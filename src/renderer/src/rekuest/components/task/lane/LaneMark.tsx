import { cn } from "@/core/util/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/core/ui/hover-card";
import { ReturnsContainer } from "@/core/ports/widgets/returns/ReturnsContainer";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { DetailTaskFragment, TaskEventKind } from "@/rekuest/api/graphql";
import { eventKindColor, formatEventKind } from "@/rekuest/lib/taskStatus";
import { describeEffect, readLostDetails } from "@/rekuest/lib/taskHistory";
import { LaneCluster, LaneSeverity, LaneTrack } from "@/rekuest/lib/taskLane";
import { memo } from "react";
import { LaneTaskEvent, isYieldLike } from "./selection";

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
});

export const formatMarkTime = (iso: string) => {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "" : TIME_FORMAT.format(ms);
};

/** Text color of a mark: severity outranks the kind's own hue. */
export const markColor = (severity: LaneSeverity, kind: TaskEventKind) =>
  severity === "error"
    ? "text-red-500"
    : severity === "warn"
      ? "text-amber-500"
      : eventKindColor(kind);

/** One line of what an event says, for peeks and the detail strip. */
export const describeLaneEvent = (e: LaneTaskEvent): string | null => {
  switch (e.kind) {
    case TaskEventKind.Effect:
      return describeEffect(e);
    case TaskEventKind.Lost:
      return (
        readLostDetails(e.value).reason ??
        e.message ??
        "its agent was lost while it ran"
      );
    case TaskEventKind.LateReport:
      return e.message ?? "arrived after the task was marked lost";
    case TaskEventKind.Delegate:
      return e.delegatedTo ? `delegated to ${e.delegatedTo.action.name}` : null;
    case TaskEventKind.Progress:
      return [e.progress != null ? `${e.progress}%` : null, e.message]
        .filter(Boolean)
        .join(" · ") || null;
    default:
      return e.message ?? null;
  }
};

const Glyph = (props: { track: LaneTrack; severity: LaneSeverity }) => {
  switch (props.track) {
    case "yield":
      return <span className="block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-current" />;
    case "log":
      return props.severity === "normal" ? (
        <span className="block h-2 w-2 rounded-full bg-current opacity-70" />
      ) : (
        <span className="block h-2.5 w-2.5 rounded-full bg-current" />
      );
    case "status":
      return <span className="block h-3.5 w-[3px] rounded-full bg-current" />;
  }
};

const PeekRow = (props: {
  event: LaneTaskEvent;
  severity: LaneSeverity;
  onSelect: (id: string) => void;
}) => {
  const { event } = props;
  const text = describeLaneEvent(event);
  return (
    <button
      type="button"
      onClick={() => props.onSelect(event.id)}
      className="flex w-full items-baseline gap-2 rounded px-1.5 py-0.5 text-left hover:bg-muted"
    >
      <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
        {formatMarkTime(event.createdAt)}
      </span>
      <span
        className={cn(
          "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
          markColor(props.severity, event.kind),
        )}
      >
        {formatEventKind(event.kind)}
      </span>
      {text && (
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {text}
        </span>
      )}
    </button>
  );
};

const PEEK_LIMIT = 8;

const MarkPeek = (props: {
  cluster: LaneCluster<LaneTaskEvent>;
  returnPorts: DetailTaskFragment["action"]["returns"];
  onSelect: (id: string) => void;
}) => {
  const { registry } = useWidgetRegistry();
  const { marks } = props.cluster;
  const single = marks.length === 1 ? marks[0] : null;

  if (single && isYieldLike(single.event) && props.returnPorts.length > 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <PeekRow
          event={single.event}
          severity={single.severity}
          onSelect={props.onSelect}
        />
        <div className="max-h-64 overflow-auto rounded-md border bg-background/60 p-2">
          <ReturnsContainer
            registry={registry}
            ports={props.returnPorts}
            values={single.event.returns}
            options={{ labels: true }}
          />
        </div>
      </div>
    );
  }

  // Newest first, like the log's tail.
  const shown = marks.slice(-PEEK_LIMIT).reverse();
  return (
    <div className="flex flex-col">
      {shown.map((m) => (
        <PeekRow
          key={m.event.id}
          event={m.event}
          severity={m.severity}
          onSelect={props.onSelect}
        />
      ))}
      {marks.length > PEEK_LIMIT && (
        <span className="px-1.5 pt-1 text-[10px] text-muted-foreground">
          +{marks.length - PEEK_LIMIT} earlier · zoom in to split
        </span>
      )}
    </div>
  );
};

/**
 * One mark (or a cluster of near-coincident ones) on a lane track. Hover
 * peeks at what it says; click selects its newest event.
 */
export const LaneMark = memo(function LaneMark(props: {
  cluster: LaneCluster<LaneTaskEvent>;
  left: number;
  selectedId: string | null;
  /** Just arrived on a live task: pings once. */
  fresh: boolean;
  returnPorts: DetailTaskFragment["action"]["returns"];
  onSelect: (id: string) => void;
}) {
  const { cluster, fresh } = props;
  const newest = cluster.marks[cluster.marks.length - 1].event;
  const selected =
    props.selectedId != null &&
    cluster.marks.some((m) => m.event.id === props.selectedId);
  const count = cluster.marks.length;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => props.onSelect(newest.id)}
          style={{ left: props.left }}
          className={cn(
            "absolute top-1/2 flex h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
            "transition-transform hover:scale-125",
            markColor(cluster.severity, newest.kind),
            selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
          )}
        >
          {fresh && (
            <span className="pointer-events-none absolute inset-0.5 rounded-full bg-current animate-mark-ping" />
          )}
          <Glyph track={cluster.track} severity={cluster.severity} />
          {count > 1 && (
            <span className="absolute -right-2 -top-1.5 rounded-full bg-muted px-1 text-[9px] font-semibold leading-3 text-foreground tabular-nums">
              {count}
            </span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-80 p-1.5">
        <MarkPeek
          cluster={cluster}
          returnPorts={props.returnPorts}
          onSelect={props.onSelect}
        />
      </HoverCardContent>
    </HoverCard>
  );
});
