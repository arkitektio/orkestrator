import { ListRender } from "@/core/layout/ListRender";
import { FlussFlow } from "@/core/linkers";
import {
  FlowFilter,
  FlowOrder,
  OffsetPaginationInput,
  useFlowsQuery,
  Ordering,
} from "@/fluss/api/graphql";
import React from "react";
import FlowCard from "../cards/FlowCard";

const NEWEST_FIRST = [{ createdAt: Ordering.Desc }];

export type Props = {
  filters?: FlowFilter;
  ordering?: FlowOrder[];
  pagination?: OffsetPaginationInput;
  title?: React.ReactNode;
  actions?: React.ReactNode;
};

const List = ({ filters, ordering, pagination, title, actions }: Props) => {
  // Newest first unless told otherwise: offset pages need an order to be pages.
  const { data, refetch, loading, error } = useFlowsQuery({
    variables: { filters, ordering: ordering ?? NEWEST_FIRST, pagination },
  });

  return (
    <ListRender
      array={data?.flows}
      loading={loading}
      error={error}
      minItemWidth={240}
      title={
        title ?? (
          <FlussFlow.ListLink className="flex-0 text-xs">Flows</FlussFlow.ListLink>
        )
      }
      actions={actions}
      refetch={refetch}
      // The page the query asked for, so the list does not ask again for another size.
      limit={pagination?.limit ?? undefined}
    >
      {(item) => <FlowCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
