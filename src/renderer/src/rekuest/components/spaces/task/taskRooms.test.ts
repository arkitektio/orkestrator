import { describe, expect, it } from 'vitest'
import { taskRooms, type RoomTask } from './taskRooms'

const lab = { id: 'lab', name: 'Lab' }
const cellar = { id: 'cellar', name: 'Cellar' }

const agent = (id: string, ...spaces: { id: string; name: string }[]) => ({
  id,
  placements: spaces.map((space) => ({ space }))
})

describe('taskRooms', () => {
  it('has no room for a task whose agents stand nowhere', () => {
    expect(taskRooms({})).toEqual([])
    expect(
      taskRooms({
        implementation: { agent: agent('root') },
        resolvedDependencies: [{ mappedAgents: [{ agent: agent('stage') }] }]
      })
    ).toEqual([])
  })

  it('groups the agents by the space they stand in, the running agent\'s first', () => {
    const task: RoomTask = {
      implementation: { agent: agent('root', cellar) },
      resolvedDependencies: [
        { mappedAgents: [{ agent: agent('stage', lab) }, { agent: agent('lamp', lab) }] },
        { mappedAgents: [{ agent: agent('pump', cellar) }] }
      ]
    }

    expect(taskRooms(task)).toEqual([
      { spaceId: 'cellar', spaceName: 'Cellar', agentIds: ['root', 'pump'], hasRoot: true },
      { spaceId: 'lab', spaceName: 'Lab', agentIds: ['stage', 'lamp'], hasRoot: false }
    ])
  })

  it('finds the agents bound at deeper levels, and names each only once', () => {
    const task: RoomTask = {
      resolvedDependencies: [
        {
          mappedAgents: [
            {
              agent: agent('stage', lab),
              mappedImplementations: [
                {
                  resolvedDependencies: [
                    { mappedAgents: [{ agent: agent('camera', lab) }, { agent: agent('stage', lab) }] }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }

    expect(taskRooms(task)).toEqual([
      { spaceId: 'lab', spaceName: 'Lab', agentIds: ['stage', 'camera'], hasRoot: false }
    ])
  })
})
