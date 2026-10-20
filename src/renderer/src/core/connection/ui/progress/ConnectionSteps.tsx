import { cn } from "@/core/util/utils";
import { Check, Circle, Clock, Loader2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * A short checklist of what connecting is doing: one row per step, its state
 * as an icon, an optional line under it and an optional action at its end.
 * The rows come from the progress store, worded by `progress/describe.ts`;
 * this only draws them, on the connecting screen, a service page and sign-in.
 */

export type StepState = "done" | "working" | "waiting" | "failed" | "pending";

export type Step = {
  id: string;
  label: ReactNode;
  state: StepState;
  detail?: ReactNode;
  action?: ReactNode;
  /** Shows "for 12 s" while the step is working or waiting. */
  since?: number;
};

const ICON: Record<StepState, ReactNode> = {
  done: <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />,
  working: <Loader2 className="size-3.5 animate-spin text-muted-foreground" />,
  waiting: <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />,
  failed: <X className="size-3.5 text-destructive" />,
  pending: <Circle className="size-2.5 text-muted-foreground/40" />,
};

/** Seconds since `since`, ticking once a second while mounted. */
const Elapsed = ({ since }: { since: number }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  // Under a few seconds a counter only adds noise.
  if (seconds < 3) return null;
  return <span className="tabular-nums text-muted-foreground/70">{seconds} s</span>;
};

export const ConnectionSteps = ({ steps, className }: { steps: Step[]; className?: string }) => (
  <ol className={cn("flex flex-col gap-2 text-left text-sm", className)} aria-live="polite">
    {steps.map((step) => (
      <li key={step.id} className="flex items-start gap-2.5" data-state={step.state}>
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">{ICON[step.state]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "min-w-0 break-words",
                step.state === "pending" && "text-muted-foreground",
                step.state === "failed" && "text-destructive",
              )}
            >
              {step.label}
            </span>
            {step.since !== undefined && (step.state === "working" || step.state === "waiting") && (
              <Elapsed since={step.since} />
            )}
          </div>
          {step.detail && <div className="text-xs text-muted-foreground">{step.detail}</div>}
        </div>
        {step.action && <div className="shrink-0">{step.action}</div>}
      </li>
    ))}
  </ol>
);

export default ConnectionSteps;
