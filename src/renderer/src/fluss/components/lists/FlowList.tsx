import { ListRender } from "@/components/layout/ListRender";
import { FlussFlow } from "@/linkers";
import {
  FlowFilter,
  FlowOrder,
  OffsetPaginationInput,
  useFlowsQuery,
} from "@/fluss/api/graphql";
import React from "react";
import FlowCard from "../cards/FlowCard";

export type Props = {
  filters?: FlowFilter;
  ordering?: FlowOrder[];
  pagination?: OffsetPaginationInput;
  title?: React.ReactNode;
  actions?: React.ReactNode;
};

const List = ({ filters, ordering, pagination, title, actions }: Props) => {
  const { data, refetch, loading, error } = useFlowsQuery({
    variables: { filters, ordering, pagination },
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
    >
      {(item) => <FlowCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
