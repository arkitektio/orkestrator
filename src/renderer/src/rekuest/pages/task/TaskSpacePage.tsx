import { asDetailQueryRoute } from '@/app/routes/DetailQueryRoute'
import { Sidebars } from '@/components/layout/Sidebars'
import { PageAction } from '@/components/ui/page-action'
import { RekuestTask } from '@/linkers'
import {
  DetailTaskFragment,
  useCancelMutation,
  useDetailTaskQuery,
  useInterruptMutation
} from '@/rekuest/api/graphql'
import { TaskSpaceScene } from '@/rekuest/components/spaces/task/SpaceScene'
import {
  createSpaceViewStore,
  SpaceViewStoreContext,
  useSpaceViewStore
} from '@/rekuest/components/spaces/task/store'
import { TaskTimeline } from '@/rekuest/components/spaces/task/panels/TaskTimeline'
import { LiveTicker } from '@/rekuest/components/spaces/task/LiveTicker'
import { LiveStatusStrip } from '@/rekuest/components/spaces/task/panels/LiveStatusStrip'
import { ChildTaskUpdater } from '@/rekuest/components/updaters/ChildTaskUpdater'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import type {} from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { useReassign } from '@/rekuest/hooks/useReassign'
import { isCancelable, isInterruptable } from '@/rekuest/lib/taskStatus'

/**
 * Keeps the store in sync when the GraphQL cache updates
 * (e.g. via the ChildTaskUpdater subscription).
 */
const StoreRefresher = ({ task }: { task: DetailTaskFragment }) => {
  const refreshTimeline = useSpaceViewStore((s) => s.refreshTimeline)

  useEffect(() => {
    refreshTimeline(task)
  }, [task, refreshTimeline])

  return null
}

export const TaskSpacePage = asDetailQueryRoute(useDetailTaskQuery, ({ data, id }) => {
  const reassign = useReassign({ task: data.task })
  const [cancel] = useCancelMutation()
  const [interrupt] = useInterruptMutation()

  const [store] = useState(() => createSpaceViewStore(data.task))

  return (
    <SpaceViewStoreContext.Provider value={store}>
      <StoreRefresher task={data.task} />
      <LiveTicker />
      <RekuestTask.ModelPage
        title={`${data?.task?.action.name} — Space`}
        object={data.task}
        pageActions={
          <>
            <PageAction
              size={'sm'}
              onClick={() => {
                reassign()
              }}
            >
              Rerun
            </PageAction>
            {isCancelable(data.task) && (
              <PageAction
                onClick={() =>
                  cancel({
                    variables: { input: { task: data.task.id } }
                  })
                }
                // Stopping a running task outranks starting another one.
                priority={20}
                variant={'destructive'}
                size={'sm'}
              >
                Cancel
              </PageAction>
            )}
            {isInterruptable(data.task) && (
              <PageAction
                onClick={() =>
                  interrupt({
                    variables: { input: { task: data.task.id } }
                  })
                }
                // Stopping a running task outranks starting another one.
                priority={20}
                variant={'destructive'}
                size={'sm'}
              >
                Interrupt
              </PageAction>
            )}
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <RekuestTask.Knowledge object={data?.task} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <ChildTaskUpdater taskId={id} />
        <LiveStatusStrip />
        <ResizablePanelGroup
          direction="vertical"
          className="h-full min-h-[calc(100vh-12rem)] px-3 pb-3"
        >
          <ResizablePanel defaultSize={70} minSize={20}>
            <TaskSpaceScene />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={30} minSize={10}>
            <TaskTimeline />
          </ResizablePanel>
        </ResizablePanelGroup>
      </RekuestTask.ModelPage>
    </SpaceViewStoreContext.Provider>
  )
})

export default TaskSpacePage
