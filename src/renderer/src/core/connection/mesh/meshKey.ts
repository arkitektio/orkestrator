import { grantedMesh, MeshGrantSchema, type GrantedMesh } from "@/core/connection/arkitekt/fakts/meshGrant";

/**
 * A fresh mesh key for a node that is not logged in, without a new sign-in.
 *
 * lok mints one at `POST <base_url>meshkey/` (`/f/meshkey/`) for the client
 * the Bearer access token names, i.e. this computer in this membership. Like
 * the key a grant brings, it is one-shot, expires within 15 minutes, and a
 * newer key deletes the older one; it is never stored.
 *
 * The refusals each mean something different to the caller:
 *   401 `not_live`     — the login behind the token is gone; only a sign-in helps.
 *   403 `not_enrolled` — this membership is not on the mesh; nothing the app can do.
 *   409 `connected`    — lok sees this computer's node connected; try again later.
 *   429 `throttled`    — asked too often; wait at least a minute.
 */
export type MeshKeyOutcome =
  | { kind: "key"; mesh: GrantedMesh }
  | { kind: "not-live" }
  | { kind: "not-enrolled" }
  | { kind: "connected" }
  | { kind: "throttled"; retryAfterMs: number }
  | { kind: "failed"; error: string };

export const MESH_KEY_THROTTLE_MS = 60_000;

/** `Retry-After` in seconds (or an HTTP date), never under a minute. */
const retryAfter = (header: string | null, now: number): number => {
  if (!header) return MESH_KEY_THROTTLE_MS;
  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - now;
  return Number.isFinite(ms) ? Math.max(MESH_KEY_THROTTLE_MS, ms) : MESH_KEY_THROTTLE_MS;
};

/** The key block, top level or under `mesh` / `auth` as on the token response. */
const keyFrom = (body: unknown): GrantedMesh | undefined => {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  for (const candidate of [record, record.mesh, record.auth]) {
    const parsed = MeshGrantSchema.safeParse(candidate);
    const mesh = parsed.success ? grantedMesh(parsed.data) : undefined;
    if (mesh) return mesh;
  }
  return undefined;
};

export const requestMeshKey = async (
  baseUrl: string,
  accessToken: string,
  { timeoutMs = 10_000, now = Date.now }: { timeoutMs?: number; now?: () => number } = {},
): Promise<MeshKeyOutcome> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}meshkey/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: "{}",
      signal: controller.signal,
    });
    switch (response.status) {
      case 401:
        return { kind: "not-live" };
      case 403:
        return { kind: "not-enrolled" };
      case 409:
        return { kind: "connected" };
      case 429:
        return { kind: "throttled", retryAfterMs: retryAfter(response.headers.get("Retry-After"), now()) };
    }
    if (!response.ok) return { kind: "failed", error: `meshkey: HTTP ${response.status}` };
    const mesh = keyFrom(await response.json().catch(() => undefined));
    return mesh ? { kind: "key", mesh } : { kind: "failed", error: "meshkey: the answer carried no key" };
  } catch (error) {
    return { kind: "failed", error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
};

/* ─────────────────────────────── pacing ───────────────────────────────── */

/** How often one window may ask, per mesh. Reset once the node runs. */
export type MeshKeyPacing = {
  /** Asks that did not end in a key (409, network), for the backoff. */
  misses: number;
  /** Keys fetched since the node last ran; a key the server keeps refusing is not asked for forever. */
  keys: number;
  /** Not before this time (epoch ms). */
  notBefore: number;
  /** Nothing more to ask until the node runs or the window signs in again. */
  stopped: boolean;
};

export const MESH_KEY_MAX_KEYS = 3;
/** A key needs a moment to turn into a running node; asking again sooner would delete it. */
export const MESH_KEY_SETTLE_MS = 2 * 60_000;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 10 * 60_000;

export const freshPacing = (): MeshKeyPacing => ({ misses: 0, keys: 0, notBefore: 0, stopped: false });

/** What one ask means for the next. */
export const paceAfter = (pacing: MeshKeyPacing, outcome: MeshKeyOutcome, now: number): MeshKeyPacing => {
  switch (outcome.kind) {
    case "key": {
      const keys = pacing.keys + 1;
      return { misses: 0, keys, notBefore: now + MESH_KEY_SETTLE_MS, stopped: keys >= MESH_KEY_MAX_KEYS };
    }
    case "not-live":
    case "not-enrolled":
      return { ...pacing, stopped: true };
    case "throttled":
      return { ...pacing, notBefore: now + outcome.retryAfterMs };
    case "connected":
    case "failed": {
      const misses = pacing.misses + 1;
      return { ...pacing, misses, notBefore: now + Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (misses - 1)) };
    }
  }
};
