import { isTaskLive } from '@/rekuest/lib/taskTracker'
// ── Task Space Store (single source of truth) ───────────────────────

import { useContext } from 'react'
import { createContext } from 'react'
import { createStore, useStore } from 'zustand'
import { DetailTaskFragment } from '@/rekuest/api/graphql'
import { taskRooms, type TaskRoom } from './taskRooms'

// ── store interface ──────────────────────────────────────────────────

interface SpaceViewState {
  task: DetailTaskFragment

  /** The spaces the task's agents stand in. */
  rooms: TaskRoom[]

  // Live follow
  isLive: boolean
  liveNow: number

  /** The moment the rooms show while the task is not followed live. */
  selectedTimepoint: number

  // Actions
  selectTimepoint: (timestamp: number) => void
  refreshTask: (task: DetailTaskFragment) => void
  setLiveNow: (now: number) => void
  enableLive: () => void
}

export const createSpaceViewStore = (task: DetailTaskFragment) => {
  // A running task opens at the live frontier and follows "now"; a finished
  // task opens at its start for replay (follow disabled).
  const taskDone = !isTaskLive(task)
  const liveNow = Date.now()

  return createStore<SpaceViewState>((set, get) => ({
    task,
    rooms: taskRooms(task),

    isLive: !taskDone,
    liveNow,

    selectedTimepoint: taskDone ? new Date(task.createdAt).getTime() : liveNow,

    // Any manual scrub/jump drops out of follow-live mode.
    selectTimepoint: (timestamp) => set({ isLive: false, selectedTimepoint: timestamp }),

    refreshTask: (updatedTask) => {
      const { isLive: wasLive, liveNow: currentNow, selectedTimepoint: currentTimepoint } = get()
      // Live stops cleanly the moment the task completes, so the final frame stays put.
      const stillLive = wasLive && isTaskLive(updatedTask)
      set({
        task: updatedTask,
        rooms: taskRooms(updatedTask),
        isLive: stillLive,
        selectedTimepoint: stillLive ? currentNow : currentTimepoint
      })
    },

    setLiveNow: (now) => {
      // Not following: just advance the clock so the "now" frontier + elapsed move.
      set(get().isLive ? { liveNow: now, selectedTimepoint: now } : { liveNow: now })
    },

    enableLive: () => set({ isLive: true, selectedTimepoint: get().liveNow })
  }))
}

export type SpaceViewStore = ReturnType<typeof createSpaceViewStore>

export const SpaceViewStoreContext = createContext<SpaceViewStore | null>(null)

/** The store itself, for what must listen without rendering on every change. */
export function useSpaceViewStoreApi(): SpaceViewStore {
  const store = useContext(SpaceViewStoreContext)
  if (!store) throw new Error('Missing SpaceViewStoreContext')
  return store
}

export function useSpaceViewStore<T>(selector: (s: SpaceViewState) => T): T {
  return useStore(useSpaceViewStoreApi(), selector)
}
