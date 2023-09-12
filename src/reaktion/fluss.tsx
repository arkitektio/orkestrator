import { useCallback } from "react";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

const initialNodes = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "1" } },
  { id: "2", position: { x: 0, y: 100 }, data: { label: "2" } },
];

const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={(c) => {
        console.log(c.map((c) => c.type)), onNodesChange(c);
      }}
      onEdgesChange={(c) => {
        console.log(
          "Edges",
          c.map((c) => c.type)
        ),
          onEdgesChange(c);
      }}
      onConnect={onConnect}
    >
      <MiniMap />
      <Controls />
      <Background />
    </ReactFlow>
  );
}

export const New = () => {
  return (
    <div className="h-full w-full">
      <Flow />
    </div>
  );
};
