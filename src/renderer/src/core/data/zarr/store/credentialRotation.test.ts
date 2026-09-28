import { describe, expect, it } from "vitest";
import { CredentialRotation } from "./credentialRotation";
import type { S3FetchConfig } from "../runner/s3-request";

/**
 * The forced-vs-raced rotation semantics. `s3Store.test.ts` covers the happy
 * lifecycle end to end; this pins the one subtle rule on its own: a FORCED
 * rotation (post-403) must never settle for a NON-forced rotation it raced,
 * because the non-forced refresher may re-serve the cached grant that just
 * failed — under concurrent fetching that race is routine, and losing it
 * turned an expired grant into a permanently missing row group.
 */

const config = (label: string): S3FetchConfig =>
  ({ storeId: label, accessKey: label }) as unknown as S3FetchConfig;

/** A refresher that records calls and lets the test resolve them manually. */
const manualRefresher = () => {
  const calls: { forceRefresh: boolean; resolve: (c: S3FetchConfig) => void }[] = [];
  const refresher = (options: { forceRefresh?: boolean }) =>
    new Promise<S3FetchConfig>((resolve) => {
      calls.push({ forceRefresh: Boolean(options.forceRefresh), resolve });
    });
  return { calls, refresher };
};

describe("CredentialRotation forced rotation", () => {
  it("a forced rotate chains AFTER a raced non-forced one instead of joining it", async () => {
    const { calls, refresher } = manualRefresher();
    const rotation = new CredentialRotation(config("initial"), refresher);

    const nonForced = rotation.rotate({});
    const forced = rotation.rotate({ forceRefresh: true });
    expect(calls).toHaveLength(1); // the forced one waits its turn

    // The raced rotation re-serves the (bad) cached grant…
    calls[0].resolve(config("stale-cached"));
    await nonForced;
    await Promise.resolve(); // let the chained forced rotation start

    // …and the forced caller gets its OWN, genuinely forced refresh.
    expect(calls).toHaveLength(2);
    expect(calls[0].forceRefresh).toBe(false);
    expect(calls[1].forceRefresh).toBe(true);
    calls[1].resolve(config("fresh"));
    expect((await forced).storeId).toBe("fresh");
    expect(rotation.current().storeId).toBe("fresh");
  });

  it("forced rotations still coalesce with each other", async () => {
    const { calls, refresher } = manualRefresher();
    const rotation = new CredentialRotation(config("initial"), refresher);

    const first = rotation.rotate({ forceRefresh: true });
    const second = rotation.rotate({ forceRefresh: true });
    expect(calls).toHaveLength(1); // one round-trip for the whole 403 storm
    calls[0].resolve(config("fresh"));
    expect((await first).storeId).toBe("fresh");
    expect((await second).storeId).toBe("fresh");
  });

  it("non-forced rotations coalesce as before", async () => {
    const { calls, refresher } = manualRefresher();
    const rotation = new CredentialRotation(config("initial"), refresher);

    const first = rotation.rotate({});
    const second = rotation.rotate({});
    expect(calls).toHaveLength(1);
    calls[0].resolve(config("fresh"));
    await first;
    await second;
    expect(rotation.current().storeId).toBe("fresh");
  });
});
