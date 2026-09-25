import { Button } from '@/core/ui/button'
import { useSpaceViewStore } from '../store'
import { classifyChild, type ChildStatusBucket } from './statusColors'
import { CheckCircle2, CircleSlash, Loader2, Radio, XCircle } from 'lucide-react'

const notEmpty = <T,>(v: T | null | undefined): v is T => v != null

const formatElapsed = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

const CountChip = ({
  icon: Icon,
  count,
  label,
  className,
  spin
}: {
  icon: typeof Loader2
  count: number
  label: string
  className: string
  spin?: boolean
}) => (
  <div
    title={`${count} ${label}`}
    className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${className} ${
      count === 0 ? 'opacity-40' : ''
    }`}
  >
    <Icon className={`h-3.5 w-3.5 ${spin && count > 0 ? 'animate-spin' : ''}`} />
    <span className="tabular-nums">{count}</span>
  </div>
)

/**
 * At-a-glance status of the task's children plus the live-follow control.
 * Counts running/done/errored/cancelled, shows ticking elapsed time, and a
 * LIVE indicator that doubles as a "Go live" button when follow is off.
 */
export const LiveStatusStrip = () => {
  const children = useSpaceViewStore((s) => s.task.children)
  const taskDone = useSpaceViewStore((s) => s.task.isDone === true)
  const isLive = useSpaceViewStore((s) => s.isLive)
  const enableLive = useSpaceViewStore((s) => s.enableLive)
  const startTime = useSpaceViewStore((s) => new Date(s.task.createdAt).getTime())
  const finishedAt = useSpaceViewStore((s) => s.task.finishedAt)
  const liveNow = useSpaceViewStore((s) => s.liveNow)

  const counts: Record<ChildStatusBucket, number> = {
    running: 0,
    done: 0,
    errored: 0,
    cancelled: 0
  }
  for (const child of (children || []).filter(notEmpty)) {
    counts[classifyChild(child)] += 1
  }
  const total = counts.running + counts.done + counts.errored + counts.cancelled

  const endTime = taskDone && finishedAt ? new Date(finishedAt).getTime() : liveNow
  const elapsed = formatElapsed(endTime - startTime)

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-foreground">
      {isLive ? (
        <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          LIVE
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => enableLive()}
          disabled={taskDone}
          title={taskDone ? 'Task has finished' : 'Follow the live frontier'}
        >
          <Radio className="h-3.5 w-3.5" />
          Go live
        </Button>
      )}

      <div className="h-4 w-px bg-border" />

      <CountChip
        icon={Loader2}
        count={counts.running}
        label="running"
        className="border-sky-500/50 bg-sky-500/10 text-sky-500"
        spin
      />
      <CountChip
        icon={CheckCircle2}
        count={counts.done}
        label="done"
        className="border-primary/50 bg-primary/10 text-primary"
      />
      <CountChip
        icon={XCircle}
        count={counts.errored}
        label="errored"
        className="border-rose-500/50 bg-rose-500/10 text-rose-500"
      />
      <CountChip
        icon={CircleSlash}
        count={counts.cancelled}
        label="cancelled"
        className="border-zinc-500/50 bg-zinc-500/10 text-zinc-400"
      />

      <span className="ml-1 text-xs text-muted-foreground">
        {total} task{total === 1 ? '' : 's'}
      </span>

      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
        <span>{taskDone ? 'Walltime' : 'Elapsed'}</span>
        <span className="font-medium text-foreground">{elapsed}</span>
      </div>
    </div>
  )
}
