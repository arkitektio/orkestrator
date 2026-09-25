import { beforeEach, describe, expect, it, vi } from "vitest";
import { S3_CREDENTIAL_REFRESH_SKEW_MS, type S3FetchConfig } from "../runner/s3-request";

const fetchS3Path = vi.hoisted(() => vi.fn());
vi.mock("../runner/s3-request", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../runner/s3-request")>()),
  fetchS3Path,
}));

const { ConfiguredS3Store } = await import("./s3Store");

const HOUR = 60 * 60 * 1000;

let storeSeq = 0;
const configFor = (expiresAt: number, accessKey = "key-1"): S3FetchConfig => ({
  accessKey,
  baseUrl: "https://data.example.org/bucket/key",
  expiresAt,
  region: "us-east-1",
  secretKey: "secret",
  sessionToken: "token",
  // Unique per store: the byte cache is global and keyed by storeId, so shared
  // ids would let one test's cached response answer another's request.
  storeId: `store-${(storeSeq += 1)}`,
});

const ok = () =>
  new Response(new Uint8Array([1, 2, 3]), { status: 200 });

describe("ConfiguredS3Store credential rotation", () => {
  beforeEach(() => {
    fetchS3Path.mockReset();
    fetchS3Path.mockImplementation(async () => ok());
  });

  it("does not touch the refresher while the credentials are fresh", async () => {
    const refresh = vi.fn();
    const store = new ConfiguredS3Store(configFor(Date.now() + HOUR), {
      preloadMetadata: false,
      refreshConfig: refresh,
    });

    await store.get("/zarr.json");

    expect(refresh).not.toHaveBeenCalled();
    expect(fetchS3Path).toHaveBeenCalledTimes(1);
  });

  it("rotates before a request once inside the skew, and signs with the new config", async () => {
    const fresh = configFor(Date.now() + HOUR, "key-2");
    const refresh = vi.fn(async () => fresh);
    const store = new ConfiguredS3Store(
      configFor(Date.now() + S3_CREDENTIAL_REFRESH_SKEW_MS - 1_000),
      { preloadMetadata: false, refreshConfig: refresh },
    );

    await store.get("/zarr.json");

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchS3Path.mock.calls[0][0]).toBe(fresh);
  });

  // The regression this exists for: an expired config used to be a hard throw,
  // which killed brick streaming for the rest of the session.
  it("still throws on expiry when no refresher is wired", async () => {
    const store = new ConfiguredS3Store(configFor(Date.now() - 1), {
      preloadMetadata: false,
    });

    await expect(store.get("/zarr.json")).rejects.toThrow(/have expired/);
    expect(fetchS3Path).not.toHaveBeenCalled();
  });

  it("collapses a burst of stale requests into ONE refresh", async () => {
    const refresh = vi.fn(async () => configFor(Date.now() + HOUR, "key-2"));
    const store = new ConfiguredS3Store(configFor(Date.now() - 1), {
      preloadMetadata: false,
      refreshConfig: refresh,
    });

    // Distinct keys so the byte cache cannot answer them for us.
    await Promise.all(
      ["/a", "/b", "/c", "/d"].map((key) => store.get(key as `/${string}`)),
    );

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("force-refreshes and retries once when S3 answers 403", async () => {
    const fresh = configFor(Date.now() + HOUR, "key-2");
    const refresh = vi.fn(async () => fresh);
    fetchS3Path
      .mockImplementationOnce(async () => new Response(null, { status: 403 }))
      .mockImplementationOnce(async () => ok());

    const store = new ConfiguredS3Store(configFor(Date.now() + HOUR), {
      preloadMetadata: false,
      refreshConfig: refresh,
    });

    const result = await store.get("/zarr.json");

    expect(refresh).toHaveBeenCalledWith({ forceRefresh: true });
    expect(fetchS3Path).toHaveBeenCalledTimes(2);
    expect(fetchS3Path.mock.calls[1][0]).toBe(fresh);
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("gives up after one retry rather than looping on a persistent 403", async () => {
    fetchS3Path.mockImplementation(async () => new Response(null, { status: 403 }));
    const store = new ConfiguredS3Store(configFor(Date.now() + HOUR), {
      preloadMetadata: false,
      refreshConfig: async () => configFor(Date.now() + HOUR, "key-2"),
    });

    await expect(store.get("/zarr.json")).rejects.toThrow(/403/);
    expect(fetchS3Path).toHaveBeenCalledTimes(2);
  });

  it("hands workers a rotated config, synchronously when nothing is due", async () => {
    const fresh = configFor(Date.now() + HOUR, "key-2");
    const stale = configFor(Date.now() - 1);
    const store = new ConfiguredS3Store(stale, {
      preloadMetadata: false,
      refreshConfig: async () => fresh,
    });

    await expect(store.ensureFreshWorkerFetchConfig()).resolves.toBe(fresh);
    // Fresh now: no promise, so the per-chunk path allocates nothing.
    expect(store.ensureFreshWorkerFetchConfig()).toBe(fresh);
  });
});

describe("ConfiguredS3Store.getRange", () => {
  beforeEach(() => {
    fetchS3Path.mockReset();
  });

  it("signs a suffix Range header and caches by range, not by key", async () => {
    fetchS3Path.mockImplementation(
      async () =>
        new Response(new Uint8Array([9, 8]), {
          status: 206,
          headers: { "Content-Range": "bytes 98-99/100" },
        }),
    );
    const store = new ConfiguredS3Store(configFor(Date.now() + HOUR), {
      preloadMetadata: false,
    });

    const suffix = await store.getRange("/c/0/0", { suffixLength: 2 });
    expect(suffix).toEqual(new Uint8Array([9, 8]));
    expect(new Headers(fetchS3Path.mock.calls[0][2].headers).get("Range")).toBe("bytes=-2");

    await store.getRange("/c/0/0", { offset: 10, length: 5 });
    expect(new Headers(fetchS3Path.mock.calls[1][2].headers).get("Range")).toBe("bytes=10-14");
    expect(fetchS3Path).toHaveBeenCalledTimes(2);

    // Same range again: byte cache answers.
    await store.getRange("/c/0/0", { suffixLength: 2 });
    expect(fetchS3Path).toHaveBeenCalledTimes(2);
  });

  it("slices locally when a gateway ignores Range and answers 200 with the whole object", async () => {
    const whole = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    fetchS3Path.mockImplementation(async () => new Response(whole, { status: 200 }));
    const store = new ConfiguredS3Store(configFor(Date.now() + HOUR), {
      preloadMetadata: false,
    });

    expect(await store.getRange("/c/0/0", { offset: 3, length: 4 })).toEqual(
      new Uint8Array([3, 4, 5, 6]),
    );
    expect(await store.getRange("/c/0/0", { suffixLength: 3 })).toEqual(
      new Uint8Array([7, 8, 9]),
    );
  });

  it("returns undefined for a missing shard object", async () => {
    fetchS3Path.mockImplementation(async () => new Response(null, { status: 404 }));
    const store = new ConfiguredS3Store(configFor(Date.now() + HOUR), {
      preloadMetadata: false,
    });
    expect(await store.getRange("/c/9/9", { suffixLength: 20 })).toBeUndefined();
  });
});
