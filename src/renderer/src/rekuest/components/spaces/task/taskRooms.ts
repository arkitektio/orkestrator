/**
 * The rooms a task plays in: the spaces its agents stand in.
 *
 * A task knows its agents (the one that runs it, and the ones its
 * dependencies bind, level by level) and each agent's newest placement. That
 * is enough to say which spaces to show; what stands in a space is the
 * space's own to answer.
 */

type PlacedAgent = {
  id: string
  placements: readonly { space: { id: string; name: string } }[]
}

type TreeLevel = readonly {
  mappedAgents: readonly {
    agent?: PlacedAgent | null
    mappedImplementations?: readonly { resolvedDependencies?: TreeLevel | null }[] | null
  }[]
}[]

/** What of a task says where it plays. */
export type RoomTask = {
  implementation?: { agent?: PlacedAgent | null } | null
  resolvedDependencies?: TreeLevel | null
}

export type TaskRoom = {
  spaceId: string
  spaceName: string
  /** The task's agents that stand in this space. */
  agentIds: string[]
  /** Whether the agent that runs the task stands here. */
  hasRoot: boolean
}

/** The agents a task's dependencies bind, down the levels its fragment selects. */
const treeAgents = (level: TreeLevel | null | undefined): PlacedAgent[] =>
  (level ?? []).flatMap((dependency) =>
    dependency.mappedAgents.flatMap((mapping) => [
      ...(mapping.agent ? [mapping.agent] : []),
      ...(mapping.mappedImplementations ?? []).flatMap((bound) => treeAgents(bound.resolvedDependencies))
    ])
  )

/** The spaces the task's agents stand in: the one of the agent that runs it first. */
export const taskRooms = (task: RoomTask): TaskRoom[] => {
  const rooms = new Map<string, TaskRoom>()
  const stand = (agent: PlacedAgent, isRoot: boolean) => {
    for (const placement of agent.placements) {
      const room = rooms.get(placement.space.id) ?? {
        spaceId: placement.space.id,
        spaceName: placement.space.name,
        agentIds: [],
        hasRoot: false
      }
      rooms.set(room.spaceId, room)
      if (!room.agentIds.includes(agent.id)) room.agentIds.push(agent.id)
      if (isRoot) room.hasRoot = true
    }
  }

  const root = task.implementation?.agent
  if (root) stand(root, true)
  for (const agent of treeAgents(task.resolvedDependencies)) stand(agent, false)

  return [...rooms.values()]
}
