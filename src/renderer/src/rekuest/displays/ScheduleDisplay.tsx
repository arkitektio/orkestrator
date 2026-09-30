import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { CalendarClock } from "lucide-react";
import { useScheduleQuery } from "../api/graphql";
import { STATE_LABELS, scheduleState } from "../lib/automationStatus";
import { describeCadence } from "../lib/cron";

/** `@rekuest/schedule` elsewhere: its cadence, state and action. */
export const ScheduleDisplay = (props: DisplayWidgetProps) => {
  const { data } = useScheduleQuery({ variables: { id: props.id } });
  const schedule = data?.schedule;
  if (!schedule) return <DisplayLinePlaceholder {...props} icon={CalendarClock} />;

  return (
    <DisplayLine
      {...props}
      icon={CalendarClock}
      title={schedule.name || schedule.action.name}
      meta={[STATE_LABELS[scheduleState(schedule)], describeCadence(schedule), schedule.agent?.name]}
    />
  );
};
