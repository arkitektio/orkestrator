import { CARD_FRAME_WIDE_MIN_WIDTH } from "@/core/ui/card-frame";
import { ListRender } from "@/core/layout/ListRender";
import { RekuestTask } from "@/core/linkers";
import { TaskFilter, TaskOrder, OffsetPaginationInput, Ordering, useListTasksQuery } from "@/rekuest/api/graphql";
import { ReactNode } from "react";
import TaskCard from "../cards/TaskCard";

export type Props = {
  filters?: TaskFilter;
  order?: TaskOrder;
  pagination?: OffsetPaginationInput;
  title?: ReactNode;
};

/** What `ListRender` shows per page: the first request asks for no more. */
const PAGE = 20;
const NEWEST_FIRST: TaskOrder = { createdAt: Ordering.Desc };

const List = ({ filters, order = NEWEST_FIRST, pagination, title }: Props) => {
  const { data, error, refetch } = useListTasksQuery({
    variables: {
      filter: filters,
      ordering: [order],
      pagination: pagination ?? { limit: PAGE, offset: 0 },
    },
  });
  return (
    <>
      <ListRender
        array={data?.tasks}
        title={
          <RekuestTask.ListLink className="flex-0">
            {title ?? "Latest tasks"}
          </RekuestTask.ListLink>
        }
        refetch={refetch}
        limit={pagination?.limit ?? PAGE}
        error={error}
        minItemWidth={CARD_FRAME_WIDE_MIN_WIDTH}
      >
        {(ex) => (
          <TaskCard key={ex.id} item={ex} />
        )}
      </ListRender>
    </>
  );
};

export default List;
