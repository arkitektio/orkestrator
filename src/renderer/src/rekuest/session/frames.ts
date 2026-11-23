import { applyPatch, type Operation } from "fast-json-patch";
import {
  AgentKind,
  JsonPatchOperation,
  TaskEventKind,
  TaskInstructKind,
  type AgentChangeFragment,
  type AssignInput,
  type StatePatchEventFragment,
  type StateSnapshotEventFragment,
  type TaskChangeFragment,
  type TaskEventChangeFragment,
} from "../api/graphql";

/**
 * The frames of a caller session on takt (`/rekuest/session`), as the wire
 * carries them: snake_case, like the agent protocol. The contract is takt's
 * `tests/fixtures/session_wire_examples.json` (copied beside this file, tested
 * in `frames.test.ts`); the protocol is takt's `docs/session-protocol.md`.
 *
 * Items are the payloads the change feeds carry (`TaskEventPayload`,
 * `TaskChangePayload`, `PatchEvent`, `AgentChange`); the `to…` functions below
 * turn them into the generated GraphQL fragment shapes, so every cache writer
 * that took a subscription's payload takes a session's unchanged.
 */

export type SessionLimits = {
  session_grace: number;
  ping_interval: number;
  replay_max: number;
  deadman_min: number;
};

/** Everything a call frame carries but its `request` id (added by the session). */
export type CallFrame =
  | { type: "ASSIGN"; input: WireAssignInput; deadman?: number | null }
  | { type: "CANCEL" | "INTERRUPT" | "PAUSE" | "INQUIRE"; task: string }
  | { type: "RESUME"; task: string; step?: boolean }
  | {
      type: "DECIDE";
      task: string;
      approved: boolean;
      answer?: string | null;
      values?: Record<string, unknown> | null;
      remember?: string | null;
    }
  | { type: "DEADMAN"; task: string; seconds: number | null }
  | { type: "PROBE"; input: Record<string, unknown> }
  | { type: "PROBE_CANCEL" | "PROBE_PAUSE" | "PROBE_RESUME"; probe: string };

export type ClientFrame =
  | {
      type: "HELLO";
      token: string;
      session?: string | null;
      last_pos?: number;
      client_info?: Record<string, unknown>;
    }
  | { type: "REAUTH"; token: string }
  | { type: "WATCH" | "UNWATCH"; topic: string }
  | { type: "PING"; pos?: number }
  | (CallFrame & { request: string });

export type AssignedAnswer = {
  type: "ASSIGNED";
  pos: number;
  request: string;
  reference: string;
  task: string;
  created: boolean;
  record: WireTaskChange | null;
};
export type AcceptedAnswer = { type: "ACCEPTED"; pos: number; request: string; result?: unknown };
export type Answer = AssignedAnswer | AcceptedAnswer;

export type ServerFrame =
  | { type: "WELCOME"; session: string; resumed: boolean; limits: SessionLimits }
  | { type: "DATA"; pos: number; topic: string; item: unknown }
  | { type: "RESYNC"; pos: number; topic: string; reason: string; snapshot: unknown }
  | AssignedAnswer
  | AcceptedAnswer
  | { type: "REFUSED"; pos: number; request?: string; topic?: string; error: string }
  | { type: "PONG" }
  | { type: "CLOSING"; reason: string };

/** Close codes a session socket ends with (takt `session::frames::close`). */
export const CLOSE = {
  PROTOCOL: 4400,
  UNAUTHORIZED: 4401,
  IDLE: 4408,
  UNAVAILABLE: 4503,
} as const;

// -------------------------------------------------------------------------------------------
// items

export type WireTaskEvent = {
  id: string;
  task: string;
  kind: string;
  message?: string | null;
  progress?: number | null;
  returns?: unknown;
  level?: string | null;
  value?: unknown;
  created_at: string;
  task_seq?: number | null;
};

export type WireTaskChange = {
  id: string;
  reference?: string | null;
  is_done: boolean;
  latest_event_kind: string;
  latest_instruct_kind: string;
  action: string;
  implementation?: string | null;
  agent?: string | null;
  root?: string | null;
  parent?: string | null;
  created_at: string;
  updated_at: string;
  finished_at?: string | null;
  revision: number;
};

export type WirePatch = {
  create?: number;
  state: number;
  agent?: number | null;
  interface: string;
  ops: { op: string; path: string; value?: unknown }[];
  global_rev: number;
  session?: number | null;
  timestamp?: string | null;
};

export type WireAgentChange = {
  id: string;
  name: string;
  kind: string;
  connected: boolean;
  blocked: boolean;
  last_seen?: string | null;
  client: string;
  user: string;
  organization: string;
  app?: string | null;
  release?: string | null;
};

export const toTaskEventChange = (event: WireTaskEvent): TaskEventChangeFragment => ({
  __typename: "TaskEventChange",
  id: event.id,
  task: event.task,
  taskSeq: event.task_seq ?? null,
  kind: event.kind as TaskEventKind,
  message: event.message ?? null,
  progress: event.progress ?? null,
  returns: event.returns ?? null,
  value: event.value ?? null,
  createdAt: event.created_at,
});

export const toTaskChange = (task: WireTaskChange): TaskChangeFragment => ({
  __typename: "TaskChange",
  id: task.id,
  reference: task.reference ?? null,
  isDone: task.is_done,
  latestEventKind: task.latest_event_kind as TaskEventKind,
  latestInstructKind: task.latest_instruct_kind as TaskInstructKind,
  action: task.action,
  implementation: task.implementation ?? null,
  agent: task.agent ?? null,
  root: task.root ?? null,
  parent: task.parent ?? null,
  createdAt: task.created_at,
  updatedAt: task.updated_at,
  finishedAt: task.finished_at ?? null,
});

export const toAgentChange = (agent: WireAgentChange): AgentChangeFragment => ({
  __typename: "AgentChange",
  id: agent.id,
  name: agent.name,
  kind: agent.kind as AgentKind,
  connected: agent.connected,
  blocked: agent.blocked,
  lastSeen: agent.last_seen ?? null,
  client: agent.client,
  user: agent.user,
  organization: agent.organization,
  app: agent.app ?? "",
  release: agent.release ?? "",
});

export const toStatePatchEvent = (patch: WirePatch): StatePatchEventFragment => ({
  __typename: "StatePatchEvent",
  stateId: String(patch.state),
  agentId: patch.agent == null ? "" : String(patch.agent),
  interface: patch.interface,
  globalRevision: patch.global_rev,
  sessionId: patch.session == null ? null : String(patch.session),
  timestamp: patch.timestamp ?? null,
  ops: patch.ops.map((op) => ({
    __typename: "JSONPatch",
    op: op.op as JsonPatchOperation,
    path: op.path,
    value: op.value ?? null,
  })),
});

// -------------------------------------------------------------------------------------------
// snapshots

/** A task topic's snapshot: its record, its newest events (oldest first), its counter. */
export type TaskSnapshot = {
  task: WireTaskChange | null;
  events: WireTaskEvent[];
  task_seq: number;
};

/** A list topic's snapshot: its rows as they are now. */
export type ListSnapshot<T> = { rows: T[] };

/** One state in a state topic's snapshot: its newest snapshot and the patches after it. */
export type WireStateValue = {
  state: number;
  value: { base: unknown; base_rev: number; patches: WirePatch[] };
};

/** A state topic's snapshot (`state:` one state, `states:` all of an agent's). */
export type StatesSnapshot = {
  agent: number;
  session: number | null;
  global_rev: number;
  states: Record<string, WireStateValue>;
};

/** A state's value: its snapshot with the patches after it applied, in order. */
export const materialize = (state: WireStateValue["value"]): unknown => {
  let value: unknown = structuredClone(state.base ?? {});
  for (const patch of state.patches) {
    try {
      value = applyPatch(value, patch.ops as Operation[], false, false).newDocument;
    } catch (e) {
      // A patch that does not apply is a broken history; the rest still applies (as the
      // server materializes it).
      console.warn("[rekuest] a state patch did not apply:", e);
    }
  }
  return value;
};

/** One state of a snapshot as the `watchState` feed's first event. */
export const toStateSnapshotEvent = (
  snapshot: StatesSnapshot,
  stateInterface: string,
): StateSnapshotEventFragment | null => {
  const state = snapshot.states[stateInterface];
  if (!state) return null;
  return {
    __typename: "StateSnapshotEvent",
    stateId: String(state.state),
    agentId: String(snapshot.agent),
    interface: stateInterface,
    value: materialize(state.value),
    globalRevision: snapshot.global_rev,
    sessionId: snapshot.session == null ? null : String(snapshot.session),
    timestamp: null,
  };
};

/** Every state of a snapshot, by interface (the `watchAgent` feed's first event). */
export const materializeAll = (snapshot: StatesSnapshot): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(snapshot.states).map(([name, state]) => [name, materialize(state.value)]),
  );

// -------------------------------------------------------------------------------------------
// calls

/** An assign as the session takes it: the GraphQL `AssignInput`, its fields in snake_case. */
export type WireAssignInput = Record<string, unknown>;

const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/**
 * The GraphQL `AssignInput` as the session's `ASSIGN` takes it: field names in
 * snake_case, recursively through the input's own structures, but never inside
 * `args` or a value the caller filled in (those keys are port keys and data).
 */
export const toWireAssignInput = (input: AssignInput): WireAssignInput => {
  const VERBATIM = new Set(["args", "values", "value"]);
  const convert = (value: unknown, verbatim: boolean): unknown => {
    if (verbatim || value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((item) => convert(item, false));
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([key, v]) => [snake(key), convert(v, VERBATIM.has(key))]),
    );
  };
  return convert(input, false) as WireAssignInput;
};
