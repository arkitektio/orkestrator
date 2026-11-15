import { BlokTravelProvider, useRekuestTravelSource } from '@/rekuest/travel/context'
import { useLayoutEffect, type ReactNode } from 'react'
import { useSpaceViewStore, useSpaceViewStoreApi } from './store'
import { bindTravelClock } from './travelClock'

/**
 * Puts what is below (the run in 3D) on the task's clock: live while the task
 * is followed live, at the slider's moment otherwise. `present` keeps it on
 * the present whatever the slider says (the slider is folded away).
 */
export const TaskTravel = ({ children, present = false }: { children: ReactNode; present?: boolean }) => {
  const store = useSpaceViewStoreApi()
  const isLive = useSpaceViewStore((s) => s.isLive)
  const source = useRekuestTravelSource()

  // A layout effect: the clock stands on the task's moment before any blok
  // below starts to watch the source.
  useLayoutEffect(() => bindTravelClock(store, source), [store, source])

  return <BlokTravelProvider source={isLive || present ? null : source}>{children}</BlokTravelProvider>
}
