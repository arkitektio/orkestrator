// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DetailTaskFragment, TaskEventKind } from '@/rekuest/api/graphql'
import { useBlokTravelSource } from '@/rekuest/travel/context'
import { createSpaceViewStore, SpaceViewStoreContext } from './store'
import { TaskTravel } from './TaskRoom'

vi.mock('@/rekuest/api/hooks', () => ({ useRekuest: () => null }))

/** An hour ago: the clock never stands in the future, so the fixture must not either. */
const CREATED = Date.now() - 3_600_000

const task = (running: boolean): DetailTaskFragment =>
  ({
    id: 'task',
    createdAt: new Date(CREATED).toISOString(),
    isDone: !running,
    latestEventKind: running ? TaskEventKind.Progress : TaskEventKind.Done,
    children: [],
    resolvedDependencies: []
  }) as unknown as DetailTaskFragment

/** What a blok below the clock sees: the travel source, or null while live. */
const seen: unknown[] = []
const Probe = () => {
  seen.push(useBlokTravelSource())
  return null
}

const mount = (running: boolean) => {
  seen.length = 0
  const store = createSpaceViewStore(task(running))
  render(
    <SpaceViewStoreContext.Provider value={store}>
      <TaskTravel>
        <Probe />
      </TaskTravel>
    </SpaceViewStoreContext.Provider>
  )
  return store
}

const last = <T,>(list: T[]): T => list[list.length - 1]

describe('the task clock the run in 3D is drawn on', () => {
  it('is live while the task is followed', () => {
    mount(true)
    expect(last(seen)).toBeNull()
  })

  it("stands on the slider's moment once the task is scrubbed, and live again when asked", () => {
    const store = mount(true)
    act(() => store.getState().selectTimepoint(CREATED + 5000))

    const source = last(seen) as { getClock: () => { at: number } }
    expect(source).not.toBeNull()
    expect(source.getClock().at).toBe(CREATED + 5000)

    act(() => store.getState().enableLive())
    expect(last(seen)).toBeNull()
  })

  it('replays a finished task from its start', () => {
    mount(false)
    const source = last(seen) as { getClock: () => { at: number } }
    expect(source.getClock().at).toBe(CREATED)
  })
})
