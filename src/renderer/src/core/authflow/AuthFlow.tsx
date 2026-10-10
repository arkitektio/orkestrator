import { toast } from "@/core/notify";
import { copyText } from "@/core/tabs/sharing/universalLink";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { cn } from "@/core/util/utils";
import { Check, ChevronDown, Copy, ExternalLink, Loader2, Smartphone, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { parseRedirect } from "./redirect";
import type { AuthSession } from "./types";
import { AuthFlowState, useAuthFlow } from "./useAuthFlow";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** What the user is asked for at a step the server names; the name itself otherwise. */
const STEP_TEXT: Record<string, string> = {
  MFA: "Approve the login in the app on your phone.",
};

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
            placeholder={`${redirectUrl ?? "https://…/auth/callback"}?code=…&state=…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && parsed && onComplete(parsed.code, parsed.state)}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            disabled={!parsed || busy}
            onClick={() => parsed && onComplete(parsed.code, parsed.state)}
          >
            Finish
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * A started login, from the provider's page to DONE, without any chrome
 * around it: what the user sees is picked by the session's `finish` (a code
 * to approve, or the provider's page in the browser). Renders nothing before
 * there is a session. `onRestart` starts a fresh one when it ran out.
 */
export const AuthFlowPanel = ({ auth, onRestart }: { auth: AuthFlowState; onRestart: () => void }) => {
  const session = auth.session;
  const phase = auth.phase;
  if (!session || !phase) return null;

  if (phase.kind === "expired" || phase.kind === "failed" || phase.kind === "cancelled") {
    return (
      <div className="flex flex-col items-start gap-3 text-sm">
        <span className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
          {phase.kind === "expired"
            ? "The login was not finished in time."
            : phase.kind === "cancelled"
              ? "The login was cancelled."
              : phase.message}
        </span>
        <Button type="button" size="sm" onClick={onRestart} disabled={auth.opening}>
          Start again
        </Button>
      </div>
    );
  }

  const poll = session.finish === "POLL";
  const labels = poll ? ["Approve the code", "Confirm", "Linked"] : ["Sign in in the browser", "Linked"];
  const current = phase.kind === "done" ? labels.length - 1 : phase.kind === "step" ? 1 : 0;

  return (
    <div className="flex flex-col gap-5">
      <Steps labels={labels} current={current} />

      {poll && phase.kind === "approve" && session.userCode && (
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
          <Button type="button" variant="outline" size="sm" onClick={auth.reopen}>
            <ExternalLink className="h-4 w-4" /> Open login page
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">Code valid for {clock(auth.secondsLeft)}</span>
        </div>
      )}

      {!poll && phase.kind === "approve" && (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-5 text-center">
          <span className="text-sm">Finish signing in on the provider's page in your browser.</span>
          <span className="text-xs text-muted-foreground">
            When you are done, the browser hands you back to Orkestrator and this finishes by itself.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={auth.reopen}>
            <ExternalLink className="h-4 w-4" /> Open again
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">Valid for {clock(auth.secondsLeft)}</span>
        </div>
      )}

      {phase.kind === "step" && (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-5 text-center">
          <Smartphone className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm">{STEP_TEXT[phase.step] ?? phase.step}</span>
        </div>
      )}

      {phase.kind === "done" && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-5 text-center text-sm">
          <Check className="h-8 w-8 text-emerald-500" />
          Linked.
        </div>
      )}

      {!poll && phase.kind === "approve" && (
        <PasteFallback
          busy={auth.completing}
          redirectUrl={session.redirectUrl}
          onComplete={(code, state) => void auth.completeRedirect(code, state)}
        />
      )}

      {phase.kind !== "done" && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          {auth.paused || (auth.problem && !poll) ? (
            <span className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> {auth.problem}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {auth.problem ? "Retrying…" : "Waiting…"}
            </span>
          )}
          {auth.paused && (
            <Button type="button" size="sm" variant="outline" onClick={auth.resume}>
              Keep waiting
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * One login as a dialog's content: opens on mount and sends the user straight
 * to the provider. `open` obtains the session (the module's start or resume
 * mutation, mapped to an `AuthSession`); `restart` starts over differently
 * than by opening again (back to a picker).
 */
export const AuthFlow = ({
  flow,
  title,
  open,
  restart,
  onDone,
  header,
}: {
  flow: string;
  title: string;
  open: () => Promise<AuthSession | null | undefined>;
  restart?: () => void;
  onDone: (session: AuthSession) => void;
  header?: React.ReactNode;
}) => {
  const auth = useAuthFlow({
    flow,
    open,
    onDone: (session) => {
      toast.success(`${session.result?.label ?? title} linked`);
      onDone(session);
    },
  });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void auth.begin();
  }, [auth.begin]);

  const again = () => (restart ? restart() : void auth.begin());

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {auth.session ? (
          header
        ) : (
          <DialogDescription>{auth.problem ? "The login could not be started." : "Starting the login…"}</DialogDescription>
        )}
      </DialogHeader>
      {auth.session ? (
        <AuthFlowPanel auth={auth} onRestart={again} />
      ) : auth.problem ? (
        <div className="flex flex-col items-start gap-3 text-sm">
          <span className="text-destructive">{auth.problem}</span>
          <Button size="sm" onClick={again} disabled={auth.opening}>
            Try again
          </Button>
        </div>
      ) : (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
};
