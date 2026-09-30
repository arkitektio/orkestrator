import { TaskEventKind } from '@/rekuest/api/graphql'
import { statusBucket } from '@/rekuest/lib/taskStatus'

/**
 * Tailwind classes for a status bar/badge keyed by an task's
 * `latestEventKind`. Shared by the timeline bars and the live status strip so
 * the two surfaces speak the same colour language. The palette is deliberately
 * softer than the global gantt palette (`statusBarColor`), but the branching
 * follows the shared `statusBucket` vocabulary.
 */
export const getStatusColor = (status: TaskEventKind | undefined | string) => {
  if (status === TaskEventKind.Yield) return 'bg-violet-400/90 border-violet-500'
  switch (statusBucket(status as TaskEventKind)) {
    case 'done':
      return 'bg-primary/20 border-primary'
    case 'error':
      return 'bg-rose-400/90 border-rose-500'
    case 'cancelled':
      return 'bg-zinc-500/80 border-zinc-600'
    case 'lost':
    case 'paused':
      return 'bg-amber-400/90 border-amber-500'
    default:
      return 'bg-primary/70 border-primary'
  }
}

export type ChildStatusBucket = 'running' | 'done' | 'errored' | 'cancelled'

/**
 * Buckets an task into a coarse lifecycle status for at-a-glance counts.
 * Anything not yet terminal counts as "running".
 */
export const classifyChild = (child: {
  isDone?: boolean | null
  latestEventKind?: TaskEventKind | null
}): ChildStatusBucket => {
  switch (statusBucket(child.latestEventKind, child.isDone)) {
    case 'error':
    case 'lost':
      return 'errored'
    case 'cancelled':
      return 'cancelled'
    case 'done':
      return 'done'
    default:
      return 'running'
  }
}
