import { RekuestSchedule, RekuestTrigger } from "@/core/linkers";
import { toast } from "@/core/notify";
import { CommandActionIcon } from "@/core/smart/extensions/CommandActionRow";
import { useTabActions } from "@/core/tabs/TabsProvider";
import { Button } from "@/core/ui/button";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import {
  useTriggerScheduleMutation,
  useUpdateScheduleMutation,
  useUpdateTriggerMutation,
} from "@/rekuest/api/graphql";
import { AutomationRow as Row } from "@/rekuest/lib/automation";
import { AlarmClock, Columns2, FastForward, Pause, Play, Zap } from "lucide-react";
import React from "react";
import { AutomationDot } from "./AutomationStatus";

const failed = (count: number) => (count === 1 ? "1 failed" : `${count} failed`);

/** Where the rule stands, in its own words: what a reader scans the list for. */
const Standing = ({ row }: { row: Row }) => {
  if (row.state === "failing") {
    return (
      <span
        className="text-destructive"
        title={row.lastErrorAt ? new Date(row.lastErrorAt).toLocaleString() : undefined}
      >
        {failed(row.failures)}
      </span>
    );
  }
  if (row.state === "ended") {
    return <>ended{row.maxRuns != null && ` · ${row.runCount}/${row.maxRuns}`}</>;
  }
  if (row.state === "paused") return <>paused</>;
  if (row.state === "running") return <>running now</>;
  if (row.nextAt) {
    return (
      <span title={new Date(row.nextAt).toLocaleString()}>
        next <Timestamp date={row.nextAt} relative />
      </span>
    );
  }
  if (row.lastRunAt) {
    return (
      <span title={new Date(row.lastRunAt).toLocaleString()}>
        {row.kind === "signal" ? "fired" : "ran"} <Timestamp date={row.lastRunAt} relative />
      </span>
    );
  }
  return <>{row.kind === "signal" ? "not fired yet" : "not run yet"}</>;
};

/**
 * The row's own actions, revealed on hover: the two things done to a rule
 * from the list (switch it off, run it now), "open to the side", and the
 * ObjectButton for the rest, which is the menu right-click gives.
 *
 * `opacity-0` rather than unmounted: the ObjectButton's popover must survive
 * the pointer leaving the row.
 */
const RowActions = ({ row }: { row: Row }) => {
  const { openBeside } = useTabActions();
  const [updateSchedule] = useUpdateScheduleMutation();
  const [updateTrigger] = useUpdateTriggerMutation();
  const [runNow] = useTriggerScheduleMutation({ refetchQueries: ["ListSchedules"] });
  const Smart = row.kind === "clock" ? RekuestSchedule : RekuestTrigger;

  const toggle = () => {
    const input = { id: row.id, enabled: !row.enabled };
    const done =
      row.kind === "clock"
        ? updateSchedule({ variables: { input } })
        : updateTrigger({ variables: { input } });
    done.catch((error) => toast.error(`Could not change ${row.name}: ${error.message}`));
  };

  return (
    <div
      className={cn(
        "absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg border border-border/60 bg-background/95 p-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity",
        "group-hover:opacity-100 focus-within:opacity-100 [&:has([data-state=open])]:opacity-100",
      )}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
    >
      {row.kind === "clock" && row.enabled && row.state !== "ended" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Run now"
          aria-label="Run now"
          disabled={row.state === "running"}
          onClick={() =>
            runNow({ variables: { id: row.id } }).then(
              () => toast.success(`${row.name} started`),
              (error) => toast.error(`Could not start it: ${error.message}`),
            )
          }
        >
          <FastForward className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title={row.enabled ? "Pause" : "Resume"}
        aria-label={row.enabled ? "Pause" : "Resume"}
        onClick={toggle}
      >
        {row.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Open to the side"
        aria-label="Open to the side"
        onClick={() => openBeside(Smart.linkBuilder(row.id), { label: row.name, evict: true })}
      >
        <Columns2 className="h-3.5 w-3.5" />
      </Button>
      <Smart.ObjectButton object={row} variant="ghost" className="h-7 w-7" />
    </div>
  );
};

/**
 * One rule, laid out like an action in the search bar: an icon tile, the
 * rule's name with what sets it off underneath, and where it stands at the
 * end. The tile's dot is its state. A schedule and a trigger read the same.
 */
const AutomationRowItem = ({ row }: { row: Row }) => {
  const Smart = row.kind === "clock" ? RekuestSchedule : RekuestTrigger;
  // A rule named after its action (the default) need not say the action twice.
  const details = [
    row.onlyIf.length > 0 ? `${row.when} if ${row.onlyIf.join(" and ")}` : row.when,
    row.name !== row.action.name && `runs ${row.action.name}`,
    row.agent && `on ${row.agent.name}`,
  ].filter(Boolean);

  return (
    <Smart.Smart object={row}>
      <div
        className={cn(
          "group relative rounded-md transition-colors hover:bg-accent",
          !row.enabled && "opacity-60",
        )}
      >
        <Smart.DetailLink object={row} className="flex items-center gap-3 px-2 py-2">
          <span className="relative shrink-0">
            <CommandActionIcon icon={row.kind === "clock" ? AlarmClock : Zap} />
            <AutomationDot
              state={row.state}
              className="absolute -right-0.5 -top-0.5 h-2 w-2 ring-2 ring-background"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-md text-foreground">{row.name}</span>
            <span className="truncate text-xs text-muted-foreground">{details.join(" · ")}</span>
            {row.state === "failing" && row.lastError && (
              <span className="truncate text-xs text-destructive/80" title={row.lastError}>
                {row.lastError}
              </span>
            )}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground group-hover:invisible">
            <Standing row={row} />
          </span>
        </Smart.DetailLink>

        <RowActions row={row} />
      </div>
    </Smart.Smart>
  );
};

export default React.memo(AutomationRowItem);
