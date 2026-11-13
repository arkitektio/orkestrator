import { isTaskLive } from '@/rekuest/lib/taskTracker'
import { Slider } from '@/core/ui/slider'
import { Button } from '@/core/ui/button'
import { Radio } from 'lucide-react'
import { useSpaceViewStore } from '../store'

/**
 * The moment the Space shows, as one thin row: the task's start, the slider,
 * its end (now, while it runs). Dragging leaves the live frontier; "Go live"
 * is offered only then.
 */
export const TimeSlider = () => {
  const startTime = useSpaceViewStore((s) => new Date(s.task.createdAt).getTime())
  // While running, `finishedAt` is null — fall back to the live clock so the
  // slider range is valid for live tasks (previously NaN, breaking the slider).
  const endTime = useSpaceViewStore((s) =>
    s.task.finishedAt ? new Date(s.task.finishedAt).getTime() : s.liveNow
  )

  const setTimepoint = useSpaceViewStore((s) => s.selectTimepoint)
  const selectedTimepoint = useSpaceViewStore((s) => s.selectedTimepoint)
  const isLive = useSpaceViewStore((s) => s.isLive)
  const enableLive = useSpaceViewStore((s) => s.enableLive)
  const taskDone = useSpaceViewStore((s) => !isTaskLive(s.task))

  const shown = isLive ? endTime : selectedTimepoint

  return (
    <div className="flex w-full items-center gap-3 px-4 py-1.5 text-xs tabular-nums text-muted-foreground">
      <span className="shrink-0">{new Date(startTime).toLocaleTimeString()}</span>
      <Slider
        className="flex-1"
        value={[selectedTimepoint]}
        min={startTime}
        max={endTime}
        step={1}
        onValueChange={(value) => {
          setTimepoint(value[0])
        }}
      />
      {/* The moment shown: the end while following, else where the slider stands. */}
      <span className={isLive ? 'shrink-0' : 'shrink-0 font-medium text-foreground'}>
        {new Date(shown).toLocaleTimeString()}
      </span>
      {!taskDone && !isLive && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 shrink-0 gap-1.5 px-2 text-xs"
          onClick={() => enableLive()}
          title="Follow the live frontier"
        >
          <Radio className="h-3.5 w-3.5" />
          Go live
        </Button>
      )}
    </div>
  )
}
