import { cn } from "@/core/util/utils";
import { CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { SessionSync } from "./client";
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
  const { label, detail } = describe(shown, sync.since, now);
  const Icon = shown === "catching_up" ? RefreshCw : CloudOff;

  return (
    <span
      role="status"
      title={detail}
      data-testid="rekuest-sync-indicator"
      data-sync={shown}
      className="flex shrink-0 items-center"
    >
      <Icon
        aria-hidden
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          shown === "reconnecting" && "animate-pulse text-warning",
          shown === "connecting" && "animate-pulse text-muted-foreground",
          shown === "catching_up" && "animate-spin text-primary/70",
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
};
