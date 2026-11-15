import { DetailTaskFragment } from '@/rekuest/api/graphql'
import { isTaskLive } from '@/rekuest/lib/taskTracker'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { LiveTicker } from './LiveTicker'
import { TimeSlider } from './panels/TimeSlider'
import { createSpaceViewStore, SpaceViewStoreContext } from './store'
import { TaskTravel } from './TaskRoom'

/**
 * What is below (the run as its action's blok draws it) on the task's clock,
 * with the time slider at its foot: as it is while the task is followed live,
 * as it was at the slider's moment otherwise.
 *
 * `focusTime` moves the slider there. `onSlider` makes the slider foldable (a
 * handle at the foot); folded (`slider: false`), what is below shows the
 * present and nothing travels. `openAt: "end"` stands a finished task on its
 * end instead of its start. `placed`: the blok below places the slider itself
 * (`<timeline />`), so there is none at the foot and nothing to fold.
 */
export const TaskClock = (props: {
  task: DetailTaskFragment
  focusTime?: number | null
  slider?: boolean
  onSlider?: (open: boolean) => void
  openAt?: 'start' | 'end'
  placed?: boolean
  children: ReactNode
}) => {
  const { task, focusTime = null, onSlider, openAt = 'start', placed = false } = props
  // A slider the blok places is always there.
  const slider = placed || (props.slider ?? true)
  const foot = !placed && slider
  const [store] = useState(() => {
    const created = createSpaceViewStore(task)
    if (openAt === 'end' && !isTaskLive(task) && task.finishedAt) {
      created.getState().selectTimepoint(new Date(task.finishedAt).getTime())
    }
    return created
  })

  useEffect(() => {
    store.getState().refreshTask(task)
  }, [store, task])

  useEffect(() => {
    if (focusTime != null) store.getState().selectTimepoint(focusTime)
  }, [store, focusTime])

  // Folded away, a running task is followed again: the slider reopens on now.
  useEffect(() => {
    if (!slider && isTaskLive(store.getState().task)) store.getState().enableLive()
  }, [store, slider])

  return (
    <SpaceViewStoreContext.Provider value={store}>
      <LiveTicker />
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative min-h-0 flex-1">
          <TaskTravel present={!slider}>{props.children}</TaskTravel>
          {onSlider && !placed && (
            <button
              type="button"
              aria-expanded={slider}
              onClick={() => onSlider(!slider)}
              className="absolute bottom-0 left-4 z-10 flex items-center gap-1.5 rounded-t-md border border-b-0 bg-background/90 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur hover:text-foreground"
            >
              {slider ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              Time
            </button>
          )}
        </div>
        {foot && (
          <div className={onSlider ? 'shrink-0 border-t' : 'shrink-0'}>
            <TimeSlider />
          </div>
        )}
      </div>
    </SpaceViewStoreContext.Provider>
  )
}
