import { RekuestAction, RekuestTrigger } from "@/core/linkers";
import { Card } from "@/core/ui/card";
import { ListTriggerFragment } from "@/rekuest/api/graphql";
import { triggerState } from "@/rekuest/lib/automationStatus";
import {
  KIND_LABELS,
  describeCondition,
  fromWireConditions,
} from "@/rekuest/lib/triggerConditions";
import React from "react";
import { AutomationStatus } from "./AutomationStatus";

const TriggerCard = ({ item }: { item: ListTriggerFragment }) => {
  const state = triggerState(item);
  const conditions = fromWireConditions(item.conditions);

  return (
    <RekuestTrigger.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <RekuestTrigger.DetailLink
            object={item}
            className="min-w-0 truncate text-sm font-medium leading-tight transition-colors hover:text-primary"
          >
            {item.name}
          </RekuestTrigger.DetailLink>
          <AutomationStatus state={state} />
        </div>

        <p className="truncate text-xs text-muted-foreground">
          On <span className="font-mono">{item.identifier}</span> {KIND_LABELS[item.kind]}
          {conditions.length > 0 && <> · {conditions.map(describeCondition).join(", ")}</>}
        </p>

        {state === "failing" && item.lastError && (
          <p className="line-clamp-2 text-xs text-destructive/80" title={item.lastError}>
            {item.lastError}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-muted-foreground/60">
          <RekuestAction.DetailLink
            object={item.action}
            className="min-w-0 truncate transition-colors hover:text-foreground"
          >
            → {item.action.name}
          </RekuestAction.DetailLink>
        </div>
      </Card>
    </RekuestTrigger.Smart>
  );
};

export default React.memo(TriggerCard);
