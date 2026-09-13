import { ListRender } from "@/components/layout/ListRender";
import { RekuestTask } from "@/linkers";
import { TaskFilter, TaskOrder, OffsetPaginationInput, useListTasksQuery } from "@/rekuest/api/graphql";
import { ReactNode } from "react";
import TaskCard from "../cards/TaskCard";

export type Props = {
  filters?: TaskFilter;
  order?: TaskOrder;
  pagination?: OffsetPaginationInput;
  title?: ReactNode;
};

const List = ({ filters, order, pagination, title }: Props) => {
  const { data, error, refetch } = useListTasksQuery({
    variables: {
      filter: filters,
      ordering: order ? [order] : undefined,
      pagination: pagination,
    },
  });
  return (
    <>
      <ListRender
        array={data?.tasks}
        title={
          <RekuestTask.ListLink className="flex-0">
            {title ?? "Latest Tasks"}
          </RekuestTask.ListLink>
        }
        refetch={refetch}
        error={error}
      >
        {(ex) => (
          <TaskCard key={ex.id} item={ex} />
        )}
      </ListRender>
    </>
  );
};

export default List;
