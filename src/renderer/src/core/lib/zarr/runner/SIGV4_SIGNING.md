# SigV4 signing, and the ways it fails silently

Everything in `s3-request.ts`. Read this before changing how a request is built,
and read it *first* if you are staring at a 403 — a signing mistake does not
look like a signing mistake. It comes back as a bare `403 Forbidden` with a
generic body, and the thing it blames (your credentials) is usually fine.

## The one contract

> **The bytes on the wire must be the bytes that were signed.**

SigV4 does not sign a request object. It signs a *string* — the canonical
request — built from the method, the URI, the query, and a chosen set of
headers. The server rebuilds that same string from what it **receives** and
re-computes the signature. Any byte that differs between what we hashed and what
arrived is a `SignatureDoesNotMatch`, and the error names none of them.

**GETs are PRESIGNED (query auth)** — see "Presigned GETs and the HTTP cache"
below. Their canonical request signs exactly one header, `host`; the entire
credential story rides in `X-Amz-*` query parameters, and `Range` is an
ordinary unsigned header.

The legacy header-signed path (kept for any future non-GET) signs five headers:

```
host;range;x-amz-content-sha256;x-amz-date;x-amz-security-token
```

`range` being in that list is the whole reason for Trap 1 below — and the
reason GETs moved to presigning. Anything the browser adds afterwards
(`Origin`, `Sec-*`, `If-None-Match`, `Accept-Encoding`) is *not* signed and is
correctly ignored by the server — verified directly, see "Ruled out" below.

---

## Presigned GETs and the HTTP cache

Every GET is presigned: the SigV4 signature is computed over the method, the
canonical URI, the `X-Amz-*` query parameters, and the single header `host`,
then appended to the URL as `X-Amz-Signature`. Nothing else about the request
is signed.

Two things fall out of that, and they are the point:

1. **Trap 1 is retired for GETs — and inverted into a feature.** With `Range`
   unsigned, Chromium narrowing a ranged request against its sparse 206 cache
   entry no longer breaks a signature; it serves the cached bytes and fetches
   only the gap. Ranged shard reads (inner chunks, coalesced runs, shard
   indexes) therefore participate in the HTTP cache — memory and disk — which
   the `no-store` opt-out had denied them entirely. Header-signed whole-object
   GETs were, despite appearances, not cached either: they carried an
   `Authorization` header, which RFC 9111 makes uncacheable unless the response
   explicitly allows it, and MinIO sends no `Cache-Control`.

2. **The presigned URL IS the cache key**, so the same object must presign to
   the same URL everywhere. `X-Amz-Date` is therefore pinned to the UTC hour
   floor — deterministic across the main thread and every worker — with
   `X-Amz-Expires` covering the credential's remaining lifetime from that
   pinned date (the session token bounds real validity server-side). A fresh
   date per request would give every fetch a private cache entry and cache
   nothing. Worst case, an hour boundary rotates the key.

The one contract extends to the query: **the wire query string is the exact
canonical query string** (RFC-3986-encoded pairs, byte-order-sorted by encoded
key) with `X-Amz-Signature` appended — built by hand, never re-serialized
through `URLSearchParams`, whose encoding differs. This is Trap 2's rule
applied to a second URL component.

Presigned URLs are memoized per (credential fingerprint, hour, object) — one
signing round per object per credential window instead of two or three
`crypto.subtle` round trips per request. Trap 3's rule applies: the memo key
carries the access key, the secret's fingerprint, the session token's
fingerprint, region, and the grant's expiry.

**An empty session token must be OMITTED from the query.** The header path
signed and sent an empty `x-amz-security-token` and MinIO accepted it (see
"Ruled out"); a presigned URL carrying an empty `X-Amz-Security-Token`
parameter is rejected with a 403 — verified against the live deployment. An
empty token is what the datalayer's static-credentials fallback issues, so
this is exactly the degraded mode that must keep working.

Covered by `s3-request.test.ts` → `describe("presigned query auth")`,
`describe("ranged reads")`, and `describe("HTTP cache participation")`.

---

## Trap 1 — the browser cache rewrites a signed header

**This one cost days.** It presents as a credentials error and is a caching bug.

`Range` is a signed header, and Chromium is allowed to modify it *after* we sign
and *before* it leaves the process. It stores a `206` as a **sparse cache
entry**: it remembers which byte ranges of an object it already holds. When a
later request overlaps what is cached, it narrows the `Range` on the wire to
just the bytes it is missing.

That is exactly the fabriks read pattern. hyparquet reads the Parquet **footer**
first — the tail of the object — then reads a row group that runs to EOF. The
second read overlaps the cached tail:

```
object size           10534069 bytes
footer read (cached)  the last ~5859 bytes
row-group read
  signed              range:bytes=10009781-10534068     ← to EOF, what we hashed
  actually sent       Range: bytes=10009781-10528209    ← narrowed by the cache
                                            ^^^^^^^^ stops where the cache begins
```

MinIO canonicalizes `bytes=10009781-10528209`, we signed
`bytes=10009781-10534068`, and the signatures cannot match. Forever — it is
deterministic once the footer is cached, and the cache is **on disk**, so it
survives an app restart, a Vite cache clear, and a full rebuild.

### The fix, then and now

**Now:** GETs are presigned (see "Presigned GETs and the HTTP cache" above), so
`Range` is not signed and the narrowing is harmless — desirable, even. The trap
as described can only bite the header-signed path again if a non-GET ever
carries a header the browser may rewrite.

**Historically:** `signRequest` set `cache: 'no-store'` on any request carrying
a `Range`, opting it out of the cache doing the rewriting — at the price of no
HTTP caching for any ranged read. That guard still exists on the header-signed
(non-GET) path, and a caller that chose its own `cache` mode is respected
throughout.

Covered by `s3-request.test.ts` → `describe("HTTP cache participation")`.

### Why it hid for so long

Every diagnostic that does not run *inside the browser* passes:

| probe | result |
|---|---|
| `curl` / Node with the same key, range, and credentials | **206** |
| the repo's own `fetchS3Path` from Vitest, live server | **206** |
| the app's exact grant, signed by hand | **206** |
| the same request **from the renderer** | **403** |

Node has no HTTP cache, so it sends the `Range` it was given. Only Chromium
rewrites it. Reproducing outside the browser proves nothing here.

The tell, if you ever see it again: **every Range-less request succeeds and
every ranged request to one object fails.** Zarr chunks, media, and parquet PUTs
kept working throughout, because none of them carry a `Range`.

### How it was finally caught

Dump the canonical request from the client and diff it against what the server
received. Nothing else distinguishes "wrong secret" from "rewritten header",
because both produce a byte-identical error.

---

## Trap 2 — reserved characters in the key

`URL` leaves sub-delimiters (`=`, `+`, `,`, `:`, `@`) literal in `pathname`, but
SigV4 requires every byte outside the unreserved set percent-encoded.

`strictlyEncodedPath` encodes each segment, and — critically —
`normalizeWirePath` rewrites the **outgoing URL** into that same form before the
fetch. Encoding only the canonical form is worse than not encoding at all: our
side is self-consistent, the server canonicalizes the literal it received, and
they disagree.

Invisible for as long as every signed path was a zarr chunk (`c/0/0/0`,
`zarr.json` — unreserved throughout). A hive-partitioned prefix
(`level=0/part-00000.parquet`) hits it on the very first read.

> The deployment has since moved to non-hive `level0/`, so this no longer fires
> in practice. The encoding stays: it is correct for any key, and a key with a
> `+` or a space would hit it again.

---

## Trap 3 — the signing-key memo must include the secret

Deriving a SigV4 signing key is four sequential HMACs, so it is memoized per
`(accessKey, secretFingerprint, dateStamp, region)`.

The fingerprint is not decoration. It is tempting to assume the access key
identifies the credential set — a rotation issues a new access key alongside the
secret — but a datalayer that falls back to **static** credentials when STS is
unavailable hands out grant after grant under **one** access key while the
secret behind it changes. Keyed on the access key alone, the first grant's
signing key is reused for every later one: `Credential=` on the wire is current,
the HMAC behind it is stale, and nothing recovers it — refreshing the grant
re-derives nothing, because the memo never sees a new key.

Fingerprinted (FNV-1a, twice, 64 bits) rather than used directly so the secret
is not sitting in a `Map` key. A collision degrades to the bug above, not to
anything unsafe.

Covered by `describe("signing-key cache")`.

---

## Diagnosing a 403

**The response body is the first thing to get, and it is not in the console** —
`fabriksStore.fetch` throws `${status} ${statusText}` and drops the XML. Read it
from DevTools → Network → Response, or trace the server:

```bash
docker exec next-minio-1 sh -c \
  'mc alias set local http://localhost:9000 <root-user> <root-pass> >/dev/null;
   mc admin trace --verbose --errors local'
```

`--verbose` prints every request header — the access key, the signed-header
list, the `Range` **as received**, and the error body. That last point is what
makes it worth more than the browser: it shows the server's side of the
disagreement.

Pipe carefully: `mc admin trace | grep … > file` **block-buffers** and will
leave you with an empty file. Redirect raw, or use `grep --line-buffered`.

### Read the error code — it partitions the causes

| code | meaning |
|---|---|
| `SignatureDoesNotMatch` | the session was **found** and its secret loaded; the canonical request disagrees. Look at what was signed vs what arrived. |
| `InvalidTokenId` | the session does not exist server-side. The credential is dead, not wrong. |
| `AccessDenied` | credentials fine, policy refuses. Also what MinIO returns for a missing key when the policy does not grant `ListBucket`. |
| `NoSuchKey` | the key is genuinely absent. |

The difference between the first two is the useful one: `SignatureDoesNotMatch`
**proves the credentials reached the server intact**, which retires the entire
"the grant is broken" family of hypotheses in one step.

### Offline verification

Given a canonical request and a secret you can recompute the signature without
touching the network, and compare it to the one on the wire. If they match, the
client signed what it meant to and the wire was altered in transit — go looking
for a rewriter. If they differ, the inputs differ; bisect them.

---

## Ruled out — do not re-investigate

Each of these was tested against the live deployment and is **not** a cause:

- **The proxy (Caddy).** Every successful probe went through the same route.
  `Host` is preserved end to end.
- **CORS / the preflight.** A failed preflight means the GET is never sent; if
  the server is answering, the preflight passed.
- **Browser-added headers.** `Origin`, `Sec-*`, `Accept-Encoding: identity` are
  unsigned and ignored. `If-None-Match` / `If-Modified-Since` produce a `304`,
  never a 403.
- **An empty `x-amz-security-token`.** Signed and sent empty; accepted.
- **`+` or `/` in the secret.** Base64-ish secrets survive the GraphQL round
  trip untouched. (Mangling one *does* reproduce the error exactly — so it
  remains worth a glance, just not the cause here.)
- **Multipart-uploaded objects.** A ranged GET against one is fine.
- **Clock skew.** Would be `RequestTimeTooSkewed`.

---

## Server-side notes (MinIO)

Two things about the deployment that shaped the client:

**`GetSessionToken` does not exist in MinIO.** It answers
`InvalidParameterValue: Unsupported action GetSessionToken`. MinIO implements
`AssumeRole` and the federated variants only. A datalayer that calls
`get_session_token` and swallows the failure silently issues its **static**
credentials to every client — permanent keys, empty session token, no log line.
Setting `DATALAYER.role_arn` forces the working `AssumeRole` path; MinIO ignores
the ARN's value when no role policy is configured, so any ARN-shaped string
does, and the session is scoped by the inline policy alone.

**Concurrent `AssumeRole` drops sessions.** Minting nine grants at once
reproducibly leaves about one that is well-formed and coherent — the access key
matches its own token's `accessKey` claim — but was never persisted, and fails
`InvalidTokenId` permanently. Relevant because a 403 retry storm mints grants in
bursts. Serialise or retry grant creation; do not assume a returned credential
is live.

---

## Rules for changing this file

1. **Never sign a header the transport may rewrite** without opting out of the
   layer that rewrites it. `range` is the known case; treat any conditional or
   negotiated header the same way.
2. **Keep `normalizeWirePath` next to `canonicalUri`.** They must produce the
   same bytes. Changing one alone is a silent 403.
3. **Anything that identifies a credential belongs in the memo key.** Access key
   alone is not an identity.
4. **Preserve the caller's `init`.** `signRequest` spreads it; a field dropped
   here (`cache`, `signal`) is a behaviour change nothing will catch.
5. Add a test. Every trap above has one, and each exists because the failure it
   guards is indistinguishable from a credentials problem at runtime.
