import { Spinner } from "@/core/ui/spinner";
import { PageLayout } from "@/core/layout/PageLayout";
import { Button } from "@/core/ui/button";
import { DialogButton } from "@/core/ui/dialog-button";
import { Check, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ListMailAccountsDocument, MailboxTreeDocument, useCompleteOAuthLinkMutation } from "../api/graphql";
import { announceOAuthLinked } from "../auth/linked";
import { describeError, errorCodeOf, errorMessageOf } from "../errors";
import { MailAccount } from "../linkers";

/**
 * Where an OAuth mailbox login comes back. The provider sends the browser to
 * the coord server's public relay (`/auth/callback/kuvert`), which opens
 * `orkestrator://kuvert/auth/callback?code&state` — this page, in a tab. It
 * finishes the link with one `completeOAuthLink` and moves on to the mailbox.
 * A dialog still waiting on the same login notices the mailbox appear.
 */
const AuthCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get("code");
  const state = params.get("state");
  // The provider's own refusal (the user cancelled the consent, …).
  const providerError = params.get("error_description") ?? params.get("error");

  const [complete] = useCompleteOAuthLinkMutation({ refetchQueries: [ListMailAccountsDocument, MailboxTreeDocument] });
  const [result, setResult] = useState<
    { kind: "working" } | { kind: "done"; name: string } | { kind: "failed"; text: string }
  >({ kind: "working" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (providerError) {
      setResult({ kind: "failed", text: `The sign-in was stopped: ${providerError}` });
      return;
    }
    if (!code || !state) {
      setResult({ kind: "failed", text: "This link has no sign-in code in it." });
      return;
    }
    complete({ variables: { input: { code, state } } })
      .then((r) => {
        const account = r.data?.completeOAuthLink;
        if (!account) throw new Error("The server returned no mailbox");
        setResult({ kind: "done", name: account.emailAddress });
        announceOAuthLinked(state, account);
        navigate(MailAccount.linkBuilder(account.id), { replace: true });
      })
      .catch((e) =>
        setResult({ kind: "failed", text: describeError(errorCodeOf(e), { message: errorMessageOf(e) }).text }),
      );
  }, [code, state, providerError]);

  return (
    <PageLayout title="Mailbox sign-in">
      <div className="flex h-full flex-col items-center justify-center gap-4 p-12 text-center">
        {result.kind === "working" && (
          <>
            <Spinner className="size-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Finishing the sign-in…</span>
          </>
        )}
        {result.kind === "done" && (
          <>
            <Check className="h-8 w-8 text-primary" />
            <span className="text-sm">{result.name} linked.</span>
          </>
        )}
        {result.kind === "failed" && (
          <>
            <TriangleAlert className="h-8 w-8 text-destructive" />
            <span className="max-w-md text-sm">{result.text}</span>
            <div className="flex gap-2">
              <DialogButton name="kuvertlink" dialogProps={{}} options={{ size: "medium" }}>
                Start again
              </DialogButton>
              <Button variant="ghost" onClick={() => navigate("/kuvert/accounts")}>
                Mailboxes
              </Button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default AuthCallbackPage;
