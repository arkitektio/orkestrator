import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ReturnsContainer } from "@/components/widgets/returns/ReturnsContainer";
import { RekuestTask, RekuestImplementation, RekuestAgent } from "@/linkers";
import {
  TaskEventFragment,
  TaskEventKind,
  DetailTaskFragment,
  PortKind,
  ReturnPortFragment,
} from "@/rekuest/api/graphql";
import { UnknownReturnWidget } from "@/app/shadCnWidgetRegistry";
import { Clock } from "lucide-react";
import { ReactNode, memo, useEffect, useMemo, useState } from "react";
import Timestamp from "@/components/ui/timestamp";
import { useWidgetRegistry } from "../../widgets/WidgetsContext";
import { deriveLiveState } from "../../hooks/useTasks";
import { isTerminalEvent } from "../../lib/taskTracker";
import {
  TaskStatusIcon,
  eventKindColor,
  formatEventKind,
  statusTheme,
} from "../../lib/taskStatus";
import { TaskStatusLine } from "./TaskStatusLine";

// Module-level formatter: `toLocaleTimeString` constructs a fresh Intl
// formatter per call, which adds up fast for a log with hundreds of rows.
// The options mirror `toLocaleTimeString(undefined, { hour12: false })`.
const LOG_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
});

const formatLogTime = (iso: string) => {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "" : LOG_TIME_FORMAT.format(ms);
};

/**
 * One line of the log: fixed-width time and kind columns, free-form body.
 * Deliberately terminal-flavored — the log is the raw, complete record.
 */
const LogRow = memo(function LogRow(props: {
  event: TaskEventFragment;
  children?: ReactNode;
}) {
  const { event, children } = props;
  return (
    <li className="flex items-baseline gap-3 px-3 py-0.5 hover:bg-muted/40">
      <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground/70">
        {formatLogTime(event.createdAt)}
      </span>
      <span
        className={cn(
          "w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wide",
          eventKindColor(event.kind),
        )}
      >
        {formatEventKind(event.kind)}
      </span>
      <div className="min-w-0 flex-1 text-xs">{children}</div>
    </li>
  );
});

/** A yield line: result rendered inline, collapsible for chatty generators. */
const YieldLogRow = (props: {
  returnPorts: DetailTaskFragment["action"]["returns"];
  event: TaskEventFragment;
  defaultExpanded: boolean;
}) => {
  const { registry } = useWidgetRegistry();
  const [expanded, setExpanded] = useState(props.defaultExpanded);
  const hasReturns =
    props.event.returns != null && props.returnPorts.length > 0;

  if (!hasReturns) {
    return (
      <LogRow event={props.event}>
        <span className="text-muted-foreground">yielded (no returns)</span>
      </LogRow>
    );
  }

  return (
    <LogRow event={props.event}>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="w-fit text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {expanded ? "hide result" : "show result"}
        </button>
        {expanded && (
          <div className="my-1.5 w-full rounded-md border bg-background/60 p-3 font-sans">
            <ReturnsContainer
              registry={registry}
              ports={props.returnPorts}
              values={props.event.returns}
              options={{ labels: true }}
            />
          </div>
        )}
      </div>
    </LogRow>
  );
};

/**
 * One event dispatched to its row. Memoised on the event (a stable cache
 * object) and the action's return ports rather than the whole task, so a new
 * progress event only mounts one new row instead of rerendering every line.
 */
const TaskLogEntry = memo(function TaskLogEntry(props: {
  event: TaskEventFragment;
  returnPorts: DetailTaskFragment["action"]["returns"];
  defaultExpanded: boolean;
}) {
  const { event: e, returnPorts, defaultExpanded } = props;
  switch (e.kind) {
    case TaskEventKind.Yield:
      return (
        <YieldLogRow
          returnPorts={returnPorts}
          event={e}
          defaultExpanded={defaultExpanded}
        />
      );
    case TaskEventKind.Delegate:
      return (
        <LogRow event={e}>
          <span className="text-muted-foreground">
            delegated to {e.delegatedTo?.action.name}
          </span>
          {e.delegatedTo && (
            <RekuestTask.DetailLink
              object={e.delegatedTo}
              className="ml-1 text-foreground underline-offset-2 hover:underline"
            >
              (details)
            </RekuestTask.DetailLink>
          )}
        </LogRow>
      );
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
      return (
        <LogRow event={e}>
          <span className="text-destructive">{e.message}</span>
        </LogRow>
      );
    case TaskEventKind.Progress:
      return (
        <LogRow event={e}>
          <div className="flex items-baseline gap-2">
            {e.progress != null && (
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {e.progress}%
              </span>
            )}
            {e.message && (
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {e.message}
              </span>
            )}
          </div>
        </LogRow>
      );
    default:
      return (
        <LogRow event={e}>
          {e.message && (
            <span className="text-muted-foreground">{e.message}</span>
          )}
        </LogRow>
      );
  }
});

export const ChildTasksSection = (props: {
  task: DetailTaskFragment;
}) => {
  // Sorted once per `children` identity; this section rerenders on every
  // task event, and `createdAt` is ISO-8601 so the strings sort correctly
  // without allocating Dates per comparison.
  const rawChildren = props.task.children;
  const children = useMemo(
    () =>
      (rawChildren ?? [])
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)),
    [rawChildren],
  );

  if (children.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Child Tasks ({children.length})
      </h3>
      <div className="flex flex-col gap-2">
        {children.map((child) => (
          <div
            key={child.id}
            className="rounded-md border border-muted-foreground/10 p-2"
          >
            <TaskStatusLine task={child} compact showLink />
          </div>
        ))}
      </div>
    </div>
  );
};

const formatWalltime = (task: DetailTaskFragment) => {
  if (!task.finishedAt) return null;
  const seconds =
    (new Date(task.finishedAt).getTime() -
      new Date(task.createdAt).getTime()) /
    1000;
  return `${seconds.toFixed(2)}s`;
};

const formatSeconds = (ms: number) => {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/** Ticking elapsed-time readout for a still-running task. */
const ElapsedTime = ({ since }: { since: string }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-sm font-semibold tabular-nums text-foreground">
      {formatSeconds(Math.max(0, now - new Date(since).getTime()))}
    </span>
  );
};

/**
 * At-a-glance status panel: status icon + label, reference, live progress,
 * latest message / error, timing, and the implementation / agent / lineage
 * context — everything you'd otherwise have to hunt for in the event log.
 */
export const TaskStatusHero = (props: { task: DetailTaskFragment }) => {
  const { task } = props;
  const live = useMemo(() => deriveLiveState(task), [task]);
  const theme = statusTheme(task);
  const running = !task.isDone && !isTerminalEvent(task.latestEventKind);
  const walltime = formatWalltime(task);
  const agent = task.implementation?.agent;

  return (
    <div className={cn("rounded-xl border p-5 ring-1", theme.ring, theme.bg)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <TaskStatusIcon
            kind={task.latestEventKind}
            isDone={task.isDone}
            className="h-8 w-8 shrink-0"
          />
          <div className="min-w-0">
            <div className={cn("text-lg font-semibold leading-tight", theme.text)}>
              {theme.label}
            </div>
            {task.reference && (
              <div className="truncate font-mono text-xs text-muted-foreground">
                {task.reference}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Started&nbsp;<Timestamp date={task.createdAt} relative />
          </div>
          {task.finishedAt && (
            <div>
              Finished&nbsp;<Timestamp date={task.finishedAt} relative />
            </div>
          )}
          {walltime && (
            <div className="text-sm font-semibold text-foreground">{walltime}</div>
          )}
          {running && <ElapsedTime since={task.createdAt} />}
        </div>
      </div>

      {running && (
        <div className="mt-4">
          {live.progress != null ? (
            <div className="flex items-center gap-2">
              <Progress value={live.progress} className="h-1.5 flex-1" />
              <span className="w-9 text-right text-xs text-muted-foreground">
                {live.progress}%
              </span>
            </div>
          ) : (
            <div className="h-1.5 w-full animate-pulse rounded-full bg-primary/30" />
          )}
        </div>
      )}

      {live.error ? (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {live.error}
        </div>
      ) : (
        live.message && (
          <p className="mt-3 text-sm text-muted-foreground">{live.message}</p>
        )
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
        {task.implementation ? (
          <RekuestImplementation.DetailLink object={task.implementation}>
            <Badge variant="outline" className="cursor-pointer font-mono">
              {task.implementation.interface}
            </Badge>
          </RekuestImplementation.DetailLink>
        ) : (
          <Badge variant="outline" className="font-mono text-muted-foreground">
            Unassigned
          </Badge>
        )}
        {agent && (
          <RekuestAgent.DetailLink object={agent}>
            <Badge variant="secondary" className="cursor-pointer">
              {agent.name}
            </Badge>
          </RekuestAgent.DetailLink>
        )}
        {task.parent && (
          <RekuestTask.DetailLink object={task.parent}>
            <Badge variant="outline" className="cursor-pointer">
              ← Parent task
            </Badge>
          </RekuestTask.DetailLink>
        )}
      </div>
    </div>
  );
};

const formatArgValue = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
};

type ArgPortLike = DetailTaskFragment["action"]["args"][number];

/**
 * Resolve a DISPLAY widget for an input port: retag the arg port as a return
 * port and drop its assign (form) widget so the registry falls back to the
 * kind-based display widgets — Structure args render as smart display cards,
 * primitives with their return widgets.
 */
const argPortToDisplayPort = (port: ArgPortLike): ReturnPortFragment =>
  ({
    ...port,
    __typename: "ReturnPort",
    widget: null,
  }) as unknown as ReturnPortFragment;

const TaskArgValue = (props: { port: ArgPortLike; value: unknown }) => {
  const { registry } = useWidgetRegistry();
  const displayPort = useMemo(
    () => argPortToDisplayPort(props.port),
    [props.port],
  );
  const Widget = registry.getReturnWidgetForPort(displayPort, true);

  // Structure args are stored as the plain object id, while the structure
  // display widget expects the `{ object }` shape used by return values.
  const value =
    props.port.kind === PortKind.Structure &&
    (typeof props.value === "string" || typeof props.value === "number")
      ? { object: props.value }
      : props.value;

  if (props.value == null || Widget === UnknownReturnWidget) {
    return (
      <span
        className={cn(
          "font-mono text-xs",
          props.value == null ? "text-muted-foreground" : "text-foreground",
        )}
        title={formatArgValue(props.value)}
      >
        {formatArgValue(props.value)}
      </span>
    );
  }

  return (
    // False positive: the registry looks up pre-registered module-level
    // components (same pattern as ReturnsContainer) — nothing is created
    // during render, so widget state is never reset.
    // eslint-disable-next-line react-hooks/static-components
    <Widget
      port={displayPort}
      widget={null}
      value={value as never}
      options={{ labels: false }}
    />
  );
};

/**
 * The inputs this task was called with: one row per arg port, matched against
 * the raw `args` map and rendered through the display-widget registry (so
 * structures link to their objects), with a plain-text fallback for kinds
 * without a display widget.
 */
export const TaskArgsSection = (props: { task: DetailTaskFragment }) => {
  const ports = props.task.action.args;
  if (!ports || ports.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Inputs
      </h3>
      <div className="rounded-md border divide-y">
        {ports.map((port) => {
          const value = props.task.args?.[port.key];
          return (
            <div
              key={port.key}
              className="flex items-center gap-4 px-3 py-2 text-sm"
            >
              <div className="w-1/3 min-w-0 shrink-0">
                <div className="truncate font-medium">
                  {port.label || port.key}
                </div>
                {port.identifier && (
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {port.identifier}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <TaskArgValue port={port} value={value} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * The task's most recent yielded result, surfaced above the event log so the
 * output is visible without scrolling through progress/log noise.
 */
export const TaskResultSection = (props: { task: DetailTaskFragment }) => {
  const { registry } = useWidgetRegistry();
  const latestYield = props.task.events
    .filter((e) => e.kind === TaskEventKind.Yield)
    .at(0);

  if (!latestYield?.returns || props.task.action.returns.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Latest Result
      </h3>
      <div className="rounded-md border bg-muted/40 p-3">
        <ReturnsContainer
          registry={registry}
          ports={props.task.action.returns}
          values={latestYield.returns}
          options={{ labels: true }}
        />
      </div>
    </div>
  );
};

// Above this many yields, older results start collapsed (the latest stays
// open) so a chatty generator doesn't turn the log into a wall of widgets.
const MAX_EXPANDED_YIELDS = 3;

// Only the newest window of events is mounted by default; a long-running task
// can accumulate thousands of progress lines, and each row is a DOM subtree.
const LOG_WINDOW = 200;

/**
 * The task's complete event record, oldest → newest, as dense log lines.
 * Every event kind is shown — nothing is filtered out — but only the newest
 * `LOG_WINDOW` are mounted until the reader asks for earlier ones.
 */
export const TaskTimeLine = (props: {
  task: DetailTaskFragment;
}) => {
  const { task } = props;
  const [visibleLimit, setVisibleLimit] = useState(LOG_WINDOW);

  // The cache stores events newest-first; a log reads top-to-bottom.
  const { events, expandAllYields, latestYieldId } = useMemo(() => {
    const yieldsWithReturns = task.events.filter(
      (e) => e.kind === TaskEventKind.Yield && e.returns != null,
    );
    return {
      events: [...task.events].reverse(),
      expandAllYields: yieldsWithReturns.length <= MAX_EXPANDED_YIELDS,
      latestYieldId: yieldsWithReturns.at(0)?.id,
    };
  }, [task.events]);

  const hiddenCount = Math.max(0, events.length - visibleLimit);
  const visible = hiddenCount > 0 ? events.slice(hiddenCount) : events;
  const returnPorts = task.action.returns;

  return (
    <ol className="flex w-full flex-col rounded-md border bg-muted/20 py-1 font-mono">
      {hiddenCount > 0 && (
        <li className="px-3 py-1">
          <button
            type="button"
            onClick={() => setVisibleLimit((limit) => limit + LOG_WINDOW)}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Show {Math.min(hiddenCount, LOG_WINDOW)} earlier ({hiddenCount}{" "}
            hidden)
          </button>
        </li>
      )}
      {visible.map((e) => (
        <TaskLogEntry
          key={e.id}
          event={e}
          returnPorts={returnPorts}
          defaultExpanded={expandAllYields || e.id === latestYieldId}
        />
      ))}
    </ol>
  );
};

export const DefaultRenderer = (props: {
  task: DetailTaskFragment;
}) => {
  const { task } = props;
  const hasResult =
    task.action.returns.length > 0 &&
    task.events.some(
      (e) => e.kind === TaskEventKind.Yield && e.returns != null,
    );
  const hasArgs = task.action.args.length > 0;

  return (
    <div className="h-full w-full overflow-y-auto @container">
      <div className="flex w-full flex-col gap-6 p-4">
        <TaskStatusHero task={task} />
        {(hasResult || hasArgs) && (
          <div
            className={cn(
              "grid gap-6",
              hasResult && hasArgs && "@4xl:grid-cols-2",
            )}
          >
            <TaskResultSection task={task} />
            <TaskArgsSection task={task} />
          </div>
        )}
        <ChildTasksSection task={task} />
        {task.events.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Event Log
            </h3>
            <TaskTimeLine task={task} />
          </div>
        )}
      </div>
    </div>
  );
};
