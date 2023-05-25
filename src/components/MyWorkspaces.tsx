import React from "react";
import { useMyWorkspacesQuery } from "../fluss/api/graphql";
import { WorkspaceCard } from "../fluss/components/cards/WorkspaceCard";
import { withFluss } from "../fluss/fluss";
import { ListRender } from "../layout/SectionTitle";
import { Workspace } from "../linker";
import { useDeleteWorkspaceMate } from "../mates/workspace/useDeleteWorkspaceMate";
import { usePinWorkspaceMate } from "../mates/workspace/usePinWorkspaceMate";
import { FlowHomeFilterParams } from "../pages/flows/FlowHome";
export type IMyGraphsProps = {} & FlowHomeFilterParams;

const MyWorkspaces: React.FC<IMyGraphsProps> = ({ limit, createdDay }) => {
  const variables = { limit: limit, offset: 0, createdDay: createdDay };
  const { data, loading, error, refetch } = withFluss(useMyWorkspacesQuery)({
    variables: variables,
  });

  const deleteWorkspaceMate = useDeleteWorkspaceMate();
  const pinWorkspaceMate = usePinWorkspaceMate();

  return (
    <ListRender
      array={data?.myworkspaces}
      loading={loading}
      title={
        <Workspace.ListLink className="flex-0">Workspaces</Workspace.ListLink>
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

export { MyWorkspaces as MyDiagrams };
