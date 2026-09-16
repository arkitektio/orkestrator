import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LiveTaskFragment, TaskEventKind, useCancelMutation } from '@/rekuest/api/graphql'
import { LiveTaskState, useLiveTask, useTask } from '@/rekuest/hooks/useTasks'
import { RekuestTask } from '@/linkers'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Loader, Square, X } from 'lucide-react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useEffect, useState } from 'react'
import { dismiss, useTaskNotifications } from '../../lib/taskNotifications'
import { TaskStatusLine } from '../task/TaskStatusLine'
import { TaskStatusIcon } from '../../lib/taskStatus'
import { borderColorForLiveState, DynamicYieldDisplay } from '../task/YieldDisplay'

/**
 * Headless auto-dismiss for one task. Success and cancellation clear after a
 * delay long enough to read the result; errors AND tasks that yielded a result
 * (e.g. an image) persist until dismissed, so the result stays inspectable.
 *
 * Rendered for EVERY active id by the stack itself. It used to live in the
 * expanded card, which only mounts while the hover list is open — so finished
 * tasks never cleared on their own and piled up behind the island.
 */
const TaskAutoDismiss = ({ id }: { id: string }) => {
  const live = useLiveTask({ task: id })

  useEffect(() => {
    if ((live.done || live.cancelled) && !live.yield && !live.error) {
      const timer = setTimeout(() => dismiss(id), 8000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [live.done, live.cancelled, live.yield, live.error, id])

  return null
}

/**
 * A single live task card in the expanded list: status line, error block and
 * the full yield display. Auto-dismiss lives in {@link TaskAutoDismiss}.
 */
const TaskNotificationCard = ({ id }: { id: string }) => {
  const task = useTask({ task: id })
  const live = useLiveTask({ task: id })

  if (!task) {
    return null
  }

  return (
    <div
      className={cn(
        // `w-full`, not a fixed width: the card used to be `w-80` inside a
        // `w-80` container with padding, so it overflowed by exactly that
        // padding. The container owns the width; the card fills it.
        // `min-w-0` lets the truncation inside actually engage.
        'relative flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-md border bg-background p-3 shadow-lg',
        borderColorForLiveState(live)
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={() => dismiss(id)}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="min-w-0 pr-7">
        <TaskStatusLine task={task} showCancel showLink />
      </div>

      {live.error && (
        // Server errors arrive as arbitrary text: a stack trace, or a single
        // unbroken token like a URL or a UUID, which would otherwise push the
        // card wider than its container. Break anywhere, and cap the height so
        // one long failure cannot bury the tasks underneath it.
        <div className="max-h-32 w-full min-w-0 overflow-y-auto break-words whitespace-pre-wrap rounded bg-red-500/10 p-2 text-xs text-red-500">
          {live.error}
        </div>
      )}

      <AnimatedYield
        eventId={latestYieldEventId(task)}
        values={live.yield}
        actionId={live.actionId}
      />
    </div>
  )
}

/** A task that has neither finished nor been stopped. */
const isRunning = (live: LiveTaskState) =>
  !live.done && !live.cancelled && !live.error && !live.isDone

/**
 * The latest yield, cross-faded whenever a new one arrives. Keyed on the YIELD
 * event's id rather than on the values, so two identical consecutive yields
 * still read as "something happened" and a re-render with the same event does
 * not replay the animation.
 */
const AnimatedYield = ({
  eventId,
  values,
  actionId,
  className,
  minimal
}: {
  eventId: string | undefined
  values: unknown[] | null | undefined
  actionId: string | undefined
  className?: string
  minimal?: boolean
}) => (
  <AnimatePresence mode="popLayout" initial={false}>
    {values && actionId && (
      <motion.div
        key={eventId ?? 'yield'}
        layout
        initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        // A yield is a rendered widget — an image, a table — sized by its own
        // registry entry, not by this island. Contain it rather than trust it.
        className={cn('min-w-0 overflow-hidden', className)}
      >
        <DynamicYieldDisplay values={values} actionId={actionId} minimal={minimal} />
      </motion.div>
    )}
  </AnimatePresence>
)

/** Id of the newest YIELD event; events arrive newest first. */
const latestYieldEventId = (task: LiveTaskFragment) =>
  task.events?.find((event) => event.kind === TaskEventKind.Yield)?.id

/**
 * The collapsed "island": a summary of the latest task (icon, name, progress,
 * latest yield). Further tasks show as a stacked edge beneath it, not a count.
 * Hovering / clicking it expands the full
 * stack; hovering also reveals its own controls (open, cancel, dismiss).
 *
 * While the task runs the island looks busy — a light sweep across it and a
 * live progress edge (indeterminate when no PROGRESS event arrived yet) — and
 * goes still the moment it settles, so "still working" is readable at a glance.
 */
const TaskNotificationPill = ({ id, onClick }: { id: string; onClick: () => void }) => {
  const task = useTask({ task: id })
  const live = useLiveTask({ task: id })
  const reduceMotion = useReducedMotion()
  const [cancel, { loading: cancelRequested }] = useCancelMutation({
    variables: { input: { task: id } }
  })

  if (!task) {
    return null
  }

  const running = isRunning(live)
  const cancelling = cancelRequested || task.latestEventKind === TaskEventKind.Cancelling

  // The controls live inside the clickable island, so they must not also
  // toggle the expanded stack.
  const stop = (fn: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation()
    fn()
  }

  return (
    // A `div role="button"`, not a `<button>`: the hover controls are buttons
    // themselves, and interactive content cannot nest inside a `<button>`.
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        // Only the island itself: Enter on a focused control bubbles up here,
        // and swallowing it would stop that control from activating.
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      aria-label="Show tasks"
      aria-busy={running}
      // The rail is 240px and an action name can be any length, so every part
      // of this row is either `shrink-0` or allowed to truncate. `min-w-0` on
      // the flexible one is what makes `truncate` engage at all — without it a
      // flex item's automatic minimum size is its content, and the row grows
      // past the rail instead of clipping.
      // A raised card, like a browser's now-playing media control at the foot
      // of its sidebar: soft border, real shadow, lifting a little further on
      // hover. The contents (yield widgets) stay bare — the card is the only
      // chrome. Status is carried by the icon, not a coloured border.
      className="group relative flex w-full min-w-0 cursor-pointer flex-col gap-1.5 overflow-hidden rounded-xl border border-border/60 bg-background/90 px-2.5 py-2 text-left shadow-md shadow-black/5 transition-[box-shadow,background-color] duration-200 hover:bg-background hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:shadow-black/30"
    >
      {/* Busy sweep: a soft band of light travelling across the island. */}
      {running && !reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '300%' }}
          transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
        />
      )}

      <div className="relative flex min-w-0 items-center gap-2">
        <TaskStatusIcon
          kind={task.latestEventKind}
          isDone={task.isDone}
          className="h-4 w-4 shrink-0"
        />
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-xs font-medium transition-[padding] group-hover:pr-12 group-focus-within:pr-12',
            running && 'text-foreground/80'
          )}
        >
          {live.actionName || 'Unknown action'}
        </span>
        {/* Status chips give way to the controls on hover, in the same spot,
            so the row never reflows under the pointer. */}
        <div className="flex shrink-0 items-center gap-1 transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0">
          {live.progress != null && (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {live.progress}%
            </span>
          )}
        </div>
        <div className="pointer-events-none absolute right-0 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          <RekuestTask.DetailLink
            object={task}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(event: React.MouseEvent) => event.stopPropagation()}
            aria-label="Open task"
            title="Open task"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </RekuestTask.DetailLink>
          {running ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive"
              disabled={cancelling}
              onClick={stop(() => cancel())}
              aria-label="Cancel task"
              title={cancelling ? 'Cancelling…' : 'Cancel task'}
            >
              {cancelling ? (
                <Loader className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Square className="h-3 w-3 fill-current" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={stop(() => dismiss(id))}
              aria-label="Dismiss task"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <AnimatedYield
        eventId={latestYieldEventId(task)}
        values={live.yield}
        actionId={live.actionId}
        minimal
        // Capped: the island is a summary, the full yield is one hover away.
        // The mask fades an over-tall widget out instead of hard-clipping it.
        className="relative max-h-24 [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
      />

      {/* Progress edge along the bottom: determinate once the task reports
          progress, a travelling segment until then. */}
      <AnimatePresence>
        {running && (
          <motion.div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-primary/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {live.progress != null ? (
              <motion.div
                className="h-full bg-primary"
                initial={false}
                animate={{ width: `${live.progress}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
              />
            ) : (
              <motion.div
                className="h-full w-1/3 bg-primary/70"
                initial={{ x: '-100%' }}
                animate={reduceMotion ? { x: '100%' } : { x: '300%' }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 1.2, ease: 'easeInOut', repeat: Infinity }
                }
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ENTER = { opacity: 0, y: 15, scale: 0.96 }
const SHOWN = { opacity: 1, y: 0, scale: 1 }
const LEAVE = { opacity: 0, y: -10, scale: 0.95 }
const SPRING = { type: 'spring', bounce: 0.3, duration: 0.35 } as const

/**
 * Running tasks, as a strip at the foot of the rail.
 *
 * Deliberately where a browser puts its now-playing control: tasks are ambient
 * and long-running, so they belong in the chrome that is always there rather
 * than floating over the page, where they covered content and moved with
 * nothing.
 *
 * Collapsed is a single row summarising the latest task; hover or focus fans
 * every active task out into a card list to the RIGHT of the rail. Popping out
 * rather than expanding in place matters here — growing inside a 240px column
 * would shove the pinned routes above it around every time a task started.
 *
 * Reads its ids from the `taskNotifications` store, which `TaskUpdater` feeds
 * from the WatchMyTasks subscription, so a fresh task still pops in on create.
 */
export const TaskNotificationStack = () => {
  const ids = useTaskNotifications()
  const [expanded, setExpanded] = useState(false)

  return (
    <AnimatePresence>
      {ids.length > 0 && (
        // `min-w-0` so this section can be narrower than the pill's content
        // wants to be; without it the rail's own flex column would be widened
        // by a long action name rather than the name being truncated.
        // `shrink-0` so a long pin list above squeezes the scrolling list, not
        // this. Wrapped in presence so the island fades OUT when the last task
        // is dismissed instead of vanishing.
        <motion.div
          key="task-island"
          initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="min-w-0 shrink-0 px-2 pb-2"
        >
          {ids.map((id) => (
            <TaskAutoDismiss key={id} id={id} />
          ))}
          <HoverCard open={expanded} onOpenChange={setExpanded} openDelay={80} closeDelay={180}>
            <HoverCardTrigger asChild>
              <motion.div layout className="relative w-full min-w-0">
                {/* More than one task: the edges of the cards underneath peek
                    out below the island, like a stack — "there is more" said
                    without a counter. The list itself is one hover away. */}
                <AnimatePresence>
                  {ids.length > 1 && (
                    <motion.div
                      key="stack-peek"
                      aria-hidden
                      data-testid="task-stack-peek"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-x-2.5 -bottom-1.5 h-6 rounded-b-xl border border-t-0 border-border/50 bg-background/60 shadow-sm shadow-black/5"
                    />
                  )}
                </AnimatePresence>
                {/* Re-keyed on the newest id: a freshly started task fades in
                    over the previous one rather than swapping its text. */}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={ids[0]}
                    initial={ENTER}
                    animate={SHOWN}
                    exit={LEAVE}
                    transition={SPRING}
                    className="relative w-full min-w-0"
                  >
                    <TaskNotificationPill
                      id={ids[0]}
                      onClick={() => setExpanded((current) => !current)}
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </HoverCardTrigger>

            <HoverCardContent
              side="right"
              align="end"
              sideOffset={8}
              // Capped against the viewport, not just given a width: at 320px plus
              // the rail plus the gaps, a narrow window would otherwise push this
              // off-screen. Radix flips it on collision, and this keeps it fitting
              // whichever side it lands on.
              className="flex max-h-[70vh] w-80 max-w-[calc(100vw-var(--rail-width)-2.5rem)] flex-col gap-2 overflow-y-auto overflow-x-hidden p-2"
            >
              <AnimatePresence initial={false}>
                {ids.map((id) => (
                  <motion.div
                    key={id}
                    layout
                    initial={ENTER}
                    animate={SHOWN}
                    exit={LEAVE}
                    transition={SPRING}
                    // `shrink-0`: this is a scrolling flex column, and without it
                    // the cards compress into each other as tasks pile up instead
                    // of the list scrolling.
                    className="w-full min-w-0 shrink-0"
                  >
                    <TaskNotificationCard id={id} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </HoverCardContent>
          </HoverCard>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
