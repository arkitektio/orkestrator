import { ListRender } from "@/core/layout/ListRender";
import { FlussRun } from "@/core/linkers";
import {
  OffsetPaginationInput,
  RunFilter,
  RunOrder,
  useListRunsQuery,
} from "@/fluss/api/graphql";
import React from "react";
import RunCard from "../cards/RunCard";

export type Props = {
  filters?: RunFilter;
  ordering?: RunOrder[];
  pagination?: OffsetPaginationInput;
  title?: React.ReactNode;
  actions?: React.ReactNode;
};

const List = ({ filters, ordering, pagination, title, actions }: Props) => {
  const { data, refetch, loading, error } = useListRunsQuery({
    variables: { filters, ordering, pagination },
  });

  return (
    <ListRender
      array={data?.runs}
      loading={loading}
      error={error}
      minItemWidth={240}
      title={
        title ?? (
          <FlussRun.ListLink className="flex-0 text-xs">Runs</FlussRun.ListLink>
        )
      }
      actions={actions}
      refetch={refetch}
    >
      {(item) => <RunCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
