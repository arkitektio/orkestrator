import { createList } from "@/core/components/layout/createList";
import {
  ListTasksQuery,
  Ordering,
  TaskFilter,
  TaskOrder,
  useListTasksQuery,
} from "@/rekuest/api/graphql";
import { useMemo } from "react";
import TaskCard from "../cards/TaskCard";

// `ListTasks` names its filter variable `$filter`; createList speaks `filters`.
const TaskHistoryList = createList<
  ListTasksQuery,
  TaskFilter,
  never,
  TaskOrder[],
  ListTasksQuery["tasks"][number]
>({
  useHook: ({ variables, fetchPolicy }) =>
    useListTasksQuery({
      variables: {
        filter: variables.filters,
        ordering: variables.ordering,
        pagination: variables.pagination,
      },
      fetchPolicy,
    }),
  dataKey: "tasks",
  ItemComponent: TaskCard,
  title: "History",
  defaultLimit: 12,
  minItemWidth: 240,
});

const NEWEST_FIRST: TaskOrder[] = [{ createdAt: Ordering.Desc }];

/** Every run of this action, newest first, paged. */
export const ActionTaskHistory = ({ id }: { id: string }) => {
  const filters = useMemo(() => ({ action: id }), [id]);
  return <TaskHistoryList filters={filters} ordering={NEWEST_FIRST} />;
};
