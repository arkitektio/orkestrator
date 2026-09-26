import { useCallback, useEffect, useRef, useState } from "react";
import {
  AuthFinish,
  AuthSessionFragment,
  ListBankAccountsDocument,
  ListBankConnectionsDocument,
  useCompleteBankLinkMutation,
  useCompleteScalableLinkMutation,
  useGetBankConnectionLazyQuery,
} from "../api/graphql";
import { authPhase, AuthPhase, keepPolling, LinkAnswer, stepInterval } from "./phase";

export type Connection = LinkAnswer & { id: string; accounts?: { id: string }[] };

/**
 * Drives one login, whichever way it finishes (`AuthSession.finish`):
 *
 * - POLL (Scalable): call `completeScalableLink(state)` every `interval`
 *   seconds; each call is one server step (DEVICE → MFA → ACTIVE).
 * - REDIRECT (Enable Banking): the bank sends the browser to the coord relay,
 *   which hands `code` and `state` to Orkestrator's `/bank/auth/callback`
 *   page. Meanwhile this re-reads the connection, so the dialog notices when
 *   that page (or `completeRedirect`, the paste fallback) finished it.
 *
 * Never two requests in flight; `retries` consecutive errors pause the loop.
 * `open` is how the session is obtained: a start, or `resumeLink`.
 */
export const useAuthSession = ({
  open,
  retries = 3,
}: {
  open: () => Promise<AuthSessionFragment | null | undefined>;
  retries?: number;
}) => {
  const [session, setSession] = useState<AuthSessionFragment | null>(null);
  const [answer, setAnswer] = useState<Connection | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [opening, setOpening] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  // Bumped after every step, whatever it returned, to arm the next one.
  const [attempt, setAttempt] = useState(0);
  const failures = useRef(0);

  const [completePoll] = useCompleteScalableLinkMutation();
  const [completeRedirectLink, { loading: completing }] = useCompleteBankLinkMutation({
    refetchQueries: [ListBankConnectionsDocument, ListBankAccountsDocument],
  });
  const [readConnection] = useGetBankConnectionLazyQuery({ fetchPolicy: "network-only" });

  const phase: AuthPhase | null = session ? authPhase(answer, session.expiresAt, now) : null;
  const polling = !!phase && keepPolling(phase) && !paused;

  const begin = useCallback(async () => {
    setError(null);
    setAnswer(null);
    setPaused(false);
    setOpening(true);
    failures.current = 0;
    try {
      const next = await open();
      if (!next) throw new Error("The server returned no login session");
      setSession(next);
      setAnswer(next.connection);
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
    if (!session || !polling) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [session, polling]);

  const state = session?.state;
  const finish = session?.finish;
  const connectionId = session?.connection.id;
  const delay = session ? stepInterval(session.finish, session.interval) * 1000 : 0;
  useEffect(() => {
    if (!state || !connectionId || !polling) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const next: Connection | undefined =
          finish === AuthFinish.Poll
            ? (await completePoll({ variables: { state } })).data?.completeScalableLink
            : (await readConnection({ variables: { id: connectionId } })).data?.bankConnection;
        if (cancelled) return;
        failures.current = 0;
        setError(null);
        if (next) setAnswer(next);
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
  }, [state, connectionId, finish, polling, delay, completePoll, readConnection, attempt, retries]);

  /** REDIRECT fallback: finish with the code and state from a pasted redirect. */
  const completeRedirect = useCallback(
    async (code: string, redirectState: string) => {
      try {
        const result = await completeRedirectLink({ variables: { input: { code, state: redirectState } } });
        const next = result.data?.completeBankLink;
        if (next) setAnswer(next);
        return next ?? null;
      } catch (e) {
        setError(e);
        return null;
      }
    },
    [completeRedirectLink],
  );

  return {
    session,
    phase,
    connection: answer,
    error,
    paused,
    opening,
    completing,
    begin,
    completeRedirect,
    resume: () => {
      failures.current = 0;
      setError(null);
      setPaused(false);
    },
    secondsLeft: session ? Math.max(0, Math.round((new Date(session.expiresAt).getTime() - now) / 1000)) : 0,
  };
};
