import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlussWorkspace } from "@/linkers";
import { ListWorkspaceFragment } from "@/reaktion/api/graphql";

import Timestamp from "@/components/ui/timestamp";

interface Props {
  workspace: ListWorkspaceFragment;

}

const TheCard = ({ workspace }: Props) => {
  return (
    <FlussWorkspace.Smart object={workspace}>
      <Card className="aspect-square">
        <CardHeader>
          <CardTitle>
            <FlussWorkspace.DetailLink object={workspace}>
              {workspace.title}
            </FlussWorkspace.DetailLink>
          </CardTitle>
          <CardDescription>
            {workspace.description || "No description"}
            <br />
            {workspace.latestFlow?.createdAt && (
              <Timestamp date={workspace.latestFlow.createdAt} />
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    </FlussWorkspace.Smart>
  );
};

export default React.memo(TheCard);