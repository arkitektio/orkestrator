import { isTaskLive } from '@/rekuest/lib/taskTracker'
import { useEffect } from 'react'
import { useSpaceViewStore } from './store'

/**
 * Drives the live clock. While the task is still running, ticks the store at
 * ~3 Hz. `setLiveNow` advances `selectedTimepoint` (tracking the live frontier)
 * only when the view is live; when paused it still advances `liveNow` so the
 * elapsed timer and timeline range keep moving.
 *
 * Renders nothing. Throttled to an interval (not requestAnimationFrame) on
 * purpose: each live tick recomputes the active sets over all children, which is
 * fine a few times a second but wasteful at 60 fps.
 */
export const LiveTicker = () => {
  const taskDone = useSpaceViewStore((s) => !isTaskLive(s.task))
  const finishedAt = useSpaceViewStore((s) => s.task.finishedAt)
  const setLiveNow = useSpaceViewStore((s) => s.setLiveNow)

  useEffect(() => {
    if (taskDone) {
      // Pin the frontier at the real end so it doesn't drift past completion.
      if (finishedAt) setLiveNow(new Date(finishedAt).getTime())
      return
    }

    const interval = setInterval(() => setLiveNow(Date.now()), 333)
    return () => clearInterval(interval)
  }, [taskDone, finishedAt, setLiveNow])

  return null
}
