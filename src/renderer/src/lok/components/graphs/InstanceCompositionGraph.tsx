import { ServiceInstanceFragment } from "@/lok/api/graphql";
import React from "react";
import { ReactFlow, ReactFlowInstance } from "@xyflow/react";
import InstanceMappingEdge from "./edges/InstanceMappingEdge";
import ClientNode from "./nodes/ClientNode";
import ServiceInstanceNode from "./nodes/ServiceInstanceNode";

export default ({ service }: { service: ServiceInstanceFragment }) => {
  const reactFlowWrapper = React.useRef(null);
  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance | null>(null);

  const nodes = [
    {
      id: "start",
      position: { x: 300, y: 300 },
      data: service,
      type: "serviceinstance", // corrected typo here
    },

    ...service.mappings.map((mapping, index) => ({
      id: mapping.client.id,
      position: {
        x:
          300 +
          Math.cos(((2 * Math.PI) / service.mappings.length) * index) * 200,
        y:
          300 +
          Math.sin(
            ((2 * Math.PI) / service.mappings.length) * index, // corrected to use service.mappings.length
          ) *
          200,
      },
      data: mapping.client,
      type: "client",
    })),
  ];

  const edges = service.mappings.map((mapping) => ({
    // updated to use service.mappings
    id: mapping.id,
    target: "start",
    source: mapping.client.id,
    label: mapping.key,
    data: mapping,
    type: "instancemapping",
  }));

  React.useEffect(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  return (
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{
          serviceinstance: ServiceInstanceNode,
          client: ClientNode,
        }}
        edgeTypes={{
          instancemapping: InstanceMappingEdge,
        }}
        onInit={setReactFlowInstance}
        fitView
      />
    </div>
  );
};
