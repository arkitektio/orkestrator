import { beforeEach, describe, expect, it, vi } from "vitest";
import type { S3FetchConfig } from "@/core/data/zarr/runner/s3-request";

const fetchS3Path = vi.hoisted(() => vi.fn());
vi.mock("@/core/data/zarr/runner/s3-request", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/data/zarr/runner/s3-request")>()),
  fetchS3Path,
}));

const { S3ParquetStore } = await import("./s3ParquetStore");

const HOUR = 60 * 60 * 1000;

const config = (): S3FetchConfig => ({
  accessKey: "key-1",
  baseUrl: "https://data.example.org/bucket/prefix",
  expiresAt: Date.now() + HOUR,
  region: "us-east-1",
  secretKey: "secret",
  sessionToken: "token",
  storeId: "parquet-store",
});

/** A 64-byte object whose byte at index i is i. */
const whole = () => new Uint8Array(Array.from({ length: 64 }, (_, i) => i));

describe("S3ParquetStore range reads", () => {
  beforeEach(() => {
    fetchS3Path.mockReset();
  });

  it("keeps a 206 range answer as it came", async () => {
    fetchS3Path.mockImplementation(
      async () =>
        new Response(whole().subarray(8, 16), {
          status: 206,
          headers: { "Content-Range": "bytes 8-15/64" },
        }),
    );
    const store = new S3ParquetStore({ config: config() });
    const bytes = await store.getRange("part.parquet", 8, 16);
    expect(Array.from(bytes)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(fetchS3Path.mock.calls[0][2]).toEqual({ headers: { Range: "bytes=8-15" } });
  });

  it("slices a 200 whole-object answer to the range, and caches a COPY, not a view over the whole object", async () => {
    fetchS3Path.mockImplementation(async () => new Response(whole(), { status: 200 }));
    const store = new S3ParquetStore({ config: config() });

    const bytes = await store.getRange("part.parquet", 8, 16);
    expect(Array.from(bytes)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    // The cache accounts 8 bytes for this entry; the backing buffer must agree,
    // or every few-KB footer read pins the whole object behind it.
    expect(bytes.byteLength).toBe(8);
    expect(bytes.buffer.byteLength).toBe(8);

    // Served from the cache: one fetch, same bytes.
    const again = await store.getRange("part.parquet", 8, 16);
    expect(again).toBe(bytes);
    expect(fetchS3Path).toHaveBeenCalledTimes(1);
    expect(store.stats.cacheHits).toBe(1);
  });
});
