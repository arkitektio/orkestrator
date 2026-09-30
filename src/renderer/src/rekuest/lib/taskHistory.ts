import { TaskEventKind } from "../api/graphql";

/**
 * A task's history under the journal model (rekuest-server
 * `docs/design/journal.md`, `workflows.md`).
 *
 * - Everything an agent reports on a task is numbered per task (`step`), in
 *   program order. Events the server writes itself (`QUEUED`, `LOST`, the
 *   `-ING` of an instruct) carry no step.
 * - A child call takes a step of its parent too: the child task records it as
 *   `parentStep`, and has no event of its own in the parent's history.
 * - A workflow whose agent dies is resumed: the server puts it back to
 *   `QUEUED` ("sent again") and the resumed run's reports continue after the
 *   last step. Each such run is an *attempt*.
 * - `LOST` is final; what the agent sends after it is kept as `LATE_REPORT`.
 *
 * Pure, so the log's order is testable without rendering.
 */

export type HistoryEvent = {
  id: string;
  kind: TaskEventKind;
  createdAt: string;
  step?: number | null;
};

export type HistoryChild = {
  id: string;
  createdAt: string;
  parentStep?: number | null;
};

export type HistoryRow<E extends HistoryEvent, C extends HistoryChild> =
  | { type: "event"; event: E }
  | { type: "child"; child: C };

export type HistoryAttempt<E extends HistoryEvent, C extends HistoryChild> = {
  /** 0 for the first run, n for the n-th resume. */
  index: number;
  rows: HistoryRow<E, C>[];
};

// ISO-8601 strings sort chronologically as strings; no Date per comparison.
const byCreatedAt = (a: { createdAt: string }, b: { createdAt: string }) =>
  a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;

/**
 * An event keeps its place by arrival time rather than by step: the ones the
 * server wrote (no step), and `LATE_REPORT`, which belongs after the `LOST` it
 * could not replace whatever step the agent gave it.
 */
const isAnchored = (e: HistoryEvent) =>
  e.step == null || e.kind === TaskEventKind.LateReport;

/**
 * Within one attempt, put the stepped events in step order while the anchored
 * ones keep their positions: the stepped events are sorted into the slots
 * stepped events occupied. A frame resent from an agent's journal after a
 * restart arrives late but lands at its step.
 */
const orderAttempt = <E extends HistoryEvent>(events: E[]): E[] => {
  const stepped = events
    .filter((e) => !isAnchored(e))
    .sort((a, b) => (a.step as number) - (b.step as number));
  let next = 0;
  return events.map((e) => (isAnchored(e) ? e : stepped[next++]));
};

/**
 * Split the events into attempts, order each, and place the child calls.
 *
 * A new attempt begins at a `QUEUED` that follows a `STARTED`: the only way a
 * task goes back to the queue after it began is a workflow resume.
 *
 * A child with a `parentStep` goes right after the last event with an earlier
 * step (steps are gapless across events and children, and a resumed run
 * continues the numbering, so this holds across attempts). A child without
 * one (an agent that does not number, or an older row) goes by `createdAt`.
 */
export const orderTaskHistory = <
  E extends HistoryEvent,
  C extends HistoryChild,
>(
  events: readonly E[],
  children: readonly C[] = [],
): HistoryAttempt<E, C>[] => {
  const chronological = [...events].sort(byCreatedAt);

  const attempts: E[][] = [[]];
  let started = false;
  for (const e of chronological) {
    if (e.kind === TaskEventKind.Queued && started) {
      attempts.push([]);
      started = false;
    }
    if (e.kind === TaskEventKind.Started) started = true;
    attempts[attempts.length - 1].push(e);
  }

  type Placed = { attempt: number; row: HistoryRow<E, C> };
  const flat: Placed[] = attempts.flatMap((list, attempt) =>
    orderAttempt(list).map(
      (event): Placed => ({ attempt, row: { type: "event", event } }),
    ),
  );

  const steppedAt = (i: number): number | null => {
    const row = flat[i].row;
    return row.type === "event" && !isAnchored(row.event)
      ? (row.event.step as number)
      : null;
  };

  const insertionIndex = (child: C): number => {
    const parentStep = child.parentStep;
    if (parentStep != null) {
      // Right after what the parent did just before the call — so the call
      // stays in the attempt that made it, ahead of a resume's QUEUED.
      let after = -1;
      for (let i = flat.length - 1; i >= 0; i--) {
        const step = steppedAt(i);
        if (step != null && step < parentStep) {
          after = i;
          break;
        }
      }
      if (after !== -1) {
        // Past the calls already placed there: those came first.
        let i = after + 1;
        while (i < flat.length && flat[i].row.type === "child") i++;
        return i;
      }
      const before = flat.findIndex((_, i) => {
        const step = steppedAt(i);
        return step != null && step > parentStep;
      });
      if (before !== -1) return before;
    }
    const at = flat.findIndex(
      (p) =>
        (p.row.type === "event" ? p.row.event.createdAt : p.row.child.createdAt) >
        child.createdAt,
    );
    return at === -1 ? flat.length : at;
  };

  for (const child of sortChildrenByCall(children)) {
    const i = insertionIndex(child);
    const attempt = flat[i - 1]?.attempt ?? flat[i]?.attempt ?? 0;
    flat.splice(i, 0, { attempt, row: { type: "child", child } });
  }

  return attempts.map((_, index) => ({
    index,
    rows: flat.filter((p) => p.attempt === index).map((p) => p.row),
  }));
};

/** Children in the order their parent called them. */
export const sortChildrenByCall = <C extends HistoryChild>(
  children: readonly C[],
): C[] =>
  [...children].sort((a, b) =>
    a.parentStep != null && b.parentStep != null
      ? a.parentStep - b.parentStep
      : byCreatedAt(a, b),
  );

// ---------------------------------------------------------------------------
// LOST

export type LostDetails = {
  /** Whether the task ever reported STARTED. If not, nothing ran. */
  started: boolean | null;
  lastProgress: number | null;
  /** The implementation's `effects`: NONE, REPEATABLE, UNKNOWN, IRREVERSIBLE. */
  effects: string | null;
  reason: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

/**
 * What a LOST event's `value` says, for whoever decides about the task. Every
 * field is optional: an older server, or a task lost before it was ever
 * delivered, may say less.
 */
export const readLostDetails = (value: unknown): LostDetails => {
  const v = asRecord(value) ?? {};
  const progress = v.last_progress ?? v.lastProgress;
  return {
    started: typeof v.started === "boolean" ? v.started : null,
    lastProgress: typeof progress === "number" ? progress : null,
    effects: typeof v.effects === "string" ? v.effects.toUpperCase() : null,
    reason: typeof v.reason === "string" && v.reason ? v.reason : null,
  };
};

/**
 * Whether running a lost task again could repeat something in the world. Safe
 * when it never started (nothing ran), or when its implementation declares
 * NONE / REPEATABLE effects. An unknown `started` counts as started, and an
 * undeclared `effects` as UNKNOWN: the server's own default.
 */
export const isRiskyRerun = (lost: LostDetails): boolean =>
  lost.started !== false &&
  (lost.effects === null ||
    lost.effects === "UNKNOWN" ||
    lost.effects === "IRREVERSIBLE");

/** The LOST event of a task, if it ended LOST. */
export const findLostEvent = <E extends { kind: TaskEventKind }>(
  events: readonly E[],
): E | undefined => events.find((e) => e.kind === TaskEventKind.Lost);

// ---------------------------------------------------------------------------
// EFFECT

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "medium",
});

const formatEpochSeconds = (value: unknown): string | null =>
  typeof value === "number" && Number.isFinite(value)
    ? TIME_FORMAT.format(value * 1000)
    : null;

const shortJson = (value: unknown, max = 60): string => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text === undefined) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

/**
 * One line for an EFFECT event: a value a workflow took from outside itself
 * (`task.now()`, `task.random()`, `task.sleep()`, `task.record()`, a hold a
 * person resumed), recorded so a resumed run gets the same value back.
 */
export const describeEffect = (event: {
  effect?: string | null;
  key?: string | null;
  value?: unknown;
}): string => {
  const kind = event.effect?.toUpperCase() ?? null;
  switch (kind) {
    case "NOW":
      return `took the time ${formatEpochSeconds(event.value) ?? shortJson(event.value)}`;
    case "SLEEP":
      return `sleeps until ${formatEpochSeconds(event.value) ?? shortJson(event.value)}`;
    case "RANDOM": {
      const hex = typeof event.value === "string" ? event.value : "";
      return `drew random ${hex.length > 12 ? `${hex.slice(0, 12)}…` : hex}`;
    }
    case "HOLD":
      return "hold resumed by a person";
    case "RECORD":
      return `recorded ${event.value === undefined ? "" : shortJson(event.value)}`.trim();
    default:
      return `${kind ?? "effect"} ${shortJson(event.value)}`.trim();
  }
};
