import { useDialog } from "@/core/dialogs/registry";
import { RekuestFiring, RekuestSignal, RekuestTask, RekuestTrigger } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { ListFiringFragment } from "@/rekuest/api/graphql";
import { describeFiring } from "@/rekuest/lib/firing";
import { TaskStatusIcon, statusBucket, statusTheme } from "@/rekuest/lib/taskStatus";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { RotateCcw } from "lucide-react";

/**
 * What became of triggers meeting signals, newest first: each row is one
 * firing, with the run it started or why it started none. `hide` drops the
 * column the page already is (a trigger's page, a signal's page). Hovering
 * offers the same firing again. Nothing when there are no firings.
 */
export const FiringsTable = ({
  firings,
  hide,
  title = "Firings",
}: {
  firings: readonly ListFiringFragment[];
  hide?: "trigger" | "signal";
  title?: string | null;
}) => {
  const { openDialog } = useDialog();
  if (firings.length === 0) return null;

  const columns = hide
    ? "grid-cols-[minmax(0,2fr)_7rem_minmax(0,3fr)_7rem]"
    : "grid-cols-[minmax(0,2fr)_minmax(0,2fr)_7rem_minmax(0,3fr)_7rem]";

  return (
    <section>
      {title && <h2 className="mb-2 text-sm font-medium">{title}</h2>}
      <div className="text-sm">
        <div
          className={cn(
            "grid gap-x-4 border-b px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground",
            columns,
          )}
        >
          {hide !== "signal" && <span>Signal</span>}
          {hide !== "trigger" && <span>Trigger</span>}
          <span>Outcome</span>
          <span />
          <span>When</span>
        </div>
        {firings.map((firing) => {
          const words = describeFiring(firing);
          const run = firing.task;
          const bucket = run ? statusBucket(run.latestEventKind, run.isDone) : undefined;
          // A finished run's last message is noise; a live or failed one's is the point.
          const message =
            run && (bucket === "running" || bucket === "queued" || bucket === "error")
              ? run.events.find((e) => e.message)?.message
              : undefined;
          const note = [words.note, message].filter(Boolean).join(" · ");

          return (
            <div
              key={firing.id}
              className={cn(
                "group relative grid items-center gap-x-4 border-b border-border/40 px-2 py-1.5 hover:bg-muted/40",
                columns,
              )}
            >
              {hide !== "signal" && (
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className="min-w-0 truncate">
                    <StructureDisplay
                      identifier={firing.signal.identifier}
                      id={firing.signal.object}
                      variant="inline"
                      link
                      fallback={<span className="font-mono text-xs">#{firing.signal.object}</span>}
                    />
                  </span>
                  <RekuestSignal.DetailLink
                    object={firing.signal}
                    className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {KIND_LABELS[firing.signal.kind]}
                  </RekuestSignal.DetailLink>
                </span>
              )}
              {hide !== "trigger" && (
                <RekuestTrigger.DetailLink
                  object={firing.trigger}
                  className="min-w-0 truncate hover:text-primary"
                >
                  {firing.trigger.name}
                </RekuestTrigger.DetailLink>
              )}
              {run ? (
                <RekuestTask.DetailLink
                  object={run}
                  className="flex items-center gap-1.5 hover:text-primary"
                >
                  <TaskStatusIcon
                    kind={run.latestEventKind}
                    isDone={run.isDone}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  {statusTheme(run).label}
                </RekuestTask.DetailLink>
              ) : (
                <span className={words.tone === "error" ? "text-destructive" : "text-muted-foreground"}>
                  {words.label}
                </span>
              )}
              <span
                className={cn(
                  "min-w-0 truncate text-xs",
                  words.tone === "error" || bucket === "error"
                    ? "text-destructive/80"
                    : "text-muted-foreground",
                )}
                title={note || undefined}
              >
                {note}
              </span>
              <RekuestFiring.DetailLink
                object={firing}
                className="truncate text-xs text-muted-foreground hover:text-foreground"
                title={new Date(firing.createdAt).toLocaleString()}
              >
                <Timestamp date={firing.createdAt} relative />
              </RekuestFiring.DetailLink>

              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 h-7 -translate-y-1/2 gap-1.5 border border-border/60 bg-background/95 px-2 text-xs opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() =>
                  openDialog("firetrigger", { trigger: firing.trigger.id, signal: firing.signal.id })
                }
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Fire again
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
