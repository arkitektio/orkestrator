import { ListRender } from "@/core/layout/ListRender";
import { FlussWorkspace } from "@/core/linkers";
import {
  OffsetPaginationInput,
  useWorkspacesQuery,
  WorkspaceFilter,
  WorkspaceOrder,
  Ordering,
} from "@/fluss/api/graphql";
import React from "react";
import WorkspaceCard from "../cards/WorkspaceCard";

const NEWEST_FIRST = [{ createdAt: Ordering.Desc }];

export type Props = {
  filters?: WorkspaceFilter;
  ordering?: WorkspaceOrder[];
  pagination?: OffsetPaginationInput;
  title?: React.ReactNode;
  actions?: React.ReactNode;
};

const List = ({ filters, ordering, pagination, title, actions }: Props) => {
  // Newest first unless told otherwise: offset pages need an order to be pages.
  const { data, refetch, loading, error } = useWorkspacesQuery({
    variables: { filters, ordering: ordering ?? NEWEST_FIRST, pagination },
  });

  return (
    <ListRender
      array={data?.workspaces}
      loading={loading}
      error={error}
      minItemWidth={260}
      title={
        title ?? (
          <FlussWorkspace.ListLink className="flex-0 text-xs">
            Workspaces
          </FlussWorkspace.ListLink>
        )
      }
      actions={actions}
      refetch={refetch}
      // The page the query asked for, so the list does not ask again for another size.
      limit={pagination?.limit ?? undefined}
    >
      {(item) => <WorkspaceCard key={item.id} workspace={item} />}
    </ListRender>
  );
};

export default List;
