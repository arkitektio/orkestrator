import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { CopyButton } from "@/core/ui/copy-button";
import { cn } from "@/core/util/utils";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { SessionError, SessionSync } from "./client";
import { useRekuestSession, useRekuestSessionSync } from "./hooks";

type Tone = "good" | "warn" | "muted";

const TONE: Record<Tone, { text: string; dot: string }> = {
  good: { text: "text-success", dot: "bg-success" },
  warn: { text: "text-warning", dot: "bg-warning" },
  muted: { text: "text-muted-foreground", dot: "bg-muted-foreground/40" },
};

const elapsed = (ms: number) => {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} h`;
};

const statusOf = (sync: SessionSync, now: number): { tone: Tone; label: string; pulse: boolean } => {
  const away = sync.since != null ? ` for ${elapsed(now - sync.since)}` : "";
  switch (sync.status) {
    case "open":
      return sync.catchingUp
        ? { tone: "warn", label: "Catching up after a long absence", pulse: true }
        : { tone: "good", label: "Live", pulse: false };
    case "reconnecting":
      return { tone: "warn", label: `Reconnecting${away}`, pulse: true };
    case "connecting":
      return { tone: "warn", label: `Not connected yet${away}`, pulse: true };
    case "closed":
      return { tone: "muted", label: "Closed", pulse: false };
  }
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[9rem_1fr] items-baseline gap-3 py-1.5 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0">{children}</dd>
  </div>
);

const ErrorLines = ({ error }: { error: SessionError }) => (
  <span className="flex flex-col">
    <span>{error.message}</span>
    {error.detail && (
      <span className="font-mono text-xs text-muted-foreground">{error.detail}</span>
    )}
  </span>
);

/**
 * Settings → Connection: this window's caller session on takt, which carries every live task,
 * task event, agent and state update, and every call. Whether it is live, why not, and what it
 * follows.
 */
export const SessionStatusCard = () => {
  const session = useRekuestSession();
  const sync = useRekuestSessionSync(session);
  // Re-read when what it follows or waits for changes.
  useSyncExternalStore(session.subscribeStatus, session.getActivity, session.getActivity);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (sync.since == null) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [sync.since]);

  const status = statusOf(sync, now);
  const tone = TONE[status.tone];
  const last = session.getLastError();
  const limits = session.getLimits();
  const topics = session.getTopics();
  const id = session.id;

  return (
    <Card data-testid="session-status-card">
      <CardHeader>
        <CardTitle>Live updates</CardTitle>
        <CardDescription>
          Tasks, their events, agents and states reach this window over one connection to the
          server, which also carries what you start and stop. Tasks keep running when it drops.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <Row label="Status">
            <span className={cn("flex items-center gap-1.5", tone.text)}>
              <span aria-hidden className="relative flex size-2 shrink-0">
                {status.pulse && (
                  <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", tone.dot)} />
                )}
                <span className={cn("relative size-2 rounded-full", tone.dot)} />
              </span>
              <span data-testid="session-status">{status.label}</span>
            </span>
          </Row>
          {sync.error && (
            <Row label="Why">
              <ErrorLines error={sync.error} />
            </Row>
          )}
          {!sync.error && last && (
            <Row label="Last interrupted">
              <span className="flex flex-col">
                <span className="text-muted-foreground">
                  {new Date(last.at).toLocaleString()}
                </span>
                <ErrorLines error={last} />
              </span>
            </Row>
          )}
          <Row label="Server">
            <span className="break-all font-mono text-xs">{session.getUrl()}</span>
          </Row>
          <Row label="Session">
            {id ? (
              <span className="flex items-center gap-1">
                <span className="truncate font-mono text-xs">{id}</span>
                <CopyButton value={id} title="Copy the session id" />
              </span>
            ) : (
              <span className="text-muted-foreground">None yet</span>
            )}
          </Row>
          <Row label="Following">
            <span title={topics.join("\n")}>
              {topics.length === 1 ? "1 feed" : `${topics.length} feeds`}
            </span>
          </Row>
          <Row label="Waiting for answers">
            {session.getPendingCount() === 0
              ? "Nothing"
              : `${session.getPendingCount()} of your requests`}
          </Row>
          {limits && (
            <Row label="Catch-up window">
              Back within {elapsed(limits.session_grace * 1000)}, this window gets exactly what it
              missed; later, everything is loaded again.
            </Row>
          )}
        </dl>
      </CardContent>
    </Card>
  );
};
