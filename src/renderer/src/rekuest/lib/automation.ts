import { SignalKind } from "../api/graphql";
import { AutomationState, scheduleState, triggerState } from "./automationStatus";
import { describeCadence } from "./cron";
import { KIND_LABELS, describeCondition, fromWireConditions } from "./triggerConditions";

/**
 * Schedules and triggers as one thing: a rule that runs an action, either on
 * a clock or on a signal. The list, the detail pages and the builder all
 * speak about a rule in these words, so they are made here once.
 */
export type AutomationKind = "clock" | "signal";

export const AUTOMATION_IDENTIFIER = {
  clock: "@rekuest/schedule",
  signal: "@rekuest/trigger",
} as const;

type Named = { id: string; name: string };

/** What every rule says about its own life: how often it ran, and its limits. */
type Lifetime = {
  exhausted?: boolean;
  runCount?: number;
  maxRuns?: number | null;
  lastRunAt?: string | null;
  lastErrorAt?: string | null;
};

export type ScheduleLike = Lifetime & {
  id: string;
  name: string;
  enabled: boolean;
  cron?: string | null;
  intervalSeconds?: number | null;
  timezone?: string | null;
  consecutiveFailures: number;
  lastError?: string | null;
  action: Named;
  agent?: Named | null;
  nextRun?: { notBefore?: string | null; isDone: boolean } | null;
};

export type TriggerLike = Lifetime & {
  id: string;
  name: string;
  enabled: boolean;
  identifier: string;
  kind: SignalKind;
  conditions?: unknown;
  consecutiveFailures: number;
  lastError?: string | null;
  action: Named;
  agent?: Named | null;
};

export type AutomationRow = {
  kind: AutomationKind;
  identifier: (typeof AUTOMATION_IDENTIFIER)[AutomationKind];
  id: string;
  name: string;
  /** What sets it off, in words: "At 09:00 on weekdays", "When @mikro/image is created". */
  when: string;
  /** The extra conditions of a signal rule, each in words. */
  onlyIf: string[];
  action: Named;
  agent: Named | null;
  enabled: boolean;
  state: AutomationState;
  /** When it last created a run. */
  lastRunAt: string | null;
  /** When its waiting run is due (a clock rule that is waiting). */
  nextAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  failures: number;
  /** Runs created so far, and how many it may create (a rule with a limit). */
  runCount: number;
  maxRuns: number | null;
};

/** "When @mikro/image is created". */
export const describeSignal = (identifier: string, kind: SignalKind) =>
  `When ${identifier} is ${KIND_LABELS[kind]}`;

export const scheduleRow = (schedule: ScheduleLike, now: number = Date.now()): AutomationRow => {
  const state = scheduleState(schedule, now);
  return {
    kind: "clock",
    identifier: AUTOMATION_IDENTIFIER.clock,
    id: schedule.id,
    name: schedule.name,
    when: describeCadence(schedule),
    onlyIf: [],
    action: schedule.action,
    agent: schedule.agent ?? null,
    enabled: schedule.enabled,
    state,
    lastRunAt: schedule.lastRunAt ?? null,
    nextAt: state === "waiting" ? (schedule.nextRun?.notBefore ?? null) : null,
    lastError: schedule.lastError ?? null,
    lastErrorAt: schedule.lastErrorAt ?? null,
    failures: schedule.consecutiveFailures,
    runCount: schedule.runCount ?? 0,
    maxRuns: schedule.maxRuns ?? null,
  };
};

export const triggerRow = (trigger: TriggerLike): AutomationRow => ({
  kind: "signal",
  identifier: AUTOMATION_IDENTIFIER.signal,
  id: trigger.id,
  name: trigger.name,
  when: describeSignal(trigger.identifier, trigger.kind),
  onlyIf: fromWireConditions(trigger.conditions).map(describeCondition),
  action: trigger.action,
  agent: trigger.agent ?? null,
  enabled: trigger.enabled,
  state: triggerState(trigger),
  lastRunAt: trigger.lastRunAt ?? null,
  nextAt: null,
  lastError: trigger.lastError ?? null,
  lastErrorAt: trigger.lastErrorAt ?? null,
  failures: trigger.consecutiveFailures,
  runCount: trigger.runCount ?? 0,
  maxRuns: trigger.maxRuns ?? null,
});

// What needs a look first: failing, then what is running, then the rest;
// paused and ended rules sink to the bottom.
const STATE_RANK: Record<AutomationState, number> = {
  failing: 0,
  running: 1,
  waiting: 2,
  idle: 2,
  paused: 3,
  ended: 3,
};

export const sortAutomations = (rows: readonly AutomationRow[]): AutomationRow[] =>
  [...rows].sort(
    (a, b) =>
      STATE_RANK[a.state] - STATE_RANK[b.state] ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );

/** A rule being built, as far as it is known: the builder's headline. */
export type DraftWords = {
  kind: AutomationKind;
  /** The cadence in words (clock). */
  cadence?: string;
  signal?: { identifier: string; kind: SignalKind };
  conditions?: string[];
  action?: string;
};

export const describeDraft = (draft: DraftWords): string => {
  const run = `run ${draft.action ?? "…"}`;
  if (draft.kind === "clock") return `${draft.cadence ?? "On a clock"}, ${run}`;
  if (!draft.signal) return `When something changes, ${run}`;
  const conditions = draft.conditions?.length ? ` and ${draft.conditions.join(" and ")}` : "";
  return `${describeSignal(draft.signal.identifier, draft.signal.kind)}${conditions}, ${run}`;
};
