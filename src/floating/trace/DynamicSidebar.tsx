import { useTraceRiver } from "./context";

import { ArkitektTraceNodeSidebar } from "./sidebars/ArkitektTraceNodeSidebar";
import { CanvasSidebar } from "./sidebars/CanvasSidebar";

export const DynamicSidebar = () => {
  const { selectedNode, flow } = useTraceRiver();

  if (!selectedNode) return <CanvasSidebar />;

  return (
    <>
      {selectedNode?.type == "ArkitektNode" && (
        <ArkitektTraceNodeSidebar node={selectedNode} />
      )}
    </>
  );
};
