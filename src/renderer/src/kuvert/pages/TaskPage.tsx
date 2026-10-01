import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { useGetTaskQuery } from "../api/graphql";
import { TaskDetail } from "../components/tasks/TaskDetail";
import { KUVERT_HELP } from "../help";
import { MailTask } from "../linkers";

/** A task as a page of its own (double-click in a list, or a link). */
const TaskPage = asDetailQueryRoute(useGetTaskQuery, ({ data }) => (
  <MailTask.ModelPage title={data.task.title || "Task"} object={data.task} help={KUVERT_HELP.task}>
    <div className="-m-3 min-h-full">
      <TaskDetail task={data.task} />
    </div>
  </MailTask.ModelPage>
));

export default TaskPage;
