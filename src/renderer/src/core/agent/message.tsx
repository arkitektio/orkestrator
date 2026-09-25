import { z } from "zod";

/**
 * Agent wire protocol — ported from the canonical Python reference
 * `rekuest_next/messages.py`. The client acts as an EXECUTOR: it publishes
 * implementations, receives ASSIGN, and reports STARTED/PROGRESS/LOG/YIELD/
 * COMPLETED/FAILED/CRITICAL back. Terminal reports are retained until the
 * backend sends an EVENT_ACK (persist-then-ack) and resent on reconnect.
 */

export const LogLevel = z.enum(["DEBUG", "INFO", "ERROR", "WARN", "CRITICAL"]);

/** How a participant intends to use the protocol (granted per token scopes). */
export const AgentMode = z.enum([
  "EXECUTOR",
  "CALLER",
  "ORCHESTRATOR",
  "OBSERVER",
]);
export type AgentMode = z.infer<typeof AgentMode>;

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
  "EVENT_ACK",
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
  // Reply messages should carry the same id; the backend correlates EVENT_ACK
  // against a report's id, so agent→backend events default-generate one.
  id: z.string().optional(),
});

/** Base for agent→backend reporting events that join the ack/resume stream. */
const FromAgentEvent = Message.extend({
  id: z.string().default(() => crypto.randomUUID()),
  // Monotonic per-connection stream sequence for at-least-once dedup/resume.
  seq: z.number().optional().nullable(),
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

export const EventAck = Message.extend({
  type: z.literal(ToAgentMessageType.enum.EVENT_ACK),
  event: z.string(),
  task: z.string().optional().nullable(),
  seq: z.number().optional().nullable(),
});

export const AssignInquiry = z.object({
  task: z.string(),
});

export const Init = Message.extend({
  type: z.literal(ToAgentMessageType.enum.INIT),
  agent: z.string(),
  inquiries: z.array(AssignInquiry).default([]),
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

export const Register = Message.extend({
  type: z.literal(FromAgentMessageType.enum.REGISTER),
  token: z.string(),
  force: z.boolean().default(false),
  mode: AgentMode.default(AgentMode.enum.EXECUTOR),
  session_id: z.string().optional().nullable(),
});

export const SessionInit = Message.extend({
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

export const HeartbeatEvent = Message.extend({
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
  EventAck,
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
]);

export type ToAgentMessage = z.infer<typeof ToAgentMessage>;
export type FromAgentMessage = z.infer<typeof FromAgentMessage>;
export type Assign = z.infer<typeof Assign>;
export type Init = z.infer<typeof Init>;
export type CancelMessage = z.infer<typeof Cancel>;
export type Heartbeat = z.infer<typeof Heartbeat>;
export type Register = z.infer<typeof Register>;
export type EventAck = z.infer<typeof EventAck>;
export type YieldEvent = z.infer<typeof YieldEvent>;
export type CompletedEvent = z.infer<typeof CompletedEvent>;
export type FailedEvent = z.infer<typeof FailedEvent>;
export type CriticalEvent = z.infer<typeof CriticalEvent>;
export type CancelledEvent = z.infer<typeof CancelledEvent>;
export type InterruptedEvent = z.infer<typeof InterruptedEvent>;
export type LogEvent = z.infer<typeof LogEvent>;
export type ProgressEvent = z.infer<typeof ProgressEvent>;
