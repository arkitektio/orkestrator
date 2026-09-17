import { TaskEventKind } from "../api/graphql";
import { isTaskLive } from "./taskTracker";

/**
 * Pure ordering / overflow logic for the task island at the foot of the rail
 * (`components/global/TaskNotificationStack`). Kept free of React and UI
 * imports so the rules — which row comes first, which rows fit, when a row
 * clears on its own — are testable without rendering anything.
 */

/** Rows shown before the rest fold behind the stacked-edge peek. */
export const MAX_VISIBLE_ROWS = 3;

export type RankableTask = {
  isDone?: boolean | null;
  latestEventKind: TaskEventKind;
};

/**
 * Sort rank of a row: `0` still working, `1` failed, `2` finished quietly.
 *
 * Ranked on {@link isTaskLive} rather than `statusBucket`: the bucket files
 * `CANCELLING` / `INTERRUPTING` under "cancelled", but such a task is still
 * running and must not sink below finished ones. A task that is not hydrated
 * into the cache yet counts as live — it was only just created.
 */
export type TaskRank = 0 | 1 | 2;

export const taskRank = (task: RankableTask | undefined): TaskRank => {
  if (!task || isTaskLive(task)) return 0;
  if (
    task.latestEventKind === TaskEventKind.Failed ||
    task.latestEventKind === TaskEventKind.Critical
  ) {
    return 1;
  }
  return 2;
};

export type RankedId = { id: string; rank: TaskRank };

/**
 * The store's ids paired with their ranks, as a string. Every task event gives
 * the task list a new identity, but only a change of *rank* can change the
 * order — so the order is memoized on this string, which a PROGRESS or YIELD
 * event leaves untouched.
 */
export const rankSignature = (
  ids: readonly string[],
  tasksById: ReadonlyMap<string, RankableTask>,
): string => JSON.stringify(ids.map((id) => [id, taskRank(tasksById.get(id))]));

/**
 * Display order for a {@link rankSignature}: by rank, and within a rank in the
 * store's own order (newest first) — `Array.prototype.sort` is stable.
 */
export const orderFromSignature = (signature: string): RankedId[] =>
  (JSON.parse(signature) as [string, TaskRank][])
    .map(([id, rank]) => ({ id, rank }))
    .sort((a, b) => a.rank - b.rank);

/**
 * The order to show while the user is interacting with the island. Rows must
 * not re-sort under the pointer, so the order seen when the interaction began
 * is kept: ids that are gone drop out, and ids that appeared since go on top —
 * the strip is anchored at its bottom, so a row added at the top moves nothing
 * beneath it.
 */
export const reconcileOrder = (
  frozen: readonly string[],
  current: readonly string[],
): string[] => {
  const present = new Set(current);
  const known = new Set(frozen);
  return [
    ...current.filter((id) => !known.has(id)),
    ...frozen.filter((id) => present.has(id)),
  ];
};

/**
 * Split the ordered ids into the rows on show and the ones behind the peek.
 * `keepId` (the expanded row) is never hidden: if it would fall past the cap it
 * takes the last visible slot instead.
 */
export const splitVisible = (
  ordered: readonly string[],
  options: { showAll?: boolean; keepId?: string | null; max?: number } = {},
): { visible: string[]; hidden: string[] } => {
  const max = options.max ?? MAX_VISIBLE_ROWS;
  if (options.showAll || ordered.length <= max) {
    return { visible: [...ordered], hidden: [] };
  }
  let visible = ordered.slice(0, max);
  const keepId = options.keepId;
  if (keepId && ordered.includes(keepId) && !visible.includes(keepId)) {
    visible = [...visible.slice(0, max - 1), keepId];
  }
  const shown = new Set(visible);
  return { visible, hidden: ordered.filter((id) => !shown.has(id)) };
};

/**
 * Whether a row clears on its own. Only a quiet finish does: a failure has to
 * be read, and a task that yielded a result (an image, a table) keeps it
 * inspectable until dismissed. Ranked rather than read off an error *message*,
 * because a FAILED event is not guaranteed to carry one.
 */
export const shouldAutoDismiss = (
  task: RankableTask | undefined,
  hasYield: boolean,
): boolean => task !== undefined && taskRank(task) === 2 && !hasYield;

/**
 * One dot per hidden task on the peek, capped — past a handful the dots say
 * "several more" just as well, and the peek must not outgrow the rail.
 */
export const overflowDots = <T,>(hidden: readonly T[], cap = 8): T[] =>
  hidden.slice(0, cap);
