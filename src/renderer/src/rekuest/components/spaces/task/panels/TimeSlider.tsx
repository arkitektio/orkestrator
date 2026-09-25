import { Slider } from '@/core/components/ui/slider'
import { Button } from '@/core/components/ui/button'
import { Radio } from 'lucide-react'
import { useSpaceViewStore } from '../store'

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
  const taskDone = useSpaceViewStore((s) => s.task.isDone === true)

  const span = endTime - startTime
  const fraction = span > 0 ? (selectedTimepoint - startTime) / span : 0
  const clampedFraction = Math.max(0, Math.min(1, fraction))

  return (
    <div className="w-full px-4 py-2 relative mb-2 group flex items-center gap-3">
      <div className="flex-grow relative">
        <Slider
          value={[selectedTimepoint]}
          min={startTime}
          max={endTime}
          step={1}
          onValueChange={(value) => {
            setTimepoint(value[0])
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{new Date(startTime).toLocaleTimeString()}</span>
          <span>{new Date(endTime).toLocaleTimeString()}</span>
        </div>
        <div
          className="absolute group-hover:opacity-100 opacity-0 transition-opacity pointer-events-none"
          style={{
            top: '50%',
            transform: 'translate(-50%, 100%)',
            left: `${clampedFraction * 100}%`
          }}
        >
          <div className="text-sm bg-muted/80 px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
            {new Date(selectedTimepoint).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {!taskDone &&
        (isLive ? (
          <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-500 shrink-0">
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
            className="h-7 gap-1.5 text-xs shrink-0"
            onClick={() => enableLive()}
            title="Follow the live frontier"
          >
            <Radio className="h-3.5 w-3.5" />
            Go live
          </Button>
        ))}
    </div>
  )
}
