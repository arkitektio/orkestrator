import { RekuestTask } from "@/core/linkers";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { ListTaskFragment } from "@/rekuest/api/graphql";
import { TaskStatusIcon, statusBucket, statusTheme } from "@/rekuest/lib/taskStatus";
import { formatDuration } from "@/rekuest/lib/taskTimeline";

/**
 * The latest runs of one rule, newest first, as a table. Every run here is
 * the same action from the same rule, so a row says only what differs: how
 * it went, when, how long, and (`subject`) what set it off. Nothing when
 * there are no runs.
 */
export const RunsTable = <R extends ListTaskFragment>({
  runs,
  subject,
}: {
  runs: readonly R[];
  /** A leading column: the object a trigger's run was fired by. */
  subject?: { label: string; render: (run: R) => React.ReactNode };
}) => {
  if (runs.length === 0) return null;

  const columns = subject
    ? "grid-cols-[minmax(0,2fr)_7rem_minmax(0,3fr)_8rem_4.5rem]"
    : "grid-cols-[7rem_minmax(0,1fr)_8rem_4.5rem]";

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium">Runs</h2>
      <div className="text-sm">
        <div
          className={cn(
            "grid gap-x-4 border-b px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground",
            columns,
          )}
        >
          {subject && <span>{subject.label}</span>}
          <span>Status</span>
          <span />
          <span>Started</span>
          <span className="text-right">Took</span>
        </div>
        {runs.map((run) => {
          const bucket = statusBucket(run.latestEventKind, run.isDone);
          const live = bucket === "running" || bucket === "queued";
          // A finished run's last message is noise; a live or failed one's is the point.
          const message =
            live || bucket === "error" ? run.events.find((e) => e.message)?.message : undefined;
          const tookMs = run.finishedAt
            ? new Date(run.finishedAt).getTime() - new Date(run.createdAt).getTime()
            : undefined;

          return (
            <RekuestTask.Smart key={run.id} object={run} hover>
              <div
                className={cn(
                  "grid items-center gap-x-4 border-b border-border/40 px-2 py-1.5 hover:bg-muted/40",
                  columns,
                )}
              >
                {subject && <span className="min-w-0 truncate">{subject.render(run)}</span>}
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
                <span
                  className={cn(
                    "min-w-0 truncate text-xs",
                    bucket === "error" ? "text-destructive/80" : "text-muted-foreground",
                  )}
                  title={message ?? undefined}
                >
                  {message}
                </span>
                <span
                  className="truncate text-xs text-muted-foreground"
                  title={new Date(run.createdAt).toLocaleString()}
                >
                  <Timestamp date={run.createdAt} relative />
                </span>
                <span className="text-right text-xs tabular-nums text-muted-foreground">
                  {tookMs != null ? formatDuration(tookMs) : live ? "…" : ""}
                </span>
              </div>
            </RekuestTask.Smart>
          );
        })}
      </div>
    </section>
  );
};
