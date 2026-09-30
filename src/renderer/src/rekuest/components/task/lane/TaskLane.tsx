import { cn } from "@/core/util/utils";
import { useElementSize } from "@/core/util/useElementSize";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/core/ui/hover-card";
import { RekuestTask } from "@/core/linkers";
import { DetailTaskFragment } from "@/rekuest/api/graphql";
import {
  clusterMarks,
  LaneSegment,
  LaneTrack,
  layoutTaskLane,
} from "@/rekuest/lib/taskLane";
import { formatDuration } from "@/rekuest/lib/taskTimeline";
import { statusBucket, TaskStatusBucket } from "@/rekuest/lib/taskStatus";
import { isTaskLive } from "@/rekuest/lib/taskTracker";
import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TaskStatusLine } from "../TaskStatusLine";
import { LaneMark } from "./LaneMark";
import { LaneSelection, LaneTaskChild } from "./selection";

// Inner padding so marks at the very start and end are not clipped.
const PAD = 12;
// Marks closer than this (px) merge into one with a count.
const CLUSTER_PX = 14;
const CALL_ROW_H = 20;
const MAX_ZOOM = 64;
// How long after it arrived a mark still pings, while the task is live.
const FRESH_MS = 3000;

const BAR_COLOR: Record<TaskStatusBucket, string> = {
  done: "bg-green-500/70",
  error: "bg-red-500/80",
  cancelled: "bg-muted-foreground/40",
  lost: "bg-amber-500/70",
  paused: "bg-amber-500/50",
  queued: "bg-muted-foreground/25",
  running: "bg-primary/60",
};

/** Wall clock that ticks once a second, only while the task runs. */
const useLaneNow = (running: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [running]);
  return now;
};

const NICE_STEPS = [
  100, 250, 500, 1_000, 2_000, 5_000, 10_000, 15_000, 30_000, 60_000, 120_000,
  300_000, 600_000, 900_000, 1_800_000, 3_600_000, 7_200_000, 21_600_000,
  43_200_000, 86_400_000,
];

/** Relative time ticks (+0 s, +5 s, …) at least ~90 px apart. */
const axisTicks = (span: number, inner: number) => {
  if (span <= 0 || inner <= 0) return [];
  const minStep = (span * 90) / inner;
  const step = NICE_STEPS.find((s) => s >= minStep) ?? NICE_STEPS[NICE_STEPS.length - 1];
  const ticks: number[] = [];
  for (let t = 0; t <= span; t += step) ticks.push(t);
  return ticks;
};

type Row = { key: string; label: string; height: number; content: ReactNode };

const CallBar = (props: {
  segment: LaneSegment<LaneTaskChild>;
  left: number;
  width: number;
  selected: boolean;
  onSelect: () => void;
}) => {
  const { segment } = props;
  const child = segment.child;
  return (
    <div
      className="absolute"
      style={{
        left: props.left,
        width: Math.max(props.width, 6),
        top: segment.row * CALL_ROW_H + 3,
        height: CALL_ROW_H - 6,
      }}
    >
      <RekuestTask.Smart
        object={child}
        className="h-full w-full"
        containerClassName="h-full w-full"
      >
        <HoverCard openDelay={150} closeDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              onClick={props.onSelect}
              className={cn(
                "relative flex h-full w-full items-center overflow-hidden rounded-sm px-1.5 text-left text-[10px] font-medium text-foreground/90",
                BAR_COLOR[segment.status],
                props.selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
              )}
            >
              {segment.status === "running" && (
                <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-task-sweep" />
              )}
              <span className="relative truncate">{child.action.name}</span>
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-72 p-2">
            <TaskStatusLine task={child} compact showLink />
            {child.callKey && (
              <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/70">
                {child.callKey}
              </div>
            )}
          </HoverCardContent>
        </HoverCard>
      </RekuestTask.Smart>
    </div>
  );
};

/**
 * The task's history left → right: a run bar per attempt (resumes get their
 * own band) with lifecycle ticks on it, the child calls packed into rows, and
 * yields and logs as marks on their own tracks. One shared time axis, which
 * ⌘/Ctrl + wheel (or a pinch) zooms around the pointer. Tracks with nothing
 * to show are not drawn.
 */
export const TaskLane = (props: {
  task: DetailTaskFragment;
  selection: LaneSelection;
  onSelect: (selection: LaneSelection) => void;
}) => {
  const { task, selection, onSelect } = props;
  const live = isTaskLive(task);
  const now = useLaneNow(live);

  const { ref, size } = useElementSize<HTMLDivElement>();
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const pendingScroll = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const prev = zoomRef.current;
      const next = Math.min(MAX_ZOOM, Math.max(1, prev * Math.exp(-e.deltaY * 0.01)));
      if (next === prev) return;
      const offset = e.clientX - el.getBoundingClientRect().left;
      const ratio = (el.scrollLeft + offset) / (el.clientWidth * prev);
      zoomRef.current = next;
      pendingScroll.current = ratio * el.clientWidth * next - offset;
      setZoom(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);

  useLayoutEffect(() => {
    if (pendingScroll.current == null || !ref.current) return;
    ref.current.scrollLeft = pendingScroll.current;
    pendingScroll.current = null;
  }, [zoom, ref]);

  const resetZoom = () => {
    zoomRef.current = 1;
    setZoom(1);
  };

  const lane = useMemo(
    () => layoutTaskLane(task, task.events, task.children ?? [], now),
    [task, now],
  );

  const contentWidth = Math.max(0, size.width * zoom);
  const inner = Math.max(0, contentWidth - 2 * PAD);
  const pos = (x: number) => PAD + x * inner;

  const clusters = useMemo(
    () => clusterMarks(lane.marks, inner, CLUSTER_PX),
    [lane.marks, inner],
  );
  const byTrack = (track: LaneTrack) => clusters.filter((c) => c.track === track);
  const statusClusters = byTrack("status");
  const yieldClusters = byTrack("yield");
  const logClusters = byTrack("log");

  const ticks = axisTicks(lane.end - lane.start, inner);
  const span = lane.end - lane.start;
  const lastAttempt = lane.attempts.length - 1;
  const runStatus = statusBucket(task.latestEventKind, task.isDone);
  const selectedEventId = selection?.kind === "event" ? selection.id : null;
  const selectEvent = useCallback(
    (id: string) => onSelect({ kind: "event", id }),
    [onSelect],
  );

  const renderMarks = (list: typeof clusters) =>
    list.map((c) => (
      <LaneMark
        key={c.key}
        cluster={c}
        left={pos(c.x)}
        selectedId={selectedEventId}
        fresh={live && c.marks.some((m) => now - Date.parse(m.event.createdAt) < FRESH_MS)}
        returnPorts={task.action.returns}
        onSelect={selectEvent}
      />
    ));

  const rows: Row[] = [
    {
      // One bar per attempt, lifecycle ticks on top.
      key: "run",
      label: "Run",
      height: 30,
      content: (
        <>
          {lane.attempts.map((a) => (
            <div
              key={a.index}
              className={cn(
                "absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full",
                a.index === lastAttempt ? BAR_COLOR[runStatus] : "bg-amber-500/40",
              )}
              style={{ left: pos(a.x0), width: Math.max(2, (a.x1 - a.x0) * inner) }}
            >
              {lane.attempts.length > 1 && (
                <span className="absolute -top-3.5 left-0 whitespace-nowrap text-[9px] text-amber-600 dark:text-amber-400">
                  {a.index === 0 ? "run 1" : `resumed · run ${a.index + 1}`}
                </span>
              )}
            </div>
          ))}
          {renderMarks(statusClusters)}
        </>
      ),
    },
  ];
  if (lane.segments.length > 0) {
    rows.push({
      key: "calls",
      label: "Calls",
      height: Math.max(1, lane.rows) * CALL_ROW_H + 4,
      content: lane.segments.map((s) => (
        <CallBar
          key={s.child.id}
          segment={s}
          left={pos(s.x0)}
          width={(s.x1 - s.x0) * inner}
          selected={selection?.kind === "child" && selection.id === s.child.id}
          onSelect={() => onSelect({ kind: "child", id: s.child.id })}
        />
      )),
    });
  }
  if (yieldClusters.length > 0) {
    rows.push({ key: "yields", label: "Yields", height: 26, content: renderMarks(yieldClusters) });
  }
  if (logClusters.length > 0) {
    rows.push({ key: "logs", label: "Logs", height: 26, content: renderMarks(logClusters) });
  }

  return (
    <div className="relative flex w-full select-none">
      <div className="flex w-14 shrink-0 flex-col">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-center border-t border-border/40 pl-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
            style={{ height: r.height }}
          >
            {r.label}
          </div>
        ))}
        <div className="h-5 border-t border-border/40" />
      </div>
      <div ref={ref} className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        {size.width > 0 && (
          <div className="relative" style={{ width: contentWidth }}>
            {rows.map((r) => (
              <div
                key={r.key}
                className="relative border-t border-border/40"
                style={{ height: r.height }}
              >
                {r.content}
              </div>
            ))}

            {/* Time axis. */}
            <div className="relative h-5 border-t border-border/40">
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute top-1 -translate-x-1/2 whitespace-nowrap text-[9px] tabular-nums text-muted-foreground/60"
                  style={{ left: pos(span <= 0 ? 0 : t / span) }}
                >
                  {t === 0 ? "0" : `+${formatDuration(t)}`}
                </span>
              ))}
            </div>

            {live && (
              <div
                className="pointer-events-none absolute inset-y-0 w-px bg-primary/70"
                style={{ left: pos(1) }}
              >
                <span className="absolute -top-0.5 right-1 text-[9px] font-semibold uppercase text-primary">
                  now
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {zoom > 1 && (
        <button
          type="button"
          onClick={resetZoom}
          className="absolute right-1 top-1 z-20 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          Fit · {zoom.toFixed(1)}×
        </button>
      )}
    </div>
  );
};
