import { createList } from "@/core/layout/createList";
import { MailTaskList } from "@/core/linkers";
import { useListTaskListsQuery } from "@/kuvert/api/graphql";
import TaskListCard from "../cards/TaskListCard";

const TList = createList({
  useHook: useListTaskListsQuery,
  dataKey: "taskLists",
  ItemComponent: TaskListCard,
  title: "Task lists",
  smart: MailTaskList,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No task lists yet",
});

export default TList;
