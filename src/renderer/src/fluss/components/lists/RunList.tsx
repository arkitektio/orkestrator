import { ListRender } from "@/core/layout/ListRender";
import { FlussRun } from "@/core/linkers";
import {
  OffsetPaginationInput,
  RunFilter,
  RunOrder,
  useListRunsQuery,
  Ordering,
} from "@/fluss/api/graphql";
import React from "react";
import RunCard from "../cards/RunCard";

const NEWEST_FIRST = [{ createdAt: Ordering.Desc }];

export type Props = {
  filters?: RunFilter;
  ordering?: RunOrder[];
  pagination?: OffsetPaginationInput;
  title?: React.ReactNode;
  actions?: React.ReactNode;
};

const List = ({ filters, ordering, pagination, title, actions }: Props) => {
  // Newest first unless told otherwise: offset pages need an order to be pages.
  const { data, refetch, loading, error } = useListRunsQuery({
    variables: { filters, ordering: ordering ?? NEWEST_FIRST, pagination },
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
      // The page the query asked for, so the list does not ask again for another size.
      limit={pagination?.limit ?? undefined}
    >
      {(item) => <RunCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
