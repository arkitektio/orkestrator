import { z } from "zod";

/**
 * Agent wire protocol — ported from the canonical Python reference
 * `rekuest_next/messages.py`. The client acts as an EXECUTOR: it publishes
 * implementations, receives ASSIGN, and reports STARTED/PROGRESS/LOG/YIELD/
 * COMPLETED/FAILED/CRITICAL back.
 *
 * Agent protocol 2: both directions are numbered and acknowledged. A report
 * carries `pos` in this process's `journal_session` and is kept until a
 * `JOURNAL_ACK` covers it; a command from the server carries `pos` and is
 * answered with `COMMAND_ACK`. See `journal.ts`.
 */

/**
 * The arkitekt-spec this agent's protocol is written against, sent on every
 * REGISTER as `spec_version` (what the Python agents send from
 * `arkitekt_spec.current_spec_version()`). takt refuses a REGISTER without one
 * (close 4006). Bump it when the agent is brought up to a newer spec.
 */
export const AGENT_SPEC_VERSION = "10.1.0";

/** The feature a server speaking agent protocol 2 requires of a REGISTER. */
export const FEATURE_PROTOCOL_2 = "protocol_2";

export const LogLevel = z.enum(["DEBUG", "INFO", "ERROR", "WARN", "CRITICAL"]);

/** What an agent knows of a task, when asked (`INQUIRE`). */
export const TaskStatus = z.enum([
  "UNKNOWN",
  "WAITING",
  "RUNNING",
  "PAUSED",
  "HELD",
  "ENDED",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const ToAgentMessageType = z.enum([
  "INIT",
  "ASSIGN",
  "CANCEL",
  "INTERRUPT",
  "PAUSE",
  "RESUME",
  "COLLECT",
  "HEARTBEAT",
  "BOUNCE",
  "KICK",
  "PROTOCOL_ERROR",
    "JOURNAL_ACK",
  "JOURNAL_NACK",
  "INQUIRE",
  "ASSIGN_RESPONSE",
]);

export const FromAgentMessageType = z.enum([
  "REGISTER",
  "SESSION_INIT",
  "LOG",
  "PROGRESS",
  "STARTED",
  "COMPLETED",
  "YIELD",
  "FAILED",
  "CRITICAL",
  "PAUSED",
  "RESUMED",
  "CANCELLED",
  "APP_CANCELLED",
  "INTERRUPTED",
    "HEARTBEAT_ANSWER",
  "COMMAND_ACK",
  "JOURNAL_SKIP",
  "INQUIRY_ANSWER",
]);

export const ShallowJSONSerializable = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.record(z.string(), z.any()),
  z.array(z.any()),
]);

export const Message = z.object({
  id: z.string().optional(),
  // A command's position in the server's stream to this agent: handled once per
  // position and answered with COMMAND_ACK. Absent on what is not a command
  // (INIT, HEARTBEAT, the acknowledgements, INQUIRE).
  pos: z.number().optional().nullable(),
});

/**
 * Base for every agent→backend frame: the backend refuses one without an `id`
 * (takt closes the socket with 3003, "does not match the schema").
 */
const FromAgentFrame = Message.extend({
  id: z.string().default(() => crypto.randomUUID()),
});

/** Base for agent→backend reports: numbered by the journal before they are sent. */
const FromAgentEvent = FromAgentFrame.extend({
  journal_session: z.string().optional().nullable(),
  agent_ts: z.number().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Server → Agent
// ---------------------------------------------------------------------------

export const Assign = Message.extend({
  type: z.literal(ToAgentMessageType.enum.ASSIGN),
  interface: z.string(),
  task: z.string(),
  implementation: z.string().optional().nullable(),
  action: z.string().optional().nullable(),
  root: z.string().optional().nullable(),
  parent: z.string().optional().nullable(),
  resolution: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  capture: z.boolean().optional().nullable(),
  step: z.boolean().optional().nullable(),
  args: z.record(z.string(), ShallowJSONSerializable),
  message: z.string().optional().nullable(),
  user: z.string().optional().nullable(),
  org: z.string().optional().nullable(),
  token: z.string().optional().nullable(),
});

export const Heartbeat = Message.extend({
  type: z.literal(ToAgentMessageType.enum.HEARTBEAT),
});

export const Pause = Message.extend({
  type: z.literal(ToAgentMessageType.enum.PAUSE),
  task: z.string(),
});

export const Resume = Message.extend({
  type: z.literal(ToAgentMessageType.enum.RESUME),
  task: z.string(),
});

export const Cancel = Message.extend({
  type: z.literal(ToAgentMessageType.enum.CANCEL),
  task: z.string(),
});

export const Collect = Message.extend({
  type: z.literal(ToAgentMessageType.enum.COLLECT),
  drawers: z.array(z.string()),
});

export const Interrupt = Message.extend({
  type: z.literal(ToAgentMessageType.enum.INTERRUPT),
  task: z.string(),
});

export const Bounce = Message.extend({
  type: z.literal(ToAgentMessageType.enum.BOUNCE),
  duration: z.number().optional().nullable(),
});

export const Kick = Message.extend({
  type: z.literal(ToAgentMessageType.enum.KICK),
  reason: z.string().optional().nullable(),
});

export const ProtocolError = Message.extend({
  type: z.literal(ToAgentMessageType.enum.PROTOCOL_ERROR),
  error: z.string(),
});

/** The server has every report of `journal_session` through `through`. */
export const JournalAck = Message.extend({
  type: z.literal(ToAgentMessageType.enum.JOURNAL_ACK),
  journal_session: z.string(),
  through: z.number(),
});

/** A gap: the server next takes position `expected` of `journal_session`. */
export const JournalNack = Message.extend({
  type: z.literal(ToAgentMessageType.enum.JOURNAL_NACK),
  journal_session: z.string(),
  expected: z.number(),
});

/** What does this agent know of `task`? Answered at once (`INQUIRY_ANSWER`). */
export const Inquire = Message.extend({
  type: z.literal(ToAgentMessageType.enum.INQUIRE),
  task: z.string(),
  request: z.string(),
});

export const Init = Message.extend({
  type: z.literal(ToAgentMessageType.enum.INIT),
  agent: z.string(),
  // The nonce of the REGISTER this answers: an INIT with another is of a
  // connection that is gone.
  nonce: z.string().optional().nullable(),
  // How far the server has each journal session the REGISTER named.
  positions: z.record(z.string(), z.number()).default({}),
});

export const AssignResponse = Message.extend({
  type: z.literal(ToAgentMessageType.enum.ASSIGN_RESPONSE),
  request: z.string(),
  reference: z.string().optional().nullable(),
  task: z.string().optional().nullable(),
  created: z.boolean().optional().nullable(),
  error: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Agent → Server
// ---------------------------------------------------------------------------

export const Register = FromAgentFrame.extend({
  type: z.literal(FromAgentMessageType.enum.REGISTER),
  token: z.string(),
  force: z.boolean().default(false),
    session_id: z.string().optional().nullable(),
  spec_version: z.string().min(1).default(AGENT_SPEC_VERSION),
  // A server on protocol 2 refuses a REGISTER that does not say so.
  features: z.array(z.string()).default([FEATURE_PROTOCOL_2]),
  // New for every connection attempt; INIT echoes it.
  nonce: z.string().default(() => crypto.randomUUID()),
  // The highest command position this process has handled.
  commands_seen: z.number().default(0),
  // The journal sessions this process still owes reports of.
  sessions: z.array(z.string()).default([]),
});

/** Every command through `through` has been handled. */
export const CommandAck = FromAgentFrame.extend({
  type: z.literal(FromAgentMessageType.enum.COMMAND_ACK),
  through: z.number(),
});

/** Positions `first`..`last` of `session` are no longer held: pass them over. */
export const JournalSkip = FromAgentFrame.extend({
  type: z.literal(FromAgentMessageType.enum.JOURNAL_SKIP),
  session: z.string(),
  first: z.number(),
  last: z.number(),
});

export const InquiryAnswer = FromAgentFrame.extend({
  type: z.literal(FromAgentMessageType.enum.INQUIRY_ANSWER),
  task: z.string(),
  request: z.string(),
  status: TaskStatus,
});

export const SessionInit = FromAgentFrame.extend({
  type: z.literal(FromAgentMessageType.enum.SESSION_INIT),
  session_id: z.string(),
  states: z.record(z.string(), z.any()).default({}),
});

export const StartedEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.STARTED),
  task: z.string(),
});

export const LogEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.LOG),
  task: z.string(),
  message: z.string(),
  level: LogLevel.default("INFO"),
});

export const ProgressEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.PROGRESS),
  task: z.string(),
  progress: z.number().optional().nullable(),
  message: z.string().optional().nullable(),
});

export const YieldEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.YIELD),
  task: z.string(),
  returns: z.record(z.string(), z.any()).optional().nullable(),
});

export const CompletedEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.COMPLETED),
  task: z.string(),
});

export const FailedEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.FAILED),
  task: z.string(),
  error: z.string(),
});

export const CriticalEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.CRITICAL),
  task: z.string(),
  error: z.string(),
});

export const CancelledEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.CANCELLED),
  task: z.string(),
});

export const InterruptedEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.INTERRUPTED),
  task: z.string(),
});

export const PausedEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.PAUSED),
  task: z.string(),
});

export const ResumedEvent = FromAgentEvent.extend({
  type: z.literal(FromAgentMessageType.enum.RESUMED),
  task: z.string(),
});

export const HeartbeatEvent = FromAgentFrame.extend({
  type: z.literal(FromAgentMessageType.enum.HEARTBEAT_ANSWER),
});

export const ToAgentMessage = z.discriminatedUnion("type", [
  Init,
  Assign,
  Cancel,
  Interrupt,
  Heartbeat,
  Pause,
  Resume,
  Collect,
  Bounce,
  Kick,
    ProtocolError,
  JournalAck,
  JournalNack,
  Inquire,
  AssignResponse,
]);

export const FromAgentMessage = z.discriminatedUnion("type", [
  Register,
  SessionInit,
  StartedEvent,
  LogEvent,
  ProgressEvent,
  YieldEvent,
  CompletedEvent,
  FailedEvent,
  CriticalEvent,
  CancelledEvent,
  InterruptedEvent,
  PausedEvent,
    ResumedEvent,
  HeartbeatEvent,
  CommandAck,
  JournalSkip,
  InquiryAnswer,
]);

export type ToAgentMessage = z.infer<typeof ToAgentMessage>;
export type FromAgentMessage = z.infer<typeof FromAgentMessage>;
export type Assign = z.infer<typeof Assign>;
export type Init = z.infer<typeof Init>;
export type CancelMessage = z.infer<typeof Cancel>;
export type Heartbeat = z.infer<typeof Heartbeat>;
export type Register = z.infer<typeof Register>;
export type InquireMessage = z.infer<typeof Inquire>;
export type YieldEvent = z.infer<typeof YieldEvent>;
export type CompletedEvent = z.infer<typeof CompletedEvent>;
export type FailedEvent = z.infer<typeof FailedEvent>;
export type CriticalEvent = z.infer<typeof CriticalEvent>;
export type CancelledEvent = z.infer<typeof CancelledEvent>;
export type InterruptedEvent = z.infer<typeof InterruptedEvent>;
export type LogEvent = z.infer<typeof LogEvent>;
export type ProgressEvent = z.infer<typeof ProgressEvent>;
