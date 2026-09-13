import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ReturnsContainer } from "@/components/widgets/returns/ReturnsContainer";
import {
  TaskEventKind,
  DetailTaskFragment,
  useNoChildrenDetailTaskQuery,
} from "@/rekuest/api/graphql";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import Timestamp from "@/components/ui/timestamp";
import { useWidgetRegistry } from "../../widgets/WidgetsContext";
import { statusBarColor } from "../../lib/taskStatus";
import {
  TimelineDependencyGroup,
  TimelineItem,
  TimelineMethodRow,
  buildTimeline,
  mapParentEvents,
  notEmpty,
} from "../../lib/taskTimeline";

/**
 * The static dependency→method gantt of a task's children, shared by the
 * task timeline page and the agent space page. (The 3D task-space view has
 * its own zoom/pan variant on top of the same `buildTimeline` core.)
 */

const TimelineItemDetail = ({ item }: { item: TimelineItem }) => {
  const { data } = useNoChildrenDetailTaskQuery({
    variables: { id: item.task.id },
  });

  const { registry } = useWidgetRegistry();

  const task = data?.task || item.task;
  const latestEvent = task.events
    ?.filter((i) => i.kind == TaskEventKind.Yield)
    .at(-1);

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">{task.action?.name}</h4>
        <p className="text-sm text-muted-foreground">{task.id}</p>
      </div>
      <div className="grid gap-2">
        <div className="grid grid-cols-3 items-center gap-4">
          <span className="text-sm font-medium">Status</span>
          <span className="col-span-2 text-sm">
            {task.latestEventKind}
          </span>
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <span className="text-sm font-medium">Created</span>
          <span className="col-span-2 text-sm">
            <Timestamp date={task.createdAt} relative />
          </span>
        </div>
        <div className="grid grid-cols-3 items-center gap-4">
          <span className="text-sm font-medium">Duration</span>
          <span className="col-span-2 text-sm">
            {item.endTime - item.startTime} ms
          </span>
        </div>
        {latestEvent && latestEvent.returns && task.action?.returns && (
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-sm font-medium">Latest Result</span>
            <div className="bg-muted p-2 rounded-md">
              <ReturnsContainer
                registry={registry}
                ports={task.action.returns}
                values={latestEvent.returns}
                showKeys={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Controlled popover around a single timeline bar. Only mounted for the bar
 * the user clicked — a Radix Popover root per bar is far too heavy for a
 * gantt with hundreds of children.
 */
export const TimelineItemPopover = ({
  item,
  open,
  onOpenChange,
  children,
}: {
  item: TimelineItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[500px]">
        <TimelineItemDetail item={item} />
      </PopoverContent>
    </Popover>
  );
};

const TimelineBars = ({
  items,
  highlighted,
}: {
  items: TimelineItem[];
  highlighted: string[];
}) => {
  const highlightedSet = useMemo(() => new Set(highlighted), [highlighted]);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="relative h-8 w-full bg-muted/30 rounded-full">
      {items.map((item) => {
        const id = item.task.id;
        const bar = (
          <div
            key={id}
            onClick={() => setOpenId(id)}
            className={`${
              highlightedSet.has(id)
                ? "ring-2 ring-offset-1 ring-primary z-20 opacity-100"
                : "opacity-60 hover:opacity-100 hover:z-20"
            } ${statusBarColor(
              item.task.latestEventKind
            )} absolute h-full border rounded-md cursor-pointer transition-all flex items-center justify-center shadow-sm`}
            style={{
              left: item.start * 100 + "%",
              width: Math.max((item.end - item.start) * 100, 0.5) + "%",
            }}
          >
            <div className="text-[10px] truncate w-full text-center px-1 text-white font-medium drop-shadow-md">
              {item.task.action?.name}
            </div>
            {!item.task.isDone && (
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              </div>
            )}
          </div>
        );

        if (openId !== id) {
          return bar;
        }

        return (
          <TimelineItemPopover
            key={id}
            item={item}
            open
            onOpenChange={(open) => {
              if (!open) setOpenId(null);
            }}
          >
            {bar}
          </TimelineItemPopover>
        );
      })}
    </div>
  );
};

const TimelineMethodRender = ({
  row,
  highlighted,
}: {
  row: TimelineMethodRow;
  highlighted: string[];
}) => {
  return (
    <>
      <div className="col-span-2 ml-4 rounded-md border border-amber-200/70 bg-background/50 px-2 py-2 z-10">
        <div className="relative pl-5">
          <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-amber-300/70" />
          <span className="absolute left-0 -top-3 h-6 w-px bg-amber-300/70" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 shrink-0">
              {row.method}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {row.summary}
            </div>
            <div className="ml-auto text-[10px] text-muted-foreground">
              {row.items.length}
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-10 flex items-center relative z-10">
        <TimelineBars items={row.items} highlighted={highlighted} />
      </div>
    </>
  );
};

export const TimelineRender = ({
  group,
  highlighted,
}: {
  group: TimelineDependencyGroup;
  highlighted: string[];
}) => {
  const [expanded, setExpanded] = useState(true);
  const methodCount = group.methods.length;
  const itemCount = group.items.length;

  return (
    <>
      <div
        className={
          expanded
            ? "col-span-2 cursor-pointer rounded-md border border-amber-300/70 bg-amber-50/40 shadow-sm shadow-amber-200/20 transition-colors z-10"
            : "col-span-2 cursor-pointer rounded-md border border-border bg-card/60 hover:bg-card transition-colors z-10"
        }
      >
        <div className="w-full relative" onClick={() => setExpanded(!expanded)}>
          <div className="flex flex-col px-2 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="font-semibold text-sm truncate">{group.dependency}</div>
              <div className="ml-auto rounded bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-700">
                {itemCount}
              </div>
            </div>

            <div className="pl-6 pt-2">
              <div className="relative rounded-lg border border-dashed border-amber-300/80 bg-background/70 px-2 py-1 text-xs text-muted-foreground truncate">
                <span className="absolute -left-3 top-1/2 h-px w-3 -translate-y-1/2 bg-amber-300/70" />
                <span className="absolute -left-3 top-0 h-1/2 w-px bg-amber-300/70" />
                {group.summary || `${methodCount} method${methodCount === 1 ? "" : "s"}`}
              </div>
            </div>

            {!expanded && (
              <div className="pl-6 pt-1 text-[11px] text-muted-foreground truncate">
                {methodCount} method{methodCount === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="col-span-10 flex items-center relative z-10">
        {!expanded ? (
          <div className="relative h-6 w-full rounded-full border border-dashed border-amber-300/70 bg-amber-50/30 flex items-center px-3 text-xs text-muted-foreground">
            {itemCount} delegated task{itemCount === 1 ? "" : "s"}
          </div>
        ) : (
          <div className="relative h-6 w-full rounded-full border border-dashed border-amber-300/70 bg-amber-50/20 flex items-center px-3 text-xs text-muted-foreground">
            {methodCount} method{methodCount === 1 ? "" : "s"} grouped under this dependency
          </div>
        )}
      </div>

      {expanded &&
        group.methods.map((row) => (
          <TimelineMethodRender
            key={row.id}
            row={row}
            highlighted={highlighted}
          />
        ))}
    </>
  );
};

export const GanttTimeline = ({
  task,
  className = "flex flex-grow flex-col text-white @container",
  panelClassName = "flex flex-col gap-2 relative",
}: {
  task?: DetailTaskFragment | null;
  className?: string;
  panelClassName?: string;
}) => {
  const [highlighted, setHighlighted] = useState<string[]>([]);

  const { groups, events } = useMemo(() => {
    if (!task) return { groups: [], events: [] };
    const children = (task.children || []).filter(notEmpty);
    const { groups, startTime, endTime } = buildTimeline(children);
    return {
      groups,
      events: mapParentEvents(task.events || [], startTime, endTime),
    };
  }, [task]);

  return (
    <div className={className} onClick={() => setHighlighted([])}>
      <div className={panelClassName}>
        <div className="absolute inset-0 flex pointer-events-none z-0">
          <div className="w-2/12"></div>
          <div className="w-10/12 relative border-l  border-white/5">
            {events.map((event, index) => (
              <div
                key={`global-event-${index}`}
                className="absolute top-0 bottom-0 w-px bg-white/20 group"
                style={{ left: `${event.position * 100}%` }}
              >
                <div className="absolute top-full mt-1 text-[8px] text-muted-foreground whitespace-nowrap -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 px-1 rounded border z-50">
                  {event.kind}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex pointer-events-none z-0">
          <div className="w-2/12"></div>
          <div className="w-10/12 relative border-l  border-white/5">
            {events.map((event, index) => (
              <div
                key={`global-event-${index}`}
                className="absolute bottom-0 w-px bg-white/20 group "
                style={{ left: `${event.position * 100}%` }}
              >
                <div className="-translate-x-1/2 text-xs flex items-center justify-center w-16 p-1 border bg-background/90 rounded-md ">
                  {event.kind == TaskEventKind.Log && event.message}
                  </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-y-2 z-10 mb-10">
          {groups.map((group) => (
            <TimelineRender
              key={group.id}
              group={group}
              highlighted={highlighted}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
