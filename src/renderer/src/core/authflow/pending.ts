/**
 * The logins this app started and has not seen finish, by `state`. In
 * localStorage, so the callback page recognises a redirect whichever window
 * it lands in, and after a restart. A redirect whose state is not in here was
 * not started on this device: the callback page asks before finishing it.
 */
export type PendingAuth = {
  namespace: string;
  /** The profile it was started on; its `state` means nothing to another server. */
  profile: string | null;
  expiresAt: number;
};

const KEY = "orkestrator.authflow.pending";
// A login past its deadline may still be at a later step; keep it a while.
const GRACE = 60 * 60 * 1000;

const read = (now: number): Record<string, PendingAuth> => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, PendingAuth>;
    return Object.fromEntries(Object.entries(all).filter(([, entry]) => entry.expiresAt + GRACE > now));
  } catch {
    return {};
  }
};

const write = (all: Record<string, PendingAuth>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Without storage every redirect is simply asked about.
  }
};

export const rememberPending = (state: string, entry: PendingAuth, now: number = Date.now()) =>
  write({ ...read(now), [state]: entry });

export const findPending = (state: string, now: number = Date.now()): PendingAuth | null => read(now)[state] ?? null;

export const forgetPending = (state: string, now: number = Date.now()) => {
  const { [state]: _gone, ...rest } = read(now);
  write(rest);
};
