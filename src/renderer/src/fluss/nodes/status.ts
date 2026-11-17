import { RunEventFragment, RunEventKind } from "@/fluss/api/graphql";
import { cn } from "@/core/util/utils";

/** Border/shadow classes for a node given its latest run event (track mode). */
export const statusClassName = (event: RunEventFragment | undefined, base?: string) =>
  cn(
    base,
    event?.kind === RunEventKind.Error &&
      "border-destructive dark:shadow-red/20 shadow-destructive/10",
    event?.kind === RunEventKind.Complete &&
      "border-success dark:shadow-green/20 shadow-success/10",
  );

export const errorClassName = (hasErrors: boolean, base: string) =>
  hasErrors
    ? "border-destructive/40 shadow-destructive/30 dark:border-destructive dark:shadow-destructive/20 shadow-xl"
    : base;
