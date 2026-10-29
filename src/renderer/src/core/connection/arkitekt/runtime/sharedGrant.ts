import { withCrossWindowLock } from "./sharedRefresh";

/**
 * One media access grant per (service, profile, datalayer), shared by every
 * window and kept across launches until it expires.
 *
 * A presigned URL carries its credential, so it is only a stable HTTP cache
 * key while the grant is: a grant minted per window (or per launch) gave every
 * window its own URL for the same snapshot, and Chromium downloaded it again
 * in each. Stored in localStorage next to the profile book (which already
 * holds the refresh tokens) — these are short-lived, read-only media
 * credentials. Minting runs under a cross-window lock and re-reads first, so
 * two windows opening at once mint once.
 *
 * Storage that throws or is missing degrades to a grant per window, which is
 * what this replaced.
 */

const KEY_PREFIX = "arkitekt:mediagrant:";

/** Refresh this far before expiry, so a URL minted late still has time to be fetched. */
export const GRANT_REFRESH_SKEW_MS = 60_000;

export type SharedGrant = { expiresAt: number };

/**
 * `scope` names the object for services whose grants are per store or asset
 * (rekuest, dokuments) rather than one per session (mikro, kraph).
 */
export const mediaGrantKey = (service: string, profileId: string, datalayer: string, scope?: string): string =>
  `${KEY_PREFIX}${service}:${encodeURIComponent(profileId)}:${datalayer}` +
  (scope === undefined ? "" : `#${encodeURIComponent(scope)}`);

const storage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

const isUsable = (grant: SharedGrant | null | undefined, now: number): grant is SharedGrant =>
  !!grant && now < grant.expiresAt - GRANT_REFRESH_SKEW_MS;

const readStored = <G extends SharedGrant>(key: string): G | null => {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || typeof (parsed as SharedGrant).expiresAt !== "number") return null;
    return parsed as G;
  } catch {
    return null;
  }
};

/** The stored grant keys `matches` picks, read before any is removed. */
const storedKeys = (store: Storage, matches: (key: string) => boolean): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key && key.startsWith(KEY_PREFIX) && matches(key)) keys.push(key);
  }
  return keys;
};

/**
 * Per-object grants (one per store or asset) would otherwise pile up, so every
 * write first drops the stored grants that have expired.
 */
const pruneExpired = (store: Storage, now: number): void => {
  const expired = storedKeys(store, (key) => {
    const grant = readStored(key);
    return !grant || grant.expiresAt <= now;
  });
  for (const key of expired) store.removeItem(key);
};

const writeStored = (key: string, grant: SharedGrant): void => {
  try {
    const store = storage();
    if (!store) return;
    pruneExpired(store, Date.now());
    store.setItem(key, JSON.stringify(grant));
  } catch {
    // Quota or a blocked store: this window still has it in memory.
  }
};

/** This window's copy, so a hit costs a Map lookup rather than a JSON parse. */
const held = new Map<string, SharedGrant>();
const inFlight = new Map<string, Promise<SharedGrant>>();

/**
 * The grant stored under `key`, minting one with `mint` when none is usable.
 * `mint` must return the grant already stamped (`stampGrant`): its
 * `signedAt` / `expiresAt` are what every window signs with. `share: false`
 * keeps it in this window only (no profile to scope storage by).
 */
export const sharedGrant = <G extends SharedGrant>(
  key: string,
  mint: () => Promise<G>,
  { share = true }: { share?: boolean } = {},
): Promise<G> => {
  const now = Date.now();
  const mine = held.get(key) as G | undefined;
  if (isUsable(mine, now)) return Promise.resolve(mine);

  const stored = share ? readStored<G>(key) : null;
  if (isUsable(stored, now)) {
    held.set(key, stored);
    return Promise.resolve(stored);
  }

  const pending = inFlight.get(key) as Promise<G> | undefined;
  if (pending) return pending;

  const run = (
    share
      ? withCrossWindowLock(key, async () => {
          // Another window may have minted while we waited for the lock.
          const fresh = readStored<G>(key);
          if (isUsable(fresh, Date.now())) return fresh;
          const minted = await mint();
          writeStored(key, minted);
          return minted;
        })
      : mint()
  )
    .then((grant) => {
      held.set(key, grant);
      return grant;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, run);
  return run;
};

/**
 * Drop the stored grants of `profileId` (sign out, remove), or of every
 * profile when omitted (forget all). Other windows notice on their next miss;
 * their in-memory copy lapses with the grant.
 */
export const forgetMediaGrants = (profileId?: string): void => {
  const wanted = profileId === undefined ? null : encodeURIComponent(profileId);
  // `<service>:<profile>:<datalayer>` — the datalayer is a URL with colons of
  // its own, so the profile is the second field, not a substring search.
  const matches = (key: string) => {
    if (!key.startsWith(KEY_PREFIX)) return false;
    if (wanted === null) return true;
    const rest = key.slice(KEY_PREFIX.length);
    const start = rest.indexOf(":") + 1;
    const end = rest.indexOf(":", start);
    return start > 0 && end > start && rest.slice(start, end) === wanted;
  };
  for (const key of [...held.keys()]) if (matches(key)) held.delete(key);
  try {
    const store = storage();
    if (!store) return;
    for (const key of storedKeys(store, matches)) store.removeItem(key);
  } catch {
    // Nothing to clean when storage is unavailable.
  }
};
