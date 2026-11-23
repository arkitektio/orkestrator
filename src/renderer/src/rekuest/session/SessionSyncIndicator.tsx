import { CONNECTION_STATUS_PATH } from "@/core/connection/statusPath";
import { cn } from "@/core/util/utils";
import { CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { SessionError, SessionSync } from "./client";
import { useRekuestSession, useRekuestSessionSync } from "./hooks";

type Kind = "connecting" | "reconnecting" | "catching_up";

/** How long a state lasts before it is shown: a blip that resumes at once says nothing. */
const SHOW_AFTER_MS: Record<Kind, number> = {
  connecting: 5_000,
  reconnecting: 2_000,
  catching_up: 1_000,
};

const kindOf = (sync: SessionSync): Kind | null => {
  if (sync.status === "connecting") return "connecting";
  if (sync.status === "reconnecting") return "reconnecting";
  if (sync.status === "open" && sync.catchingUp) return "catching_up";
  return null;
};

const elapsed = (ms: number) => {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} h`;
};

const KEEP_RUNNING =
  "Tasks keep running (except those set to stop when this window goes away).";

/** The error under the explanation: its sentence, then what the socket said. */
const withError = (detail: string, error: SessionError | null) =>
  error ? `${detail}\n\nWhy: ${error.message}${error.detail ? `\n${error.detail}` : ""}` : detail;

const describe = (kind: Kind, since: number | null, now: number) => {
  const away = since != null ? ` for ${elapsed(now - since)}` : "";
  switch (kind) {
    case "connecting":
      return {
        label: "Live updates not connected",
        detail: `Live task and state updates have not connected yet${away}; what you see may be out of date.`,
      };
    case "reconnecting":
      return {
        label: "Live updates reconnecting",
        detail: `Live task and state updates are paused${away}, reconnecting. What you see may be out of date until they are back; what was missed is replayed then. ${KEEP_RUNNING}`,
      };
    case "catching_up":
      return {
        label: "Catching up",
        detail:
          "Back after a long absence: every list and task shown is being loaded again, so it may be out of date for a moment.",
      };
  }
};

/**
 * Beside the agent in the rail's footer: whether this window's rekuest updates are live. Nothing
 * while they are; a glyph (with the reason on hover) while the session is reconnecting, never
 * connected, or catching up after a new session.
 */
export const SessionSyncIndicator = () => {
  const sync = useRekuestSessionSync(useRekuestSession());
  const navigate = useNavigate();
  const kind = kindOf(sync);
  // The sync it was shown for: a new one (every change makes one) waits its own delay.
  const [shownFor, setShownFor] = useState<SessionSync | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!kind) return;
    const timer = setTimeout(() => {
      setNow(Date.now());
      setShownFor(sync);
    }, SHOW_AFTER_MS[kind]);
    return () => clearTimeout(timer);
  }, [sync, kind]);

  const shown = kind && shownFor === sync ? kind : null;

  // The "for 12 s" in the hover text moves while it is shown.
  useEffect(() => {
    if (!shown) return;
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, [shown]);

  if (!shown) return null;
  const { label, detail: explanation } = describe(shown, sync.since, now);
  const detail = withError(explanation, sync.error);
  const Icon = shown === "catching_up" ? RefreshCw : CloudOff;
  // It sits inside the account switcher's trigger: what it does must not open the menu too.
  const stop = (event: SyntheticEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  const open = (event: SyntheticEvent) => {
    stop(event);
    navigate(CONNECTION_STATUS_PATH);
  };

  return (
    // A span with the link's role: a real anchor may not sit inside the trigger's button.
    <span
      role="link"
      tabIndex={0}
      aria-label={`${label}: open the connection status`}
      onPointerDown={stop}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") open(event);
      }}
      title={`${detail}\n\nClick for the connection status.`}
      data-testid="rekuest-sync-indicator"
      data-sync={shown}
      className="flex shrink-0 cursor-pointer items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon
        aria-hidden
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          // Yellow whatever the reason: what it shows may be out of date.
          "text-warning",
          shown === "catching_up" ? "animate-spin" : "animate-pulse",
        )}
      />
    </span>
  );
};
