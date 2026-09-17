import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Position,
  Handle,
  MarkerType,
  useReactFlow,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AgentSelectionDialog } from "@/rekuest/dialogs/AgentSelectionDialog";
import { Button } from "@/components/ui/button";
import { ResolutionFragment } from "@/rekuest/api/graphql";

const elk = new ELK();

interface GraphResolution {
  id: string;
  name: string;
  resolvedDependencies?: GraphResolvedDependency[];
}

interface GraphResolvedDependency {
  id: string;
  key: string;
  dependency: {
    id: string;
    key: string;
    description?: string | null;
  };
  implementation: {
    id: string;
    name: string;
    interface: string;
    agent: {
      id: string;
      name: string;
    };
  };
  downStreamResolution?: GraphResolution | null;
}

const useLayout = () => {
  const { getNodes, getEdges, setNodes, fitView } = useReactFlow();

  const onLayout = useCallback(
    ({
      direction,
      useInitialNodes = false,
    }: {
      direction: "DOWN" | "RIGHT";
      useInitialNodes?: boolean;
    }) => {
      const opts = {
        "elk.direction": direction,
        "elk.algorithm": "layered",
        "elk.layered.spacing.nodeNodeBetweenLayers": "100",
        "elk.spacing.nodeNode": "80",
        "elk.hierarchyHandling": "INCLUDE_CHILDREN",
        "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
        "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      };

      const ns = useInitialNodes ? getNodes() : getNodes();
      const es = useInitialNodes ? getEdges() : getEdges();


      // Reconstruct hierarchy for ELK
      const buildElkHierarchy = (nodes: Node[], parentId?: string): any[] => {
        return nodes
          .filter((n) => n.parentId === parentId)
          .map((n) => {
            const children = buildElkHierarchy(nodes, n.id);
            const elkNode: any = {
              id: n.id,
              width: n.measured?.width ?? 200,
              height: n.measured?.height ?? 100,
            };

            if (children.length > 0) {
              elkNode.children = children;
              elkNode.layoutOptions = {
                "elk.padding": "[top=50,left=20,bottom=20,right=20]",
                "elk.direction": direction,
                "elk.spacing.nodeNode": "40",
                "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
                "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
              };
            }
            return elkNode;
          });
      };

      const rootChildren = buildElkHierarchy(ns, undefined);

      const graph: any = {
        id: "root",
        layoutOptions: opts,
        children: rootChildren,
        edges: es.map((e) => ({
          id: e.id,
          sources: [e.source],
          targets: [e.target],
        })),
      };

      elk
        .layout(graph)
        .then((g) => {
          const newNodes: Node[] = [];

          const processNode = (elkNode: any) => {
            const originalNode = ns.find((n) => n.id === elkNode.id);
            if (originalNode) {
              newNodes.push({
                ...originalNode,
                sourcePosition:
                  direction === "RIGHT" ? Position.Right : Position.Bottom,
                targetPosition:
                  direction === "RIGHT" ? Position.Left : Position.Top,
                position: { x: elkNode.x!, y: elkNode.y! },
                style: {
                  ...originalNode.style,
                  width: elkNode.width,
                  height: elkNode.height,
                },
              });
            }

            if (elkNode.children) {
              elkNode.children.forEach((c: any) => processNode(c));
            }
          };

          g.children?.forEach((c: any) => processNode(c));

          setNodes(newNodes);
          window.requestAnimationFrame(() => {
            fitView();
          });
        })
        .catch((err) => console.error("ELK Layout Error:", err));
    },
    [getNodes, getEdges, setNodes, fitView]
  );

  return { onLayout };
};

const ResolutionNode = ({ data }: { data: { label: string } }) => {
  return (
    <Card className="w-[200px] border-border shadow-md bg-card">
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-muted-foreground"
      />
      <CardHeader className="p-3">
        <CardTitle className="text-sm font-bold">{data.label}</CardTitle>
        <CardDescription className="text-xs">Root</CardDescription>
      </CardHeader>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-muted-foreground"
      />
    </Card>
  );
};

const ImplementationNode = ({
  data,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
}: {
  data: { label: string; action: string; dependencyKey: string };
  sourcePosition?: Position;
  targetPosition?: Position;
}) => {
  return (
    <Card className="w-[200px] border-chart-3 shadow-md bg-card">
      <Handle
        type="target"
        position={targetPosition}
        className="w-3 h-3 !bg-chart-3"
      />
      <CardHeader className="p-3">
        <div className="text-xs text-muted-foreground mb-1 truncate">
          {data.dependencyKey}
        </div>
        <CardTitle className="text-sm font-bold truncate">{data.action}</CardTitle>
        <CardDescription className="text-xs truncate ">{data.label}</CardDescription>
      </CardHeader>
      <Handle
        type="source"
        position={sourcePosition}
        className="w-3 h-3 !bg-chart-3"
      />
    </Card>
  );
};

const getColor = (id: string) => {
  const colors = [
    "#ef4444", // red-500
    "#f97316", // orange-500
    "#f59e0b", // amber-500
    "#84cc16", // lime-500
    "#22c55e", // green-500
    "#10b981", // emerald-500
    "#14b8a6", // teal-500
    "#06b6d4", // cyan-500
    "#0ea5e9", // sky-500
    "#3b82f6", // blue-500
    "#6366f1", // indigo-500
    "#8b5cf6", // violet-500
    "#a855f7", // purple-500
    "#d946ef", // fuchsia-500
    "#ec4899", // pink-500
    "#f43f5e", // rose-500
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const GroupNode = ({ data,  }: { data: { label: string; id: string } }) => {
  const color = getColor(data.id);
  return (
    <div
      className="w-full h-full p-2 rounded-lg"
      style={{
        backgroundColor: color,

      }}
    >
      <div
        className="text-xs font-bold mt-2 uppercase tracking-wider"
        style={{ color: "white" }}
      >
        {data.label}
      </div>
    </div>
  );
};

const DependencyGroupNode = ({
  data,
  targetPosition = Position.Top,
}: {
  data: {
    label: string;
    description?: string;
    onAdd?: () => void;
    onAutoAdd?: () => void;
  };
  targetPosition?: Position;
}) => {
  return (
    <div className="w-full h-full bg-orange-100/50 dark:bg-orange-900/20 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg p-2 relative group">
      <Handle
        type="target"
        position={targetPosition}
        className="w-3 h-3 !bg-orange-500"
      />
      <div className="flex justify-between items-start ">
        <div>
          <div className="text-xs font-bold text-orange-500 mb-1 uppercase tracking-wider">
            {data.label}
          </div>
          {data.description && (
            <div className="text-[10px] text-orange-400 dark:text-orange-300 italic max-w-[150px]">
              {data.description}
            </div>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={data.onAutoAdd}
            className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-[10px]"
            title="Magic Auto Add"
          >
            Auto
          </button>
          <button
            onClick={data.onAdd}
            className="p-1 bg-chart-3 text-white rounded hover:bg-chart-3/80 text-[10px]"
            title="Add Agent"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  resolution: ResolutionNode,
  implementation: ImplementationNode,
  group: GroupNode,
  dependencyGroup: DependencyGroupNode,
};

export const ResolutionGraph = ({
  resolution,
}: {
  resolution: ResolutionFragment;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState<
    string | undefined
  >(undefined);

  const onAdd = useCallback((dependencyId: string) => {
    setSelectedDependency(dependencyId);
    setDialogOpen(true);
  }, []);

  const onAutoAdd = useCallback((dependencyId: string) => {
    console.log("Auto add for", dependencyId);
    // TODO: Implement auto add logic
  }, []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const visitedNodes = new Set<string>();
    const agentGroups = new Map<string, string>(); // resolutionId-agentId -> groupId

    // Add Root Node
    nodes.push({
      id: resolution.id,
      type: "implementation",
      data: {
        label: "Root",
        action: resolution.name,
        dependencyKey: "Entrypoint",
      },
      position: { x: 0, y: 0 },
    });
    visitedNodes.add(resolution.id);

    const traverse = (res: GraphResolution, parentId: string) => {
      res.resolvedDependencies?.forEach((dep) => {
        if (dep.implementation) {
          // 1. Dependency Group (Outer)
          const dependencyId = dep.dependency.id;
          const dependencyKey = dep.dependency.key;
          const dependencyDescription = dep.dependency.description;

          const depGroupKey = `${res.id}-${dependencyId}`;
          let depGroupId = agentGroups.get(depGroupKey);

          if (!depGroupId) {
            depGroupId = `dep-group-${res.id}-${dependencyId}`;
            agentGroups.set(depGroupKey, depGroupId);
            nodes.push({
              id: depGroupId,
              type: "dependencyGroup",
              data: {
                label: dependencyKey,
                description: dependencyDescription,
                onAdd: () => onAdd(dependencyId),
                onAutoAdd: () => onAutoAdd(dependencyId),
              },
              position: { x: 0, y: 0 },
              style: { width: 0, height: 0 },
            });

            // Edge from Parent (Consumer) to Dependency Group
            edges.push({
              id: `${parentId}-${depGroupId}`,
              source: parentId,
              target: depGroupId,
              type: "smoothstep",
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            });
          }

          // 2. Agent Group (Inner)
          const agentId = dep.implementation.agent.id;
          const agentName = dep.implementation.agent.name;
          const agentGroupKey = `${depGroupId}-${agentId}`;
          let agentGroupId = agentGroups.get(agentGroupKey);

          if (!agentGroupId) {
            agentGroupId = `group-${res.id}-${dependencyId}-${agentId}`;
            agentGroups.set(agentGroupKey, agentGroupId);
            nodes.push({
              id: agentGroupId,
              type: "group",
              data: { label: agentName, id: agentId },
              position: { x: 0, y: 0 },
              style: { width: 0, height: 0 }, // Initial size, will be set by ELK
              parentId: depGroupId,
              extent: "parent",
            });
          }

          // Ensure unique ID for the node in the graph
          // We combine parentId and dep.id to ensure uniqueness in the tree if the same dependency is used in different branches
          const nodeId = `${dep.id}`;

          if (!visitedNodes.has(nodeId)) {
            nodes.push({
              id: nodeId,
              type: "implementation",
              data: {
                label: dep.implementation.interface,
                action: dep.implementation.name,
                dependencyKey: dep.key,
              },
              position: { x: 0, y: 0 },
              parentId: agentGroupId,
              extent: "parent",
            });
            visitedNodes.add(nodeId);
          }

          if (dep.downStreamResolution) {
            traverse(dep.downStreamResolution, nodeId);
          }
        }
      });
    };

    traverse(resolution, resolution.id);
    return { nodes, edges };
  }, [resolution, onAdd, onAutoAdd]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-full w-full border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <LayoutHandler />
      </ReactFlow>
      <AgentSelectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dependencyId={selectedDependency}
        onSelect={(implId) => console.log("Selected", implId)}
      />
    </div>
  );
};

const LayoutHandler = () => {
  const { onLayout } = useLayout();

  useEffect(() => {
    onLayout({ direction: "DOWN", useInitialNodes: true });
  }, [onLayout]);

  return (
    <Panel position="top-right">
      <Button
        onClick={() => onLayout({ direction: "DOWN" })}
        variant={"outline"}
      >
        Vertical Layout
      </Button>
      <Button
        onClick={() => onLayout({ direction: "RIGHT" })}
        variant={"outline"}
      >
        Horizontal Layout
      </Button>
    </Panel>
  );
};
