import { MailTaskList } from "@/core/linkers";
import TaskListList from "../components/lists/TaskListList";

const Page = () => {
  return (
    <MailTaskList.ListPage title="Task lists">
      <div className="p-3">
        <TaskListList defaultLimit={30} />
      </div>
    </MailTaskList.ListPage>
  );
};

export default Page;
