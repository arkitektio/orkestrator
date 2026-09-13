// SigV4 request signing for the datalayer's S3 gateway.
//
// The contract is one line — the bytes on the wire must be the bytes that were
// signed — and every way it has been broken so far is written up in
// SIGV4_SIGNING.md next to this file. Read it before changing how a request is
// built, and before debugging a 403: a signing mistake surfaces as a bare
// `403 Forbidden` that blames the credentials, which are usually fine.
import type { AbsolutePath } from '@zarrita/storage'

export interface SerializedRequestInit {
  cache?: RequestCache
  credentials?: RequestCredentials
  headers?: Array<[string, string]>
  integrity?: string
  keepalive?: boolean
  method?: string
  mode?: RequestMode
  redirect?: RequestRedirect
  referrer?: string
  referrerPolicy?: ReferrerPolicy
}

export interface S3FetchConfig {
  accessKey: string
  baseUrl: string
  expiresAt: number
  region: string
  secretKey: string
  sessionToken: string
  storeId: string
}

const encoder = new TextEncoder()

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return toHex(new Uint8Array(digest))
}

async function hmacSha256(
  key: Uint8Array<ArrayBuffer>,
  value: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(value),
  )

  return new Uint8Array(signature)
}

async function deriveSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const kDate = await hmacSha256(encoder.encode(`AWS4${secretKey}`), dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, 's3')
  return hmacSha256(kService, 'aws4_request')
}

/**
 * SigV4 signing keys change only with (credentials, UTC date, region) — at
 * most once per day per store — but every chunk request needs one, and a
 * fresh derivation is 4 sequential `crypto.subtle` HMAC round-trips (8 async
 * calls). Memoize the derivation PROMISE per (accessKey, date, region) so
 * concurrent first requests share one derivation; ~6 crypto ops per chunk
 * drop to 2. Module state — this file runs inside each decode worker, so the
 * memo is naturally per-worker. Date rollover self-handles via the key.
 */
const signingKeyMemo = new Map<string, Promise<Uint8Array<ArrayBuffer>>>()
const SIGNING_KEY_MEMO_MAX = 8

/**
 * A short, stable, non-reversible tag for a secret, for use inside a cache key.
 * FNV-1a run twice with different offset bases and concatenated — synchronous,
 * which `deriveSigningKeyCached` needs: a digest via `crypto.subtle` would be a
 * promise, and two concurrent callers would both miss the memo while awaiting
 * it, which is the deduplication the memo exists for.
 *
 * Not a security boundary — the secret is already in memory on `config`. This
 * only has to tell two secrets apart.
 */
function fingerprint(secret: string): string {
  const fnv1a = (seed: number): string => {
    let hash = seed
    for (let index = 0; index < secret.length; index++) {
      hash ^= secret.charCodeAt(index)
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return hash.toString(36)
  }
  return `${fnv1a(0x811c9dc5)}${fnv1a(0xdeadbeef)}`
}

export function deriveSigningKeyCached(
  config: S3FetchConfig,
  dateStamp: string,
): Promise<Uint8Array<ArrayBuffer>> {
  // The secret has to participate in the key. It is tempting to assume the
  // access key identifies the credential set — a rotation issues a new access
  // key alongside the secret — but a datalayer that falls back to its STATIC
  // credentials when STS is unavailable hands out grant after grant under ONE
  // access key, and the secret behind it can change between them. Keyed on the
  // access key alone, the first grant's signing key is then reused for every
  // later one: `Credential=` on the wire is current, the HMAC behind it is not,
  // and S3 answers SignatureDoesNotMatch. Nothing recovers it — refreshing the
  // grant re-derives nothing, because the memo never sees a new key.
  //
  // Fingerprinted rather than used directly so the secret is not sitting in a
  // Map key. FNV-1a twice over, for 64 bits: this only has to separate two
  // secrets that share an access key, and a collision degrades to the bug above
  // rather than to anything unsafe.
  const memoKey = `${config.accessKey}|${fingerprint(config.secretKey)}|${dateStamp}|${config.region}`

  const cached = signingKeyMemo.get(memoKey)
  if (cached) return cached
  const derived = deriveSigningKey(config.secretKey, dateStamp, config.region)
  if (signingKeyMemo.size >= SIGNING_KEY_MEMO_MAX) {
    const oldest = signingKeyMemo.keys().next().value
    if (oldest !== undefined) signingKeyMemo.delete(oldest)
  }
  signingKeyMemo.set(memoKey, derived)
  // A failed derivation must not poison the memo.
  derived.catch(() => signingKeyMemo.delete(memoKey))
  return derived
}

function canonicalQueryString(url: URL): string {
  const entries = Array.from(url.searchParams.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (leftKey !== rightKey) {
      return leftKey.localeCompare(rightKey)
    }

    return leftValue.localeCompare(rightValue)
  })

  return entries
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join('&')
}

/**
 * Every path segment RFC-3986 encoded, with `/` kept as the separator, and
 * decoded first so an already-escaped input is not escaped twice.
 *
 * Encoding the SEGMENTS matters, and it is not what a pathname already gives
 * you: `URL` leaves reserved sub-delimiters — `=`, `+`, `,`, `:`, `@` —
 * literal in `pathname`, but SigV4 requires every byte outside the unreserved
 * set percent-encoded. This went unnoticed for as long as every signed path
 * was a zarr chunk (`c/0/0/0`, `zarr.json` — unreserved throughout); a
 * fabriks prefix is hive-partitioned, so its very first geometry read is
 * `level=0/part-….parquet`.
 */
function strictlyEncodedPath(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => encodeRfc3986(decodeURIComponent(segment)))
    .join('/')
}

/** The canonical URI for SigV4 (see `strictlyEncodedPath`). */
function canonicalUri(url: URL): string {
  return strictlyEncodedPath(url.pathname)
}

/**
 * Force the WIRE path into exactly the form the canonical request signs.
 *
 * The signature is only half the contract: the server recomputes its own
 * canonical request from the bytes it RECEIVES. MinIO (and AWS's raw-path
 * comparison) canonicalize from the request path as sent — a literal `=` on
 * the wire stays a literal `=` in their canonical URI. Signing `%3D` while
 * sending `=` therefore fails with `SignatureDoesNotMatch` even though our
 * own canonical form is internally consistent. The wire bytes and the signed
 * bytes must be the SAME bytes, so the URL is normalized before either.
 */
function normalizeWirePath(url: URL): void {
  url.pathname = strictlyEncodedPath(url.pathname)
}

function normalizeHeaderValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function createCanonicalHeaders(
  url: URL,
  headers: Headers,
  amzDate: string,
  sessionToken: string,
): {
  canonicalHeaders: string
  requestHeaders: Headers
  signedHeaders: string
} {
  const requestHeaders = new Headers(headers)
  requestHeaders.set('x-amz-content-sha256', 'UNSIGNED-PAYLOAD')
  requestHeaders.set('x-amz-date', amzDate)
  requestHeaders.set('x-amz-security-token', sessionToken)

  const canonicalHeaderMap = new Map<string, string>()
  canonicalHeaderMap.set('host', url.host)

  for (const [key, value] of requestHeaders.entries()) {
    canonicalHeaderMap.set(key.toLowerCase(), normalizeHeaderValue(value))
  }

  const sortedHeaders = Array.from(canonicalHeaderMap.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  )

  return {
    canonicalHeaders: sortedHeaders
      .map(([key, value]) => `${key}:${value}\n`)
      .join(''),
    requestHeaders,
    signedHeaders: sortedHeaders.map(([key]) => key).join(';'),
  }
}

function assertCredentialsValid(config: S3FetchConfig): void {
  if (Date.now() >= config.expiresAt) {
    throw new Error(`S3 credentials for ${config.storeId} have expired`)
  }
}

async function signRequest(
  url: URL,
  config: S3FetchConfig,
  init: RequestInit,
): Promise<RequestInit> {
  assertCredentialsValid(config)

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const method = (init.method ?? 'GET').toUpperCase()
  const payloadHash = 'UNSIGNED-PAYLOAD'
  const { canonicalHeaders, requestHeaders, signedHeaders } = createCanonicalHeaders(
    url,
    new Headers(init.headers),
    amzDate,
    config.sessionToken,
  )

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`
  const canonicalRequest = [
    method,
    canonicalUri(url),
    canonicalQueryString(url),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')

  const signingKey = await deriveSigningKeyCached(config, dateStamp)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))


  requestHeaders.set(
    'Authorization',
    [
      `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', '),
  )

  return {
    ...init,
    method,
    headers: requestHeaders,
    // `range` is a SIGNED header, and the HTTP cache is allowed to rewrite it
    // before the request leaves the browser. Chromium stores a 206 as a sparse
    // cache entry, so a later overlapping range is narrowed to just the bytes
    // it does not already hold: ask for `bytes=10009781-10534068` after the
    // Parquet footer (the tail of the same object) has been cached, and what
    // goes on the wire is `bytes=10009781-10528209`. The server canonicalizes
    // what it RECEIVES, so the signature cannot match, and it fails as
    // SignatureDoesNotMatch — a credentials error for a caching problem.
    //
    // `no-store` opts the request out of that cache entirely. Only ranged
    // requests pay it: a whole-object GET (every zarr chunk) is never rewritten
    // and keeps its caching.
    cache: hasRangeHeader(requestHeaders) ? 'no-store' : init.cache,
  }
}

/**
 * Whether this request carries a `Range` — i.e. whether the browser cache is
 * allowed to rewrite a header we signed. See the `cache` note in `signRequest`.
 * Only the legacy header-signed path (non-GET) still needs this: presigned GETs
 * sign no headers, so a rewritten `Range` breaks nothing.
 */
function hasRangeHeader(headers: Headers): boolean {
  return headers.has('range')
}

// ---------------------------------------------------------------------------
// Presigned (query-auth) GETs — see SIGV4_SIGNING.md "Presigned GETs and the
// HTTP cache". The signature lives in the URL and NO headers are signed, so
// the browser cache may narrow a `Range` freely — which turns Chromium's
// sparse-206 machinery from the trap it was (Trap 1) into the byte cache the
// ranged shard reads never had.
// ---------------------------------------------------------------------------

/** Presign validity ceiling (the SigV4 maximum, 7 days). */
const PRESIGN_MAX_EXPIRES_SECONDS = 604_800

/**
 * The presigned URL IS the HTTP cache key, so the same object must presign to
 * the same URL across every worker and across time — a fresh `X-Amz-Date` per
 * request would give every fetch its own cache entry and cache nothing. The
 * date is pinned to the UTC hour floor: deterministic everywhere, and at worst
 * an hour boundary rotates the cache key.
 */
function presignPinnedTime(now: number): number {
  return now - (now % 3_600_000)
}

function amzDateOf(timeMs: number): string {
  return new Date(timeMs).toISOString().replace(/[:-]|\.\d{3}/g, '')
}

/**
 * Memoized presigned URLs. One signing round per object per credential window
 * instead of 2–3 `crypto.subtle` round trips per request. Everything that
 * identifies the credential is in the key (SIGV4_SIGNING.md rule 3), secrets
 * fingerprinted rather than stored. LRU-capped: thousands of shard objects at
 * ~0.5 KB of URL each.
 */
const presignedUrlMemo = new Map<string, Promise<string>>()
const PRESIGN_MEMO_MAX = 4096

async function presignS3Url(
  config: S3FetchConfig,
  url: URL,
  pinnedTime: number,
): Promise<string> {
  const amzDate = amzDateOf(pinnedTime)
  const dateStamp = amzDate.slice(0, 8)
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`
  // Validity runs from the (past) pinned date; cover the credential's whole
  // remaining lifetime — the session token bounds real validity server-side.
  const expiresSeconds = Math.min(
    PRESIGN_MAX_EXPIRES_SECONDS,
    Math.max(60, Math.ceil((config.expiresAt - pinnedTime) / 1000)),
  )

  const params: Array<[string, string]> = [
    // Pre-existing query params survive (none in practice — grants mint bare
    // base URLs — but dropping one silently would be a wrong-object read).
    ...Array.from(url.searchParams.entries()),
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${config.accessKey}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresSeconds)],
    ['X-Amz-SignedHeaders', 'host'],
  ]
  // OMITTED when empty, unlike the header path (which signed and sent an
  // empty token, accepted): MinIO rejects a presigned URL carrying an empty
  // X-Amz-Security-Token with a 403 — verified against the live deployment.
  // An empty token means the datalayer fell back to static credentials.
  if (config.sessionToken) {
    params.push(['X-Amz-Security-Token', config.sessionToken])
  }
  // Canonical query: RFC-3986-encoded pairs in BYTE order of the encoded key
  // (the spec's order — deliberately not `localeCompare`).
  const canonicalQuery = params
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  const canonicalRequest = [
    'GET',
    canonicalUri(url),
    canonicalQuery,
    `host:${url.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')

  const signingKey = await deriveSigningKeyCached(config, dateStamp)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  // Wire bytes == signed bytes (the one contract): the query is the exact
  // canonical string plus the signature — never re-serialized through
  // URLSearchParams, whose encoding differs from RFC 3986.
  return `${url.origin}${url.pathname}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

/** The memoized presigned URL for one (credential window, object) pair. */
function presignedS3UrlCached(config: S3FetchConfig, url: URL): Promise<string> {
  assertCredentialsValid(config)
  const pinnedTime = presignPinnedTime(Date.now())
  const memoKey = [
    config.accessKey,
    fingerprint(config.secretKey),
    fingerprint(config.sessionToken),
    config.region,
    config.expiresAt,
    pinnedTime,
    `${url.origin}${url.pathname}${url.search}`,
  ].join('|')

  const cached = presignedUrlMemo.get(memoKey)
  if (cached) return cached
  const presigned = presignS3Url(config, url, pinnedTime)
  if (presignedUrlMemo.size >= PRESIGN_MEMO_MAX) {
    const oldest = presignedUrlMemo.keys().next().value
    if (oldest !== undefined) presignedUrlMemo.delete(oldest)
  }
  presignedUrlMemo.set(memoKey, presigned)
  presigned.catch(() => presignedUrlMemo.delete(memoKey))
  return presigned
}

/**
 * The memoized presigned GET URL for one whole object — the same URL
 * `fetchS3Path` would fetch, handed out for consumers that want the browser
 * to load it itself (`<img src>`, three.js loaders). Because the URL is the
 * HTTP cache key, two consumers of one object within the same hour share one
 * cache entry. The wire path is normalized to the signed form first (see
 * `normalizeWirePath`).
 */
export function presignS3ObjectUrl(config: S3FetchConfig, objectUrl: string | URL): Promise<string> {
  const url = typeof objectUrl === 'string' ? new URL(objectUrl) : new URL(objectUrl.href)
  normalizeWirePath(url)
  return presignedS3UrlCached(config, url)
}

export function resolveStoreUrl(root: string | URL, path: AbsolutePath): URL {
  const base = typeof root === 'string' ? new URL(root) : new URL(root.href)
  if (!base.pathname.endsWith('/')) {
    base.pathname += '/'
  }

  const resolved = new URL(path.slice(1), base)
  resolved.search = base.search
  return resolved
}

export async function fetchS3Path(
  config: S3FetchConfig,
  path: AbsolutePath,
  init: RequestInit = {},
): Promise<Response> {
  const url = resolveStoreUrl(config.baseUrl, path)
  // Wire bytes == signed bytes, or the server's recomputed signature differs.
  normalizeWirePath(url)
  const method = (init.method ?? 'GET').toUpperCase()
  if (method !== 'GET') {
    // Header-signed path, retained for any future non-GET caller.
    return fetch(url, await signRequest(url, config, init))
  }
  // GETs carry the signature in the URL and sign no headers, so `Range` rides
  // unsigned and the HTTP cache applies — including to ranged (206) responses,
  // where Chromium's sparse entries serve cached bytes and fetch only gaps.
  // The caller's init passes through whole (headers, cache, signal).
  const presigned = await presignedS3UrlCached(config, url)
  return fetch(presigned, { ...init, method })
}

export function serializeRequestInit(
  init?: RequestInit,
): SerializedRequestInit | undefined {
  if (!init) {
    return undefined
  }

  return {
    cache: init.cache,
    credentials: init.credentials,
    headers: Array.from(new Headers(init.headers).entries()),
    integrity: init.integrity,
    keepalive: init.keepalive,
    method: init.method,
    mode: init.mode,
    redirect: init.redirect,
    referrer: init.referrer,
    referrerPolicy: init.referrerPolicy,
  }
}

export function deserializeRequestInit(
  init?: SerializedRequestInit,
): RequestInit | undefined {
  if (!init) {
    return undefined
  }

  return {
    cache: init.cache,
    credentials: init.credentials,
    headers: init.headers,
    integrity: init.integrity,
    keepalive: init.keepalive,
    method: init.method,
    mode: init.mode,
    redirect: init.redirect,
    referrer: init.referrer,
    referrerPolicy: init.referrerPolicy,
  }
}

export function isExpiredS3FetchConfig(config: S3FetchConfig): boolean {
  return Date.now() >= config.expiresAt
}

/**
 * Rotate credentials this far BEFORE they actually expire. A request signed at
 * `expiresAt - 1ms` still has to cross the network, and one that dies in flight
 * surfaces as an S3 403 from inside a decode worker — a confusing failure a
 * long way from its cause. The margin buys every in-flight request time to land
 * under the credentials it was signed with.
 */
export const S3_CREDENTIAL_REFRESH_SKEW_MS = 60_000

/**
 * Due for rotation — `isExpiredS3FetchConfig` plus the skew. This is the check
 * on the request hot path, so it stays a single `Date.now()` compare: no
 * allocation, and no await unless it actually returns true.
 */
export function isStaleS3FetchConfig(
  config: S3FetchConfig,
  now: number = Date.now(),
): boolean {
  return now >= config.expiresAt - S3_CREDENTIAL_REFRESH_SKEW_MS
}
