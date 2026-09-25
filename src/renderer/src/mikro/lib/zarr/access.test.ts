// @vitest-environment jsdom
// The graphql document module this imports reaches `window` at import time.
import { describe, expect, it, vi } from "vitest";
import { S3_CREDENTIAL_REFRESH_SKEW_MS } from "@/lib/zarr/runner/s3-request";
import type { MikroClient } from "@/lib/zarr/store/types";
import { buildS3FetchConfig, getGeneralAccess, isGrantUsable } from "./access";

const grant = (accessKey: string, expiresIn: number) => ({
  accessKey,
  bucket: "bucket",
  expiresIn,
  region: "us-east-1",
  secretKey: "secret",
  sessionToken: "token",
});

/** A client counting mutations, so "one round-trip" is an assertion. */
const fakeClient = (expiresIn = 3600, onMutate?: () => void) => {
  let issued = 0;
  const client: MikroClient = {
    mutate: async () => {
      onMutate?.();
      issued += 1;
      return { data: { requestGeneralZarrAccess: grant(`key-${issued}`, expiresIn) } };
    },
  };
  return { client, calls: () => issued };
};

describe("isGrantUsable", () => {
  it("rejects a grant that would die inside the refresh skew", () => {
    const now = 1_000_000;
    const dated = (expiresAt: number) => ({ grant: grant("k", 0), expiresAt });

    expect(isGrantUsable(dated(now + S3_CREDENTIAL_REFRESH_SKEW_MS + 1), now)).toBe(true);
    expect(isGrantUsable(dated(now + S3_CREDENTIAL_REFRESH_SKEW_MS), now)).toBe(false);
    expect(isGrantUsable(dated(now - 1), now)).toBe(false);
    expect(isGrantUsable(null, now)).toBe(false);
  });
});

describe("getGeneralAccess", () => {
  it("mints once and reuses the grant while it stays usable", async () => {
    const { client, calls } = fakeClient();

    const first = await getGeneralAccess(client);
    const second = await getGeneralAccess(client);

    expect(calls()).toBe(1);
    expect(second).toBe(first);
  });

  // The failure this whole path exists for: a scene's stores all go stale at
  // the same instant and every one of them asks at once.
  it("collapses concurrent callers into a single round-trip", async () => {
    const { client, calls } = fakeClient();

    const results = await Promise.all(
      Array.from({ length: 8 }, () => getGeneralAccess(client)),
    );

    expect(calls()).toBe(1);
    expect(new Set(results).size).toBe(1);
  });

  it("re-mints when the cached grant is inside the skew", async () => {
    // expiresIn below the skew: usable on arrival by the wire's reckoning,
    // never usable by ours.
    const { client, calls } = fakeClient(1);

    await getGeneralAccess(client);
    await getGeneralAccess(client);

    expect(calls()).toBe(2);
  });

  it("forceRefresh bypasses a cached grant", async () => {
    const { client, calls } = fakeClient();

    const first = await getGeneralAccess(client);
    const forced = await getGeneralAccess(client, { forceRefresh: true });

    expect(calls()).toBe(2);
    expect(forced.grant.accessKey).not.toBe(first.grant.accessKey);
  });

  it("keeps grants separate per client", async () => {
    const a = fakeClient();
    const b = fakeClient();

    await getGeneralAccess(a.client);
    await getGeneralAccess(b.client);

    expect(a.calls()).toBe(1);
    expect(b.calls()).toBe(1);
  });

  it("does not cache a failed mint", async () => {
    let attempt = 0;
    const client: MikroClient = {
      mutate: async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("network");
        return { data: { requestGeneralZarrAccess: grant("key", 3600) } };
      },
    };

    await expect(getGeneralAccess(client)).rejects.toThrow("network");
    await expect(getGeneralAccess(client)).resolves.toMatchObject({
      grant: { accessKey: "key" },
    });
  });
});

describe("buildS3FetchConfig", () => {
  it("rebuilds the base url from the grant's bucket, not the old config", () => {
    const config = buildS3FetchConfig(
      { grant: { ...grant("k", 3600), bucket: "rotated" }, expiresAt: 42 },
      { key: "some/key", storeId: "store-1" },
      "https://data.example.org/",
    );

    expect(config.baseUrl).toBe("https://data.example.org/rotated/some/key");
    expect(config.expiresAt).toBe(42);
    expect(config.storeId).toBe("store-1");
  });
});

describe("getGeneralAccess timing", () => {
  // `expiresIn` is a duration measured from when the server answered, so a slow
  // round-trip must eat into the lifetime rather than being handed back.
  it("pins expiry to arrival, not to the request", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const slowClient: MikroClient = {
      mutate: () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: { requestGeneralZarrAccess: grant("k", 3600) } }),
            5_000,
          ),
        ),
    };

    const pending = getGeneralAccess(slowClient);
    await vi.advanceTimersByTimeAsync(5_000);

    expect((await pending).expiresAt).toBe(5_000 + 3600 * 1000);
    vi.useRealTimers();
  });
});

describe("fabriks credentials are a separate kind", () => {
  /**
   * A client that answers whichever mutation it is given, recording which.
   * The two kinds are DIFFERENT credentials from different mutations — a zarr
   * grant does not authorize a fabriks prefix — so the cache must not let one
   * satisfy a request for the other.
   */
  const dualClient = () => {
    const issued: string[] = [];
    let n = 0;
    const client: MikroClient = {
      mutate: async (options: { mutation: unknown }) => {
        n += 1;
        const doc = JSON.stringify(options.mutation);
        if (doc.includes("requestGeneralFabriksAccess")) {
          issued.push("fabriks");
          return { data: { requestGeneralFabriksAccess: grant(`fabriks-${n}`, 3600) } };
        }
        issued.push("zarr");
        return { data: { requestGeneralZarrAccess: grant(`zarr-${n}`, 3600) } };
      },
    };
    return { client, issued };
  };

  it("mints a fabriks grant from the fabriks mutation, not the zarr one", async () => {
    const { client, issued } = dualClient();
    const dated = await getGeneralAccess(client, { kind: "fabriks" });
    expect(issued).toEqual(["fabriks"]);
    expect(dated.grant.accessKey).toMatch(/^fabriks-/);
  });

  it("never hands a zarr grant to a fabriks caller, or the reverse", async () => {
    const { client, issued } = dualClient();
    const zarr = await getGeneralAccess(client);
    const fabriks = await getGeneralAccess(client, { kind: "fabriks" });

    // Two kinds, two round-trips — a shared cache would have made the second free.
    expect(issued).toEqual(["zarr", "fabriks"]);
    expect(zarr.grant.accessKey).toMatch(/^zarr-/);
    expect(fabriks.grant.accessKey).toMatch(/^fabriks-/);
    expect(zarr.grant.accessKey).not.toBe(fabriks.grant.accessKey);
  });

  it("caches each kind independently, so neither evicts the other", async () => {
    const { client, issued } = dualClient();
    await getGeneralAccess(client);
    await getGeneralAccess(client, { kind: "fabriks" });
    // Both are cached now: repeats cost nothing, and crucially the fabriks grant
    // did not overwrite the zarr one on its way in.
    const zarrAgain = await getGeneralAccess(client);
    const fabriksAgain = await getGeneralAccess(client, { kind: "fabriks" });

    expect(issued).toEqual(["zarr", "fabriks"]);
    expect(zarrAgain.grant.accessKey).toMatch(/^zarr-/);
    expect(fabriksAgain.grant.accessKey).toMatch(/^fabriks-/);
  });

  it("forces a refresh of one kind without disturbing the other", async () => {
    const { client, issued } = dualClient();
    const zarr = await getGeneralAccess(client);
    await getGeneralAccess(client, { kind: "fabriks" });
    const refreshed = await getGeneralAccess(client, { kind: "fabriks", forceRefresh: true });

    expect(issued).toEqual(["zarr", "fabriks", "fabriks"]);
    expect(refreshed.grant.accessKey).not.toBe(zarr.grant.accessKey);
    expect((await getGeneralAccess(client)).grant.accessKey).toBe(zarr.grant.accessKey);
  });
});

/**
 * The prefetch in `useDatalayerWarmup` starts the grant before the scene query
 * returns, then the scope build awaits the same function. These two cases pin
 * the semantics that argument rests on — they are why the warmup needs no kill
 * switch.
 */
describe("getGeneralAccess as a prefetch", () => {
  it("a warm followed by the scope build costs ONE round-trip", async () => {
    const { client, calls } = fakeClient();

    // The warm: fire-and-forget, rejection swallowed on a DERIVED promise.
    const warm = getGeneralAccess(client).catch(() => {});
    // The scope build, arriving while the warm is still in flight.
    const real = await getGeneralAccess(client);
    await warm;

    expect(calls()).toBe(1);
    expect(real.grant.accessKey).toBe("key-1");
  });

  it("a REJECTED warm leaves no poisoned state — the next caller re-mints", async () => {
    let attempt = 0;
    const client: MikroClient = {
      mutate: async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("network down");
        return {
          data: { requestGeneralZarrAccess: grant(`key-${attempt}`, 3600) },
        };
      },
    };

    // Warm fails exactly as the hook would swallow it.
    await getGeneralAccess(client).catch(() => {});

    // The scope build must still be able to mint: `inFlight` is cleared in a
    // `finally`, so a failed warm cannot strand every later caller.
    const real = await getGeneralAccess(client);
    expect(real.grant.accessKey).toBe("key-2");
    expect(attempt).toBe(2);
  });

  it("still surfaces the rejection to the real caller when the grant is genuinely down", async () => {
    const client: MikroClient = {
      mutate: async () => {
        throw new Error("network down");
      },
    };

    // The hook swallows its own copy...
    await getGeneralAccess(client).catch(() => {});
    // ...but the scope build's await still rejects, so `phase: "error"` is
    // reached exactly as it is today.
    await expect(getGeneralAccess(client)).rejects.toThrow("network down");
  });
});
