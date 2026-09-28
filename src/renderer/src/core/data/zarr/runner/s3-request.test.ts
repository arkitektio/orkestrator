import type { AbsolutePath } from "@zarrita/storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchS3Path, resolveStoreUrl, type S3FetchConfig } from "./s3-request";

/**
 * SigV4 signing, and specifically the canonical URI and the presigned query.
 *
 * These exist because a signing mistake does not look like a signing mistake:
 * it comes back as a bare 403 with nothing to say which byte disagreed.
 *
 * GETs are PRESIGNED (query auth): the signature is in the URL, no headers are
 * signed, and the request is therefore HTTP-cacheable — including ranged
 * reads, where Chromium's sparse-206 cache narrowing used to BREAK the signed
 * `Range` header and is now the intended byte cache. See SIGV4_SIGNING.md.
 */

const config = (): S3FetchConfig => ({
  accessKey: "AKIAEXAMPLE",
  baseUrl: "https://gateway.example/bucket/collection-id/",
  expiresAt: Date.now() + 3_600_000,
  region: "us-east-1",
  secretKey: "secret",
  sessionToken: "token",
  storeId: "store-1",
});

/** Capture the outgoing request without issuing it. */
const captureRequest = () => {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response(new Uint8Array(), { status: 200 });
    }),
  );
  return calls;
};

const queryOf = (url: string): URLSearchParams => new URL(url).searchParams;
const signatureOf = (url: string): string => queryOf(url).get("X-Amz-Signature") ?? "";

// The presign memo keys on (credentials, hour, path) and would otherwise carry
// URLs across tests. A frozen clock inside one hour plus per-test credential
// variation keeps assertions deterministic; identical inputs MEANING identical
// URLs is itself one of the properties under test.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-17T11:15:12.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("canonical URI encoding", () => {
  it("signs a hive-partitioned key the same whether `=` arrives raw or escaped", async () => {
    // The regression this file exists for. `URL` leaves `=` literal in
    // `pathname`, but SigV4 — and S3 on the other side — require every byte
    // outside the unreserved set percent-encoded. Signing the literal produced
    // a 403 on the first fabriks geometry read (`level=0/part-00000.parquet`)
    // while every zarr chunk path, being unreserved throughout, was unaffected.
    const calls = captureRequest();

    await fetchS3Path(config(), "/level=0/part-00000.parquet" as AbsolutePath);
    await fetchS3Path(config(), "/level%3D0/part-00000.parquet" as AbsolutePath);

    expect(calls).toHaveLength(2);
    // Same object, therefore the same canonical form, therefore one signature.
    expect(signatureOf(calls[0].url)).toBe(signatureOf(calls[1].url));

    // The property that actually prevents SignatureDoesNotMatch: the WIRE
    // path is the strictly-encoded form the canonical request signs. The
    // server recomputes its signature from the bytes it receives — a literal
    // `=` on the wire while `%3D` was signed fails even though our own
    // canonical form is self-consistent.
    for (const call of calls) {
      expect(new URL(call.url).pathname).toContain("/level%3D0/");
      expect(new URL(call.url).pathname).not.toContain("level=0");
    }
  });

  it("distinguishes keys that genuinely differ", async () => {
    const calls = captureRequest();
    await fetchS3Path(config(), "/level=0/part-00000.parquet" as AbsolutePath);
    await fetchS3Path(config(), "/level=1/part-00000.parquet" as AbsolutePath);
    expect(signatureOf(calls[0].url)).not.toBe(signatureOf(calls[1].url));
  });

  it("leaves an all-unreserved zarr chunk path untouched", async () => {
    const calls = captureRequest();
    await fetchS3Path(config(), "/c/0/0/0" as AbsolutePath);
    const url = new URL(calls[0].url);
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://gateway.example/bucket/collection-id/c/0/0/0",
    );
  });
});

describe("presigned query auth", () => {
  it("carries the whole credential story in the query and signs only `host`", async () => {
    const calls = captureRequest();
    await fetchS3Path(config(), "/c/0/0/0" as AbsolutePath);
    const query = queryOf(calls[0].url);

    expect(query.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(query.get("X-Amz-Credential")).toBe(
      "AKIAEXAMPLE/20260817/us-east-1/s3/aws4_request",
    );
    expect(query.get("X-Amz-Date")).toBe("20260817T110000Z"); // UTC hour floor
    expect(query.get("X-Amz-Security-Token")).toBe("token");
    expect(query.get("X-Amz-SignedHeaders")).toBe("host");
    expect(signatureOf(calls[0].url)).toMatch(/^[0-9a-f]{64}$/);
    // Nothing header-signed: no Authorization, no x-amz-* request headers.
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("x-amz-date")).toBeNull();
    expect(headers.get("x-amz-security-token")).toBeNull();
  });

  it("presigns one object to ONE stable URL — the URL is the HTTP cache key", async () => {
    const calls = captureRequest();
    // One grant, fetched twice: real callers hold a config per grant, so its
    // expiresAt is fixed — a config minted anew would be a NEW credential
    // window and correctly presign differently.
    const grant = config();
    await fetchS3Path(grant, "/c/0/0/0" as AbsolutePath);
    // Minutes later, same hour: the pinned X-Amz-Date keeps the URL identical,
    // so Chromium's cache entry from the first fetch still matches.
    vi.setSystemTime(new Date("2026-08-17T11:53:00.000Z"));
    await fetchS3Path(grant, "/c/0/0/0" as AbsolutePath);
    expect(calls[0].url).toBe(calls[1].url);
  });

  it("covers the credential's remaining lifetime from the pinned date", async () => {
    const calls = captureRequest();
    await fetchS3Path(config(), "/c/0/0/0" as AbsolutePath);
    const expires = Number(queryOf(calls[0].url).get("X-Amz-Expires"));
    // Pinned 15m12s into the hour + 1h credential lifetime ≈ 4512s; the exact
    // value matters less than: covers now→expiry, and stays under the cap.
    expect(expires).toBeGreaterThanOrEqual(3_600);
    expect(expires).toBeLessThanOrEqual(604_800);
  });

  it("omits X-Amz-Security-Token when the grant has no session token", async () => {
    // The header path signed and sent an empty token and MinIO accepted it;
    // the presigned form with an EMPTY token is rejected with a 403 (verified
    // live). An empty token = the datalayer's static-credentials fallback.
    const calls = captureRequest();
    await fetchS3Path({ ...config(), sessionToken: "" }, "/c/0/0/0" as AbsolutePath);
    expect(queryOf(calls[0].url).has("X-Amz-Security-Token")).toBe(false);
    expect(signatureOf(calls[0].url)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses expired credentials before signing anything", async () => {
    captureRequest();
    await expect(
      fetchS3Path({ ...config(), expiresAt: Date.now() - 1 }, "/c/0/0/0" as AbsolutePath),
    ).rejects.toThrow(/expired/);
  });
});

describe("ranged reads", () => {
  it("sends Range as a plain header, UNSIGNED, on the same URL as the whole object", async () => {
    // The point of presigning: `Range` must not be in the signature, so the
    // browser cache may narrow it against a sparse 206 entry — that used to be
    // Trap 1 (SignatureDoesNotMatch), now it serves cached bytes.
    const calls = captureRequest();
    const path = "/catalog/cells.parquet" as AbsolutePath;
    await fetchS3Path(config(), path, { headers: { Range: "bytes=0-1023" } });
    await fetchS3Path(config(), path);

    expect(new Headers(calls[0].init.headers).get("Range")).toBe("bytes=0-1023");
    expect(queryOf(calls[0].url).get("X-Amz-SignedHeaders")).toBe("host");
    // Same object → same presigned URL whether ranged or not: one cache entry.
    expect(calls[0].url).toBe(calls[1].url);
  });
});

describe("signing-key cache", () => {
  /**
   * The 403 this exists for: a datalayer whose STS is unavailable falls back to
   * its STATIC credentials, so every grant it issues carries the SAME access
   * key while the secret behind it can change. Keyed on the access key alone,
   * the signing key derived for the first grant was reused for every later one
   * — `Credential=` current, HMAC stale — and refreshing the grant could not
   * recover it, because the memo never saw a new key.
   */
  it("re-derives when a new grant reuses the access key with a different secret", async () => {
    const calls = captureRequest();
    const path = "/level0/part-00000.parquet" as AbsolutePath;

    await fetchS3Path({ ...config(), secretKey: "first-secret" }, path);
    await fetchS3Path({ ...config(), secretKey: "second-secret" }, path);

    expect(calls).toHaveLength(2);
    // Same access key on the wire both times — that is the whole trap.
    for (const call of calls) {
      expect(queryOf(call.url).get("X-Amz-Credential")).toContain("AKIAEXAMPLE/");
    }
    expect(signatureOf(calls[0].url)).not.toBe(signatureOf(calls[1].url));
  });

  it("still memoizes when the credentials are genuinely unchanged", async () => {
    const calls = captureRequest();
    const path = "/level0/part-00000.parquet" as AbsolutePath;

    await fetchS3Path(config(), path);
    await fetchS3Path(config(), path);

    expect(calls[0].url).toBe(calls[1].url);
  });
});

describe("resolveStoreUrl", () => {
  it("resolves a key under a prefix, adding the separator the prefix omits", () => {
    const url = resolveStoreUrl("https://gateway.example/bucket/prefix", "/fabriks.json" as AbsolutePath);
    expect(url.href).toBe("https://gateway.example/bucket/prefix/fabriks.json");
  });

  it("keeps a hive segment literal on the wire", () => {
    // Only the CANONICAL form is encoded; the request line still carries the
    // key as written, which is what the store holds.
    const url = resolveStoreUrl(
      "https://gateway.example/bucket/prefix/",
      "/level=2/part-00001.parquet" as AbsolutePath,
    );
    expect(url.pathname).toBe("/bucket/prefix/level=2/part-00001.parquet");
  });
});

describe("HTTP cache participation", () => {
  /**
   * The old behavior this INVERTS: header-signed ranged reads had to be
   * `no-store`, because Chromium narrowing a signed `Range` against a sparse
   * 206 entry produced SignatureDoesNotMatch (SIGV4_SIGNING.md Trap 1). With
   * the signature in the URL nothing on the request is signed, so ranged
   * responses cache like any other — the byte cache sharded reads never had.
   */
  it("leaves ranged requests cacheable — narrowing a Range breaks nothing now", async () => {
    const calls = captureRequest();
    await fetchS3Path(config(), "/level0/part-00000.parquet" as AbsolutePath, {
      headers: { Range: "bytes=10009781-10534068" },
    });
    expect(calls[0].init.cache).toBeUndefined();
  });

  it("leaves a whole-object read cacheable", async () => {
    const calls = captureRequest();
    await fetchS3Path(config(), "/c/0/0/0" as AbsolutePath);
    expect(calls[0].init.cache).toBeUndefined();
  });

  it("does not disturb a caller that chose its own cache mode", async () => {
    const calls = captureRequest();
    await fetchS3Path(config(), "/zarr.json" as AbsolutePath, { cache: "reload" });
    expect(calls[0].init.cache).toBe("reload");
  });
});
