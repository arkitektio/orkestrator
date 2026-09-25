import { Button } from "@/core/components/ui/button";
import {
  GraphFragment,
  useUpdateGraphVisualMutation,
} from "@/kraph/api/graphql";
import {
  Connection,
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import React, { useState } from "react";
import { ClickContextual } from "./contextuals/ClickContextuals";
import { ConnectContextual } from "./contextuals/ConnectContextual";
import "./index.css";
import { OntologyGraphProvider } from "./OntologyGraphProvider";
import {
  ClickContextualParams,
  ConnectContextualParams,
  MyEdge,
  MyNode,
  StagingEdgeParams,
  StagingNodeParams,
} from "./types";
import { calculateMidpoint, discoLayout, EDGE_TYPES, forceLayout, hashGraph, layeredLayout, NODE_TYPES, nodeToNodePositionInput, ontologyToEdges, ontologyToNodes, radialLayout, stressLayout, treeLayout } from "./utils";

export const OntologyGraph = ({ graph }: { graph: GraphFragment }) => {
  const [updateGraphVisual] = useUpdateGraphVisualMutation();

  const reactFlowWrapper = React.useRef<HTMLDivElement | null>(null);

  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance<MyNode, MyEdge> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<MyNode>(
    ontologyToNodes(graph),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<MyEdge>(
    ontologyToEdges(graph),
  );

  const [showClickContextual, setShowClickContextual] = useState<
    undefined | ClickContextualParams | ConnectContextualParams
  >();

  React.useEffect(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
      setNodes(ontologyToNodes(graph));
      setEdges(ontologyToEdges(graph));
    }
  }, [reactFlowInstance, hashGraph(graph)]);

  const save = async () => {
    const currentNodes = reactFlowInstance?.getNodes() as MyNode[] | undefined;

    if (!currentNodes?.length) {
      return;
    }

    const nodePositions = currentNodes
      .map(nodeToNodePositionInput)
      .filter((n) => n != null);

    await updateGraphVisual({
      variables: {
        input: {
          id: graph.id,
          nodePositions,
        },
      },
    });

    console.log("Graph visuals saved successfully");
  };

  const onPaneClick = (event: React.MouseEvent) => {
    console.log("onPaneClick", event);
    if (!reactFlowWrapper.current) {
      return;
    }

    if (showClickContextual) {
      console.log("Click Hide Event");
      setShowClickContextual(undefined);
      return;
    }

    const reactFlowBounds = reactFlowWrapper?.current?.getBoundingClientRect();
    console.log("reactFlowBounds", reactFlowBounds);
    if (reactFlowInstance && reactFlowBounds) {
      const position = {
        x: event.clientX - (reactFlowBounds?.left || 0),
        y: event.clientY - (reactFlowBounds?.top || 0),
      };

      console.log("onPaneClick", position);

      setShowClickContextual({
        type: "click",
        event: event,
        position: position,
      });

      console.log("showClickContextual", showClickContextual);
    }
  };

  const layout = (layout: { [key: string]: string }) => {
    const elk = new ELK();
    const the_nodes = nodes;

    const graph = {
      id: "root",
      layoutOptions: layout,
      children: the_nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.width,
        height: node.height,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    elk.layout(graph).then(({ children }) => {
      // By mutating the children in-place we saves ourselves from creating a
      // needless copy of the nodes array.
      if (!children) {
        return;
      }

      const newNodes = children
        .map((node) => {
          const child = the_nodes.find((n) => n.id === node.id);
          if (!child) return undefined;
          return { ...child, position: { x: node.x, y: node.y } };
        })
        .filter((n): n is MyNode => n !== undefined);

      setNodes(newNodes);
    });
  };

  const nodelayout = (layout: { [key: string]: string }, root: string) => {
    const elk = new ELK();
    const the_nodes = nodes;

    // Filter out self-referencing edges and duplicate edges to prevent cycles
    const filteredEdges = edges.filter((edge, index, arr) => {
      // Remove self-referencing edges
      if (edge.source === edge.target) {
        return false;
      }

      // Remove duplicate edges (same source and target)
      const firstIndex = arr.findIndex(
        (e) => e.source === edge.source && e.target === edge.target,
      );
      return index === firstIndex;
    });

    const graph = {
      id: "root",
      layoutOptions: {
        ...layout,
        "elk.radial.rootNode": root, // Specify the root node for radial layout
      },
      children: the_nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.width,
        height: node.height,
      })),
      edges: filteredEdges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    elk
      .layout(graph)
      .then(({ children }) => {
        // By mutating the children in-place we saves ourselves from creating a
        // needless copy of the nodes array.
        if (!children) {
          return;
        }

        const newNodes = children
          .map((node) => {
            const child = the_nodes.find((n) => n.id === node.id);
            if (!child) return undefined;
            return { ...child, position: { x: node.x, y: node.y } };
          })
          .filter((n): n is MyNode => n !== undefined);

        setNodes(newNodes);
      })
      .catch((error) => {
        console.error("ELK Layout failed:", error);
        console.error(
          "This might be due to circular dependencies or self-referencing nodes",
        );
        // Fallback: Just arrange nodes in a simple circle manually
        const centerX = 400;
        const centerY = 300;
        const radius = 200;
        const angleStep = (2 * Math.PI) / the_nodes.length;

        const fallbackNodes = the_nodes.map((node, index) => {
          const angle = index * angleStep;
          return {
            ...node,
            position: {
              x: centerX + radius * Math.cos(angle),
              y: centerY + radius * Math.sin(angle),
            },
          };
        });

        setNodes(fallbackNodes);
      });
  };

  const onConnect = (connection: Connection) => {
    if (!reactFlowInstance) {
      return;
    }

    // Once we have a connection we resset the

    const nodes = (reactFlowInstance?.getNodes() as MyNode[]) || [];

    const leftNode = nodes.find((n) => n.id == connection.source);
    const rightNode = nodes.find((n) => n.id == connection.target);

    if (!leftNode || !rightNode) {
      return;
    }

    console.log(leftNode.position);
    console.log(rightNode.position);
    console.log(leftNode.position);
    console.log(rightNode.position);

    // Calcluate to Screen Position
    const screenposition = reactFlowInstance.flowToScreenPosition(
      calculateMidpoint(leftNode.position, rightNode.position),
    );

    const reactFlowBounds = reactFlowWrapper?.current?.getBoundingClientRect();

    const position = {
      x: screenposition.x - (reactFlowBounds?.left || 0),
      y: screenposition.y - (reactFlowBounds?.top || 0),
    };

    setShowClickContextual({
      type: "connect",
      leftNode: leftNode,
      rightNode: rightNode,
      connection: connection,
      position: position,
    });
  };

  const addStagingNode = (params: StagingNodeParams) => {
    if (!reactFlowInstance) {
      return;
    }

    const position = reactFlowInstance.screenToFlowPosition({
      x: params.event.clientX,
      y: params.event.clientY,
    });

    setNodes((prevNodes) => [
      ...prevNodes.filter((id) => id.id !== params.ageName),
      {
        data: params.data,
        position,
        id: params.ageName,
        type: params.type as MyNode["type"],
        height: 100,
        width: 200,
      } as MyNode,
    ]);
    setShowClickContextual(undefined);
  };

  const addStagingEdge = (params: StagingEdgeParams) => {
    if (!reactFlowInstance) {
      return;
    }

    setEdges((prevEdges) => [
      ...prevEdges.filter((id) => id.id !== params.ageName),
      {
        data: params.data,
        source: params.source,
        target: params.target,
        id: params.ageName,
        type: params.type as MyEdge["type"],
      } as MyEdge,
    ]);
    setShowClickContextual(undefined);
  };

  return (
    <OntologyGraphProvider
      graph={graph}
      addStagingEdge={addStagingEdge}
      addStagingNode={addStagingNode}
    >
      <div
        ref={reactFlowWrapper}
        style={{ width: "100%", height: "100%" }}
        className="relative"
      >
        <ReactFlow<MyNode, MyEdge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onPaneClick={onPaneClick}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onInit={(r) => setReactFlowInstance(r)}
          fitView
          proOptions={{ hideAttribution: true }}
        />
        {showClickContextual && showClickContextual.type == "click" && (
          <ClickContextual
            params={showClickContextual}
            graph={graph}
            addStagingNode={addStagingNode}
            onCancel={() => setShowClickContextual(undefined)}
          />
        )}
        {showClickContextual && showClickContextual.type == "connect" && (
          <ConnectContextual
            params={showClickContextual}
            graph={graph}
            addStagingEdge={addStagingEdge}
            onCancel={() => setShowClickContextual(undefined)}
          />
        )}
        <div className="absolute top-0 right-0 p-2">
          <Button onClick={save} variant={"outline"}>
            Save
          </Button>
        </div>
        <div className="absolute top-0 left-0 p-3 gap-2 flex flex-row">
          <Button onClick={() => layout(stressLayout)} variant={"outline"}>
            Stress
          </Button>
          <Button onClick={() => layout(forceLayout)} variant={"outline"}>
            Force
          </Button>
          <Button onClick={() => layout(discoLayout)} variant={"outline"}>
            Disco
          </Button>
          <Button onClick={() => layout(treeLayout)} variant={"outline"}>
            Tree
          </Button>
          <Button onClick={() => layout(layeredLayout)} variant={"outline"}>
            Layered
          </Button>
          <Button
            onClick={() => {
              const rootNode = nodes.at(0)?.id;
              if (rootNode) {
                nodelayout(radialLayout, rootNode);
              }
            }}
            variant={"outline"}
          >
            Circle
          </Button>
        </div>
      </div>
    </OntologyGraphProvider>
  );
};

export default OntologyGraph; // --- IGNORE ---
