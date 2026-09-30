import { RekuestAction, RekuestAgent, RekuestSchedule } from "@/core/linkers";
import { Card } from "@/core/ui/card";
import Timestamp from "@/core/ui/timestamp";
import { ListScheduleFragment } from "@/rekuest/api/graphql";
import { scheduleState } from "@/rekuest/lib/automationStatus";
import { describeCadence } from "@/rekuest/lib/cron";
import React from "react";
import { AutomationStatus } from "./AutomationStatus";

const ScheduleCard = ({ item }: { item: ListScheduleFragment }) => {
  const state = scheduleState(item);

  return (
    <RekuestSchedule.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <RekuestSchedule.DetailLink
            object={item}
            className="min-w-0 truncate text-sm font-medium leading-tight transition-colors hover:text-primary"
          >
            {item.name}
          </RekuestSchedule.DetailLink>
          <AutomationStatus state={state} />
        </div>

        <p className="truncate text-xs text-muted-foreground">{describeCadence(item)}</p>

        {state === "failing" && item.lastError && (
          <p className="line-clamp-2 text-xs text-destructive/80" title={item.lastError}>
            {item.lastError}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground/60">
          <RekuestAction.DetailLink
            object={item.action}
            className="min-w-0 truncate transition-colors hover:text-foreground"
          >
            {item.action.name}
          </RekuestAction.DetailLink>
          {state === "waiting" && item.nextRun?.notBefore ? (
            <span className="shrink-0">
              next <Timestamp date={item.nextRun.notBefore} relative />
            </span>
          ) : (
            item.agent && (
              <RekuestAgent.DetailLink
                object={item.agent}
                className="shrink-0 truncate transition-colors hover:text-foreground"
              >
                {item.agent.name}
              </RekuestAgent.DetailLink>
            )
          )}
        </div>
      </Card>
    </RekuestSchedule.Smart>
  );
};

export default React.memo(ScheduleCard);
