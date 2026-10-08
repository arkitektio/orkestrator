import { cn } from "@/core/util/utils";
import { AutomationState, STATE_LABELS } from "@/rekuest/lib/automationStatus";

const DOT: Record<AutomationState, string> = {
  ended: "bg-muted-foreground/40",
  paused: "bg-muted-foreground/40",
  failing: "bg-destructive",
  waiting: "bg-green-500",
  running: "bg-blue-500 animate-pulse",
  idle: "bg-green-500",
};

/** Just the dot, for rows that say the state in their own words. */
export const AutomationDot = ({
  state,
  className,
}: {
  state: AutomationState;
  className?: string;
}) => (
  <span
    className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[state], className)}
    title={STATE_LABELS[state]}
  />
);

export const AutomationStatus = ({
  state,
  className,
}: {
  state: AutomationState;
  className?: string;
}) => (
  <span
    className={cn(
      "flex shrink-0 items-center gap-1.5 text-xs",
      state === "failing" ? "text-destructive" : "text-muted-foreground",
      className,
    )}
  >
    <span className={cn("h-1.5 w-1.5 rounded-full", DOT[state])} />
    {STATE_LABELS[state]}
  </span>
);
