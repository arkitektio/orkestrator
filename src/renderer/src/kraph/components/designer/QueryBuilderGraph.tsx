import { Button } from "@/core/ui/button";
import { Checkbox } from "@/core/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";

import {
  GraphFragment,
  GraphTableQueryFragment,
  useCreateGraphTableQueryMutation,
  useUpdateGraphTableQueryMutation
} from "@/kraph/api/graphql";
import { KraphGraphQuery } from "@/core/linkers";
import {
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { ExternalLink, Filter, Plus, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { CypherQueryDisplay } from "./components/CypherQueryDisplay";
import { ReturnColumnBuilder } from "./components/ReturnColumnBuilder";
import { RenderGraphQueryTable } from "@/kraph/components/renderers/table/GraphTable";
import {
  enrichPath,
  generateGraphQueryInput,
  generateUnifiedCypherQueryWithColumns,
} from "./cypherGenerator";
import "./index.css";
import {
  NodeWhereClause,
  OntologyGraphProvider,
  Path,
  PATH_COLORS,
  ReturnColumn,
  WhereCondition,
} from "./OntologyGraphProvider";
import { MyEdge, MyNode } from "./types";
import {
  BUILDER_EDGE_TYPES,
  BUILDER_NODE_TYPES,
  discoLayout,
  forceLayout,
  hashGraph,
  layeredLayout,
  ontologyToEdges,
  ontologyToNodes,
  radialLayout,
  stressLayout,
  treeLayout,
} from "./utils";

// Node property configurations
const NODE_PROPERTIES: Record<
  string,
  Array<{ name: string; type: "string" | "number" | "boolean" }>
> = {
  Entity: [
    { name: "label", type: "string" },
    { name: "ageName", type: "string" },
    { name: "description", type: "string" },
  ],
  Structure: [
    { name: "label", type: "string" },
    { name: "ageName", type: "string" },
    { name: "kind", type: "string" },
  ],
  Metric: [
    { name: "label", type: "string" },
    { name: "ageName", type: "string" },
    { name: "value", type: "number" },
  ],
  default: [
    { name: "label", type: "string" },
    { name: "ageName", type: "string" },
  ],
};

// Inline WHERE clause editor component
interface InlineWhereEditorProps {
  nodeId: string;
  nodeLabel: string;
  initialConditions: WhereCondition[];
  onSave: (conditions: WhereCondition[]) => void;
  onCancel: () => void;
}

const InlineWhereEditor: React.FC<InlineWhereEditorProps> = ({
  nodeLabel,
  initialConditions,
  onSave,
  onCancel,
}) => {
  const [conditions, setConditions] = useState<WhereCondition[]>(
    initialConditions.length > 0
      ? initialConditions
      : [{ property: "", operator: "=", value: "" }],
  );

  const nodeType = nodeLabel.split(" (")[0] || "default";
  const properties = NODE_PROPERTIES[nodeType] || NODE_PROPERTIES.default;

  const addCondition = () => {
    setConditions([...conditions, { property: "", operator: "=", value: "" }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (
    index: number,
    field: keyof WhereCondition,
    value: string,
  ) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const getOperatorsForProperty = (propertyName: string) => {
    const prop = properties.find((p) => p.name === propertyName);
    if (!prop) return ["=", "!="];

    if (prop.type === "string") {
      return ["=", "!=", "CONTAINS", "STARTS WITH", "ENDS WITH"];
    } else if (prop.type === "number") {
      return ["=", "!=", "<", ">", "<=", ">="];
    } else if (prop.type === "boolean") {
      return ["=", "!="];
    }
    return ["=", "!="];
  };

  return (
    <div className="border rounded-lg p-3 bg-muted/50 space-y-2">
      <div className="text-xs font-semibold mb-2">
        WHERE Filters for {nodeLabel}
      </div>

      {conditions.map((condition, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={condition.property}
            onValueChange={(value) => updateCondition(index, "property", value)}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((prop) => (
                <SelectItem key={prop.name} value={prop.name}>
                  {prop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={condition.operator}
            onValueChange={(value) => updateCondition(index, "operator", value)}
          >
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              {getOperatorsForProperty(condition.property).map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="h-8 text-xs flex-1"
            placeholder="Value"
            value={String(condition.value)}
            onChange={(e) => updateCondition(index, "value", e.target.value)}
          />

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => removeCondition(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={addCondition}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Condition
        </Button>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              // Filter out empty conditions
              const validConditions = conditions.filter(
                (c) => c.property && c.operator && c.value,
              );
              onSave(validConditions);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper to convert GraphQL types to internal Path format
//
// The three `deserialize*` helpers below read `plan` where they used to read
// `builderArgs`. That is one translation layer fewer, not merely a rename:
// `builderArgs` was the builder's private echo of the same three lists, written
// by one mutation and readable by no field, while the query itself was stored as
// a Cypher string. The plan *is* the contract now — the server compiles it — so
// what the builder round-trips is what the query is.
const convertGraphQLToPath = (
  graphQuery: GraphTableQueryFragment
): Path[] => {
  if (!graphQuery.plan?.matches || graphQuery.plan.matches.length === 0) {
    return [];
  }

  return graphQuery.plan.matches.map((match) => {
    return {
      nodes: match.nodes,
      relations: match.relations,
      relationDirections: match.relationDirections || undefined,
      optional: match.optional || false,
      title: match.title || undefined,
      color: match.color || undefined, // Already in RGB format
    };
  });
};

// Helper to convert WhereOperator enum to internal operator string
const mapWhereOperatorToString = (operator: string): string => {
  switch (operator) {
    case "EQUALS":
      return "=";
    case "NOT_EQUALS":
      return "!=";
    case "GREATER_THAN":
      return ">";
    case "LESS_THAN":
      return "<";
    case "GREATER_THAN_OR_EQUAL":
      return ">=";
    case "LESS_THAN_OR_EQUAL":
      return "<=";
    case "CONTAINS":
      return "CONTAINS";
    case "STARTS_WITH":
      return "STARTS WITH";
    case "ENDS_WITH":
      return "ENDS WITH";
    default:
      return "=";
  }
};

// Helper to deserialize WHERE clauses from GraphQL
const deserializeWhereClauses = (
  graphQuery: GraphTableQueryFragment
): NodeWhereClause[] => {
  if (!graphQuery.plan || graphQuery.plan.wheres.length === 0) {
    return [];
  }

  // Group WHERE clauses by nodeId
  const clausesByNode = new Map<string, WhereCondition[]>();

  graphQuery.plan.wheres.forEach((where) => {
    const nodeId = where.node || where.path; // Use node if available, fallback to path
    if (!nodeId) return;

    const condition: WhereCondition = {
      property: where.property,
      operator: mapWhereOperatorToString(where.operator) as WhereCondition["operator"],
      value: where.value,
    };

    if (!clausesByNode.has(nodeId)) {
      clausesByNode.set(nodeId, []);
    }
    clausesByNode.get(nodeId)!.push(condition);
  });

  // Convert map to array of NodeWhereClause
  return Array.from(clausesByNode.entries()).map(([nodeId, conditions]) => ({
    nodeId,
    conditions,
  }));
};

// Helper to deserialize RETURN columns from GraphQL
const deserializeReturnColumns = (
  graphQuery: GraphTableQueryFragment
): ReturnColumn[] => {
  if (!graphQuery.plan || graphQuery.plan.returns.length === 0) {
    return [];
  }

  return graphQuery.plan.returns.map((ret) => ({
    nodeId: ret.node || ret.path, // Use node if available, fallback to path
    property: ret.property || "id",
    // `alias` round-trips now. Render filters and orders address a returned
    // alias, which is exactly what splicing a filter into raw Cypher could not
    // do correctly.
    alias: ret.alias || undefined,
  }));
};

// Helper to convert RGB array to CSS rgb() string for display
const rgbToCSS = (rgb: number[]): string => {
  const r = Math.round(rgb[0] * 255);
  const g = Math.round(rgb[1] * 255);
  const b = Math.round(rgb[2] * 255);
  return `rgb(${r}, ${g}, ${b})`;
};

export const QueryBuilderGraph = ({
  graph,
  graphQuery,
}: {
  graph: GraphFragment;
  graphQuery?: GraphTableQueryFragment;
}) => {
  const [paths, setPaths] = useState<Path[]>(() =>
    graphQuery ? convertGraphQLToPath(graphQuery) : []
  );
  const [activePath, setActivePath] = useState<Path | null>(null); // Current path being built
  const [nextColorIndex, setNextColorIndex] = useState(0);

  // WHERE clause builder state - track which node is being edited inline
  const [editingWhereNode, setEditingWhereNode] = useState<{
    pathIndex: number;
    nodeId: string;
  } | null>(null);

  // Node occurrence selection state - when starting a new path from a node that appears multiple times
  const [nodeOccurrenceSelection, setNodeOccurrenceSelection] = useState<{
    nodeId: string;
    occurrences: Array<{ pathIndex: number; nodePosition: number }>;
  } | null>(null);

  // RETURN columns state
  const [returnColumns, setReturnColumns] = useState<ReturnColumn[]>(() =>
    graphQuery ? deserializeReturnColumns(graphQuery) : []
  );
  const [returnBuilderOpen, setReturnBuilderOpen] = useState(false);
  const [useDistinct, setUseDistinct] = useState(true); // DISTINCT enabled by default

  // WHERE clauses state - now global for all nodes
  const [whereClauses, setWhereClauses] = useState<NodeWhereClause[]>(() =>
    graphQuery ? deserializeWhereClauses(graphQuery) : []
  );

  // Query execution state
  const [executedGraphQuery, setExecutedGraphQuery] =
    useState<GraphTableQueryFragment | null>(graphQuery || null);
  const [isRunning, setIsRunning] = useState(false);
  const [createGraphQuery] = useCreateGraphTableQueryMutation();
  const [updateGraphQuery] = useUpdateGraphTableQueryMutation({
  });

  const reactFlowWrapper = React.useRef<HTMLDivElement | null>(null);

  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance<MyNode, MyEdge> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<MyNode>(
    ontologyToNodes(graph),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<MyEdge>(
    ontologyToEdges(graph),
  );

  // Calculate possible nodes and edges based on current path
  const [possibleNodes, possibleEdges] = React.useMemo((): [
    string[],
    string[],
  ] => {
    // If no active path, no nodes are selectable (must click "New Path" button first)
    if (!activePath) {
      return [[], []];
    }

    // If active path exists but has no nodes yet, allow selecting any node to start
    if (activePath.nodes.length === 0) {
      if (paths.length === 0) {
        // First path - can start from any node
        return [nodes.map((n) => n.id), []];
      } else {
        // Subsequent paths - can only start from nodes in existing paths
        const existingPathNodes = new Set(paths.flatMap((p) => p.nodes));
        return [Array.from(existingPathNodes), []];
      }
    }

    const lastNodeId = activePath.nodes[activePath.nodes.length - 1];

    // After clicking a node, we need to select an edge (relation)
    // Nodes and relations alternate: node -> edge -> node -> edge...
    if (activePath.nodes.length === activePath.relations.length + 1) {
      // Just clicked a node, now need to click an edge connected to that node
      // Edges can be traversed in either direction (bidirectional)
      const connectedEdges = edges.filter(
        (e) => e.source === lastNodeId || e.target === lastNodeId,
      );
      const possibleEdgeIds = connectedEdges.map((e) => e.id);
      return [[], possibleEdgeIds];
    }

    // If we have equal nodes and relations, we just selected an edge
    // Now we need to click the other node of the last relation (whichever end we didn't come from)
    if (activePath.nodes.length === activePath.relations.length) {
      const lastRelationId =
        activePath.relations[activePath.relations.length - 1];
      const lastEdge = edges.find((e) => e.id === lastRelationId);
      if (lastEdge) {
        // Find which end of the edge to go to (the one we didn't come from)
        const previousNodeId = activePath.nodes[activePath.nodes.length - 1];
        const nextNodeId =
          lastEdge.source === previousNodeId
            ? lastEdge.target
            : lastEdge.source;
        return [[nextNodeId], []];
      }
    }

    return [[], []];
  }, [activePath, nodes, edges, paths]);

  // Automatically clean up orphaned WHERE clauses and return columns when paths change
  React.useEffect(() => {
    if (paths.length === 0) return;

    const validNodeIds = new Set<string>();
    paths.forEach((path) => {
      path.nodes.forEach((nodeId) => validNodeIds.add(nodeId));
    });

    // Filter WHERE clauses
    setWhereClauses((prev) => {
      const filtered = prev.filter((wc) => validNodeIds.has(wc.nodeId));
      // Only update if something changed to avoid infinite loops
      if (filtered.length !== prev.length) {
        return filtered;
      }
      return prev;
    });

    // Filter return columns
    setReturnColumns((prev) => {
      const filtered = prev.filter((col) => validNodeIds.has(col.nodeId));
      // Only update if something changed to avoid infinite loops
      if (filtered.length !== prev.length) {
        return filtered;
      }
      return prev;
    });
  }, [paths]);

  React.useEffect(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
      setNodes(ontologyToNodes(graph));
      setEdges(ontologyToEdges(graph));
    }
  }, [reactFlowInstance, hashGraph(graph)]);

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

  const onNodeClick = (_event: React.MouseEvent, node: MyNode) => {
    // Only allow clicking nodes that are in the possibleNodes list
    if (!possibleNodes.includes(node.id)) {
      return;
    }

    // Only add to active path if one exists (no longer auto-start paths)
    if (!activePath) {
      return;
    }

    // If this is the first node being added to the path, check for occurrences
    if (activePath.nodes.length === 0) {
      // Find all occurrences of this node in existing paths
      const occurrences: Array<{ pathIndex: number; nodePosition: number }> = [];
      paths.forEach((path, pathIndex) => {
        path.nodes.forEach((nId, nodePosition) => {
          if (nId === node.id) {
            occurrences.push({ pathIndex, nodePosition });
          }
        });
      });

      // If the node appears more than once, show selection dialog
      if (occurrences.length > 1) {
        setNodeOccurrenceSelection({
          nodeId: node.id,
          occurrences,
        });
        return;
      }

      // If the node appears exactly once, use the same variable reference
      if (occurrences.length === 1) {
        const newPath = {
          ...activePath,
          nodes: [node.id],
          startsFromPath: occurrences[0].pathIndex,
          startsFromNodePosition: occurrences[0].nodePosition,
        };
        setActivePath(newPath);
        return;
      }

      // If the node doesn't appear in any path, just add it normally
    }

    // Add the node to the active path
    const newPath = {
      ...activePath,
      nodes: [...activePath.nodes, node.id],
    };
    setActivePath(newPath);
  };

  const onEdgeClick = (_event: React.MouseEvent, edge: MyEdge) => {
    // Only allow clicking edges that are in the possibleEdges list
    if (!possibleEdges.includes(edge.id)) {
      return;
    }

    if (!activePath) return;

    // Determine if the edge is being traversed in forward or reverse direction
    const lastNodeId = activePath.nodes[activePath.nodes.length - 1];
    const isForward = edge.source === lastNodeId;

    // Add the edge/relation to the path with its direction
    const newPath = {
      ...activePath,
      relations: [...activePath.relations, edge.id],
      relationDirections: [...(activePath.relationDirections || []), isForward],
    };
    setActivePath(newPath);
  };

  // Function to start a new path - user must click this before selecting nodes
  const startNewPath = (nodeId?: string) => {
    const color = PATH_COLORS[nextColorIndex % PATH_COLORS.length];

    if (nodeId) {
      // Starting from a specific node (e.g., from node occurrence selection)
      const occurrences: Array<{ pathIndex: number; nodePosition: number }> = [];
      paths.forEach((path, pathIndex) => {
        path.nodes.forEach((nId, nodePosition) => {
          if (nId === nodeId) {
            occurrences.push({ pathIndex, nodePosition });
          }
        });
      });

      const startsFromPath = occurrences.length === 1 ? occurrences[0].pathIndex : undefined;
      const startsFromNodePosition = occurrences.length === 1 ? occurrences[0].nodePosition : undefined;

      setActivePath({
        nodes: [nodeId],
        relations: [],
        optional: false,
        title: `Path ${paths.length + 1}`,
        color,
        startsFromPath,
        startsFromNodePosition,
      });
    } else {
      // Starting a new empty path - user will select first node
      setActivePath({
        nodes: [],
        relations: [],
        optional: false,
        title: `Path ${paths.length + 1}`,
        color,
      });
    }
  };

  // Helper function to convert a string to snake_case and clean it for use as a variable name
  const toSnakeCase = (str: string): string => {
    return (
      str
        .trim()
        // Replace spaces, hyphens, and other non-alphanumeric chars with underscores
        .replace(/[^a-zA-Z0-9]+/g, "_")
        // Insert underscore before uppercase letters (for camelCase)
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        // Convert to lowercase
        .toLowerCase()
        // Remove leading/trailing underscores
        .replace(/^_+|_+$/g, "")
        // Replace multiple consecutive underscores with single underscore
        .replace(/_+/g, "_")
        // Ensure it starts with a letter (prefix with 'col_' if it starts with a number)
        .replace(/^([0-9])/, "col_$1")
    );
  };

  const finishPath = () => {
    if (activePath && activePath.nodes.length > 0) {
      setPaths([...paths, activePath]);
      setNextColorIndex(nextColorIndex + 1);

      // Automatically add return columns for all metric nodes in the path
      const newReturnColumns: ReturnColumn[] = [];
      // Get unique node IDs from the path to avoid duplicate column generation
      const uniqueNodeIds = Array.from(new Set(activePath.nodes));

      uniqueNodeIds.forEach((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) {
          return;
        }

        // Prepare a clean alias base from the node label/identifier
        const rawLabel =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((node.data as any)?.label as string | undefined) ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((node.data as any)?.ageName as string | undefined) ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((node.data as any)?.identifier as string | undefined) ||
          node.id;
        const cleanedLabel = toSnakeCase(rawLabel);

        if (node.type === "entitycategory") {
          const hasIdColumn = returnColumns.some(
            (col) => col.nodeId === nodeId && col.property === "id",
          );

          if (!hasIdColumn) {
            newReturnColumns.push({
              nodeId,
              property: "id",
              alias: `${cleanedLabel}_id`,
              idfor: [nodeId],
            });
          }
        }
      });

      // Add the new return columns
      if (newReturnColumns.length > 0) {
        setReturnColumns([...returnColumns, ...newReturnColumns]);
      }

      setActivePath(null);
    }
  };

  const selectNodeOccurrence = (pathIndex: number, nodePosition: number) => {
    if (!nodeOccurrenceSelection) return;

    const color = PATH_COLORS[nextColorIndex % PATH_COLORS.length];
    setActivePath({
      nodes: [nodeOccurrenceSelection.nodeId],
      relations: [],
      optional: false,
      title: `Path ${paths.length + 1}`,
      color,
      startsFromPath: pathIndex,
      startsFromNodePosition: nodePosition,
    });

    setNodeOccurrenceSelection(null);
  };

  const clearAllPaths = () => {
    setPaths([]);
    setActivePath(null);
    setNextColorIndex(0);
    setExecutedGraphQuery(null);
    setReturnColumns([]);
    setWhereClauses([]);
  };

  // Delete a specific path
  const deletePath = (pathIndex: number) => {
    const updatedPaths = paths.filter((_, index) => index !== pathIndex);
    setPaths(updatedPaths);

    // Clean up WHERE clauses and return columns that reference deleted nodes
    cleanupOrphanedReferences(updatedPaths);
  };

  // Truncate a path from a specific node index (delete node and everything after it)
  const truncatePathFromNode = (pathIndex: number, nodeIndex: number) => {
    const updatedPaths = [...paths];
    const path = updatedPaths[pathIndex];

    if (!path || nodeIndex >= path.nodes.length) return;

    // Truncate nodes array from nodeIndex onwards
    path.nodes = path.nodes.slice(0, nodeIndex);

    // Truncate relations array (should have one less element than nodes)
    path.relations = path.relations.slice(0, Math.max(0, nodeIndex - 1));

    // Truncate relationDirections if it exists
    if (path.relationDirections) {
      path.relationDirections = path.relationDirections.slice(
        0,
        Math.max(0, nodeIndex - 1),
      );
    }

    // If path becomes empty, remove it entirely
    if (path.nodes.length === 0) {
      updatedPaths.splice(pathIndex, 1);
    }

    setPaths(updatedPaths);

    // Clean up WHERE clauses and return columns that reference deleted nodes
    cleanupOrphanedReferences(updatedPaths);
  };

  // Clean up WHERE clauses and return columns for nodes not in any path
  const cleanupOrphanedReferences = (currentPaths: Path[]) => {
    // Get all node IDs that exist in current paths
    const validNodeIds = new Set<string>();
    currentPaths.forEach((path) => {
      path.nodes.forEach((nodeId) => validNodeIds.add(nodeId));
    });

    // Filter WHERE clauses to only keep those referencing valid nodes
    setWhereClauses((prev) => prev.filter((wc) => validNodeIds.has(wc.nodeId)));

    // Filter return columns to only keep those referencing valid nodes
    setReturnColumns((prev) =>
      prev.filter((col) => validNodeIds.has(col.nodeId)),
    );
  };

  // Run the query
  const runQuery = async () => {
    if (!graphQueryInput) return;

    setIsRunning(true);
    try {
      if (graphQuery) {
        // Update existing graph query
        const result = await updateGraphQuery({
          variables: {
            input: {
              id: graphQuery.id,
              ...graphQueryInput,
            },
          },
        });

        if (result.data?.updateGraphTableQuery) {
          setExecutedGraphQuery(result.data.updateGraphTableQuery);
        }
      } else {
        // Create new graph query
        const result = await createGraphQuery({
          variables: {
            input: graphQueryInput,
          },
        });

        if (result.data?.createGraphTableQuery) {
          setExecutedGraphQuery(result.data.createGraphTableQuery);
        }
      }
    } catch (error) {
      console.error("Failed to run query:", error);
    } finally {
      setIsRunning(false);
    }
  };

  // Toggle WHERE clause editor for a specific node in a path
  const toggleWhereEditor = (pathIndex: number, nodeId: string) => {
    if (
      editingWhereNode?.pathIndex === pathIndex &&
      editingWhereNode?.nodeId === nodeId
    ) {
      setEditingWhereNode(null);
    } else {
      setEditingWhereNode({ pathIndex, nodeId });
    }
  };

  // Save WHERE conditions for a node
  const saveWhereConditions = (
    pathIndex: number,
    nodeId: string,
    conditions: WhereCondition[],
  ) => {
    const updatedPaths = [...paths];
    const path = updatedPaths[pathIndex];

    if (!path) return;

    // Initialize whereClauses if not present
    if (!path.whereClauses) {
      path.whereClauses = [];
    }

    // Remove existing WHERE clause for this node
    path.whereClauses = path.whereClauses.filter((wc) => wc.nodeId !== nodeId);

    // Add new WHERE clause if there are conditions
    if (conditions.length > 0) {
      path.whereClauses.push({ nodeId, conditions });
    }

    setPaths(updatedPaths);
    setEditingWhereNode(null); // Close inline editor
  };

  // Generate Cypher query from all completed paths
  const cypherQuery = useMemo(() => {
    if (paths.length === 0) {
      return "// No paths defined yet\n// Click nodes and relationships to build a path";
    }

    const enrichedPaths = paths.map((path) => enrichPath(path, nodes, edges));
    return generateUnifiedCypherQueryWithColumns(
      enrichedPaths,
      nodes,
      returnColumns,
      whereClauses,
      useDistinct,
    );
  }, [paths, nodes, edges, returnColumns, whereClauses, useDistinct]);

  // Generate GraphQueryInput
  const graphQueryInput = useMemo(() => {
    if (paths.length === 0) return null;

    const enrichedPaths = paths.map((path) => enrichPath(path, nodes, edges));
    return generateGraphQueryInput(
      enrichedPaths,
      nodes,
      returnColumns,
      graph.id,
      "Query Builder Result",
      "Generated from Query Builder",
      whereClauses,
    );
  }, [paths, nodes, edges, returnColumns, graph.id, whereClauses]);

  // WHERE clause management functions
  const setWhereClause = (nodeId: string, conditions: WhereCondition[]) => {
    setWhereClauses((prev) => {
      const filtered = prev.filter((wc) => wc.nodeId !== nodeId);
      if (conditions.length > 0) {
        return [...filtered, { nodeId, conditions }];
      }
      return filtered;
    });
  };

  const getWhereClause = (nodeId: string): NodeWhereClause | undefined => {
    return whereClauses.find((wc) => wc.nodeId === nodeId);
  };

  // Path-based WHERE clause management functions
  const setPathWhereConditions = (
    pathIndex: number,
    nodeId: string,
    conditions: WhereCondition[]
  ) => {
    setPaths((prevPaths) => {
      const updatedPaths = [...prevPaths];
      const path = updatedPaths[pathIndex];

      if (!path) return prevPaths;

      // Initialize whereClauses if not present
      if (!path.whereClauses) {
        path.whereClauses = [];
      }

      // Remove existing WHERE clause for this node
      path.whereClauses = path.whereClauses.filter((wc) => wc.nodeId !== nodeId);

      // Add new WHERE clause if there are conditions
      if (conditions.length > 0) {
        path.whereClauses.push({ nodeId, conditions });
      }

      return updatedPaths;
    });
  };

  const getPathWhereConditions = (pathIndex: number, nodeId: string): WhereCondition[] => {
    const path = paths[pathIndex];
    if (!path || !path.whereClauses) return [];

    const whereClause = path.whereClauses.find((wc) => wc.nodeId === nodeId);
    return whereClause?.conditions || [];
  };

  // Get node properties for WHERE clause editor
  const getNodeProperties = (nodeId: string): Array<{ name: string; type: "string" | "number" | "boolean" }> => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return NODE_PROPERTIES.default;

    // Determine node type from the node data
    const nodeType = node.type;

    // Map node types to property configurations
    if (nodeType === 'entitycategory') {
      return NODE_PROPERTIES.Entity;
    }

    return NODE_PROPERTIES.default;
  };

  // Return column management functions
  const addReturnColumn = (column: ReturnColumn) => {
    setReturnColumns((prev) => {
      // Check if column already exists
      const exists = prev.some(
        (c) => c.nodeId === column.nodeId && c.property === column.property,
      );
      if (exists) return prev;
      return [...prev, column];
    });
  };

  const removeReturnColumn = (nodeId: string, property: string) => {
    setReturnColumns((prev) =>
      prev.filter((c) => !(c.nodeId === nodeId && c.property === property)),
    );
  };

  const getNodeReturnColumns = (nodeId: string): ReturnColumn[] => {
    return returnColumns.filter((c) => c.nodeId === nodeId);
  };

  // Combine all paths (completed + active)
  const allPaths = activePath ? [...paths, activePath] : paths;

  return (
    <OntologyGraphProvider
      graph={graph}
      markedPaths={allPaths}
      possibleNodes={possibleNodes}
      possibleEdges={possibleEdges}
      addStagingEdge={() => { }}
      addStagingNode={() => { }}
      whereClauses={whereClauses}
      setWhereClause={setWhereClause}
      getWhereClause={getWhereClause}
      setPathWhereConditions={setPathWhereConditions}
      getPathWhereConditions={getPathWhereConditions}
      returnColumns={returnColumns}
      addReturnColumn={addReturnColumn}
      removeReturnColumn={removeReturnColumn}
      getNodeReturnColumns={getNodeReturnColumns}
      getNodeProperties={getNodeProperties}
    >
      <div className="relative h-[calc(100vh-12rem)]">
        {/* Full-width Graph Canvas */}
        <div
          ref={reactFlowWrapper}
          style={{ width: "100%", height: "100%" }}
          className="relative border rounded-lg"
        >
          <ReactFlow<MyNode, MyEdge>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={BUILDER_NODE_TYPES}
            edgeTypes={BUILDER_EDGE_TYPES}
            onInit={(r) => setReactFlowInstance(r)}
            fitView
            proOptions={{ hideAttribution: true }}
          />

          {/* Layout buttons overlay */}
          <div className="absolute top-0 left-0 p-3 gap-2 flex flex-row flex-wrap">
            <Button onClick={() => layout(stressLayout)} variant={"outline"} size="sm">
              Stress
            </Button>
            <Button onClick={() => layout(forceLayout)} variant={"outline"} size="sm">
              Force
            </Button>
            <Button onClick={() => layout(discoLayout)} variant={"outline"} size="sm">
              Disco
            </Button>
            <Button onClick={() => layout(treeLayout)} variant={"outline"} size="sm">
              Tree
            </Button>
            <Button onClick={() => layout(layeredLayout)} variant={"outline"} size="sm">
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
              size="sm"
            >
              Circle
            </Button>
          </div>

          {/* Left sidebar overlay - Query Builder Controls */}
          <div className="absolute top-3 left-3 w-80 max-h-[calc(100%-1.5rem)] flex flex-col gap-3 overflow-y-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-lg border shadow-lg p-4">
            {/* Path Controls */}
            <div className="flex flex-row gap-2">
              {!activePath && (
                <Button onClick={() => startNewPath()} variant={"default"} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  New Path
                </Button>
              )}
              {activePath && (
                <Button onClick={finishPath} variant={"default"} className="flex-1">
                  Finish Path
                </Button>
              )}
              {activePath && (
                <Button onClick={() => setActivePath(null)} variant={"outline"} className="flex-1">
                  Cancel
                </Button>
              )}
              {paths.length > 0 && !activePath && (
                <Button onClick={clearAllPaths} variant={"destructive"} className="flex-1">
                  Clear All
                </Button>
              )}
            </div>

            {/* Display Cypher Query - hide when building a path */}
            {paths.length > 0 && !activePath && <CypherQueryDisplay query={cypherQuery} />}

            {/* Display all completed paths - hide when building a new path */}
            {!activePath && paths.map((path, pathIndex) => {
              const pathWhereClauses = path.whereClauses || [];

              return (
                <div
                  key={pathIndex}
                  className="bg-card p-3 rounded border flex flex-col gap-2"
                  style={{ borderColor: path.color ? rgbToCSS(path.color) : undefined }}
                >
                  <div className="font-semibold flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: path.color ? rgbToCSS(path.color) : undefined }}
                      ></div>
                      {path.title || `Path ${pathIndex + 1}`}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => deletePath(pathIndex)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {path.nodes.length} node{path.nodes.length !== 1 ? "s" : ""},{" "}
                    {path.relations.length} relation
                    {path.relations.length !== 1 ? "s" : ""}
                  </div>

                  {/* Display nodes with WHERE buttons */}
                  <div className="flex flex-col gap-1 mt-2">
                    {path.nodes.map((nodeId, nodeIndex) => {
                      const node = nodes.find((n) => n.id === nodeId);
                      if (!node) return null;

                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const nodeData = node.data as any;
                      const nodeLabel =
                        nodeData?.ageName ||
                        nodeData?.label ||
                        nodeData?.identifier ||
                        nodeId;
                      const nodeWhereClause = pathWhereClauses.find(
                        (wc) => wc.nodeId === nodeId,
                      );
                      const hasFilters =
                        nodeWhereClause && nodeWhereClause.conditions.length > 0;

                      const isEditing =
                        editingWhereNode?.pathIndex === pathIndex &&
                        editingWhereNode?.nodeId === nodeId;

                      return (
                        <div key={`${nodeId}-${nodeIndex}`} className="space-y-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex-1 truncate">{nodeLabel}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant={hasFilters ? "default" : "outline"}
                                className="h-6 px-2 text-xs"
                                onClick={() =>
                                  toggleWhereEditor(pathIndex, nodeId)
                                }
                              >
                                <Filter className="h-3 w-3 mr-1" />
                                {hasFilters
                                  ? `${nodeWhereClause.conditions.length}`
                                  : "WHERE"}
                              </Button>
                              {/* Delete button - truncate path from this node onwards */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() =>
                                  truncatePathFromNode(pathIndex, nodeIndex)
                                }
                                title="Delete this node and everything after it"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Inline WHERE clause editor */}
                          {isEditing && (
                            <InlineWhereEditor
                              nodeId={nodeId}
                              nodeLabel={nodeLabel}
                              initialConditions={
                                nodeWhereClause?.conditions || []
                              }
                              onSave={(conditions) =>
                                saveWhereConditions(pathIndex, nodeId, conditions)
                              }
                              onCancel={() => setEditingWhereNode(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Action buttons - hide when building a path */}
            {paths.length > 0 && !activePath && (
              <>
                <div className="flex items-center space-x-2 p-2 bg-card rounded border">
                  <Checkbox
                    id="use-distinct"
                    checked={useDistinct}
                    onCheckedChange={(checked) =>
                      setUseDistinct(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="use-distinct"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Use DISTINCT in RETURN clause
                  </Label>
                </div>
                <div className="flex flex-row gap-2">
                  <Button
                    onClick={runQuery}
                    variant={"default"}
                    className="flex-1"
                    disabled={isRunning || !graphQueryInput}
                  >
                    {isRunning ? "Running..." : "Run Query"}
                  </Button>
                </div>
              </>
            )}

            {/* Display active path */}
            {activePath && activePath.nodes.length > 0 && (
              <div
                className="bg-card p-3 rounded border flex flex-col gap-2"
                style={{ borderColor: activePath.color ? rgbToCSS(activePath.color) : undefined }}
              >
                <div className="font-semibold flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: activePath.color ? rgbToCSS(activePath.color) : undefined }}
                  ></div>
                  {activePath.title || "Current Path"} (Building...)
                </div>
                <div className="text-sm">
                  {activePath.nodes.length} node
                  {activePath.nodes.length !== 1 ? "s" : ""},{" "}
                  {activePath.relations.length} relation
                  {activePath.relations.length !== 1 ? "s" : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {activePath.nodes.length === activePath.relations.length + 1
                    ? "Click on a highlighted relation to continue"
                    : activePath.nodes.length === activePath.relations.length
                      ? "Click on the highlighted node to continue"
                      : "Click on a node to start the path"}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar overlay - Query Results */}
          {executedGraphQuery && (
            <div className="absolute top-3 right-3 w-96 max-h-[calc(100%-1.5rem)] flex flex-col gap-3 overflow-y-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-lg border shadow-lg p-4">
              <div className="bg-card p-3 rounded border flex flex-col gap-2 border-green-500">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-green-600">
                    Query Results
                  </div>
                  <KraphGraphQuery.DetailLink object={{ id: executedGraphQuery.id }}>
                    <Button size="sm" variant="outline" className="h-7 gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </Button>
                  </KraphGraphQuery.DetailLink>
                </div>
                <div className="w-full overflow-auto" style={{ maxHeight: "600px" }}>
                  <RenderGraphQueryTable
                    graphQueryId={executedGraphQuery.id}
                    options={{ minimal: true }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return Column Builder Dialog */}
      {returnBuilderOpen &&
        (() => {
          // Get all unique nodes from all paths
          const allNodeIds = new Set<string>();
          paths.forEach((path) => {
            path.nodes.forEach((nodeId) => allNodeIds.add(nodeId));
          });
          const availableNodes = nodes.filter((n) => allNodeIds.has(n.id));

          return (
            <ReturnColumnBuilder
              nodes={availableNodes}
              existingColumns={returnColumns}
              isOpen={returnBuilderOpen}
              onClose={() => setReturnBuilderOpen(false)}
              onSave={(columns) => {
                setReturnColumns(columns);
                setReturnBuilderOpen(false);
              }}
            />
          );
        })()}

      {/* Node Occurrence Selection Dialog */}
      <Dialog
        open={nodeOccurrenceSelection !== null}
        onOpenChange={(open) => !open && setNodeOccurrenceSelection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Node Occurrence</DialogTitle>
            <DialogDescription>
              This node appears multiple times in existing paths. Select which
              occurrence you want to start the new path from to reuse its
              variable.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {nodeOccurrenceSelection?.occurrences.map((occ, index) => {
              const path = paths[occ.pathIndex];
              const node = nodes.find(
                (n) => n.id === nodeOccurrenceSelection.nodeId,
              );

              const nodeLabel = node
                ? (node.data as any)?.ageName ||
                (node.data as any)?.label ||
                (node.data as any)?.identifier ||
                nodeOccurrenceSelection.nodeId
                : nodeOccurrenceSelection.nodeId;

              return (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto p-3"
                  onClick={() =>
                    selectNodeOccurrence(occ.pathIndex, occ.nodePosition)
                  }
                >
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: path.color ? rgbToCSS(path.color) : undefined }}
                      ></div>
                      <span className="font-semibold">
                        {path.title || `Path ${occ.pathIndex + 1}`}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Position {occ.nodePosition + 1} of {path.nodes.length} -{" "}
                      {nodeLabel}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </OntologyGraphProvider>
  );
};

export default QueryBuilderGraph; // --- IGNORE ---
