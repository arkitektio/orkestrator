import { useEditRiver } from "./context";
import { ArkitektNodeSidebar } from "./sidebars/ArkitektNodeSidebar";
import { EditSidebar } from "./components/EditSidebar";
import { ReactiveNodeSidebar } from "./sidebars/ReactiveNodeSidebar";
import { ArgNodeSidebar } from "./sidebars/ArgNodeSidebar";
import { ReturnNodeSidebar } from "./sidebars/ReturnNodeSidebar";
import { CanvasSidebar } from "./sidebars/CanvasSidebar";
import { useEffect, useState } from "react";
import { FlowNode } from "../types";
import { useNodes } from "reactflow";

export const DynamicSidebar = () => {
  const { selectedNode, nodes, internalSignal } = useEditRiver();

  const [node, setNode] = useState<FlowNode | null>(null);

  useEffect(() => {
    if (selectedNode) {
      console.warn(selectedNode, internalSignal);
      const n = nodes.find((n) => n.id === selectedNode);
      if (!n) return;
      setNode(n);
    } else {
      setNode(null);
    }
  }, [selectedNode, internalSignal]);

  if (!node) return <CanvasSidebar />;

  return (
    <>
      {node?.type == "ArkitektNode" && <ArkitektNodeSidebar node={node} />}
      {node?.type == "ReactiveNode" && <ReactiveNodeSidebar node={node} />}
      {node?.type == "ArgNode" && <ArgNodeSidebar node={node} />}
      {node?.type == "ReturnNode" && <ReturnNodeSidebar node={node} />}
    </>
  );
};
