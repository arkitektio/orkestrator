import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/core/ui/empty";
import { Kbd, KbdGroup } from "@/core/ui/kbd";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/core/ui/resizable";
import { Spinner } from "@/core/ui/spinner";
import { ListTodo } from "lucide-react";
import React from "react";
import { useGetTaskQuery } from "../../api/graphql";
import { MailTask } from "../../linkers";
import { useTaskSelection } from "./selection";
import { TaskDetail } from "./TaskDetail";

/** The reading pane for the selected task. */
const TaskReader = ({ id }: { id: string }) => {
  const { data, loading } = useGetTaskQuery({ variables: { id } });
  if (!data)
    return loading ? (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    ) : (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyTitle>This task is gone</EmptyTitle>
          <EmptyDescription>It was deleted.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return <TaskDetail task={data.task} page={MailTask.linkBuilder(id)} />;
};

/** Tasks on the left, the selected one on the right, the divider draggable and remembered. */
export const TaskSplit = ({ list }: { list: React.ReactNode }) => {
  const { selected } = useTaskSelection();
  return (
    <div className="-m-3 flex min-h-0 flex-1">
      <ResizablePanelGroup direction="horizontal" autoSaveId="kuvert:tasks-split">
        <ResizablePanel id="list" order={1} defaultSize={38} minSize={22} maxSize={65}>
          <div className="flex h-full flex-col overflow-y-auto">{list}</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="reader" order={2} defaultSize={62} minSize={30}>
          <div className="h-full overflow-y-auto bg-background">
            {selected ? (
              <TaskReader key={selected} id={selected} />
            ) : (
              <Empty className="h-full border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ListTodo />
                  </EmptyMedia>
                  <EmptyTitle>No task selected</EmptyTitle>
                  <EmptyDescription>
                    Pick one from the list, or walk it with{" "}
                    <KbdGroup>
                      <Kbd>↑</Kbd>
                      <Kbd>↓</Kbd>
                    </KbdGroup>
                    .
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
