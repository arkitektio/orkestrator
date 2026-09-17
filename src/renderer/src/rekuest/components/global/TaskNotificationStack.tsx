import { useLatestRef } from '@/hooks/useLatestRef'
import { cn } from '@/lib/utils'
import { LiveTaskFragment, TaskEventKind } from '@/rekuest/api/graphql'
import { useTasks } from '@/rekuest/hooks/useTasks'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MAX_VISIBLE_ROWS,
  orderFromSignature,
  overflowDots,
  rankSignature,
  reconcileOrder,
  shouldAutoDismiss,
  splitVisible,
  TaskRank
} from '../../lib/taskIsland'
import { dismiss, useTaskNotifications } from '../../lib/taskNotifications'
import { TaskIslandRow, taskIslandHeaderId } from './TaskIslandRow'

/** How long a quietly finished task stays before it clears on its own. */
const AUTO_DISMISS_MS = 8000
/** Rest on a row this long before it opens: crossing the island opens nothing. */
const OPEN_DELAY_MS = 120
/** Grace after the pointer leaves the island before the open row closes. */
const CLOSE_DELAY_MS = 200
/**
 * After a row opens, hover is ignored for this long. The opening row pushes
 * its neighbours around; without the pause, one that slides under the pointer
 * would open in turn, and the island would flicker between the two.
 */
const SETTLE_MS = 250

/**
 * Headless auto-dismiss for one task. A quiet finish clears after a delay long
 * enough to read; failures AND tasks that yielded a result (e.g. an image)
 * persist until dismissed, so the result stays inspectable.
 *
 * Rendered for EVERY active id, including the ones behind the peek — a task
 * nobody is looking at still has to clear. Paused while its row is open, so a
 * row is never pulled out from under the pointer reading it.
 */
const TaskAutoDismiss = memo(function TaskAutoDismiss({
  id,
  task,
  paused
}: {
  id: string
  task: LiveTaskFragment | undefined
  paused: boolean
}) {
  const hasYield = task?.events.some((event) => event.kind === TaskEventKind.Yield) ?? false
  const clears = shouldAutoDismiss(task, hasYield)

  useEffect(() => {
    if (!clears || paused) return undefined
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [clears, paused, id])

  return null
})

/** Hover-intent bookkeeping: timers and the settle deadline. Handlers only. */
type Intent = {
  open?: ReturnType<typeof setTimeout>
  close?: ReturnType<typeof setTimeout>
  pending: string | null
  settledAt: number
}

const cancelOpen = (intent: Intent) => {
  clearTimeout(intent.open)
  intent.pending = null
}

/** Dot colour per rank on the peek. Literal classes — Tailwind reads the source. */
const DOT: Record<TaskRank, string> = {
  0: 'bg-primary animate-pulse',
  1: 'bg-destructive',
  2: 'bg-muted-foreground/50'
}

/**
 * Running tasks, as an island at the foot of the rail.
 *
 * Deliberately where a browser puts its now-playing control: tasks are ambient
 * and long-running, so they belong in the chrome that is always there rather
 * than floating over the page, where they covered content and moved with
 * nothing.
 *
 * One line per task, up to {@link MAX_VISIBLE_ROWS}; tasks still working come
 * first, then failures, then quiet finishes. Resting the pointer on a line
 * unfolds it IN PLACE (see {@link TaskIslandRow}). That is safe for the rail
 * because the island is anchored at its bottom: a row grows upward, so nothing
 * below it moves, and the pins above are anchored at the top of their own
 * scroller, which merely gets shorter. Any further tasks sit behind the
 * stacked edge under the island, one dot each; clicking it shows them all.
 *
 * Reads its ids from the `taskNotifications` store, which `TaskUpdater` feeds
 * from the WatchMyTasks subscription, so a fresh task still pops in on create.
 * The task list is read ONCE here and handed down: see `TaskIslandRow` for why.
 */
export const TaskNotificationStack = () => {
  const ids = useTaskNotifications()
  const { data } = useTasks()
  const myTasks = data?.myTasks

  const tasksById = useMemo(
    () => new Map((myTasks ?? []).map((task) => [task.id, task] as const)),
    [myTasks]
  )

  // Every task event rebuilds `tasksById`, but the ORDER can only change when
  // a rank does. Memoizing on the signature string keeps the order (and with it
  // every row's props) stable through the stream of PROGRESS / YIELD events.
  const signature = rankSignature(
    ids.filter((id) => tasksById.has(id)),
    tasksById
  )
  const ranked = useMemo(() => orderFromSignature(signature), [signature])
  const orderedIds = useMemo(() => ranked.map((entry) => entry.id), [ranked])
  const rankById = useMemo(() => new Map(ranked.map((entry) => [entry.id, entry.rank])), [ranked])

  const [hovered, setHovered] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [frozenOrder, setFrozenOrder] = useState<string[] | null>(null)

  // A task can be dismissed while it is the open one; derived here rather than
  // cleaned up in an effect, so a stale id never survives a render.
  const known = (id: string | null) => (id !== null && rankById.has(id) ? id : null)
  const pinned = known(pinnedId)
  const expandedId = known(hoverId) ?? pinned

  // While the user is in the island its rows must not re-sort under the
  // pointer, so the order is frozen for as long as the interaction lasts.
  const engaged = hovered || pinned !== null
  const displayIds = engaged && frozenOrder ? reconcileOrder(frozenOrder, orderedIds) : orderedIds
  const { visible, hidden } = splitVisible(displayIds, { showAll, keepId: expandedId })
  const orderKey = visible.join('|')
  const overflowing = displayIds.length > MAX_VISIBLE_ROWS

  const intent = useRef<Intent>({ pending: null, settledAt: 0 })

  // What the stable row callbacks below need to read without being rebuilt
  // (which would re-render every memoized row) each time it changes.
  const latest = useLatestRef({ expandedId, engaged, hovered, displayIds, pinned })

  useEffect(() => {
    const timers = intent.current
    return () => {
      clearTimeout(timers.open)
      clearTimeout(timers.close)
    }
  }, [])

  const freeze = useCallback(() => {
    if (!latest.current.engaged) setFrozenOrder(latest.current.displayIds)
  }, [latest])

  const onHover = useCallback(
    (id: string) => {
      const state = intent.current
      clearTimeout(state.close)
      if (id === latest.current.expandedId) {
        cancelOpen(state)
        return
      }
      if (state.pending === id || Date.now() < state.settledAt) return
      cancelOpen(state)
      state.pending = id
      state.open = setTimeout(() => {
        state.pending = null
        state.settledAt = Date.now() + SETTLE_MS
        setHoverId(id)
      }, OPEN_DELAY_MS)
    },
    [latest]
  )

  const onTogglePin = useCallback(
    (id: string) => {
      cancelOpen(intent.current)
      intent.current.settledAt = Date.now() + SETTLE_MS
      if (latest.current.pinned === id) {
        setPinnedId(null)
        // Under a pointer the row stays open until the pointer leaves. With
        // no pointer in the island (keyboard) nothing would ever close it.
        if (!latest.current.hovered) setHoverId(null)
        return
      }
      freeze()
      setPinnedId(id)
      // Opens at once as well: a click is all the intent there is, and a
      // keyboard user never hovers.
      setHoverId(id)
    },
    [freeze, latest]
  )

  const onCollapse = useCallback((id: string) => {
    cancelOpen(intent.current)
    setHoverId(null)
    setPinnedId(null)
    // Escape may come from a control inside the region that is about to
    // unmount; hand focus back to the header rather than lose it to <body>.
    document.getElementById(taskIslandHeaderId(id))?.focus()
  }, [])

  const onDismiss = useCallback(
    (id: string) => {
      // The dismiss button unmounts with its row. Move focus to a neighbouring
      // row first so a keyboard user stays in the island.
      const rows = latest.current.displayIds
      const index = rows.indexOf(id)
      const neighbour = rows[index + 1] ?? rows[index - 1]
      if (neighbour) document.getElementById(taskIslandHeaderId(neighbour))?.focus()
      dismiss(id)
    },
    [latest]
  )

  const onPointerEnter = () => {
    clearTimeout(intent.current.close)
    freeze()
    setHovered(true)
  }

  const onPointerLeave = () => {
    cancelOpen(intent.current)
    clearTimeout(intent.current.close)
    // Only leaving the WHOLE island closes a row. Moving between rows, or
    // from a header down into its own detail, never does.
    intent.current.close = setTimeout(() => {
      setHoverId(null)
      setHovered(false)
      // The full list folds back too, unless a pinned row says the user is
      // still working in here.
      if (latest.current.pinned === null) setShowAll(false)
    }, CLOSE_DELAY_MS)
  }

  return (
    <>
      {ids.map((id) => (
        <TaskAutoDismiss key={id} id={id} task={tasksById.get(id)} paused={id === expandedId} />
      ))}
      <AnimatePresence>
        {displayIds.length > 0 && (
          // `min-w-0` so this section can be narrower than its content wants to
          // be; without it the rail's own flex column would be widened by a
          // long action name rather than the name being truncated. `shrink-0`
          // so a long pin list above squeezes the scrolling list, not this.
          // Wrapped in presence so the island fades OUT when the last task is
          // dismissed instead of vanishing.
          <motion.div
            key="task-island"
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative min-w-0 shrink-0 px-2 pb-2"
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
          >
            {/* A raised card, like a browser's now-playing media control at the
                foot of its sidebar: soft border, real shadow. One card for all
                rows, so the shadow belongs to the island and each row is free
                to clip its own unfolding.

                Always height-capped, but only a scroller while showing
                everything: three collapsed rows and one open one never reach
                the cap, and a scroller that is not needed would only get in
                the way of the row shadows and the wheel. */}
            <motion.div
              layoutScroll
              data-testid="task-island"
              className={cn(
                'relative z-10 max-h-[45vh] min-w-0 overflow-x-hidden rounded-xl border border-border/60 bg-background/90 shadow-md shadow-black/5 dark:shadow-black/30',
                showAll && overflowing ? 'overflow-y-auto' : 'overflow-y-hidden'
              )}
            >
              {/* Default presence mode, NOT `popLayout`: that pins a leaving
                  row at its old `offsetTop`, and in a list anchored at the
                  bottom the rows then slide up underneath it. Folding the
                  height away keeps the row in flow while it leaves. */}
              <AnimatePresence initial={false}>
                {visible.map((id) => {
                  const task = tasksById.get(id)
                  if (!task) return null
                  return (
                    <TaskIslandRow
                      key={id}
                      id={id}
                      task={task}
                      expanded={id === expandedId}
                      pinned={id === pinned}
                      orderKey={orderKey}
                      onHover={onHover}
                      onTogglePin={onTogglePin}
                      onCollapse={onCollapse}
                      onDismiss={onDismiss}
                    />
                  )
                })}
              </AnimatePresence>
            </motion.div>

            {/* More tasks than rows: the edge of the cards underneath peeks
                out below the island, like a stack, with one dot per hidden
                task in the colour of its state — "there is more, and this is
                how it is doing" said without a +N counter. */}
            <AnimatePresence initial={false}>
              {overflowing && (
                <motion.button
                  key="stack-peek"
                  type="button"
                  data-testid="task-stack-peek"
                  aria-expanded={showAll}
                  aria-label={
                    showAll
                      ? 'Show fewer tasks'
                      : `Show ${hidden.length} more ${hidden.length === 1 ? 'task' : 'tasks'}`
                  }
                  onClick={() => {
                    freeze()
                    setShowAll((current) => !current)
                  }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="relative mx-2.5 -mt-px flex h-3.5 w-[calc(100%-1.25rem)] cursor-pointer items-center justify-center gap-1 rounded-b-xl border border-t-0 border-border/50 bg-background/60 text-muted-foreground shadow-sm shadow-black/5 hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showAll ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    overflowDots(hidden).map((id) => (
                      <span
                        key={id}
                        data-testid="task-stack-dot"
                        className={cn('h-1 w-1 rounded-full', DOT[rankById.get(id) ?? 0])}
                      />
                    ))
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
