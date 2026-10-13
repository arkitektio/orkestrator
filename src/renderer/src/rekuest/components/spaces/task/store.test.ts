import { describe, expect, it } from 'vitest'
import { DetailTaskFragment, TaskEventKind } from '@/rekuest/api/graphql'
import { createSpaceViewStore } from './store'

const CREATED = '2026-10-13T10:00:00.000Z'

const task = (overrides: Partial<DetailTaskFragment> = {}): DetailTaskFragment =>
  ({
    id: 'task',
    createdAt: CREATED,
    isDone: false,
    latestEventKind: TaskEventKind.Progress,
    children: [],
    resolvedDependencies: [],
    ...overrides
  }) as unknown as DetailTaskFragment

const finished = (overrides: Partial<DetailTaskFragment> = {}) =>
  task({ isDone: true, latestEventKind: TaskEventKind.Done, ...overrides })

describe('space view store', () => {
  it('opens a running task live', () => {
    const state = createSpaceViewStore(task()).getState()
    expect(state.isLive).toBe(true)
    expect(state.selectedTimepoint).toBe(state.liveNow)
  })

  it('opens a finished task at its start, also when it has no children', () => {
    const state = createSpaceViewStore(finished()).getState()
    expect(state.isLive).toBe(false)
    expect(state.selectedTimepoint).toBe(Date.parse(CREATED))
  })

  it('drops out of live on a scrub', () => {
    const store = createSpaceViewStore(task())
    store.getState().selectTimepoint(Date.parse(CREATED) + 1000)
    expect(store.getState().isLive).toBe(false)
    expect(store.getState().selectedTimepoint).toBe(Date.parse(CREATED) + 1000)
  })

  it('moves the timepoint with the clock only while live', () => {
    const store = createSpaceViewStore(task())
    const later = store.getState().liveNow + 333
    store.getState().setLiveNow(later)
    expect(store.getState().selectedTimepoint).toBe(later)

    store.getState().selectTimepoint(Date.parse(CREATED))
    store.getState().setLiveNow(later + 333)
    expect(store.getState().liveNow).toBe(later + 333)
    expect(store.getState().selectedTimepoint).toBe(Date.parse(CREATED))

    store.getState().enableLive()
    expect(store.getState().isLive).toBe(true)
    expect(store.getState().selectedTimepoint).toBe(later + 333)
  })

  it('stays on its last frame when the task finishes', () => {
    const store = createSpaceViewStore(task())
    const frame = store.getState().selectedTimepoint
    store.getState().refreshTask(finished())
    expect(store.getState().isLive).toBe(false)
    expect(store.getState().selectedTimepoint).toBe(frame)
  })

  it('names the rooms of the task it is given', () => {
    const placed = finished({
      implementation: {
        agent: { id: 'root', placements: [{ space: { id: 'lab', name: 'Lab' } }] }
      }
    } as unknown as Partial<DetailTaskFragment>)
    const store = createSpaceViewStore(finished())
    expect(store.getState().rooms).toEqual([])
    store.getState().refreshTask(placed)
    expect(store.getState().rooms.map((room) => room.spaceName)).toEqual(['Lab'])
  })
})
