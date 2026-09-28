import { useEffect, useState } from "react";
import { openInBrowser } from "@/core/util/openInBrowser";
import {
  AuthSessionFragment,
  ListMailAccountsDocument,
  MailboxTreeDocument,
  StartOAuthLinkInput,
  useCancelOAuthLinkMutation,
  useCompleteOAuthLinkMutation,
  useStartOAuthLinkMutation,
} from "../api/graphql";
import { toastText } from "../errors";
import { announceOAuthLinked, onOAuthLinked } from "./linked";

export type OAuthLinkPhase = "idle" | "starting" | "waiting" | "completing" | "done" | "expired";

/**
 * One OAuth mailbox login. `begin` asks for a session and opens the provider
 * in the browser; the provider redirects to the coord relay, which opens the
 * callback page, which finishes it (and `announceOAuthLinked`s, so this hook
 * sees it). `complete` is the paste-the-redirect fallback. Nothing polls:
 * the session only changes when the user comes back.
 */
export const useOAuthLink = (onLinked: (account: { id: string; emailAddress: string }) => void) => {
  const [start] = useStartOAuthLinkMutation();
  const [cancelLink] = useCancelOAuthLinkMutation();
  const [completeLink] = useCompleteOAuthLinkMutation({ refetchQueries: [ListMailAccountsDocument, MailboxTreeDocument] });

  const [session, setSession] = useState<AuthSessionFragment | null>(null);
  const [phase, setPhase] = useState<OAuthLinkPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Finished from the callback page.
  useEffect(() => {
    if (!session) return;
    return onOAuthLinked((state, account) => {
      if (state !== session.state) return;
      setPhase("done");
      onLinked(account);
    });
  }, [session, onLinked]);

  // The countdown to `expiresAt`; past it the login cannot be finished.
  useEffect(() => {
    if (!session || phase !== "waiting") return;
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setPhase("expired");
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session, phase]);

  const begin = async (input: StartOAuthLinkInput) => {
    setError(null);
    setPhase("starting");
    try {
      const { data } = await start({ variables: { input } });
      const next = data?.startOAuthLink;
      if (!next) throw new Error("The server started no login");
      setSession(next);
      setPhase("waiting");
      openInBrowser(next.openUrl);
    } catch (e) {
      setError(toastText(e));
      setPhase("idle");
    }
  };

  const complete = async (code: string, state: string) => {
    setError(null);
    setPhase("completing");
    try {
      const { data } = await completeLink({ variables: { input: { code, state } } });
      const account = data?.completeOAuthLink;
      if (!account) throw new Error("The server returned no mailbox");
      setPhase("done");
      announceOAuthLinked(state, account);
      onLinked(account);
    } catch (e) {
      setError(toastText(e));
      setPhase("waiting");
    }
  };

  /** Drop the pending login (the dialog was closed or the user changed their mind). */
  const cancel = () => {
    if (session && phase !== "done") void cancelLink({ variables: { state: session.state } }).catch(() => undefined);
    setSession(null);
    setPhase("idle");
  };

  return { session, phase, error, secondsLeft, begin, complete, cancel, reopen: () => session && openInBrowser(session.openUrl) };
};
