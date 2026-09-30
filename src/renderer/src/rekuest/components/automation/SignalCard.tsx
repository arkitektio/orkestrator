import { useDialog } from "@/core/dialogs/registry";
import { RekuestTask } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import Timestamp from "@/core/ui/timestamp";
import { ListSignalFragment } from "@/rekuest/api/graphql";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { Zap } from "lucide-react";
import React from "react";

const shortValue = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);

/**
 * One signal: the object (shown by the module that owns it), what happened
 * to it, and the runs it fired. Hovering offers a trigger on signals like it.
 */
const SignalCard = ({ item }: { item: ListSignalFragment }) => {
  const { openDialog } = useDialog();
  const descriptors = Object.entries((item.descriptors ?? {}) as Record<string, unknown>);
  const firstRun = item.runs[0];

  return (
    <Card className="group relative flex h-full flex-col gap-1.5 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-medium leading-tight">
          <StructureDisplay
            identifier={item.identifier}
            id={item.object}
            variant="inline"
            link
            fallback={
              <span className="font-mono text-xs">
                {item.identifier} #{item.object}
              </span>
            }
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{KIND_LABELS[item.kind]}</span>
      </div>

      <p className="truncate text-xs text-muted-foreground" title={descriptors.map(([k, v]) => `${k} = ${shortValue(v)}`).join("\n")}>
        {item.service}
        {descriptors.length > 0 && (
          <> · {descriptors.slice(0, 3).map(([k, v]) => `${k}=${shortValue(v)}`).join(" ")}</>
        )}
      </p>

      {item.causingTask && (
        <RekuestTask.DetailLink
          object={item.causingTask}
          className="truncate text-xs text-muted-foreground hover:text-foreground"
        >
          from {item.causingTask.action.name}
        </RekuestTask.DetailLink>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground/60">
        <Timestamp date={item.occurredAt ?? item.receivedAt} relative />
        {firstRun && (
          <RekuestTask.DetailLink object={firstRun} className="truncate hover:text-foreground">
            → {firstRun.action.name}
            {item.runs.length > 1 && ` +${item.runs.length - 1}`}
          </RekuestTask.DetailLink>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1.5 top-1.5 h-6 w-6 bg-card opacity-0 transition-opacity group-hover:opacity-100"
        title="New trigger on signals like this"
        onClick={() =>
          openDialog("createtrigger", { identifier: item.identifier, kind: item.kind }, { size: "medium" })
        }
      >
        <Zap className="h-3.5 w-3.5" />
      </Button>
    </Card>
  );
};

export default React.memo(SignalCard);
