import { RunEventFragment, RunEventKind } from "@/fluss/api/graphql";
import { cn } from "@/lib/utils";

/** Border/shadow classes for a node given its latest run event (track mode). */
export const statusClassName = (event: RunEventFragment | undefined, base?: string) =>
  cn(
    base,
    event?.kind === RunEventKind.Error &&
      "border-red-400 dark:border-red-300 dark:shadow-red/20 shadow-red-400/10",
    event?.kind === RunEventKind.Complete &&
      "border-green-400 dark:border-green-300 dark:shadow-green/20 shadow-green-400/10",
  );

export const errorClassName = (hasErrors: boolean, base: string) =>
  hasErrors
    ? "border-destructive/40 shadow-destructive/30 dark:border-destructive dark:shadow-destructive/20 shadow-xl"
    : base;
