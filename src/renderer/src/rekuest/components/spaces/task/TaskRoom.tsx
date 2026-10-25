import { QueryError } from '@/core/layout/fallbacks/ErrorPage'
import { cn } from '@/core/util/utils'
import { useSpaceQuery } from '@/rekuest/api/graphql'
import type { SpaceRun } from '@/rekuest/run/useRun'
import { SpaceScene } from '@/rekuest/space-scene'
import { BlokTravelProvider, useRekuestTravelSource } from '@/rekuest/travel/context'
import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { useSpaceViewStore, useSpaceViewStoreApi } from './store'
import { bindTravelClock } from './travelClock'

/**
 * Puts the rooms below on the task's clock: live while the task is followed
 * live, at the slider's moment otherwise.
 */
export const TaskTravel = ({ children }: { children: ReactNode }) => {
  const store = useSpaceViewStoreApi()
  const isLive = useSpaceViewStore((s) => s.isLive)
  const source = useRekuestTravelSource()

  // A layout effect: the clock stands on the task's moment before any blok
  // below starts to watch the source.
  useLayoutEffect(() => bindTravelClock(store, source), [store, source])

  return <BlokTravelProvider source={isLive ? null : source}>{children}</BlokTravelProvider>
}

/** One space as the task sees it: the real room, to look at, with the run drawn into it. */
const TaskRoom = ({ spaceId, overlay, run }: { spaceId: string; overlay?: ReactNode; run?: SpaceRun | null }) => {
  const { data, error, refetch } = useSpaceQuery({ variables: { id: spaceId } })

  if (data?.space) return <SpaceScene space={data.space} overlay={overlay} run={run} readOnly />
  if (error) return <QueryError error={error} onRetry={() => refetch()} />
  return null
}

/**
 * The rooms of the task, one at a time: a room is a whole 3D scene, so only
 * the one that is looked at is mounted. `run` is the task's action overlay,
 * drawn into whichever room is shown; `startedIn` (the space the run was
 * started in) is shown first.
 */
export const TaskRooms = ({ run, startedIn }: { run?: SpaceRun | null; startedIn?: { id: string; name: string } | null } = {}) => {
  const placedIn = useSpaceViewStore((s) => s.rooms)
  const rooms = useMemo(() => {
    if (!startedIn) return placedIn
    const own = placedIn.find((room) => room.spaceId === startedIn.id) ?? {
      spaceId: startedIn.id,
      spaceName: startedIn.name,
      agentIds: [],
      hasRoot: false
    }
    return [own, ...placedIn.filter((room) => room.spaceId !== startedIn.id)]
  }, [placedIn, startedIn])
  const [picked, setPicked] = useState<string | null>(null)
  const room = rooms.find((candidate) => candidate.spaceId === picked) ?? rooms[0]

  if (!room) return null

  return (
    <TaskRoom
      key={room.spaceId}
      spaceId={room.spaceId}
      run={run}
      overlay={
        rooms.length > 1 ? (
          <div
            className="pointer-events-auto absolute left-2 top-2 z-30 flex gap-0.5 rounded-md border bg-background/90 p-0.5"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {rooms.map((candidate) => (
              <button
                key={candidate.spaceId}
                type="button"
                onClick={() => setPicked(candidate.spaceId)}
                className={cn(
                  'rounded px-2 py-0.5 text-xs',
                  candidate.spaceId === room.spaceId
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {candidate.spaceName}
              </button>
            ))}
          </div>
        ) : null
      }
    />
  )
}
