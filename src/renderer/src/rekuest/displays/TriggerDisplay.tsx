import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Zap } from "lucide-react";
import { useTriggerQuery } from "../api/graphql";
import { STATE_LABELS, triggerState } from "../lib/automationStatus";
import { KIND_LABELS } from "../lib/triggerConditions";

/** `@rekuest/trigger` elsewhere: what it listens for, its state and action. */
export const TriggerDisplay = (props: DisplayWidgetProps) => {
  const { data } = useTriggerQuery({ variables: { id: props.id } });
  const trigger = data?.trigger;
  if (!trigger) return <DisplayLinePlaceholder {...props} icon={Zap} />;

  return (
    <DisplayLine
      {...props}
      icon={Zap}
      title={trigger.name || trigger.action.name}
      meta={[
        STATE_LABELS[triggerState(trigger)],
        `on ${KIND_LABELS[trigger.kind].toLowerCase()} of ${trigger.identifier}`,
      ]}
    />
  );
};
