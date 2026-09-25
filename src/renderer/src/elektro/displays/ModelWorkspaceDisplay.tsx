import { DisplayWidgetProps } from "@/core/lib/display/registry";
import { useDetailModelWorkspaceQuery } from "../api/graphql";

export const ModelWorkspaceDisplay = (props: DisplayWidgetProps) => {
  const { data } = useDetailModelWorkspaceQuery({
    variables: {
      id: props.id,
    },
  });

  const workspace = data?.modelWorkspace;
  if (!workspace) {
    return <div>Workspace not found</div>;
  }
  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="mb-1 font-bold">{workspace.name}</div>
      <div className="text-xs text-muted-foreground">
        {workspace.mappings.length} model
        {workspace.mappings.length === 1 ? "" : "s"}
      </div>
    </div>
  );
};
