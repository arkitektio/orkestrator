// SigV4 for the datalayer's media objects (snapshots, thumbnails, 3D models).
//
// A thin adapter over the zarr runner's signer (`lib/zarr/runner/s3-request`),
// which already memoizes the derived signing key per (credential, UTC date,
// region) and presigned URLs per (credential, UTC hour, object). This module
// used to re-derive the key from scratch on every call — six sequential
// `crypto.subtle` round trips per thumbnail — so it now delegates instead.
import {
  deriveSigningKeyCached,
  presignS3ObjectUrl,
  type S3FetchConfig,
} from "@/lib/zarr/runner/s3-request";

// Only the credential fields actually used for signing are required here, so
// this stays structural — both mikro-next's `GeneralMediaAccessGrantFragment`
// and rekuest's `MediaAccessGrantFragment` satisfy it despite differing
// `__typename`s and extra fields.
export type S3SigningCredentials = {
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  region: string;
  /**
   * Absolute ms timestamp the grant stops being valid. Part of the presign
   * memo key, so it must be computed ONCE per grant (see `grantExpiresAt`),
   * not per call — a fresh value per call would defeat the memo. Optional
   * only for structural compatibility; a grant without one is treated as
   * lasting the rest of the current UTC hour plus one more.
   */
  expiresAt?: number;
};

const HOUR_MS = 3_600_000;

/** Fallback validity for a grant that carries no expiry: stable within the
 * hour (so the memo still hits) and never shorter than an hour. */
const fallbackExpiresAt = (now: number): number => now - (now % HOUR_MS) + 2 * HOUR_MS;

/**
 * Absolute expiry of a grant, from its `expiresIn` (seconds, as every
 * datalayer grant fragment reports it) and the moment it was issued. Compute
 * this when the grant ARRIVES and store it on the grant, so every later call
 * sees the same value.
 */
export const grantExpiresAt = (
  grant: { expiresIn?: number | null },
  issuedAt: number = Date.now(),
): number =>
  typeof grant.expiresIn === "number" && grant.expiresIn > 0
    ? issuedAt + grant.expiresIn * 1000
    : fallbackExpiresAt(issuedAt);

/** The runner's config shape for one object URL under `credentials`. */
export const s3FetchConfigFor = (url: string, credentials: S3SigningCredentials): S3FetchConfig => ({
  accessKey: credentials.accessKey,
  secretKey: credentials.secretKey,
  sessionToken: credentials.sessionToken,
  region: credentials.region,
  expiresAt: credentials.expiresAt ?? fallbackExpiresAt(Date.now()),
  baseUrl: url,
  storeId: url,
});

/**
 * A presigned GET URL for `url`, memoized per (credential identity, UTC hour,
 * object) by the runner. This is what an `<img src>` or a three.js loader
 * should be handed: no headers, so no CORS preflight, and the URL is a stable
 * HTTP cache key — the same object viewed from several cards is fetched once
 * and served from Chromium's cache after that.
 */
export const presignS3Url = async (url: string, credentials: S3SigningCredentials): Promise<string> =>
  presignS3ObjectUrl(s3FetchConfigFor(url, credentials), url);

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const hmacSha256 = async (key: Uint8Array<ArrayBuffer>, value: string): Promise<Uint8Array<ArrayBuffer>> => {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)));
};

const sha256Hex = async (value: string): Promise<string> =>
  toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));

/**
 * Header-signed request (legacy path). Retained for callers that need an
 * `Authorization` header — e.g. a non-GET or a `fetch` that must carry other
 * headers. The signing key comes from the runner's memo (two `crypto.subtle`
 * calls per request instead of six); the canonical request is unchanged, so
 * the signature is byte-for-byte what this function produced before.
 *
 * Prefer `presignS3Url` for GETs.
 */
export async function signS3Request(url: string, method: string, credentials: S3SigningCredentials) {
  const { accessKey, sessionToken, region } = credentials;
  const parsedUrl = new URL(url);
  const endpoint = parsedUrl.host; // e.g., "jhnnsrs-la" or "minio"
  const path = parsedUrl.pathname;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const service = "s3";

  const signedHeaders = "host;x-amz-date;x-amz-security-token";
  const payloadHash = "UNSIGNED-PAYLOAD"; // Standard for GET requests
  const canonicalRequest = [
    method,
    path,
    "", // Query string (empty for simple GET)
    `host:${endpoint}\nx-amz-date:${amzDate}\nx-amz-security-token:${sessionToken}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");

  const signingKey = await deriveSigningKeyCached(s3FetchConfigFor(url, credentials), dateStamp);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization: authHeader,
    "x-amz-date": amzDate,
    "x-amz-security-token": sessionToken,
    "x-amz-content-sha256": payloadHash,
  };
}
