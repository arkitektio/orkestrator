import { ScheduleOverlap, SignalKind } from "@/rekuest/api/graphql";
import { AutomationKind } from "@/rekuest/lib/automation";
import { CadenceDraft, cadenceFromSchedule } from "@/rekuest/lib/cron";
import { ConditionDraft, fromWireConditions } from "@/rekuest/lib/triggerConditions";

export type SignalWhen = { identifier: string; kind: SignalKind };

export type Pin = { agent: string; interface: string };

/**
 * What the builder starts from: nothing but a kind, an action's menu
 * ("Schedule…"), a signal on the feed, or a whole rule being edited or
 * duplicated.
 */
export type AutomationInitial = {
  kind?: AutomationKind;
  action?: string;
  name?: string;
  args?: Record<string, unknown>;
  enabled?: boolean;
  cadence?: CadenceDraft;
  ephemeralRuns?: boolean;
  when?: SignalWhen;
  conditions?: ConditionDraft[];
  port?: string;
  pin?: Pin | null;
  description?: string | null;
  /** When the rule stops by itself: a date, a number of runs, or neither. */
  endsAt?: string | null;
  maxRuns?: number | null;
  /** Clock: a slot may start while the last run is still open. */
  allowOverlap?: boolean;
  /** Clock: slots missed during downtime are run late instead of skipped. */
  catchUp?: boolean;
  /** Signal: fire at most once per object within this many seconds. */
  debounceSeconds?: number | null;
};

type Limits = { description?: string | null; endsAt?: string | null; maxRuns?: number | null };

const limitsOf = (rule: Limits) => ({
  description: rule.description ?? null,
  endsAt: rule.endsAt ?? null,
  maxRuns: rule.maxRuns ?? null,
});

const pinOf = (rule: { agent?: { id: string } | null; interface?: string | null }): Pin | null =>
  rule.agent && rule.interface ? { agent: rule.agent.id, interface: rule.interface } : null;

const argsOf = (args: unknown): Record<string, unknown> =>
  args && typeof args === "object" ? (args as Record<string, unknown>) : {};

export const initialFromSchedule = (schedule: {
  name: string;
  enabled: boolean;
  args?: unknown;
  cron?: string | null;
  intervalSeconds?: number | null;
  timezone: string;
  ephemeralRuns: boolean;
  overlap?: ScheduleOverlap;
  catchUp?: boolean;
  description?: string | null;
  endsAt?: string | null;
  maxRuns?: number | null;
  interface?: string | null;
  action: { id: string };
  agent?: { id: string } | null;
}): AutomationInitial => ({
  kind: "clock",
  action: schedule.action.id,
  name: schedule.name,
  args: argsOf(schedule.args),
  enabled: schedule.enabled,
  cadence: cadenceFromSchedule(schedule),
  ephemeralRuns: schedule.ephemeralRuns,
  pin: pinOf(schedule),
  ...limitsOf(schedule),
  allowOverlap: schedule.overlap === ScheduleOverlap.Allow,
  catchUp: schedule.catchUp ?? false,
});

export const initialFromTrigger = (trigger: {
  name: string;
  enabled: boolean;
  args?: unknown;
  identifier: string;
  kind: SignalKind;
  port: string;
  conditions?: unknown;
  description?: string | null;
  endsAt?: string | null;
  maxRuns?: number | null;
  debounceSeconds?: number | null;
  interface?: string | null;
  action: { id: string };
  agent?: { id: string } | null;
}): AutomationInitial => ({
  kind: "signal",
  action: trigger.action.id,
  name: trigger.name,
  args: argsOf(trigger.args),
  enabled: trigger.enabled,
  when: { identifier: trigger.identifier, kind: trigger.kind },
  conditions: fromWireConditions(trigger.conditions),
  port: trigger.port,
  pin: pinOf(trigger),
  ...limitsOf(trigger),
  debounceSeconds: trigger.debounceSeconds ?? null,
});
