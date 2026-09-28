import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { PageAction } from "@/core/ui/page-action";
import { Plus } from "lucide-react";
import { useGetTaskListQuery } from "../api/graphql";
import { TaskRows } from "../components/tasks/TaskRows";
import { TaskSplit } from "../components/tasks/TaskSplit";
import { TaskViewToggle, useTaskView } from "../components/tasks/TaskViewToggle";
import { TASK_VIEW_FILTERS } from "../components/tasks/taskOps";
import { MailTaskList } from "../linkers";

/** One task list: its tasks (active, snoozed or done), and the list's own menu. */
const TaskListPage = asDetailQueryRoute(useGetTaskListQuery, ({ data }) => {
  const list = data.taskList;
  const { openDialog } = useDialog();
  const { view, setView } = useTaskView();

  return (
    <MailTaskList.ModelPage
      title={list.name}
      object={list}
      pageActions={
        <>
          <TaskViewToggle view={view} onChange={setView} />
          <PageAction
            size="sm"
            collapse="icon"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openDialog("kuverttask", { list: list.id }, { size: "medium" })}
          >
            New task
          </PageAction>
          <MailTaskList.ObjectButton alwaysShow object={list} />
        </>
      }
    >
      <TaskSplit
        list={
          <TaskRows
            key={view}
            title={list.name}
            filters={{ ...TASK_VIEW_FILTERS[view], list: list.id }}
            showList={false}
            empty={{ title: view === "active" ? "Nothing to do" : "Nothing here", description: undefined }}
          />
        }
      />
    </MailTaskList.ModelPage>
  );
});

export default TaskListPage;
