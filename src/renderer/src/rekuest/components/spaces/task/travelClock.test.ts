import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand'
import { bindTravelClock } from './travelClock'

const T = Date.UTC(2026, 9, 13, 12, 0, 0)

const makeClock = (initial: { isLive: boolean; selectedTimepoint: number }) => {
  const store = createStore<{ isLive: boolean; selectedTimepoint: number; liveNow: number }>(() => ({
    ...initial,
    liveNow: T
  }))
  const seek = vi.fn()
  const unbind = bindTravelClock(store, { seek })
  return { store, seek, unbind }
}

describe('bindTravelClock', () => {
  it('tells nothing while the task is followed live', () => {
    const { store, seek } = makeClock({ isLive: true, selectedTimepoint: T })
    store.setState({ selectedTimepoint: T + 333, liveNow: T + 333 })
    store.setState({ selectedTimepoint: T + 666, liveNow: T + 666 })
    expect(seek).not.toHaveBeenCalled()
  })

  it('lands on the moment of a task that opens off live', () => {
    const { seek } = makeClock({ isLive: false, selectedTimepoint: T - 5000 })
    expect(seek).toHaveBeenCalledWith(T - 5000, true)
  })

  it('lands at once when live is left, and leaves a drag to the source to pace', () => {
    const { store, seek } = makeClock({ isLive: true, selectedTimepoint: T })
    store.setState({ isLive: false, selectedTimepoint: T - 1000 })
    expect(seek).toHaveBeenLastCalledWith(T - 1000, true)

    store.setState({ selectedTimepoint: T - 2000 })
    expect(seek).toHaveBeenLastCalledWith(T - 2000, false)
    expect(seek).toHaveBeenCalledTimes(2)
  })

  it('is not moved by the clock that only ticks', () => {
    const { store, seek } = makeClock({ isLive: false, selectedTimepoint: T - 5000 })
    seek.mockClear()
    store.setState({ liveNow: T + 333 })
    expect(seek).not.toHaveBeenCalled()
  })

  it('has nowhere to travel to without a time to stand on', () => {
    const { store, seek } = makeClock({ isLive: false, selectedTimepoint: 0 })
    store.setState({ selectedTimepoint: Number.NaN })
    expect(seek).not.toHaveBeenCalled()
  })

  it('stops following once unbound, and when live is taken up again', () => {
    const { store, seek, unbind } = makeClock({ isLive: false, selectedTimepoint: T - 5000 })
    seek.mockClear()
    store.setState({ isLive: true, selectedTimepoint: T })
    expect(seek).not.toHaveBeenCalled()

    unbind()
    store.setState({ isLive: false, selectedTimepoint: T - 1000 })
    expect(seek).not.toHaveBeenCalled()
  })
})
