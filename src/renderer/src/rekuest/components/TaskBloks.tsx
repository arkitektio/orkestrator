import * as React from "react";
import { reportErrorAs } from "@/core/notify";
import type { Structure } from "@/core/types";
import { cn } from "@/core/util/utils";
import { TaskBlokFragment, TaskBlokRole, TaskBlokStatus, useDecideMutation, useTaskBloksQuery } from "../api/graphql";
import { useTask } from "../hooks/useTasks";
import { BlokRunHostProvider, type BlokRunAgent, type BlokRunHost } from "@/core/blok/renderer/bloks/run";
import { openAsks, type TaskRootSource } from "../run/taskRoot";
import { MaterializedBlokEmbed } from "./MaterializedBlokEmbed";
import { HoldCard } from "./task/HoldCard";

/**
 * `<ask>` in a blok a task showed: the task's open ask, newest, answered in
 * place, as under a run. A hold that asks through this very blok is not
 * drawn again inside it: the blok is its form.
 */
export const TaskOpenAsk = ({
  task,
  blok,
}: {
  task: (Pick<TaskRootSource, "events"> & { isDone: boolean }) | null | undefined;
  blok: string;
}) => {
  const hold = React.useMemo(
    () =>
      task && !task.isDone
        ? openAsks(task)
            .filter((open) => open.blok !== blok)
            .at(-1)
        : undefined,
    [task, blok],
  );
  return hold ? <HoldCard key={hold.task} hold={hold} /> : null;
};

/** The run host a task blok's tree reads: its agents by key, and `<ask>` drawing the task's open ask. */
export const useTaskBlokHost = (
  task: (Pick<TaskRootSource, "events"> & { isDone: boolean }) | null | undefined,
  materialized: Pick<TaskBlokFragment["materializedBlok"], "id" | "agentMappings">,
): BlokRunHost => {
  const byKey = React.useMemo(() => {
    const agents = new Map<string, BlokRunAgent[]>();
    for (const mapping of materialized.agentMappings) {
      agents.set(mapping.key, [...(agents.get(mapping.key) ?? []), { id: mapping.agent.id, name: mapping.agent.name }]);
    }
    return agents;
  }, [materialized.agentMappings]);
  return React.useMemo<BlokRunHost>(
    () => ({
      agentsFor: (key) => byKey.get(key) ?? [],
      renderAsk: () => <TaskOpenAsk task={task} blok={materialized.id} />,
    }),
    [byKey, materialized.id, task],
  );
};

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
  const live = useTask({ task });
  const host = useTaskBlokHost(live, blok.materializedBlok);
  const asks = blok.role === TaskBlokRole.Ask;
  const onReturn = React.useCallback(
    (values: Record<string, unknown>) =>
      decide({ variables: { input: { task, approved: true, values } } }).catch(
        reportErrorAs("Couldn't send your answer"),
      ),
    [decide, task],
  );
  return (
    <BlokRunHostProvider value={host}>
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
    </BlokRunHostProvider>
  );
};

/**
 * The bloks a task showed, where the task is embedded (a chat message
 * attaching it): its asks and informs in order, the latest inform live and
 * older ones gone to their line. Follows the task: a blok it shows later, or
 * an answer given elsewhere, appears without a reload. `answeredElsewhere`:
 * the waiting asks a hold card on the same page answers already, left out.
 */
export const TaskBloks = ({
  task,
  alongside,
  answeredElsewhere,
  fallback = null,
  className,
}: {
  task: string;
  alongside?: readonly Structure[];
  answeredElsewhere?: ReadonlySet<string>;
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

  const bloks = (data?.task.bloks ?? []).filter(
    (blok) =>
      !(
        blok.role === TaskBlokRole.Ask &&
        blok.status === TaskBlokStatus.Waiting &&
        answeredElsewhere?.has(blok.materializedBlok.id)
      ),
  );
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
