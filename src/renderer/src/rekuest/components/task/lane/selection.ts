import { DetailTaskFragment, TaskEventKind } from "@/rekuest/api/graphql";

export type LaneTaskEvent = DetailTaskFragment["events"][number];
export type LaneTaskChild = DetailTaskFragment["children"][number];

/** What the lane has picked: one event or one child call, by id. */
export type LaneSelection =
  | { kind: "event"; id: string }
  | { kind: "child"; id: string }
  | null;

export type ResolvedSelection =
  | { kind: "event"; event: LaneTaskEvent }
  | { kind: "child"; child: LaneTaskChild }
  | null;

export const isYieldLike = (e: LaneTaskEvent) =>
  (e.kind === TaskEventKind.Yield || e.kind === TaskEventKind.LateReport) &&
  e.returns != null;

/**
 * The selection, looked up in the task; nothing picked falls back to the
 * latest yield, else the latest event (the cache stores events newest-first).
 */
export const resolveSelection = (
  task: DetailTaskFragment,
  selection: LaneSelection,
): ResolvedSelection => {
  if (selection?.kind === "event") {
    const event = task.events.find((e) => e.id === selection.id);
    if (event) return { kind: "event", event };
  }
  if (selection?.kind === "child") {
    const child = task.children.find((c) => c.id === selection.id);
    if (child) return { kind: "child", child };
  }
  const fallback =
    task.events.find((e) => e.kind === TaskEventKind.Yield && e.returns != null) ??
    task.events.at(0);
  return fallback ? { kind: "event", event: fallback } : null;
};

/** Epoch ms the selection sits at, for scrubbing the stage along. */
export const selectionTime = (resolved: ResolvedSelection): number | null => {
  if (!resolved) return null;
  const iso =
    resolved.kind === "event" ? resolved.event.createdAt : resolved.child.createdAt;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
};
