import { useCallback, useEffect, useRef, useState } from "react";
import { announceAuthUpdate, onAuthUpdate } from "./announce";
import { authPhase, AuthPhase, keepWaiting, stepInterval } from "./phase";
import type { AuthCompletion, AuthSession, AuthUpdate } from "./types";

/** The requests a login needs once started, already bound to a client. */
export type AuthDriver = {
  complete: (input: AuthCompletion) => Promise<AuthUpdate>;
  read?: (session: AuthSession) => Promise<AuthUpdate | null>;
  cancel?: (session: AuthSession) => Promise<void>;
};

/**
 * Drives one login, whichever way it finishes (`AuthSession.finish`):
 *
 * - POLL: call `complete(state)` every `interval` seconds; each call is one
 *   server step (code → second factor → DONE).
 * - REDIRECT: the provider sends the browser to the relay, which hands `code`
 *   and `state` to the host's callback page. That page announces the result
 *   (`announce.ts`); meanwhile this re-reads the session as a safety net.
 *   `completeRedirect` is the paste fallback.
 *
 * Never two requests in flight; `retries` consecutive errors pause the loop.
 * `open` is how the session is obtained: the module's start, or a resume.
 * `driver` must keep its identity between renders.
 */
export const useAuthSession = ({
  open,
  driver,
  retries = 3,
}: {
  open: () => Promise<AuthSession | null | undefined>;
  driver: AuthDriver;
  retries?: number;
}) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [opening, setOpening] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  // Bumped after every step, whatever it returned, to arm the next one.
  const [attempt, setAttempt] = useState(0);
  const failures = useRef(0);
  const latest = useRef(session);
  latest.current = session;

  const merge = useCallback((update: AuthUpdate | null | undefined) => {
    if (update) setSession((current) => (current ? { ...current, ...update } : current));
  }, []);

  const phase: AuthPhase | null = session ? authPhase(session, now) : null;
  const waiting = !!phase && keepWaiting(phase) && !paused;

  const begin = useCallback(async () => {
    setError(null);
    setPaused(false);
    setOpening(true);
    failures.current = 0;
    try {
      const next = await open();
      if (!next) throw new Error("The server returned no login session");
      setSession(next);
      setNow(Date.now());
      return next;
    } catch (e) {
      setError(e);
      return null;
    } finally {
      setOpening(false);
    }
  }, [open]);

  // The countdown, so an unfinished session visibly runs out.
  useEffect(() => {
    if (!session || !waiting) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [session, waiting]);

  const state = session?.state;
  const finish = session?.finish;
  const delay = session ? stepInterval(session.finish, session.interval) * 1000 : 0;

  // Finished elsewhere: the callback page, in this window or another.
  useEffect(() => (state ? onAuthUpdate(state, merge) : undefined), [state, merge]);

  useEffect(() => {
    if (!state || !waiting) return;
    if (finish !== "POLL" && !driver.read) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const next =
          finish === "POLL"
            ? await driver.complete({ state })
            : latest.current
              ? await driver.read!(latest.current)
              : null;
        if (cancelled) return;
        failures.current = 0;
        setError(null);
        merge(next);
      } catch (e) {
        if (cancelled) return;
        failures.current += 1;
        setError(e);
        if (failures.current >= retries) setPaused(true);
      }
      setNow(Date.now());
      setAttempt((n) => n + 1);
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state, finish, waiting, delay, driver, merge, attempt, retries]);

  /** REDIRECT fallback: finish with the code and state from a pasted redirect. */
  const completeRedirect = useCallback(
    async (code: string, redirectState: string) => {
      setCompleting(true);
      try {
        const update = await driver.complete({ state: redirectState, code });
        setError(null);
        merge(update);
        announceAuthUpdate(redirectState, update);
        return update;
      } catch (e) {
        setError(e);
        return null;
      } finally {
        setCompleting(false);
      }
    },
    [driver, merge],
  );

  /** Give the login up: drop it on the server (when it can be) and forget it here. */
  const cancel = useCallback(() => {
    const current = latest.current;
    if (current && keepWaiting(authPhase(current))) void driver.cancel?.(current).catch(() => undefined);
    setSession(null);
    setError(null);
  }, [driver]);

  return {
    session,
    phase,
    error,
    paused,
    opening,
    completing,
    begin,
    completeRedirect,
    cancel,
    resume: () => {
      failures.current = 0;
      setError(null);
      setPaused(false);
    },
    secondsLeft: session ? Math.max(0, Math.round((new Date(session.expiresAt).getTime() - now) / 1000)) : 0,
  };
};
