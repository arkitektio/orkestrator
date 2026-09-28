import { describe, expect, it } from "vitest";
import { TokenRotation } from "./tokenRotation";
import type { TokenResponse } from "../fakts/tokenSchema";

/**
 * The forced-vs-raced rule, pinned on its own.
 *
 * Mirrors `lib/zarr/store/credentialRotation.test.ts`, because this is the same
 * hazard one layer up: a FORCED refresh happens because the server just
 * rejected the token we hold, and the non-forced path is allowed to re-serve
 * exactly that token. Under concurrent requests — which is the normal state of
 * this app, a dozen Apollo clients sharing one token — losing that race means
 * the retry replays the rejected credential and the operation fails a second
 * time for the same reason.
 */

const token = (label: string): TokenResponse =>
  ({ access_token: label, token_type: "Bearer", client_id: "cid" }) as TokenResponse;

/** A refresher that records calls and lets the test resolve them by hand. */
const manualRefresher = () => {
  const calls: { forceRefresh: boolean; resolve: (t: TokenResponse) => void; reject: (e: Error) => void }[] = [];
  const refresher = (options: { forceRefresh: boolean }) =>
    new Promise<TokenResponse>((resolve, reject) => {
      calls.push({ forceRefresh: options.forceRefresh, resolve, reject });
    });
  return { calls, refresher };
};

describe("TokenRotation", () => {
  it("collapses concurrent non-forced refreshes into one round-trip", async () => {
    const { calls, refresher } = manualRefresher();
    const rotation = new TokenRotation(refresher);

    const first = rotation.rotate();
    const second = rotation.rotate();
    expect(calls).toHaveLength(1);

    calls[0].resolve(token("fresh"));
    expect((await first).access_token).toBe("fresh");
    expect((await second).access_token).toBe("fresh");
  });

  it("a forced rotate chains AFTER a raced non-forced one instead of joining it", async () => {
    const { calls, refresher } = manualRefresher();
    const rotation = new TokenRotation(refresher);

    const nonForced = rotation.rotate();
    const forced = rotation.rotate({ forceRefresh: true });
    expect(calls).toHaveLength(1); // the forced one waits its turn

    // The raced refresh re-serves the (rejected) cached token…
    calls[0].resolve(token("stale-cached"));
    await nonForced;
    await Promise.resolve(); // let the chained forced rotation start

    // …and the forced caller gets its OWN, genuinely forced refresh.
    expect(calls).toHaveLength(2);
    expect(calls[0].forceRefresh).toBe(false);
    expect(calls[1].forceRefresh).toBe(true);
    calls[1].resolve(token("minted"));
    expect((await forced).access_token).toBe("minted");
  });

  it("forced rotations still coalesce with each other", async () => {
    const { calls, refresher } = manualRefresher();
    const rotation = new TokenRotation(refresher);

    const first = rotation.rotate({ forceRefresh: true });
    const second = rotation.rotate({ forceRefresh: true });
    // One round-trip for the whole rejection storm across every client.
    expect(calls).toHaveLength(1);

    calls[0].resolve(token("minted"));
    expect((await first).access_token).toBe("minted");
    expect((await second).access_token).toBe("minted");
  });

  it("still runs its forced refresh when the raced one FAILED", async () => {
    const { calls, refresher } = manualRefresher();
    const rotation = new TokenRotation(refresher);

    const nonForced = rotation.rotate();
    const forced = rotation.rotate({ forceRefresh: true });

    calls[0].reject(new Error("network died"));
    await expect(nonForced).rejects.toThrow("network died");
    await Promise.resolve();
    await Promise.resolve();

    // A failed refresh must not swallow the forced caller behind it.
    expect(calls).toHaveLength(2);
    calls[1].resolve(token("minted"));
    expect((await forced).access_token).toBe("minted");
  });

  it("reports a forced refresh in flight, so unforced callers can join it", async () => {
    // The provider's fast path ("my cached token still looks fresh, skip the
    // rotation") would otherwise hand the REJECTED token to every concurrent
    // caller while the forced replacement is still running.
    const { calls, refresher } = manualRefresher();
    const rotation = new TokenRotation(refresher);

    expect(rotation.isForcedInFlight()).toBe(false);

    const nonForced = rotation.rotate();
    expect(rotation.isForcedInFlight()).toBe(false);
    calls[0].resolve(token("fresh"));
    await nonForced;

    const forced = rotation.rotate({ forceRefresh: true });
    expect(rotation.isForcedInFlight()).toBe(true);
    calls[1].resolve(token("minted"));
    await forced;
    expect(rotation.isForcedInFlight()).toBe(false);
  });

  it("releases the lock after a failure so the next caller can retry", async () => {
    const { calls, refresher } = manualRefresher();
    const rotation = new TokenRotation(refresher);

    const failing = rotation.rotate();
    calls[0].reject(new Error("boom"));
    await expect(failing).rejects.toThrow("boom");

    const next = rotation.rotate();
    expect(calls).toHaveLength(2);
    calls[1].resolve(token("recovered"));
    expect((await next).access_token).toBe("recovered");
  });
});
