import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { grantExpiresAt, presignS3Url, signS3Request, type S3SigningCredentials } from "./s3request";

/**
 * The datalayer signer is an adapter over the zarr runner's memoized signer.
 * What matters here is (a) the presigned URL for a media object is STABLE —
 * it is the HTTP cache key, so an `<img>` in every card of a grid resolves to
 * one entry — and (b) it is stable only while the credential identity is:
 * a rotated secret or session token must mint a fresh URL, never reuse the
 * memo. The header-signed path is pinned against a from-scratch reference
 * derivation so delegating to the cache changed nothing on the wire.
 */

const OBJECT = "https://datalayer.example/media/snapshots/abc.png";

const credentials = (overrides: Partial<S3SigningCredentials> = {}): S3SigningCredentials => ({
  accessKey: "AKIAEXAMPLE",
  secretKey: "secret",
  sessionToken: "token",
  region: "us-east-1",
  // Fixed so the memo key (which includes it) is identical across calls.
  expiresAt: new Date("2026-08-17T13:00:00.000Z").getTime(),
  ...overrides,
});

const queryOf = (url: string) => new URL(url).searchParams;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-17T11:15:12.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("presignS3Url", () => {
  it("returns the same URL for the same object under the same grant within the hour", async () => {
    const first = await presignS3Url(OBJECT, credentials());
    vi.setSystemTime(new Date("2026-08-17T11:42:00.000Z"));
    const second = await presignS3Url(OBJECT, credentials());
    expect(second).toBe(first);
    // Pinned to the UTC hour floor, not the call time.
    expect(queryOf(first).get("X-Amz-Date")).toBe("20260817T110000Z");
  });

  it("carries the credential in the query and signs only host", async () => {
    const url = await presignS3Url(OBJECT, credentials());
    const query = queryOf(url);
    expect(url.startsWith(`${OBJECT}?`)).toBe(true);
    expect(query.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(query.get("X-Amz-Credential")).toBe("AKIAEXAMPLE/20260817/us-east-1/s3/aws4_request");
    expect(query.get("X-Amz-SignedHeaders")).toBe("host");
    expect(query.get("X-Amz-Security-Token")).toBe("token");
    expect(query.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("mints a fresh URL when the secret rotates under the same access key", async () => {
    const before = await presignS3Url(OBJECT, credentials());
    const after = await presignS3Url(OBJECT, credentials({ secretKey: "rotated" }));
    expect(after).not.toBe(before);
    expect(queryOf(after).get("X-Amz-Signature")).not.toBe(queryOf(before).get("X-Amz-Signature"));
  });

  it("mints a fresh URL when the session token rotates", async () => {
    const before = await presignS3Url(OBJECT, credentials());
    const after = await presignS3Url(OBJECT, credentials({ sessionToken: "token-2" }));
    expect(after).not.toBe(before);
    expect(queryOf(after).get("X-Amz-Security-Token")).toBe("token-2");
  });

  it("rolls the URL over at the hour boundary", async () => {
    const before = await presignS3Url(OBJECT, credentials());
    vi.setSystemTime(new Date("2026-08-17T12:00:01.000Z"));
    const after = await presignS3Url(OBJECT, credentials());
    expect(queryOf(after).get("X-Amz-Date")).toBe("20260817T120000Z");
    expect(after).not.toBe(before);
  });

  it("distinguishes objects", async () => {
    const a = await presignS3Url(OBJECT, credentials());
    const b = await presignS3Url(OBJECT.replace("abc", "def"), credentials());
    expect(a).not.toBe(b);
  });

  it("refuses an expired grant", async () => {
    await expect(
      presignS3Url(OBJECT, credentials({ expiresAt: Date.now() - 1 })),
    ).rejects.toThrow(/expired/);
  });

  it("strictly encodes reserved characters in the key on the wire", async () => {
    const url = await presignS3Url("https://datalayer.example/media/level=0/a b.png", credentials());
    expect(new URL(url).pathname).toBe("/media/level%3D0/a%20b.png");
  });
});

describe("grantExpiresAt", () => {
  it("derives an absolute expiry from expiresIn seconds at issue time", () => {
    expect(grantExpiresAt({ expiresIn: 3600 }, 1_000)).toBe(1_000 + 3_600_000);
  });

  it("falls back to a value stable within the hour when expiresIn is missing", () => {
    const at = new Date("2026-08-17T11:15:12.000Z").getTime();
    const later = new Date("2026-08-17T11:59:59.000Z").getTime();
    expect(grantExpiresAt({}, at)).toBe(grantExpiresAt({ expiresIn: 0 }, later));
    expect(grantExpiresAt({}, at)).toBeGreaterThan(later + 3_600_000);
  });
});

describe("signS3Request (header path)", () => {
  /** The pre-delegation derivation, verbatim in spirit: fresh key each call. */
  const reference = async (url: string, method: string, c: S3SigningCredentials) => {
    const encoder = new TextEncoder();
    const hmac = async (key: string | ArrayBuffer, data: string) => {
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        typeof key === "string" ? encoder.encode(key) : key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
    };
    const hex = (buffer: ArrayBuffer) =>
      Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const parsed = new URL(url);
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const canonicalRequest = [
      method,
      parsed.pathname,
      "",
      `host:${parsed.host}\nx-amz-date:${amzDate}\nx-amz-security-token:${c.sessionToken}\n`,
      "host;x-amz-date;x-amz-security-token",
      "UNSIGNED-PAYLOAD",
    ].join("\n");
    const scope = `${dateStamp}/${c.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      hex(await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest))),
    ].join("\n");
    const kDate = await hmac(`AWS4${c.secretKey}`, dateStamp);
    const kRegion = await hmac(kDate, c.region);
    const kService = await hmac(kRegion, "s3");
    const kSigning = await hmac(kService, "aws4_request");
    return `AWS4-HMAC-SHA256 Credential=${c.accessKey}/${scope}, SignedHeaders=host;x-amz-date;x-amz-security-token, Signature=${hex(await hmac(kSigning, stringToSign))}`;
  };

  it("produces the same Authorization header as a from-scratch derivation", async () => {
    const c = credentials();
    const headers = await signS3Request(OBJECT, "GET", c);
    expect(headers.Authorization).toBe(await reference(OBJECT, "GET", c));
    expect(headers["x-amz-date"]).toBe("20260817T111512Z");
    expect(headers["x-amz-security-token"]).toBe("token");
    expect(headers["x-amz-content-sha256"]).toBe("UNSIGNED-PAYLOAD");
  });

  it("still tracks a rotated secret (the memo must not pin the first key)", async () => {
    const rotated = credentials({ secretKey: "rotated" });
    const headers = await signS3Request(OBJECT, "GET", rotated);
    expect(headers.Authorization).toBe(await reference(OBJECT, "GET", rotated));
  });
});
