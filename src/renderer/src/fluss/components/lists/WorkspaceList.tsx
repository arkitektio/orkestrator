import { ListRender } from "@/core/layout/ListRender";
import { FlussWorkspace } from "@/core/linkers";
import {
  OffsetPaginationInput,
  useWorkspacesQuery,
  WorkspaceFilter,
  WorkspaceOrder,
} from "@/fluss/api/graphql";
import React from "react";
import WorkspaceCard from "../cards/WorkspaceCard";

export type Props = {
  filters?: WorkspaceFilter;
  ordering?: WorkspaceOrder[];
  pagination?: OffsetPaginationInput;
  title?: React.ReactNode;
  actions?: React.ReactNode;
};

const List = ({ filters, ordering, pagination, title, actions }: Props) => {
  const { data, refetch, loading, error } = useWorkspacesQuery({
    variables: { filters, ordering, pagination },
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
    >
      {(item) => <WorkspaceCard key={item.id} workspace={item} />}
    </ListRender>
  );
};

export default List;
