import { isTaskLive } from '@/rekuest/lib/taskTracker'
// ── Task Space Store (single source of truth) ───────────────────────

import { useContext } from 'react'
import { createContext } from 'react'
import { createStore, useStore } from 'zustand'
import * as THREE from 'three'
import {
  DetailTaskFragment,
  DetailTaskQuery,
  PostmanTaskFragment
} from '@/rekuest/api/graphql'
import {
  buildTimeline,
  mapParentEvents,
  notEmpty,
  TimelineDependencyGroup,
  TimelineEvent
} from '@/rekuest/lib/taskTimeline'
import { SpaceGroup, SpaceGroupPlacement } from './types'

// ── derived data builders ────────────────────────────────────────────

type TreeAgent = DetailTaskQuery['task']['resolvedDependencies'][0]['mappedAgents'][0]['agent']
type TreeLevel = readonly {
  mappedAgents: readonly {
    agent?: TreeAgent | null
    mappedImplementations?: readonly { resolvedDependencies?: TreeLevel | null }[] | null
  }[]
}[]

/** The agents a task's dependencies bind, down the levels its fragment selects. */
function treeAgents(level: TreeLevel | null | undefined): TreeAgent[] {
  return (level ?? []).flatMap((dependency) =>
    dependency.mappedAgents.flatMap((mapping) => [
      ...(mapping.agent ? [mapping.agent] : []),
      ...(mapping.mappedImplementations ?? []).flatMap((bound) => treeAgents(bound.resolvedDependencies))
    ])
  )
}

function buildSpaceGroups(
  resolvedDependencies: DetailTaskQuery['task']['resolvedDependencies'],
  rootAgent?: {
    id: string
    name: string
    placements: DetailTaskQuery['task']['resolvedDependencies'][0]['mappedAgents'][0]['agent']['placements']
  } | null
): SpaceGroup[] {
  const groupMap = new Map<string, SpaceGroup>()

  // Add root agent placements first (marked as root)
  if (rootAgent) {
    for (const placement of rootAgent.placements) {
      const spaceId = placement.space.id
      if (!groupMap.has(spaceId)) {
        groupMap.set(spaceId, { spaceId, placements: [] })
      }
      groupMap.get(spaceId)!.placements.push({
        id: placement.id,
        name: placement.name,
        agentName: rootAgent.name,
        agentId: rootAgent.id,
        isRoot: true,
        model: placement.model ?? null,
        affineMatrix: placement.affineMatrix
      })
    }
  }

  // Every agent of the tree, whatever level binds it: once per space.
  const placed = new Set<string>()
  for (const agent of treeAgents(resolvedDependencies)) {
    for (const placement of agent.placements) {
      if (placed.has(placement.id)) continue
      placed.add(placement.id)
      const spaceId = placement.space.id
      if (!groupMap.has(spaceId)) {
        groupMap.set(spaceId, { spaceId, placements: [] })
      }
      groupMap.get(spaceId)!.placements.push({
        id: placement.id,
        name: placement.name,
        agentName: agent.name,
        agentId: agent.id,
        model: placement.model ?? null,
        affineMatrix: placement.affineMatrix
      })
    }
  }

  return Array.from(groupMap.values())
}

function buildAgentToTaskMap(
  resolvedDependencies: DetailTaskQuery['task']['resolvedDependencies'],
  children: PostmanTaskFragment[]
): Map<string, string[]> {
  // dependency key → agent IDs
  const depKeyToAgentIds = new Map<string, Set<string>>()
  for (const dep of resolvedDependencies) {
    const agents = new Set<string>()
    for (const mapping of dep.mappedAgents) {
      agents.add(mapping.agent.id)
    }
    depKeyToAgentIds.set(dep.key, agents)
  }

  // agent ID → task IDs
  const agentToTasks = new Map<string, string[]>()
  for (const child of children) {
    const depKey = child.dependency?.trim() || 'catch-all'
    const agentIds = depKeyToAgentIds.get(depKey)
    if (agentIds) {
      for (const agentId of agentIds) {
        if (!agentToTasks.has(agentId)) {
          agentToTasks.set(agentId, [])
        }
        agentToTasks.get(agentId)!.push(child.id)
      }
    }
  }
  return agentToTasks
}

// ── active-at-timepoint ──────────────────────────────────────────────

function computeActiveAtTimepoint(
  timepoint: number,
  children: PostmanTaskFragment[],
  agentToTaskIds: Map<string, string[]>
): {
  taskIds: Set<string>
  agentIds: Set<string>
  implementationIds: Set<string>
} {
  const taskIds = new Set<string>()
  const implementationIds = new Set<string>()

  for (const child of children) {
    const start = new Date(child.createdAt).getTime()
    const end = child.finishedAt ? new Date(child.finishedAt).getTime() : timepoint

    if (timepoint >= start && timepoint <= end) {
      taskIds.add(child.id)
      if (child.implementation?.id) {
        implementationIds.add(child.implementation.id)
      }
    }
  }

  const agentIds = new Set<string>()
  for (const [agentId, aIds] of agentToTaskIds) {
    for (const aId of aIds) {
      if (taskIds.has(aId)) {
        agentIds.add(agentId)
        break
      }
    }
  }

  return { taskIds, agentIds, implementationIds }
}

// ── layout engine ────────────────────────────────────────────────────

const RADIAL_RADIUS = 2.5

const IDENTITY_MATRIX: number[][] = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1]
]

function computeLayoutTransforms(
  spaceGroups: SpaceGroup[],
  layoutMode: 'space' | 'radial',
  rootAgentId: string | null
): Map<string, number[][]> {
  const transforms = new Map<string, number[][]>()

  for (const group of spaceGroups) {
    if (layoutMode === 'space') {
      for (const p of group.placements) {
        transforms.set(p.id, p.affineMatrix ?? IDENTITY_MATRIX)
      }
    } else {
      const rootPlacement = group.placements.find((p) => p.isRoot || p.agentId === rootAgentId)
      const others = group.placements.filter((p) => !p.isRoot && p.agentId !== rootAgentId)

      if (rootPlacement) {
        transforms.set(rootPlacement.id, IDENTITY_MATRIX)
      }

      others.forEach((p, i) => {
        const angle = (i / Math.max(others.length, 1)) * Math.PI * 2
        const x = Math.cos(angle) * RADIAL_RADIUS
        const z = Math.sin(angle) * RADIAL_RADIUS
        transforms.set(p.id, [
          [1, 0, 0, x],
          [0, 1, 0, 0],
          [0, 0, 1, z],
          [0, 0, 0, 1]
        ])
      })
    }
  }

  return transforms
}

// ── store interface ──────────────────────────────────────────────────

interface SpaceViewState {
  task: DetailTaskFragment

  // Spaces
  spaceGroups: SpaceGroup[]
  allPlacements: SpaceGroupPlacement[]

  // Root agent
  rootAgentId: string | null

  // Active at selected timepoint
  activeTaskIds: Set<string>
  activeAgentIds: Set<string>
  activeImplementationIds: Set<string>

  // Timeline
  timelineGroups: TimelineDependencyGroup[]
  timelineEvents: TimelineEvent[]
  timelineStartTime: number
  timelineEndTime: number

  // Live follow
  isLive: boolean
  liveNow: number

  // Timeline zoom — a sub-window [zoomStart, zoomEnd] as fractions of the full
  // [timelineStartTime, timelineEndTime] range (0..1). 0/1 means fully zoomed out.
  zoomStart: number
  zoomEnd: number

  // Selection & highlighting
  selectedTimepoint: number
  selectedPlacementId: string | null
  selectedAgentId: string | null
  selectedDependencyId: string | null
  highlightedTaskIds: string[]

  // Agent → task mapping
  agentToTaskIds: Map<string, string[]>

  // Camera data for 3D→2D projection
  viewProjectionMatrix: THREE.Matrix4 | null
  viewportSize: { width: number; height: number }

  // Debug
  debugWireframe: boolean

  // Layout
  layoutMode: 'space' | 'radial'
  computedTransforms: Map<string, number[][]>

  // Actions
  updateCameraData: (matrix: THREE.Matrix4, size: { width: number; height: number }) => void
  selectPlacement: (id: string | null) => void
  selectAgent: (id: string | null) => void
  selectDependency: (id: string | null) => void
  selectTimepoint: (timestamp: number) => void
  setHighlightedTaskIds: (ids: string[]) => void
  toggleDebugWireframe: () => void
  toggleLayoutMode: () => void
  refreshTimeline: (task: DetailTaskFragment) => void
  setLiveNow: (now: number) => void
  enableLive: () => void
  disableLive: () => void
  setZoomWindow: (start: number, end: number) => void
  resetZoom: () => void
}

export const createSpaceViewStore = (task: DetailTaskFragment) => {
  const children = (task.children || []).filter(notEmpty)
  const rootAgent = task.implementation?.agent ?? null
  const rootAgentId = rootAgent?.id ?? null
  const spaceGroups = buildSpaceGroups(task.resolvedDependencies, rootAgent)
  const allPlacements = spaceGroups.flatMap((g) => g.placements)
  const agentToTaskIds = buildAgentToTaskMap(task.resolvedDependencies, children)
  const { groups, startTime, endTime } = buildTimeline(children)

  // A running task opens at the live frontier and follows "now"; a finished
  // task opens at its start for replay (follow disabled).
  const taskDone = !isTaskLive(task)
  const liveNow = Date.now()
  const initialTimepoint = taskDone ? startTime : liveNow
  const initialActive = computeActiveAtTimepoint(initialTimepoint, children, agentToTaskIds)

  const parentEvents: TimelineEvent[] = mapParentEvents(
    task.events || [],
    startTime,
    endTime
  )

  const initialLayoutMode = 'space' as const
  const initialTransforms = computeLayoutTransforms(spaceGroups, initialLayoutMode, rootAgentId)

  return createStore<SpaceViewState>((set, get) => ({
    task,
    spaceGroups,
    allPlacements,
    rootAgentId,
    activeTaskIds: initialActive.taskIds,
    activeAgentIds: initialActive.agentIds,
    activeImplementationIds: initialActive.implementationIds,
    timelineGroups: groups,
    timelineEvents: parentEvents,
    timelineStartTime: startTime,
    timelineEndTime: endTime,
    agentToTaskIds,

    isLive: !taskDone,
    liveNow,

    zoomStart: 0,
    zoomEnd: 1,

    selectedTimepoint: initialTimepoint,
    selectedPlacementId: null,
    selectedAgentId: null,
    selectedDependencyId: null,
    highlightedTaskIds: [],

    viewProjectionMatrix: null,
    viewportSize: { width: 0, height: 0 },

    debugWireframe: false,

    layoutMode: initialLayoutMode,
    computedTransforms: initialTransforms,

    updateCameraData: (matrix, size) => set({ viewProjectionMatrix: matrix, viewportSize: size }),

    selectPlacement: (id) => {
      if (id === null) {
        set({ selectedPlacementId: null, selectedAgentId: null, highlightedTaskIds: [] })
        return
      }
      const placement = get().allPlacements.find((p) => p.id === id)
      const agentId = placement?.agentId ?? null
      const highlighted = agentId ? (get().agentToTaskIds.get(agentId) ?? []) : []
      set({
        selectedPlacementId: id,
        selectedAgentId: agentId,
        highlightedTaskIds: highlighted
      })
    },

    selectAgent: (id) => {
      const highlighted = id ? (get().agentToTaskIds.get(id) ?? []) : []
      set({ selectedAgentId: id, highlightedTaskIds: highlighted })
    },

    selectDependency: (id) => set({ selectedDependencyId: id }),

    selectTimepoint: (timestamp) => {
      const { task: currentTask, agentToTaskIds: currentMap } = get()
      const currentChildren = (currentTask.children || []).filter(notEmpty)
      const active = computeActiveAtTimepoint(timestamp, currentChildren, currentMap)
      // Any manual scrub/jump drops out of follow-live mode.
      set({
        isLive: false,
        selectedTimepoint: timestamp,
        activeTaskIds: active.taskIds,
        activeAgentIds: active.agentIds,
        activeImplementationIds: active.implementationIds,
        highlightedTaskIds: [...active.taskIds]
      })
    },

    setHighlightedTaskIds: (ids) => set({ highlightedTaskIds: ids }),

    toggleDebugWireframe: () => set((s) => ({ debugWireframe: !s.debugWireframe })),

    toggleLayoutMode: () => {
      const s = get()
      const next = s.layoutMode === 'space' ? ('radial' as const) : ('space' as const)
      const transforms = computeLayoutTransforms(s.spaceGroups, next, s.rootAgentId)
      set({ layoutMode: next, computedTransforms: transforms })
    },

    refreshTimeline: (updatedTask) => {
      const { isLive: wasLive, liveNow: currentNow, selectedTimepoint: currentTimepoint } = get()
      // Live stops cleanly the moment the task completes, so the final frame stays put.
      const stillLive = wasLive && isTaskLive(updatedTask)
      const computeAt = stillLive ? currentNow : currentTimepoint

      const updatedChildren = (updatedTask.children || []).filter(notEmpty)
      const updatedRootAgent = updatedTask.implementation?.agent ?? null
      const updatedRootAgentId = updatedRootAgent?.id ?? null
      const updatedSpaceGroups = buildSpaceGroups(
        updatedTask.resolvedDependencies,
        updatedRootAgent
      )
      const updatedAllPlacements = updatedSpaceGroups.flatMap((g) => g.placements)
      const updatedAgentMap = buildAgentToTaskMap(
        updatedTask.resolvedDependencies,
        updatedChildren
      )
      const updatedActive = computeActiveAtTimepoint(computeAt, updatedChildren, updatedAgentMap)
      const { groups: tGroups, startTime: sT, endTime: eT } = buildTimeline(updatedChildren)
      const updatedParentEvents: TimelineEvent[] = mapParentEvents(
        updatedTask.events || [],
        sT,
        eT
      )

      const updatedTransforms = computeLayoutTransforms(
        updatedSpaceGroups,
        get().layoutMode,
        updatedRootAgentId
      )

      set({
        task: updatedTask,
        isLive: stillLive,
        selectedTimepoint: stillLive ? currentNow : currentTimepoint,
        rootAgentId: updatedRootAgentId,
        activeTaskIds: updatedActive.taskIds,
        activeAgentIds: updatedActive.agentIds,
        activeImplementationIds: updatedActive.implementationIds,
        highlightedTaskIds: [...updatedActive.taskIds],
        spaceGroups: updatedSpaceGroups,
        allPlacements: updatedAllPlacements,
        agentToTaskIds: updatedAgentMap,
        timelineGroups: tGroups,
        timelineEvents: updatedParentEvents,
        timelineStartTime: sT,
        timelineEndTime: eT,
        computedTransforms: updatedTransforms
      })
    },

    setLiveNow: (now) => {
      const { isLive, task: currentTask, agentToTaskIds: currentMap } = get()
      if (!isLive) {
        // Not following: just advance the clock so the "now" frontier + elapsed move.
        set({ liveNow: now })
        return
      }
      const currentChildren = (currentTask.children || []).filter(notEmpty)
      const active = computeActiveAtTimepoint(now, currentChildren, currentMap)
      set({
        liveNow: now,
        selectedTimepoint: now,
        activeTaskIds: active.taskIds,
        activeAgentIds: active.agentIds,
        activeImplementationIds: active.implementationIds,
        highlightedTaskIds: [...active.taskIds]
      })
    },

    enableLive: () => {
      const { task: currentTask, agentToTaskIds: currentMap, liveNow } = get()
      const currentChildren = (currentTask.children || []).filter(notEmpty)
      const active = computeActiveAtTimepoint(liveNow, currentChildren, currentMap)
      set({
        isLive: true,
        // Zoom is a replay-only affordance; reset to the full range on going live.
        zoomStart: 0,
        zoomEnd: 1,
        selectedTimepoint: liveNow,
        activeTaskIds: active.taskIds,
        activeAgentIds: active.agentIds,
        activeImplementationIds: active.implementationIds,
        highlightedTaskIds: [...active.taskIds]
      })
    },

    disableLive: () => set({ isLive: false }),

    setZoomWindow: (start, end) => {
      const MIN_SPAN = 0.02 // up to ~50× zoom
      let s = Math.max(0, Math.min(1, start))
      let e = Math.max(0, Math.min(1, end))
      if (e - s < MIN_SPAN) {
        const mid = (s + e) / 2
        s = Math.max(0, mid - MIN_SPAN / 2)
        e = Math.min(1, s + MIN_SPAN)
        s = Math.max(0, e - MIN_SPAN)
      }
      set({ zoomStart: s, zoomEnd: e })
    },

    resetZoom: () => set({ zoomStart: 0, zoomEnd: 1 })
  }))
}

type SpaceViewStore = ReturnType<typeof createSpaceViewStore>

export const SpaceViewStoreContext = createContext<SpaceViewStore | null>(null)

export function useSpaceViewStore<T>(selector: (s: SpaceViewState) => T): T {
  const store = useContext(SpaceViewStoreContext)
  if (!store) throw new Error('Missing SpaceViewStoreContext')
  return useStore(store, selector)
}
