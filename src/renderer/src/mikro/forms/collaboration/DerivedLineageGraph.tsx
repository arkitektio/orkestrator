import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { cn } from "@/core/util/utils";
import {
  Background,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Check } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import type { LineageNodeKind } from "../../api/graphql";
import { DATA_NODE_SIZE, fallbackPositions, HEADER_CENTRE, layoutLineage } from "../../components/lineage/layout";
import { KIND_LABEL } from "../../components/lineage/lineageGraph";
import { KIND_ICON } from "../../components/lineage/LineageNodes";
import { parseNodeKey } from "../addLayer/derived";
import { flatten, LINEAGE_IDENTIFIER, type DerivedForest, type DerivedNode } from "./derivedSelection";

const HIDDEN_HANDLE = "!h-0 !w-0 !min-h-0 !min-w-0 !border-0 !bg-transparent";

type PickNodeData = {
  kind: `${LineageNodeKind}`;
  id: string;
  /** Unknown for a root: the walk names only what it found. */
  name?: string;
  /** One of the objects being put in: always goes, not clickable. */
  root: boolean;
  picked: boolean;
};

type PickNodeType = Node<PickNodeData, "pick">;

const PickNode = memo(({ data }: NodeProps<PickNodeType>) => {
  const Icon = KIND_ICON[data.kind as LineageNodeKind];
  const label = KIND_LABEL[data.kind as LineageNodeKind];
  const on = data.root || data.picked;
  return (
    <div
      className={cn(
        "flex h-full w-full items-center gap-2 rounded-md border px-2 text-xs transition-colors",
        data.root
          ? "border-primary bg-primary text-primary-foreground"
          : on
            ? "cursor-pointer border-primary bg-primary/10 hover:bg-primary/20"
            : "cursor-pointer border-dashed bg-background text-muted-foreground hover:border-primary/60",
      )}
      title={data.root ? "Being put in" : on ? "Goes in: click to leave it out" : "Left out: click to put it in"}
    >
      <Handle type="target" position={Position.Left} style={{ top: HEADER_CENTRE }} className={HIDDEN_HANDLE} isConnectable={false} />
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {data.name ?? (
            <StructureDisplay
              identifier={LINEAGE_IDENTIFIER[data.kind]}
              id={data.id}
              variant="inline"
              fallback={`${label} ${data.id}`}
            />
          )}
        </span>
        <span className={cn("truncate text-[0.625rem]", data.root ? "opacity-80" : "text-muted-foreground")}>
          {data.root ? `${label} · being put in` : label}
        </span>
      </div>
      {!data.root && (
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
            on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
          )}
        >
          {on && <Check className="h-3 w-3" />}
        </span>
      )}
      <Handle type="source" position={Position.Right} style={{ top: HEADER_CENTRE }} className={HIDDEN_HANDLE} isConnectable={false} />
    </div>
  );
});

const nodeTypes = { pick: PickNode };

// `currentColor`, resolved against each edge's own text colour (see LineageFlow).
const marker = { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "currentColor" };

type Positions = Map<string, { x: number; y: number }>;

/**
 * What was derived from the objects being put in, as their lineage: the
 * objects on the left, what came of them to the right. A node that goes in is
 * solid and ticked; one left out is dashed. Click a node to flip it,
 * shift-click to flip it and everything below it.
 */
export const DerivedLineageGraph = ({
  forest,
  isOn,
  onToggle,
}: {
  forest: DerivedForest;
  isOn: (node: DerivedNode) => boolean;
  onToggle: (node: DerivedNode, subtree: boolean) => void;
}) => {
  const derived = useMemo(() => flatten(forest.trees), [forest]);
  const byKey = useMemo(() => new Map(derived.map((node) => [node.key, node])), [derived]);
  const [positions, setPositions] = useState<Positions | null>(null);
  const [instance, setInstance] = useState<ReactFlowInstance<PickNodeType, Edge> | null>(null);

  // Laid out again only when what the walk found changes, never on a click.
  useEffect(() => {
    let cancelled = false;
    const nodes = [
      ...forest.roots.map((key) => ({ id: key, type: "data" as const, depth: 0 })),
      ...derived.map((node) => ({ id: node.key, type: "data" as const, depth: node.depth })),
    ];
    const edges = derived.map((node) => ({ id: `${node.parent}->${node.key}`, source: node.parent, target: node.key }));
    layoutLineage(nodes, edges)
      .catch((error) => {
        console.warn("[Collaboration] lineage layout failed; placing nodes in columns", error);
        return fallbackPositions(nodes);
      })
      .then((placed) => !cancelled && setPositions(placed));
    return () => {
      cancelled = true;
    };
  }, [forest, derived]);

  useEffect(() => {
    if (positions && instance) requestAnimationFrame(() => instance.fitView({ padding: 0.15, maxZoom: 1 }));
  }, [positions, instance]);

  const nodes = useMemo((): PickNodeType[] => {
    if (!positions) return [];
    const at = (key: string) => positions.get(key) ?? { x: 0, y: 0 };
    const roots = forest.roots.flatMap((key): PickNodeType[] => {
      const parsed = parseNodeKey(key);
      return parsed
        ? [{ id: key, type: "pick", position: at(key), ...DATA_NODE_SIZE, selectable: false, draggable: false, data: { ...parsed, root: true, picked: true } }]
        : [];
    });
    return [
      ...roots,
      ...derived.map((node): PickNodeType => ({
        id: node.key,
        type: "pick",
        position: at(node.key),
        ...DATA_NODE_SIZE,
        selectable: false,
        draggable: false,
        data: { kind: node.kind, id: node.id, name: node.name, root: false, picked: isOn(node) },
      })),
    ];
  }, [positions, forest.roots, derived, isOn]);

  const edges = useMemo(
    (): Edge[] =>
      derived.map((node) => {
        const on = isOn(node);
        return {
          id: `${node.parent}->${node.key}`,
          source: node.parent,
          target: node.key,
          markerEnd: marker,
          className: on ? "text-primary" : "text-muted-foreground/50",
          style: { stroke: "currentColor", strokeDasharray: on ? undefined : "4 4" },
        };
      }),
    [derived, isOn],
  );

  return (
    <div className="h-80 w-full overflow-hidden rounded-md border bg-muted/20">
      {positions ? (
        <ReactFlow<PickNodeType, Edge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={setInstance}
          onNodeClick={(event, node) => {
            const derivedNode = byKey.get(node.id);
            if (derivedNode) onToggle(derivedNode, event.shiftKey);
          }}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
        >
          <Background />
        </ReactFlow>
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Laying out…</div>
      )}
    </div>
  );
};
