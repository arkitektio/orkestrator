// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const seen = vi.hoisted(() => ({
  sources: [] as unknown[],
  readOnly: [] as unknown[],
  spaces: [] as string[]
}))

vi.mock('@/rekuest/api/hooks', () => ({ useRekuest: () => null }))
vi.mock('@/rekuest/hooks/useLiveState', () => ({
  useAgentLiveState: () => ({ value: null, revision: null })
}))
vi.mock('@/core/layout/fallbacks/ErrorPage', () => ({ QueryError: () => null }))
vi.mock('@/rekuest/api/graphql', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/rekuest/api/graphql')>()),
  useSpaceQuery: ({ variables }: { variables: { id: string } }) => ({
    data: { space: { id: variables.id, name: variables.id, placements: [] } },
    error: undefined,
    refetch: () => {}
  })
}))
vi.mock('@/rekuest/space-scene', async () => {
  const { useBlokTravelSource } = await import('@/rekuest/travel/context')
  return {
    SpaceScene: (props: { space: { id: string }; overlay?: React.ReactNode; readOnly?: boolean }) => {
      seen.sources.push(useBlokTravelSource())
      seen.readOnly.push(props.readOnly)
      seen.spaces.push(props.space.id)
      return (
        <div data-testid="room">
          {props.space.id}
          {props.overlay}
        </div>
      )
    }
  }
})

import { DetailTaskFragment, TaskEventKind } from '@/rekuest/api/graphql'
import { createSpaceViewStore, SpaceViewStoreContext } from './store'
import { TaskRooms, TaskTravel } from './TaskRoom'

/** An hour ago: the clock never stands in the future, so the fixture must not either. */
const CREATED = Date.now() - 3_600_000

const agent = (id: string, space: string) => ({ id, placements: [{ space: { id: space, name: space } }] })

const task = (spaces: string[], running: boolean): DetailTaskFragment =>
  ({
    id: 'task',
    createdAt: new Date(CREATED).toISOString(),
    isDone: !running,
    latestEventKind: running ? TaskEventKind.Progress : TaskEventKind.Done,
    children: [],
    resolvedDependencies: [{ mappedAgents: spaces.map((space) => ({ agent: agent(`agent-${space}`, space) })) }]
  }) as unknown as DetailTaskFragment

const mount = (spaces: string[], running: boolean) => {
  seen.sources = []
  seen.readOnly = []
  seen.spaces = []
  const store = createSpaceViewStore(task(spaces, running))
  render(
    <SpaceViewStoreContext.Provider value={store}>
      <TaskTravel>
        <TaskRooms />
      </TaskTravel>
    </SpaceViewStoreContext.Provider>
  )
  return store
}

const last = <T,>(list: T[]): T => list[list.length - 1]

describe('task rooms', () => {
  it('shows the room live, and only to look at, while the task is followed', () => {
    mount(['lab'], true)
    expect(last(seen.sources)).toBeNull()
    expect(last(seen.readOnly)).toBe(true)
  })

  it('puts the room on the slider\'s moment once the task is scrubbed', () => {
    const store = mount(['lab'], true)
    act(() => store.getState().selectTimepoint(CREATED + 5000))

    const source = last(seen.sources) as { getClock: () => { at: number } }
    expect(source).not.toBeNull()
    expect(source.getClock().at).toBe(CREATED + 5000)

    act(() => store.getState().enableLive())
    expect(last(seen.sources)).toBeNull()
  })

  it('replays a finished task from its start', () => {
    mount(['lab'], false)
    const source = last(seen.sources) as { getClock: () => { at: number } }
    expect(source.getClock().at).toBe(CREATED)
  })

  it('mounts one room, and offers the others only when there are any', () => {
    mount(['lab'], true)
    expect(screen.getAllByTestId('room')).toHaveLength(1)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('switches between the rooms of a task that spans several', () => {
    mount(['lab', 'cellar'], true)
    expect(screen.getAllByTestId('room')).toHaveLength(1)
    expect(last(seen.spaces)).toBe('lab')

    act(() => screen.getByRole('button', { name: 'cellar' }).click())
    expect(screen.getAllByTestId('room')).toHaveLength(1)
    expect(last(seen.spaces)).toBe('cellar')
  })

  it('renders nothing for a task that stands nowhere', () => {
    mount([], true)
    expect(screen.queryByTestId('room')).toBeNull()
  })
})
