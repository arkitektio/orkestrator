import { PageLayout } from "@/core/layout/PageLayout";
import { Button } from "@/core/ui/button";
import { DialogButton } from "@/core/ui/dialog-button";
import { BankConnection } from "@/bank/linkers";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ListBankAccountsDocument,
  ListBankConnectionsDocument,
  useCompleteBankLinkMutation,
} from "../api/graphql";
import { describeError, errorCodeOf, errorMessageOf } from "../errors";

/**
 * Where a REDIRECT login comes back. The bank sends the browser to the coord
 * server's public relay (`/auth/callback/bank`), which opens
 * `orkestrator://bank/auth/callback?code&state` — this page, in a tab. It
 * finishes the link with one `completeBankLink` and moves on to the connection.
 * A dialog still waiting on the same login notices on its next re-read.
 */
const AuthCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get("code");
  const state = params.get("state");
  // The provider's own refusal (the user cancelled at the bank, …).
  const providerError = params.get("error_description") ?? params.get("error");

  const [complete] = useCompleteBankLinkMutation({
    refetchQueries: [ListBankConnectionsDocument, ListBankAccountsDocument],
  });
  const [result, setResult] = useState<
    { kind: "working" } | { kind: "done"; name: string } | { kind: "failed"; text: string }
  >({ kind: "working" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (providerError) {
      setResult({ kind: "failed", text: `The bank stopped the login: ${providerError}` });
      return;
    }
    if (!code || !state) {
      setResult({ kind: "failed", text: "This link has no login code in it." });
      return;
    }
    complete({ variables: { input: { code, state } } })
      .then((r) => {
        const connection = r.data?.completeBankLink;
        if (!connection) throw new Error("The server returned no connection");
        setResult({ kind: "done", name: connection.aspspName });
        navigate(BankConnection.linkBuilder(connection.id), { replace: true });
      })
      .catch((e) => setResult({ kind: "failed", text: describeError(errorCodeOf(e), { message: errorMessageOf(e) }).text }));
  }, [code, state, providerError]);

  return (
    <PageLayout title="Bank login">
      <div className="flex h-full flex-col items-center justify-center gap-4 p-12 text-center">
        {result.kind === "working" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Finishing the bank login…</span>
          </>
        )}
        {result.kind === "done" && (
          <>
            <Check className="h-8 w-8 text-emerald-500" />
            <span className="text-sm">{result.name} linked.</span>
          </>
        )}
        {result.kind === "failed" && (
          <>
            <TriangleAlert className="h-8 w-8 text-amber-500" />
            <span className="max-w-md text-sm">{result.text}</span>
            <div className="flex gap-2">
              <DialogButton name="banklink" dialogProps={{}} options={{ size: "medium" }}>
                Start again
              </DialogButton>
              <Button variant="ghost" onClick={() => navigate("/bank/connections")}>
                Connections
              </Button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default AuthCallbackPage;
