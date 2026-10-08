import { useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuTrigger
} from '@/core/ui/context-menu'
import { useViewerStoreApi } from '../../platform/stores/viewerStore'

/**
 * Plays one collapsible dim: steps its selection at a steady rate, looping at
 * the end. Click toggles; right-click picks the rate.
 *
 * A step is a `setDimSelection` like a drag of the slider next to it, so it
 * costs what a scrub costs (a replan and a refetch of every layer carrying the
 * dim). The rate is how often a step is ASKED for, not a promise the data
 * keeps up: a slow store shows fewer frames, it does not queue them.
 *
 * It reads the current index from the store on each tick rather than counting
 * on its own, so dragging the slider mid-play carries on from where it was put.
 */

export const DIM_PLAY_RATES = [1, 2, 5, 10, 20, 30] as const
const DEFAULT_RATE = 5

/** The index after `current`, looping past `maxIndex` back to the start. */
export const nextDimIndex = (current: number, maxIndex: number): number =>
  maxIndex <= 0 || current >= maxIndex || current < 0 ? 0 : current + 1

export const DimPlayButton = ({
  dim,
  maxIndex,
  defaultIndex
}: {
  dim: string
  maxIndex: number
  defaultIndex: number
}) => {
  const viewerApi = useViewerStoreApi()
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState<number>(DEFAULT_RATE)

  useEffect(() => {
    if (!playing || maxIndex <= 0) return
    const timer = setInterval(() => {
      const viewer = viewerApi.getState()
      const current = viewer.dimSelections[dim] ?? defaultIndex
      viewer.setDimSelection(dim, nextDimIndex(current, maxIndex))
    }, 1000 / rate)
    return () => clearInterval(timer)
  }, [playing, rate, dim, maxIndex, defaultIndex, viewerApi])

  if (maxIndex <= 0) return null

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => setPlaying((value) => !value)}
          title={`${playing ? 'Pause' : 'Play'} ${dim} (${rate}/s) — right-click for speed`}
        >
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Speed</ContextMenuLabel>
        <ContextMenuRadioGroup value={String(rate)} onValueChange={(value) => setRate(Number(value))}>
          {DIM_PLAY_RATES.map((option) => (
            <ContextMenuRadioItem key={option} value={String(option)}>
              {option} / s
            </ContextMenuRadioItem>
          ))}
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}
