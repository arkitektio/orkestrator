/**
 * The task's own slider as the clock of what its rooms show.
 *
 * While the task is followed live nothing is told: the rooms watch their
 * agents themselves, and the three ticks a second that move the live
 * frontier never become requests. Off live, every move of the timepoint is
 * where the rooms travel to.
 */

type ClockState = { isLive: boolean; selectedTimepoint: number }

type ClockStore = {
  getState: () => ClockState
  subscribe: (listener: (state: ClockState, previous: ClockState) => void) => () => void
}

type Seekable = { seek: (at: number, immediate?: boolean) => void }

export const bindTravelClock = (store: ClockStore, source: Seekable): (() => void) => {
  const follow = (state: ClockState, immediate: boolean) => {
    if (state.isLive) return
    // A task with no time to stand on (no start yet) has nowhere to travel to.
    if (!Number.isFinite(state.selectedTimepoint) || state.selectedTimepoint <= 0) return
    source.seek(state.selectedTimepoint, immediate)
  }

  follow(store.getState(), true)
  return store.subscribe((state, previous) => {
    if (state.isLive === previous.isLive && state.selectedTimepoint === previous.selectedTimepoint) return
    // Leaving live lands at once; a drag after that is the source's to pace.
    follow(state, previous.isLive)
  })
}
