import React from "react";
import { notEmpty } from "../floating/utils";
import { useMyWorkspacesQuery } from "../fluss/api/graphql";
import { WorkspaceCard } from "../fluss/components/cards/WorkspaceCard";
import { withFluss } from "../fluss/fluss";
import { SectionTitle } from "../layout/SectionTitle";
import { useDeleteWorkspaceMate } from "../mates/workspace/useDeleteWorkspaceMate";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
export type IMyGraphsProps = {};

const MyWorkspaces: React.FC<IMyGraphsProps> = ({}) => {
  const { data } = withFluss(useMyWorkspacesQuery)();

  const deleteWorkspaceMate = useDeleteWorkspaceMate();

  return (
    <div>
      <SectionTitle>My Workspaces</SectionTitle>
      <br />
      <ResponsiveGrid>
        {data?.myworkspaces?.filter(notEmpty).map((diagram, index) => (
          <WorkspaceCard
            key={index}
            workspace={diagram}
            mates={[deleteWorkspaceMate(diagram)]}
          />
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyWorkspaces as MyDiagrams };
