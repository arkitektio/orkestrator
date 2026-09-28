import type { StoredArkitektSession } from "../session/record";
import { normalizeToken, shouldRefreshToken } from "./auth";

/**
 * Spending a refresh token safely when more than one window holds a copy.
 *
 * Popouts run the same renderer shell as the main window at the same origin,
 * so they share the persisted profile book — but each mounts its own provider
 * with its own in-memory copy of the session. lok rotates the refresh token on
 * every use and, on seeing an already-spent one, revokes the WHOLE chain (RFC
 * 9700 reuse detection). So the moment one window refreshes, every other
 * window's copy is a landmine: replaying it signs the user out everywhere,
 * including the next app launch.
 *
 * Two rules keep that from happening:
 *
 * 1. Every refresh runs under a cross-window lock keyed by the refresh CHAIN
 *    (its `client_id`), so two windows can never be in the token endpoint
 *    with the same credential. Keyed by the chain, not the profile id: a
 *    profile can be re-keyed while its refresh is in flight, a chain cannot.
 * 2. Inside the lock, the persisted book is consulted before the network: if
 *    another window already rotated this profile, its token is adopted and, if
 *    still fresh, nothing is sent at all.
 */

const LOCK_PREFIX = "arkitekt:refresh:";

export const refreshLockName = (profileId: string): string => `${LOCK_PREFIX}${profileId}`;

type LockManagerLike = {
  request: <R>(name: string, callback: () => Promise<R>) => Promise<R>;
};

const lockManager = (): LockManagerLike | null => {
  if (typeof navigator === "undefined") return null;
  const locks = (navigator as unknown as { locks?: LockManagerLike }).locks;
  return locks && typeof locks.request === "function" ? locks : null;
};

/** In-window queue per lock name, so callers in THIS window serialise even without Web Locks. */
const localTails = new Map<string, Promise<unknown>>();

const withLocalLock = <R>(name: string, fn: () => Promise<R>): Promise<R> => {
  const previous = localTails.get(name) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  const tail = run.catch(() => undefined).then(() => {
    if (localTails.get(name) === tail) localTails.delete(name);
  });
  localTails.set(name, tail);
  return run;
};

/**
 * Run `fn` while holding a lock of that name — exclusive across every window
 * of this origin (Web Locks) AND across callers within this window.
 *
 * The in-window queue is not redundant: React StrictMode runs the bootstrap
 * effect twice in development, and `TokenRotation` only coalesces the hourly
 * path, not bootstrap or a switch. Where Web Locks do not exist (node tests,
 * non-secure contexts) the in-window queue is all there is.
 */
export const withCrossWindowLock = async <R>(name: string, fn: () => Promise<R>): Promise<R> =>
  withLocalLock(name, () => {
    const locks = lockManager();
    if (!locks) return fn();
    return locks.request(name, fn);
  });

export type Reconciled = {
  session: StoredArkitektSession;
  /** `adopt` = another window already rotated this profile and its token is fresh. */
  action: "refresh" | "adopt";
};

/**
 * Which token to act on, given what we hold and what is persisted.
 *
 * A persisted refresh token that differs from ours means another window spent
 * ours; ours is dead and MUST NOT go over the wire. The persisted one is the
 * live chain — used as-is if it is still fresh, refreshed otherwise.
 */
export const reconcilePersistedSession = (
  held: StoredArkitektSession,
  persisted: StoredArkitektSession | null | undefined,
): Reconciled => {
  const persistedRt = persisted?.token.refresh_token;
  if (!persisted || !persistedRt || persistedRt === held.token.refresh_token) {
    return { session: held, action: "refresh" };
  }
  if (shouldRefreshToken(normalizeToken(persisted.token))) {
    return { session: persisted, action: "refresh" };
  }
  return { session: persisted, action: "adopt" };
};

export type RotateProfileSessionOptions = {
  profileId: string;
  /** The session this window currently holds for the profile. */
  held: StoredArkitektSession;
  /** The profile's session as persisted right now — read INSIDE the lock. */
  readPersisted: () => Promise<StoredArkitektSession | null>;
  /** The network round-trip. */
  refresh: (session: StoredArkitektSession) => Promise<StoredArkitektSession>;
  /** Write the outcome — also INSIDE the lock, so no window reads a stale book. */
  persist: (session: StoredArkitektSession) => Promise<void>;
  /**
   * Bringing a profile up (boot, switch) only needs a USABLE token, not a new
   * one: when the chain we would act on still has a fresh access token, use
   * it and send nothing. Without this every launch — and every popout —
   * spent a refresh. The hourly rotation never passes it: it runs because
   * the token is stale, or because the server just rejected it.
   */
  reuseFresh?: boolean;
};

export type RotateProfileSessionResult = {
  session: StoredArkitektSession;
  /** False when another window's fresher token was adopted without a round-trip. */
  refreshed: boolean;
};

/**
 * The one way to bring a profile's token forward: bootstrap, switch, and the
 * hourly rotation all go through here.
 */
export const rotateProfileSession = async ({
  profileId,
  held,
  readPersisted,
  refresh,
  persist,
  reuseFresh = false,
}: RotateProfileSessionOptions): Promise<RotateProfileSessionResult> =>
  withCrossWindowLock(refreshLockName(held.token.client_id ?? profileId), async () => {
    const persisted = await readPersisted().catch(() => null);
    const { session, action } = reconcilePersistedSession(held, persisted);

    const fresh = reuseFresh && !shouldRefreshToken(normalizeToken(session.token));
    if (action === "adopt" || fresh) {
      await persist(session);
      return { session, refreshed: false };
    }

    const next = await refresh(session);
    await persist(next);
    return { session: next, refreshed: true };
  });
