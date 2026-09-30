import { LogLevel, TaskEventKind } from "../api/graphql";
import {
  HistoryChild,
  HistoryEvent,
  orderTaskHistory,
} from "./taskHistory";
import { statusBucket, TaskStatusBucket } from "./taskStatus";
import { isTaskLive } from "./taskTracker";

/**
 * The task page's left → right lane: its history laid out on one x axis.
 *
 * The axis is time, but the order is the journal's (`orderTaskHistory`): each
 * row is placed at `max(previous x, its own time)`, so a frame resent from an
 * agent's journal after a restart lands at its step rather than jumping back.
 * Each resume is an attempt with its own band; child calls are bars packed
 * into as few rows as overlap allows; events are marks on one of three tracks.
 *
 * Pure, so the layout is testable without rendering. Positions are 0..1; the
 * view multiplies by its (zoomed) pixel width.
 */

export type LaneEvent = HistoryEvent & {
  level?: LogLevel | null;
  message?: string | null;
};

export type LaneChild = HistoryChild & {
  latestEventKind: TaskEventKind;
  isDone: boolean;
  finishedAt?: string | null;
  events?: readonly { createdAt: string }[] | null;
};

export type LaneTrack = "yield" | "log" | "status";
export type LaneSeverity = "normal" | "warn" | "error";

export type LaneMark<E extends LaneEvent = LaneEvent> = {
  x: number;
  time: number;
  attempt: number;
  track: LaneTrack;
  severity: LaneSeverity;
  event: E;
};

export type LaneSegment<C extends LaneChild = LaneChild> = {
  x0: number;
  x1: number;
  attempt: number;
  /** Packing row: bars in one row never overlap. */
  row: number;
  status: TaskStatusBucket;
  child: C;
};

export type LaneAttempt = { index: number; x0: number; x1: number };

export type TaskLaneLayout<E extends LaneEvent, C extends LaneChild> = {
  start: number;
  end: number;
  attempts: LaneAttempt[];
  segments: LaneSegment<C>[];
  rows: number;
  marks: LaneMark<E>[];
};

/** Which track an event is drawn on, or null when it is not drawn at all. */
export const laneTrack = (event: LaneEvent): LaneTrack | null => {
  switch (event.kind) {
    case TaskEventKind.Yield:
    case TaskEventKind.LateReport:
      return "yield";
    case TaskEventKind.Log:
      return "log";
    case TaskEventKind.Progress:
      // The header shows the percentage; only a progress that says something
      // is worth a mark.
      return event.message ? "log" : null;
    default:
      return "status";
  }
};

export const laneSeverity = (event: LaneEvent): LaneSeverity => {
  switch (event.kind) {
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return "error";
    case TaskEventKind.Lost:
    case TaskEventKind.LateReport:
      return "warn";
  }
  switch (event.level) {
    case LogLevel.Error:
    case LogLevel.Critical:
      return "error";
    case LogLevel.Warn:
      return "warn";
    default:
      return "normal";
  }
};

const parse = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
};

/** A child's end: finishedAt, else its latest event, else `fallback`. */
const childEnd = (child: LaneChild, fallback: number): number => {
  const finished = parse(child.finishedAt);
  if (finished != null) return finished;
  let latest: number | null = null;
  for (const e of child.events ?? []) {
    const t = parse(e.createdAt);
    if (t != null && (latest == null || t > latest)) latest = t;
  }
  return latest ?? fallback;
};

export const layoutTaskLane = <E extends LaneEvent, C extends LaneChild>(
  task: {
    createdAt: string;
    finishedAt?: string | null;
    isDone: boolean;
    latestEventKind: TaskEventKind;
  },
  events: readonly E[],
  children: readonly C[],
  now: number,
): TaskLaneLayout<E, C> => {
  const attempts = orderTaskHistory(events, children);
  const created = parse(task.createdAt) ?? now;

  // Monotone time along the journal order.
  let cursor = created;
  const placed = attempts.map((attempt) => ({
    index: attempt.index,
    rows: attempt.rows.map((row) => {
      const t = parse(
        row.type === "event" ? row.event.createdAt : row.child.createdAt,
      );
      if (t != null && t > cursor) cursor = t;
      return { row, time: cursor };
    }),
  }));

  // Only a live task runs up to `now`. An ended one ends at its finishedAt
  // (else its last report), and nothing in it runs past that: a child still
  // marked running there is stale state, not a call that goes on forever.
  const running = isTaskLive(task);
  const finished = parse(task.finishedAt);
  let end = running
    ? Math.max(now, cursor)
    : Math.max(finished ?? cursor, cursor);
  const childEnds = new Map<string, number>();
  for (const attempt of placed) {
    for (const { row, time } of attempt.rows) {
      if (row.type !== "child") continue;
      // A child still marked running runs to now, or to its parent's end.
      const fallback = isTaskLive(row.child)
        ? running
          ? Math.max(now, time)
          : end
        : time;
      let e = Math.max(time, childEnd(row.child, fallback));
      if (!running) e = Math.min(e, end);
      childEnds.set(row.child.id, e);
      if (e > end) end = e;
    }
  }

  const span = end - created;
  const toX = (t: number) =>
    span <= 0 ? 0 : Math.min(1, Math.max(0, (t - created) / span));

  const marks: LaneMark<E>[] = [];
  const segments: LaneSegment<C>[] = [];
  const laneAttempts: LaneAttempt[] = [];

  placed.forEach((attempt, i) => {
    const first = attempt.rows[0];
    const next = placed[i + 1]?.rows[0];
    laneAttempts.push({
      index: attempt.index,
      x0: i === 0 || !first ? 0 : toX(first.time),
      x1: next ? toX(next.time) : 1,
    });
    for (const { row, time } of attempt.rows) {
      if (row.type === "event") {
        const track = laneTrack(row.event);
        if (!track) continue;
        marks.push({
          x: toX(time),
          time,
          attempt: attempt.index,
          track,
          severity: laneSeverity(row.event),
          event: row.event,
        });
      } else {
        segments.push({
          x0: toX(time),
          x1: toX(childEnds.get(row.child.id) ?? time),
          attempt: attempt.index,
          row: 0,
          status: statusBucket(row.child.latestEventKind, row.child.isDone),
          child: row.child,
        });
      }
    }
  });

  // Greedy interval packing: first row whose last bar ended before this one.
  const rowEnds: number[] = [];
  for (const s of [...segments].sort((a, b) => a.x0 - b.x0)) {
    let r = rowEnds.findIndex((e) => e <= s.x0);
    if (r === -1) {
      r = rowEnds.length;
      rowEnds.push(s.x1);
    } else {
      rowEnds[r] = s.x1;
    }
    s.row = r;
  }

  return {
    start: created,
    end,
    attempts: laneAttempts,
    segments,
    rows: rowEnds.length,
    marks,
  };
};

export type LaneCluster<E extends LaneEvent = LaneEvent> = {
  key: string;
  x: number;
  track: LaneTrack;
  severity: LaneSeverity;
  marks: LaneMark<E>[];
};

const SEVERITY_RANK: Record<LaneSeverity, number> = {
  normal: 0,
  warn: 1,
  error: 2,
};

/**
 * Merge marks of one track closer than `minPx` at the lane's current pixel
 * `width`, so a burst of logs is one mark with a count instead of a smear.
 * Zooming in (a wider lane) splits clusters apart again.
 */
export const clusterMarks = <E extends LaneEvent>(
  marks: readonly LaneMark<E>[],
  width: number,
  minPx: number,
): LaneCluster<E>[] => {
  const byTrack = new Map<LaneTrack, LaneMark<E>[]>();
  for (const m of marks) {
    const list = byTrack.get(m.track);
    if (list) list.push(m);
    else byTrack.set(m.track, [m]);
  }

  const clusters: LaneCluster<E>[] = [];
  for (const [track, list] of byTrack) {
    list.sort((a, b) => a.x - b.x);
    let current: LaneCluster<E> | null = null;
    for (const m of list) {
      if (current && (m.x - current.x) * width < minPx) {
        current.marks.push(m);
        if (SEVERITY_RANK[m.severity] > SEVERITY_RANK[current.severity]) {
          current.severity = m.severity;
        }
      } else {
        current = {
          key: `${track}:${m.event.id}`,
          x: m.x,
          track,
          severity: m.severity,
          marks: [m],
        };
        clusters.push(current);
      }
    }
  }
  return clusters;
};
