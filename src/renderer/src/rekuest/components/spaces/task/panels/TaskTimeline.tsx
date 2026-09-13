import { SpaceViewStoreContext, useSpaceViewStore } from '../store'
import { TaskEventKind, useNoChildrenDetailTaskQuery } from '@/rekuest/api/graphql'
import { ReturnsContainer } from '@/components/widgets/returns/ReturnsContainer'
import { useWidgetRegistry } from '@/rekuest/widgets/WidgetsContext'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Crosshair,
  ExternalLink,
  Loader2,
  ZoomOut
} from 'lucide-react'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import Timestamp from 'react-timestamp'
import type {
  TimelineDependencyGroup,
  TimelineEvent,
  TimelineItem,
  TimelineMethodRow
} from '../types'
import { Button } from '@/components/ui/button'
import { RekuestTask } from '@/linkers'
import { getStatusColor } from './statusColors'

// ── formatting ───────────────────────────────────────────────────────

const formatDuration = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  if (ms < 1000) return `${Math.round(ms)} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

// ── event tick clustering ────────────────────────────────────────────

type EventCluster = {
  position: number
  events: TimelineEvent[]
}

// Only meaningful events get a tick; near-coincident ones collapse into one
// cluster so bursty logs don't pile up into an unreadable wall of boxes.
const MEANINGFUL_KINDS = new Set<TaskEventKind>([
  TaskEventKind.Log,
  TaskEventKind.Failed,
  TaskEventKind.Critical
])

const clusterEvents = (events: TimelineEvent[]): EventCluster[] => {
  const meaningful = events
    .filter((e) => MEANINGFUL_KINDS.has(e.kind))
    .filter((e) => e.kind !== TaskEventKind.Log || !!e.message)
    .sort((a, b) => a.position - b.position)

  const clusters: EventCluster[] = []
  for (const event of meaningful) {
    const last = clusters[clusters.length - 1]
    if (last && Math.abs(event.position - last.position) < 0.01) {
      last.events.push(event)
    } else {
      clusters.push({ position: event.position, events: [event] })
    }
  }
  return clusters
}

// ── item detail popover ──────────────────────────────────────────────

const TimelineItemDetail = ({ item }: { item: TimelineItem }) => {
  const { data } = useNoChildrenDetailTaskQuery({
    variables: { id: item.task.id }
  })

  const setTimelineTimepoint = useSpaceViewStore((s) => s.selectTimepoint)
  const liveNow = useSpaceViewStore((s) => s.liveNow)

  const { registry } = useWidgetRegistry()
  const task = data?.task || item.task
  const latestEvent = task.events
    ?.filter((i) => i.kind === TaskEventKind.Yield)
    .at(-1)

  const running = !task.isDone
  // Running tasks have no end yet — measure to "now".
  const durationMs = running ? liveNow - item.startTime : item.endTime - item.startTime
  // getStatusColor returns "bg-… border-…"; reuse the bg for the status dot.
  const dotClass = getStatusColor(task.latestEventKind).split(' ')[0]

  return (
    <div className="flex flex-col">
      {/* header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass} ${
            running ? 'animate-pulse' : ''
          }`}
        />
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-semibold leading-tight">
            {task.action?.name ?? 'Task'}
          </h4>
          <p className="truncate font-mono text-[10px] text-muted-foreground">{task.id}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {task.latestEventKind}
        </span>
      </div>

      {/* meta */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <div className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3 w-3" /> Created
          </div>
          <div className="mt-0.5 text-sm">
            <Timestamp date={task.createdAt} relative />
          </div>
        </div>
        <div className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Loader2 className={`h-3 w-3 ${running ? 'animate-spin' : ''}`} /> Duration
          </div>
          <div className="mt-0.5 text-sm tabular-nums">{formatDuration(durationMs)}</div>
        </div>
      </div>

      {/* latest result */}
      {latestEvent && latestEvent.returns && task.action?.returns && (
        <div className="flex flex-col gap-1.5 px-4 pb-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Latest Result
          </span>
          <div className="rounded-md border border-border/60 bg-muted/40 p-2">
            <ReturnsContainer
              registry={registry}
              ports={task.action.returns}
              values={latestEvent.returns}
              showKeys={false}
            />
          </div>
        </div>
      )}

      {/* actions */}
      <div className="flex items-center gap-2 border-t border-border/60 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => setTimelineTimepoint(item.startTime)}
        >
          <Crosshair className="h-3.5 w-3.5" />
          Jump here
        </Button>
        <RekuestTask.DetailLink object={task} className="flex-1">
          <Button size="sm" className="w-full gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Open task
          </Button>
        </RekuestTask.DetailLink>
      </div>
    </div>
  )
}

// ── bars ─────────────────────────────────────────────────────────────

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

const TimelineBars = ({ items, highlighted }: { items: TimelineItem[]; highlighted: string[] }) => {
  const zoomStart = useSpaceViewStore((s) => s.zoomStart)
  const zoomEnd = useSpaceViewStore((s) => s.zoomEnd)
  const startBound = useSpaceViewStore((s) => s.timelineStartTime)
  const endBound = useSpaceViewStore((s) => s.timelineEndTime)
  const liveNow = useSpaceViewStore((s) => s.liveNow)
  const taskDone = useSpaceViewStore((s) => s.task.isDone === true)
  const zoomSpan = zoomEnd - zoomStart || 1
  // Right edge grows with "now" while the task runs (see main timeline).
  const effectiveEnd = taskDone ? endBound : Math.max(endBound, liveNow)
  const range = effectiveEnd - startBound || 1

  return (
    <div className="relative h-8 w-full bg-muted/30 rounded-full">
      {items.map((item, index) => {
        // Running bars are open-ended: they start at their createdAt and extend
        // to the live "now"; finished bars stop at their real end.
        const barEndTime = item.task.isDone ? item.endTime : effectiveEnd
        const fullStart = (item.startTime - startBound) / range
        const fullEnd = (barEndTime - startBound) / range
        // Remap full-range positions into the zoom window and clip to the view.
        const screenStart = (fullStart - zoomStart) / zoomSpan
        const screenEnd = (fullEnd - zoomStart) / zoomSpan
        if (screenEnd <= 0 || screenStart >= 1) return null
        const left = clamp01(screenStart)
        const right = clamp01(screenEnd)
        const openEnded = !item.task.isDone
        return (
          <Popover key={index}>
            <PopoverTrigger asChild>
              <div
                className={`${
                  highlighted.includes(item.task.id)
                    ? 'ring-2 ring-offset-1 ring-primary z-20 opacity-100'
                    : 'opacity-60 hover:opacity-100 hover:z-20'
                } ${getStatusColor(item.task.latestEventKind)} ${
                  openEnded ? 'animate-pulse rounded-l-md rounded-r-none border-r-0' : 'rounded-md'
                } absolute h-full border cursor-pointer transition-all flex items-center justify-center shadow-sm`}
                style={{
                  left: left * 100 + '%',
                  width: Math.max((right - left) * 100, 0.5) + '%',
                  // Running bars fade out at the open end to read as "still going".
                  ...(openEnded
                    ? {
                        maskImage: 'linear-gradient(to right, black 60%, transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, black 60%, transparent)'
                      }
                    : {})
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] truncate w-full text-center px-1 text-white font-medium drop-shadow-md">
                  {item.task.action?.name}
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] overflow-hidden p-0">
              <TimelineItemDetail item={item} />
            </PopoverContent>
          </Popover>
        )
      })}
    </div>
  )
}

// ── method row ───────────────────────────────────────────────────────

const TimelineMethodRender = ({
  row,
  highlighted
}: {
  row: TimelineMethodRow
  highlighted: string[]
}) => (
  <>
    <div className="col-span-1 ml-4 rounded-md border border-primary/40 bg-background/50 px-2 py-2 z-10">
      <div className="relative">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary shrink-0">
            {row.method}
          </div>
          <div className="ml-auto text-[10px] text-muted-foreground">{row.items.length}</div>
        </div>
      </div>
    </div>
    <div className="col-span-11 flex items-center relative z-10">
      <TimelineBars items={row.items} highlighted={highlighted} />
    </div>
  </>
)

// ── dependency group ─────────────────────────────────────────────────

const TimelineGroupRender = ({
  group,
  highlighted
}: {
  group: TimelineDependencyGroup
  highlighted: string[]
}) => {
  const [expanded, setExpanded] = useState(true)
  const itemCount = group.items.length

  return (
    <>
      <div
        className={
          expanded
            ? 'col-span-1 cursor-pointer rounded-md border border-primary/70 bg-primary/40 shadow-sm shadow-primary/20 transition-colors z-10'
            : 'col-span-1 cursor-pointer rounded-md border border-border bg-card/60 hover:bg-card transition-colors z-10'
        }
      >
        <div className="w-full relative" onClick={() => setExpanded(!expanded)}>
          <div className="flex flex-col px-2 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-primary-600 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="font-semibold text-sm truncate">{group.dependency}</div>
              <div className="ml-auto rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary">
                {itemCount}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-11 flex items-center relative z-10">
        {!expanded ? (
          <div className="relative h-6 w-full rounded-full border border-dashed border-primary/70 bg-primary/30 flex items-center px-3 text-xs text-muted-foreground">
            {itemCount} delegated task{itemCount === 1 ? '' : 's'}
          </div>
        ) : (
          <> </>
        )}
      </div>
      {expanded &&
        group.methods.map((row) => (
          <TimelineMethodRender key={row.id} row={row} highlighted={highlighted} />
        ))}
    </>
  )
}

// ── main timeline ────────────────────────────────────────────────────

export const TaskTimeline = () => {
  const timelineGroups = useSpaceViewStore((s) => s.timelineGroups)
  const timelineEvents = useSpaceViewStore((s) => s.timelineEvents)
  const highlighted = useSpaceViewStore((s) => s.highlightedTaskIds)
  const startTime = useSpaceViewStore((s) => s.timelineStartTime)
  const endTime = useSpaceViewStore((s) => s.timelineEndTime)
  const selectedTimepoint = useSpaceViewStore((s) => s.selectedTimepoint)
  const isLive = useSpaceViewStore((s) => s.isLive)
  const liveNow = useSpaceViewStore((s) => s.liveNow)
  const taskDone = useSpaceViewStore((s) => s.task.isDone === true)
  const zoomStart = useSpaceViewStore((s) => s.zoomStart)
  const zoomEnd = useSpaceViewStore((s) => s.zoomEnd)
  const resetZoom = useSpaceViewStore((s) => s.resetZoom)

  const setHighlighted = useSpaceViewStore((s) => s.setHighlightedTaskIds)

  // While the task runs, the right edge tracks "now" so the range and any
  // open-ended (running) bars keep growing with the live clock.
  const effectiveEnd = taskDone ? endTime : Math.max(endTime, liveNow)
  const range = effectiveEnd - startTime || 1

  const zoomSpan = zoomEnd - zoomStart || 1
  const isZoomed = zoomSpan < 0.999
  // full-range fraction (0..1) → on-screen fraction within the zoom window
  const toScreen = (fullNorm: number) => (fullNorm - zoomStart) / zoomSpan

  const timepointNormalised = (selectedTimepoint - startTime) / range
  const frontierNormalised = (liveNow - startTime) / range
  const selectedScreen = toScreen(timepointNormalised)
  const frontierScreen = toScreen(frontierNormalised)

  // Re-derive event positions against the dynamic range so they stay aligned
  // as the right edge grows.
  const eventClusters = useMemo(() => {
    const withPos = timelineEvents.map((e) => ({
      ...e,
      position: (new Date(e.createdAt).getTime() - startTime) / range
    }))
    return clusterEvents(withPos)
  }, [timelineEvents, startTime, range])

  // Time-axis interaction (works in live mode too): wheel zooms anchored at the
  // cursor (and horizontal wheel pans); click-drag pans left/right. State is read
  // fresh from the store on each event so a fast gesture stays accurate. Native
  // non-passive listeners let us preventDefault and stop the panel from scrolling.
  const plotRef = useRef<HTMLDivElement>(null)
  const store = useContext(SpaceViewStoreContext)

  useEffect(() => {
    const el = plotRef.current
    if (!el || !store) return
    const timeWidthOf = (rect: DOMRect) => (rect.width * 11) / 12

    // Wheel and pointermove can fire many times per frame; coalesce the store
    // write into one requestAnimationFrame flush so the graph re-renders at
    // most once per frame. Reads go through `currentZoom` so a burst of events
    // within the same frame builds on the pending value, not the stale store.
    let pending: { start: number; end: number } | null = null
    let rafId: number | null = null
    const flush = () => {
      rafId = null
      if (!pending) return
      const { start, end } = pending
      pending = null
      store.getState().setZoomWindow(start, end)
    }
    const scheduleZoom = (start: number, end: number) => {
      pending = { start, end }
      if (rafId === null) rafId = requestAnimationFrame(flush)
    }
    const cancelScheduled = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
      pending = null
    }
    const currentZoom = () => {
      if (pending) return { zs: pending.start, ze: pending.end }
      const { zoomStart, zoomEnd } = store.getState()
      return { zs: zoomStart, ze: zoomEnd }
    }

    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect()
      const timeWidth = timeWidthOf(rect)
      if (timeWidth <= 0) return

      const { zs, ze } = currentZoom()
      const span = ze - zs

      // Horizontal intent → pan; vertical intent → zoom.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (span >= 1) return // nothing to pan when fully zoomed out
        e.preventDefault()
        const panFull = (e.deltaX / timeWidth) * span
        const newStart = Math.max(0, Math.min(1 - span, zs + panFull))
        scheduleZoom(newStart, newStart + span)
        return
      }

      if (e.deltaY === 0) return
      e.preventDefault()
      const timeLeft = rect.left + rect.width / 12
      const cursorScreen = clamp01((e.clientX - timeLeft) / timeWidth)
      const anchorFull = zs + cursorScreen * span
      const factor = e.deltaY < 0 ? 1 / 1.15 : 1.15 // scroll up → zoom in
      const newSpan = Math.min(1, span * factor) // ≥1 collapses to the full range
      const newStart = Math.max(0, Math.min(1 - newSpan, anchorFull - cursorScreen * newSpan))
      scheduleZoom(newStart, newStart + newSpan)
    }

    // click-drag to pan (only meaningful when zoomed in)
    let drag: { startX: number; startZoomStart: number; span: number; timeWidth: number } | null =
      null
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const { zs, ze } = currentZoom()
      const span = ze - zs
      if (span >= 1) return
      drag = {
        startX: e.clientX,
        startZoomStart: zs,
        span,
        timeWidth: timeWidthOf(el.getBoundingClientRect())
      }
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!drag || drag.timeWidth <= 0) return
      // grab-and-drag: dragging right reveals earlier time (window shifts left)
      const panFull = -((e.clientX - drag.startX) / drag.timeWidth) * drag.span
      const newStart = Math.max(0, Math.min(1 - drag.span, drag.startZoomStart + panFull))
      scheduleZoom(newStart, newStart + drag.span)
    }
    const onPointerUp = () => {
      if (!drag) return
      drag = null
      // Land on the final drag position right away rather than one frame late.
      if (rafId !== null) cancelAnimationFrame(rafId)
      flush()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      cancelScheduled()
    }
  }, [store])

  const zoomStartTime = startTime + zoomStart * range
  const zoomEndTime = startTime + zoomEnd * range

  return (
    <div
      className="w-full h-full justify-end text-white @container overflow-y-auto overflow-x-hidden rounded-b-2xl border border-border/60 bg-gradient-to-b from-background to-background/80  cursor-default"
      onClick={() => setHighlighted([])}
    >
      <div
        ref={plotRef}
        className={`relative w-full h-full min-h-[200px] p-3 bg-background ${
          isZoomed ? 'cursor-grab active:cursor-grabbing select-none' : ''
        }`}
      >
        {/* zoom indicator / reset */}
        {isZoomed && (
          <div className="absolute right-3 top-1 z-40 flex items-center gap-2">
            <span className="rounded-md border border-border/60 bg-background/90 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {new Date(zoomStartTime).toLocaleTimeString()} –{' '}
              {new Date(zoomEndTime).toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={(e) => {
                e.stopPropagation()
                resetZoom()
              }}
            >
              <ZoomOut className="h-3 w-3" />
              Reset
            </Button>
          </div>
        )}

        {/* event ticks — one per cluster, label on hover only */}
        <div className="absolute inset-0 flex z-20 pointer-events-none">
          <div className="w-1/12" />
          <div className="w-11/12 relative border-l border-white/5">
            <TooltipProvider delayDuration={100}>
              {eventClusters.map((cluster, index) => {
                const screen = toScreen(cluster.position)
                if (screen < 0 || screen > 1) return null
                const hasError = cluster.events.some(
                  (e) =>
                    e.kind === TaskEventKind.Failed ||
                    e.kind === TaskEventKind.Critical
                )
                return (
                  <Tooltip key={`evt-${index}`}>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute top-0 bottom-0 w-px cursor-default pointer-events-auto ${
                          hasError
                            ? 'bg-rose-500/60 hover:bg-rose-400'
                            : 'bg-white/15 hover:bg-white/50'
                        }`}
                        style={{ left: `${screen * 100}%` }}
                      >
                        {cluster.events.length > 1 && (
                          <span className="absolute -top-1 -translate-x-1/2 rounded-full bg-muted px-1 text-[8px] text-muted-foreground">
                            {cluster.events.length}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="flex flex-col gap-0.5">
                        {cluster.events.slice(0, 6).map((e, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-medium">{e.kind}</span>
                            {e.message ? (
                              <span className="text-muted-foreground">: {e.message}</span>
                            ) : null}
                          </div>
                        ))}
                        {cluster.events.length > 6 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{cluster.events.length - 6} more
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </TooltipProvider>
          </div>
        </div>

        {/* live "now" frontier */}
        {isLive && endTime > startTime && frontierScreen >= 0 && frontierScreen <= 1 && (
          <div className="absolute inset-0 flex pointer-events-none z-30">
            <div className="w-1/12" />
            <div className="w-11/12 relative">
              <div
                className="absolute top-0 bottom-0 border-l border-dashed border-emerald-500/70"
                style={{ left: `${frontierScreen * 100}%` }}
              >
                <span className="absolute -top-0.5 -translate-x-1/2 rounded bg-emerald-500/20 px-1 text-[8px] font-medium text-emerald-400">
                  now
                </span>
              </div>
            </div>
          </div>
        )}

        {/* selected timepoint indicator */}
        {selectedScreen >= 0 && selectedScreen <= 1 && (
          <div className="absolute inset-0 flex pointer-events-none z-30">
            <div className="w-1/12" />
            <div className="w-11/12 relative">
              <div
                className="absolute top-0 bottom-0 w-px bg-primary shadow-[0_0_8px_0_var(--primary,#a855f7)]"
                style={{ left: `${selectedScreen * 100}%` }}
              >
                <div className="absolute -top-px left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-primary" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-y-2 z-10 mb-10">
          {timelineGroups.map((group) => (
            <TimelineGroupRender key={group.id} group={group} highlighted={highlighted} />
          ))}
        </div>
      </div>
    </div>
  )
}
