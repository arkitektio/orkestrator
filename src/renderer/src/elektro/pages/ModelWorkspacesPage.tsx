import { Explainer } from "@/core/layout/Explainer";
import { ElektroModelWorkspace } from "@/core/linkers";
import React from "react";
import ModelWorkspaceList from "../components/lists/ModelWorkspaceList";

export type IRepresentationScreenProps = {};

const ModelWorkspacesPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <ElektroModelWorkspace.ListPage title="Workspaces">
      <div className="p-3">
        <Explainer
          title="Model Workspaces"
          description="Workspaces gather the neuron models you iterate on. Create one from any model, then every model you save from the editor while it is active joins the workspace."
        />
        <ModelWorkspaceList defaultLimit={30} />
      </div>
    </ElektroModelWorkspace.ListPage>
  );
};

export default ModelWorkspacesPage;
