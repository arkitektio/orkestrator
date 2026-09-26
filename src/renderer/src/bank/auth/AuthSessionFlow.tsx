import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { copyText } from "@/core/tabs/sharing/universalLink";
import { cn } from "@/core/util/utils";
import { Check, ChevronDown, Copy, ExternalLink, Loader2, Smartphone, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useBank } from "../api/funcs";
import {
  AuthFinish,
  AuthSessionFragment,
  ListBankAccountsDocument,
  ListBankConnectionsDocument,
} from "../api/graphql";
import { describeError, errorCodeOf, errorMessageOf } from "../errors";
import { openInBrowser } from "../openInBrowser";
import { parseRedirect } from "./redirect";
import { Connection, useAuthSession } from "./useAuthSession";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const Steps = ({ labels, current }: { labels: string[]; current: number }) => (
  <ol className="flex flex-wrap items-center gap-2 text-xs">
    {labels.map((label, i) => (
      <li key={label} className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
            i < current && "border-emerald-500 bg-emerald-500 text-white",
            i === current && "border-foreground",
            i > current && "text-muted-foreground",
          )}
        >
          {i < current ? <Check className="h-3 w-3" /> : i + 1}
        </span>
        <span className={cn(i === current ? "text-foreground" : "text-muted-foreground")}>{label}</span>
        {i < labels.length - 1 && <span className="h-px w-6 bg-border" />}
      </li>
    ))}
  </ol>
);

/** REDIRECT fallback: the browser did not come back, so paste where it ended up. */
const PasteFallback = ({
  onComplete,
  busy,
  redirectUrl,
}: {
  onComplete: (code: string, state: string) => void;
  busy: boolean;
  redirectUrl?: string | null;
}) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const parsed = parseRedirect(text);
  return (
    <div className="flex flex-col gap-2 text-xs">
      <button
        type="button"
        className="flex items-center gap-1 self-start text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
        Browser didn't bring you back?
      </button>
      {open && (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder={`${redirectUrl ?? "https://…/auth/callback/bank"}?code=…&state=…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && parsed && onComplete(parsed.code, parsed.state)}
            className="h-8 text-xs"
          />
          <Button size="sm" disabled={!parsed || busy} onClick={() => parsed && onComplete(parsed.code, parsed.state)}>
            Finish
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * One login, from open to ACTIVE, for any provider. What the user sees is
 * picked by the session's `finish`: a code to approve (POLL) or the bank's
 * consent page in the browser (REDIRECT). `open` obtains the session (a start
 * or `resumeLink`); `restart` starts a fresh one when it ran out.
 */
export const AuthSessionFlow = ({
  title,
  open,
  restart,
  onDone,
  header,
}: {
  title: string;
  open: () => Promise<AuthSessionFragment | null | undefined>;
  restart?: () => void;
  onDone: (connection: Connection) => void;
  header?: React.ReactNode;
}) => {
  const auth = useAuthSession({ open });
  const bank = useBank();
  const started = useRef(false);
  const finished = useRef(false);

  // Open on mount and send the user straight to the provider.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void auth.begin().then((session) => session && openInBrowser(session.openUrl));
  }, [auth.begin]);

  useEffect(() => {
    if (auth.phase?.kind !== "active" || !auth.connection || finished.current) return;
    finished.current = true;
    void bank.refetchQueries({ include: [ListBankConnectionsDocument, ListBankAccountsDocument] });
    const count = auth.connection.accounts?.length;
    toast.success(`${title} linked${count ? ` · ${count} accounts` : ""}`);
    onDone(auth.connection);
  }, [auth.phase?.kind, auth.connection]);

  const session = auth.session;
  const phase = auth.phase;
  const again = () => (restart ? restart() : auth.begin().then((s) => s && openInBrowser(s.openUrl)));

  if (!session) {
    const problem = auth.error ? describeError(errorCodeOf(auth.error), { message: errorMessageOf(auth.error) }) : null;
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{problem ? "The login could not be started." : "Starting the login…"}</DialogDescription>
        </DialogHeader>
        {problem ? (
          <div className="flex flex-col items-start gap-3 text-sm">
            <span className="text-destructive">{problem.text}</span>
            <Button size="sm" onClick={again} disabled={auth.opening}>
              Try again
            </Button>
          </div>
        ) : (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  if (phase?.kind === "expired" || phase?.kind === "failed") {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{phase.kind === "expired" ? "The login ran out" : "Login failed"}</DialogTitle>
          <DialogDescription>
            {phase.kind === "expired"
              ? "It was not finished in time. Start a new one."
              : describeError(auth.connection?.lastErrorCode, { message: phase.message }).text}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={again} disabled={auth.opening}>
            Start again
          </Button>
        </DialogFooter>
      </div>
    );
  }

  const poll = session.finish === AuthFinish.Poll;
  const labels = poll
    ? ["Approve the code", "Confirm on your phone", "Linked"]
    : ["Consent at the bank", "Linked"];
  const current = phase?.kind === "active" ? labels.length - 1 : phase?.kind === "mfa" ? 1 : 0;
  const problem = auth.error ? describeError(errorCodeOf(auth.error), { message: errorMessageOf(auth.error) }) : null;

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {header}
      </DialogHeader>
      <Steps labels={labels} current={current} />

      {poll && phase?.kind === "approve" && session.userCode && (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-5">
          <span className="text-xs text-muted-foreground">Check that the page shows this code, then approve it</span>
          <button
            type="button"
            className="group flex items-center gap-3 font-mono text-3xl font-semibold tracking-[0.25em]"
            onClick={async () => (await copyText(session.userCode!)) && toast.success("Code copied")}
            title="Copy the code"
          >
            {session.userCode}
            <Copy className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60" />
          </button>
          <Button variant="outline" size="sm" onClick={() => openInBrowser(session.openUrl)}>
            <ExternalLink className="h-4 w-4" /> Open login page
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">Code valid for {clock(auth.secondsLeft)}</span>
        </div>
      )}

      {!poll && phase?.kind === "approve" && (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-5 text-center">
          <span className="text-sm">Give consent on the bank's page in your browser.</span>
          <span className="text-xs text-muted-foreground">
            When you are done, the browser hands you back to Orkestrator and this finishes by itself.
          </span>
          <Button variant="outline" size="sm" onClick={() => openInBrowser(session.openUrl)}>
            <ExternalLink className="h-4 w-4" /> Open the bank again
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">Session valid for {clock(auth.secondsLeft)}</span>
        </div>
      )}

      {phase?.kind === "mfa" && (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-5 text-center">
          <Smartphone className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm">Approve the login in the app on your phone.</span>
        </div>
      )}

      {phase?.kind === "active" && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-5 text-center text-sm">
          <Check className="h-8 w-8 text-emerald-500" />
          Linked.
        </div>
      )}

      {!poll && phase?.kind === "approve" && (
        <PasteFallback
          busy={auth.completing}
          redirectUrl={session.redirectUrl}
          onComplete={(code, state) => void auth.completeRedirect(code, state)}
        />
      )}

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {auth.paused ? (
          <span className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> {problem?.text}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {auth.error ? "Retrying…" : "Waiting…"}
          </span>
        )}
        {auth.paused && (
          <Button size="sm" variant="outline" onClick={auth.resume}>
            Keep waiting
          </Button>
        )}
      </div>
    </div>
  );
};
