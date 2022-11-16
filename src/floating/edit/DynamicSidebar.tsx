import { useEditRiver } from "./context";
import { ArkitektNodeSidebar } from "./sidebars/ArkitektNodeSidebar";
import { EditSidebar } from "./components/EditSidebar";
import { ReactiveNodeSidebar } from "./sidebars/ReactiveNodeSidebar";
import { ArgNodeSidebar } from "./sidebars/ArgNodeSidebar";
import { ReturnNodeSidebar } from "./sidebars/ReturnNodeSidebar";

export const DynamicSidebar = () => {
  const { selectedNode, flow } = useEditRiver();

  if (!selectedNode) return <EditSidebar flow={flow} />;

  return (
    <>
      {selectedNode?.type == "ArkitektNode" && (
        <ArkitektNodeSidebar node={selectedNode} />
      )}
      {selectedNode?.type == "ReactiveNode" && (
        <ReactiveNodeSidebar node={selectedNode} />
      )}
      {selectedNode?.type == "ArgNode" && (
        <ArgNodeSidebar node={selectedNode} />
      )}
      {selectedNode?.type == "ReturnNode" && (
        <ReturnNodeSidebar node={selectedNode} />
      )}
    </>
  );
};
