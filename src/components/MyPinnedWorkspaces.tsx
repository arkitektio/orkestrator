import React from "react";
import { usePinnedWorkspacesQuery } from "../fluss/api/graphql";
import { WorkspaceCard } from "../fluss/components/cards/WorkspaceCard";
import { withFluss } from "../fluss/fluss";
import { ListRender } from "../layout/SectionTitle";
import { Workspace } from "../linker";
import { useDeleteWorkspaceMate } from "../mates/workspace/useDeleteWorkspaceMate";
import { usePinWorkspaceMate } from "../mates/workspace/usePinWorkspaceMate";
import { FlowHomeFilterParams } from "../pages/flows/FlowHome";
export type IMyGraphsProps = {} & FlowHomeFilterParams;

const MyPinnedWorkspaces: React.FC<IMyGraphsProps> = ({
  limit,
  createdDay,
}) => {
  const variables = { limit: limit, offset: 0, createdDay: createdDay };
  const { data, loading, error, refetch } = withFluss(usePinnedWorkspacesQuery)(
    {
      variables: variables,
    }
  );

  const deleteWorkspaceMate = useDeleteWorkspaceMate();
  const pinWorkspaceMate = usePinWorkspaceMate();

  return (
    <ListRender
      array={data?.workspaces}
      loading={loading}
      title={
        <Workspace.ListLink className="flex-0">
          Pinned Workspaces
        </Workspace.ListLink>
      }
      refetch={refetch}
    >
      {(diagram, index) => (
        <WorkspaceCard
          key={index}
          workspace={diagram}
          mates={[deleteWorkspaceMate(diagram), pinWorkspaceMate(diagram)]}
        />
      )}
    </ListRender>
  );
};

export { MyPinnedWorkspaces as MyPinnedWorkspaces };
