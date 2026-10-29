import { TaskEventKind } from "../api/graphql";

/**
 * What waits for a person's decision, read off a HELD event.
 *
 * The server writes HELD on the task that waits — a child an agent asked for,
 * or a task that holds itself — and, for a child, the same event with `held`
 * (the child's id) on its parent and root. So a pill or a task page watching
 * the parent finds the child to `decide` without looking for descendants.
 *
 * `title` / `description` are the agent's own words; `action`, `agent` and
 * `args` are what the server knows for certain and are shown beside them.
 */
export interface HoldRequest {
  /** The held task: the one `decide` answers. */
  task: string;
  kind: "assign" | "self";
  title: string;
  description?: string | null;
  action?: { id: string; name: string; hash?: string | null } | null;
  agent?: { id: string; name: string } | null;
  callerAgent?: { id: string; name: string } | null;
  args?: unknown;
  /** A task's hold through a blok (an ask): the materialization the person answers in. */
  blok?: string | null;
}

type HoldEvent = {
  kind: TaskEventKind;
  value?: unknown;
  message?: string | null;
  task: { id: string };
};

type Named = { id: string; name: string };

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const named = (value: unknown): Named | null => {
  const r = record(value);
  return r && r.id != null ? { id: String(r.id), name: String(r.name ?? r.id) } : null;
};

/** The task a HELD or DECIDED event is about: `held` on a parent, else its own. */
const heldTaskOf = (event: HoldEvent): string => {
  const held = record(event.value)?.held;
  return held != null ? String(held) : event.task.id;
};

export const holdFromEvent = (event: HoldEvent): HoldRequest | null => {
  if (event.kind !== TaskEventKind.Held) return null;
  const value = record(event.value) ?? {};
  const prompt = record(value.prompt);
  const action = named(value.action);
  const callerAgent = named(value.caller_agent);
  return {
    task: heldTaskOf(event),
    kind: value.kind === "self" ? "self" : "assign",
    title:
      (prompt?.title as string | undefined) ||
      event.message ||
      (action ? `Run ${action.name}` : "Waiting for your decision"),
    description: (prompt?.description as string | null | undefined) ?? null,
    action: action && { ...action, hash: (record(value.action)?.hash as string) ?? null },
    agent: named(value.agent),
    callerAgent,
    args: value.args,
    ...(value.blok != null ? { blok: String(value.blok) } : {}),
  };
};

/** A blok a task showed while it carried on (an INFORM event). */
export interface TaskInform {
  task: string;
  /** The materialization it shows. */
  blok: string;
  message?: string | null;
}

/** What an INFORM event shows, or null for any other event. */
export const informFromEvent = (event: HoldEvent): TaskInform | null => {
  if (event.kind !== TaskEventKind.Inform) return null;
  const blok = record(event.value)?.blok;
  return blok != null ? { task: event.task.id, blok: String(blok), message: event.message ?? null } : null;
};

/** The held task a DECIDED event answers, or null for any other event. */
export const decidedTaskOf = (event: HoldEvent): string | null =>
  event.kind === TaskEventKind.Decided ? heldTaskOf(event) : null;

/** How a hold was answered: by a person, or at once because the run is in auto-mode. */
export interface HoldDecision {
  /** The held task it answers. */
  task: string;
  approved: boolean;
  /** Nobody was asked: the run is in auto-mode. */
  auto: boolean;
  /** What the person wrote with it, if anything. */
  answer?: string | null;
  /** What they answered through the hold's blok, by its returns. */
  values?: Record<string, unknown> | null;
  /** Who decided (their sub); none in auto-mode. */
  user?: string | null;
}

/** The decision a DECIDED event carries (`{approved, answer, auto, user}`), or null. */
export const decisionFromEvent = (event: HoldEvent): HoldDecision | null => {
  const task = decidedTaskOf(event);
  if (!task) return null;
  const value = record(event.value) ?? {};
  return {
    task,
    approved: value.approved !== false,
    auto: value.auto === true,
    answer: typeof value.answer === "string" && value.answer.trim() ? value.answer : null,
    ...(record(value.values) ? { values: record(value.values) } : {}),
    ...(typeof value.user === "string" ? { user: value.user } : {}),
  };
};

/** Add or drop a hold as a HELD / DECIDED event arrives; the same array when neither. */
export const applyHoldEvent = (
  holds: readonly HoldRequest[],
  event: HoldEvent,
): readonly HoldRequest[] => {
  const hold = holdFromEvent(event);
  if (hold) return [...holds.filter((h) => h.task !== hold.task), hold];
  const decided = decidedTaskOf(event);
  if (decided) return holds.filter((h) => h.task !== decided);
  return holds;
};

/** What still waits, from a task's events (in any order: they are sorted here). */
export const pendingHolds = (
  events: readonly (HoldEvent & { createdAt?: string | null })[],
): HoldRequest[] =>
  [...events]
    .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")))
    .reduce<readonly HoldRequest[]>(applyHoldEvent, [])
    .slice();

/** Why a task's open asks can no longer be answered: it is being stopped, or it ended. */
export type AskClosed = "cancelling" | "interrupting" | "ended";

// The task's endings (`TERMINAL_EVENT_KINDS` in taskTracker, kept here so this stays a leaf).
const ENDED_KINDS: readonly TaskEventKind[] = [
  TaskEventKind.Completed,
  TaskEventKind.Cancelled,
  TaskEventKind.Critical,
  TaskEventKind.Failed,
  TaskEventKind.Interrupted,
  TaskEventKind.Lost,
  TaskEventKind.Denied,
];

/**
 * Whether `task`'s open asks are closed, and why; null while they can be
 * answered. Once a cancel or interrupt is asked for, an answer would reach a
 * task that is going away, so nothing takes one from then on.
 */
export const askClosed = (task: {
  isDone?: boolean | null;
  latestEventKind?: TaskEventKind | null;
  events?: readonly { kind: TaskEventKind }[] | null;
}): AskClosed | null => {
  const kinds = [
    ...(task.latestEventKind ? [task.latestEventKind] : []),
    ...(task.events ?? []).map((event) => event.kind),
  ];
  if (task.isDone || kinds.some((kind) => ENDED_KINDS.includes(kind))) return "ended";
  if (kinds.includes(TaskEventKind.Cancelling)) return "cancelling";
  if (kinds.includes(TaskEventKind.Interrupting)) return "interrupting";
  return null;
};

/** {@link AskClosed} as the sentence a closed ask shows in place of its buttons. */
export const askClosedText = (closed: AskClosed): string =>
  closed === "cancelling"
    ? "The task is being cancelled: this can no longer be answered."
    : closed === "interrupting"
      ? "The task is being interrupted: this can no longer be answered."
      : "The task has ended: this can no longer be answered.";
