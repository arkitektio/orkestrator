import { SignalKind, useScheduleQuery, useTriggerQuery } from "@/rekuest/api/graphql";
import { AutomationKind } from "@/rekuest/lib/automation";
import { useMemo } from "react";
import {
  AutomationBuilder,
  BuilderError,
  BuilderLoading,
} from "../components/automation/builder/AutomationBuilder";
import {
  AutomationInitial,
  initialFromSchedule,
  initialFromTrigger,
} from "../components/automation/builder/initial";

/**
 * A new rule: an action on a clock, or on a signal. Opened bare ("New
 * automation"), from an action's menu (`action`, with the `kind` it asked
 * for), from a signal (`identifier`, `signalKind` and its descriptors as
 * `sample`), or as a copy of a saved rule (`initial`).
 */
export const CreateAutomationDialog = (props: {
  kind?: AutomationKind;
  action?: string;
  identifier?: string;
  signalKind?: SignalKind;
  sample?: Record<string, unknown>;
  initial?: AutomationInitial;
}) => {
  const initial = useMemo<AutomationInitial>(
    () =>
      props.initial ?? {
        kind: props.kind ?? (props.identifier ? "signal" : "clock"),
        action: props.action,
        when: props.identifier
          ? { identifier: props.identifier, kind: props.signalKind ?? SignalKind.Created }
          : undefined,
      },
    [props.initial, props.kind, props.action, props.identifier, props.signalKind],
  );
  return <AutomationBuilder initial={initial} sample={props.sample} />;
};

export const EditScheduleDialog = ({ id }: { id: string }) => {
  const { data, error, refetch } = useScheduleQuery({ variables: { id } });
  const schedule = data?.schedule;
  const initial = useMemo(() => (schedule ? initialFromSchedule(schedule) : null), [schedule]);
  if (!schedule && error) {
    return <BuilderError title="Edit automation" error={error} onRetry={() => refetch()} />;
  }
  if (!schedule || !initial) return <BuilderLoading title="Edit automation" />;
  return (
    <AutomationBuilder initial={initial} existing={{ kind: "clock", id: schedule.id }} />
  );
};

export const EditTriggerDialog = ({ id }: { id: string }) => {
  const { data, error, refetch } = useTriggerQuery({ variables: { id } });
  const trigger = data?.trigger;
  const initial = useMemo(() => (trigger ? initialFromTrigger(trigger) : null), [trigger]);
  if (!trigger && error) {
    return <BuilderError title="Edit automation" error={error} onRetry={() => refetch()} />;
  }
  if (!trigger || !initial) return <BuilderLoading title="Edit automation" />;
  return (
    <AutomationBuilder initial={initial} existing={{ kind: "signal", id: trigger.id }} />
  );
};
