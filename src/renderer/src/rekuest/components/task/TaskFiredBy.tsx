import { RekuestSchedule, RekuestTrigger } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { DetailTaskFragment } from "@/rekuest/api/graphql";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { AlarmClock, Zap } from "lucide-react";

/**
 * Why this task exists, when nobody started it by hand: the schedule whose
 * slot it is, or the trigger that fired it and the object whose signal set
 * it off. Nothing for any other task.
 */
export const TaskFiredBy = ({ task }: { task: DetailTaskFragment }) => {
  const { schedule, trigger, signal } = task;
  if (schedule) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <AlarmClock className="h-3.5 w-3.5 shrink-0" />
        Scheduled by
        <RekuestSchedule.DetailLink object={schedule} className="font-medium text-foreground hover:underline">
          {schedule.name}
        </RekuestSchedule.DetailLink>
      </div>
    );
  }
  if (!trigger) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <Zap className="h-3.5 w-3.5 shrink-0" />
      Fired by
      <RekuestTrigger.DetailLink object={trigger} className="font-medium text-foreground hover:underline">
        {trigger.name}
      </RekuestTrigger.DetailLink>
      {signal && (
        <>
          when
          <StructureDisplay
            identifier={signal.identifier}
            id={signal.object}
            variant="inline"
            link
            fallback={
              <span className="font-mono">
                {signal.identifier} #{signal.object}
              </span>
            }
          />
          was {KIND_LABELS[signal.kind]}
        </>
      )}
    </div>
  );
};
