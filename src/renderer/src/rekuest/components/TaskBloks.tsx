import * as React from "react";
import { reportErrorAs } from "@/core/notify";
import type { Structure } from "@/core/types";
import { cn } from "@/core/util/utils";
import { TaskBlokFragment, TaskBlokRole, TaskBlokStatus, useDecideMutation, useTaskBloksQuery } from "../api/graphql";
import { useTask } from "../hooks/useTasks";
import { MaterializedBlokEmbed } from "./MaterializedBlokEmbed";

/** One blok a task showed: an ask answered through it while it waits, frozen once settled; an inform, live. */
export const TaskBlokView = ({
  task,
  blok,
  alongside,
}: {
  task: string;
  blok: TaskBlokFragment;
  alongside?: readonly Structure[];
}) => {
  const [decide] = useDecideMutation();
  const asks = blok.role === TaskBlokRole.Ask;
  const onReturn = React.useCallback(
    (values: Record<string, unknown>) =>
      decide({ variables: { input: { task, approved: true, values } } }).catch(
        reportErrorAs("Couldn't send your answer"),
      ),
    [decide, task],
  );
  return (
    <MaterializedBlokEmbed
      materialized={blok.materializedBlok}
      alongside={alongside}
      ask={
        asks
          ? {
              status: blok.status,
              values: (blok.values as Record<string, unknown> | null) ?? null,
              decidedBy: blok.decidedBy,
            }
          : undefined
      }
      onReturn={asks && blok.status === TaskBlokStatus.Waiting ? onReturn : undefined}
    />
  );
};

/**
 * The bloks a task showed, where the task is embedded (a chat message
 * attaching it): its asks and informs in order, the latest inform live and
 * older ones gone to their line. Follows the task: a blok it shows later, or
 * an answer given elsewhere, appears without a reload.
 */
export const TaskBloks = ({
  task,
  alongside,
  fallback = null,
  className,
}: {
  task: string;
  alongside?: readonly Structure[];
  fallback?: React.ReactNode;
  className?: string;
}) => {
  const { data, refetch } = useTaskBloksQuery({ variables: { id: task } });
  // The live copy of the task (the user's own runs) moves with every event: read the bloks again then.
  const live = useTask({ task });
  const moved = live ? `${live.latestEventKind}:${live.events.length}:${live.isDone}` : null;
  React.useEffect(() => {
    if (moved) void refetch();
  }, [moved, refetch]);

  const bloks = data?.task.bloks ?? [];
  if (bloks.length === 0) return <>{fallback}</>;
  const lastInform = bloks.findLastIndex((blok) => blok.role === TaskBlokRole.Inform);
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {bloks.map((blok, index) =>
        blok.role === TaskBlokRole.Inform && index !== lastInform ? (
          <div key={blok.materializedBlok.id} className="px-1 text-xs text-muted-foreground">
            {blok.message || blok.materializedBlok.name || blok.materializedBlok.blok.name}
          </div>
        ) : (
          <TaskBlokView key={blok.materializedBlok.id} task={task} blok={blok} alongside={alongside} />
        ),
      )}
    </div>
  );
};
