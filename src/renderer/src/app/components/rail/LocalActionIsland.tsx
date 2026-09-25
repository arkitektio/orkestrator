import { Button } from "@/core/ui/button";
import { AlertCircle, Sparkles, X } from "lucide-react";
import {
  cancelLocalActionRun,
  dismissLocalActionRun,
  useLocalActionRuns,
} from "../../../core/smart/localactions/localActionRuns";
import {
  RailIsland,
  RailIslandName,
  RailIslandProgress,
  RailIslandRow,
} from "../../../core/ui/rail/RailIsland";

/**
 * Local actions still running, as an island in the rail.
 *
 * This is the only place a running action can be seen or stopped once the
 * popover or the button that started it has gone — which, for the context menu,
 * is immediately: selecting the row closes the menu. Reads
 * `app/localActionRuns` and issues no GraphQL of its own, so it needs no Guard;
 * the module-specific work happens inside each action's `execute`, which
 * follows the guard convention itself.
 */
export const LocalActionIsland = () => {
  const runs = useLocalActionRuns((state) => state.runs);

  return (
    <RailIsland
      show={runs.length > 0}
      islandKey="local-action-island"
      testId="local-action-island"
    >
      {runs
        .slice()
        .reverse()
        .map((run) => {
          const working = run.status === "running";
          const Icon = run.icon ?? Sparkles;
          return (
            <RailIslandRow
              key={run.id}
              working={working}
              testId="local-action-island-row"
            >
              <div className="relative flex min-w-0 items-center gap-2">
                {run.status === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}

                <RailIslandName name={run.title} working={working} />

                {working && run.progress != null && (
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {run.progress.toFixed(0)}%
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    working
                      ? cancelLocalActionRun(run.id)
                      : dismissLocalActionRun(run.id)
                  }
                  aria-label={working ? "Cancel action" : "Dismiss action"}
                  title={working ? "Cancel action" : "Dismiss"}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {working && (
                <RailIslandProgress
                  progress={run.progress ?? 0}
                  started={run.progress != null}
                />
              )}

              {run.status === "error" && (
                <p className="relative mt-1 line-clamp-2 break-words text-[11px] leading-snug text-destructive">
                  {run.error}
                </p>
              )}
            </RailIslandRow>
          );
        })}
    </RailIsland>
  );
};
