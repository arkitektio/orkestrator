import { useDialog } from "@/core/dialogs/registry";
import { RekuestSignal, RekuestTask, RekuestTrigger } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import Timestamp from "@/core/ui/timestamp";
import { ListSignalFragment } from "@/rekuest/api/graphql";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { Zap } from "lucide-react";
import React from "react";

const shortValue = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);

export const signalDescriptors = (signal: { descriptors?: unknown }) =>
  signal.descriptors && typeof signal.descriptors === "object"
    ? (signal.descriptors as Record<string, unknown>)
    : {};

/**
 * One signal: the object (shown by the module that owns it), what happened
 * to it, what it carried, and every run it fired, each named by its trigger.
 * Hovering offers a rule on signals like it, with its descriptors at hand as
 * conditions.
 */
const SignalRow = ({ item }: { item: ListSignalFragment }) => {
  const { openDialog } = useDialog();
  const descriptors = signalDescriptors(item);
  const entries = Object.entries(descriptors);

  return (
    <RekuestSignal.Smart object={item}>
      <div className="group relative grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_6rem] items-start gap-x-4 rounded-md px-3 py-2.5 hover:bg-muted/40">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium leading-5">
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
          <div className="truncate text-xs text-muted-foreground">
            {KIND_LABELS[item.kind]} · {item.serviceName}
            {item.causingTask && (
              <>
                {" · from "}
                <RekuestTask.DetailLink object={item.causingTask} className="hover:text-foreground">
                  {item.causingTask.action.name}
                </RekuestTask.DetailLink>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {entries.length > 0 && (
            <div
              className="truncate font-mono text-xs leading-5 text-muted-foreground"
              title={entries.map(([k, v]) => `${k} = ${shortValue(v)}`).join("\n")}
            >
              {entries.map(([k, v]) => `${k}=${shortValue(v)}`).join("  ")}
            </div>
          )}
          {item.runs.length > 0 && (
            <div className="flex flex-wrap gap-x-3 text-xs leading-5">
              {item.runs.map((run) => (
                <span key={run.id} className="min-w-0 truncate">
                  <span className="text-muted-foreground">→ </span>
                  <RekuestTask.DetailLink object={run} className="hover:text-primary">
                    {run.action.name}
                  </RekuestTask.DetailLink>
                  {run.trigger && (
                    <RekuestTrigger.DetailLink
                      object={run.trigger}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      ({run.trigger.name})
                    </RekuestTrigger.DetailLink>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <RekuestSignal.DetailLink
          object={item}
          className="truncate text-right text-xs leading-5 text-muted-foreground hover:text-foreground"
        >
          <Timestamp date={item.occurredAt ?? item.receivedAt} relative />
        </RekuestSignal.DetailLink>

        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 h-7 -translate-y-1/2 gap-1.5 border border-border/60 bg-background/95 px-2 text-xs opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() =>
            openDialog("createautomation", {
              kind: "signal",
              identifier: item.identifier,
              signalKind: item.kind,
              sample: descriptors,
            })
          }
        >
          <Zap className="h-3.5 w-3.5" />
          Run something on this
        </Button>
      </div>
    </RekuestSignal.Smart>
  );
};

export default React.memo(SignalRow);
