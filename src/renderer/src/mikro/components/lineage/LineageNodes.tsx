import {
  lensSmart,
  MikroArrayDataset,
  MikroFile,
  MikroMeshCollection,
  MikroSparseDataset,
  MikroTableDataset,
} from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import { LineageNodeKind } from "@/mikro/api/graphql";
import { dtypeBytes, formatBytes } from "@/mikro/specs";
import {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  Handle,
  Node,
  NodeProps,
  Position,
} from "@xyflow/react";
import {
  Aperture,
  Box,
  Cog,
  FileText,
  Grid3x3,
  Loader2,
  LucideIcon,
  Network,
  PenTool,
  Plus,
  Shapes,
  Table2,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import { ArraySchematic } from "../array/ArraySchematic";
import { chunkCount, SchematicAxis, sliceIntervals } from "../array/schematicGeometry";
import {
  DATA_NODE_SIZE,
  dataNodeHeight,
  HEADER_CENTRE,
  LENS_ROW_HEIGHT,
  LENS_ROWS_PADDING,
  SCHEMATIC_CAPTION_HEIGHT,
  SCHEMATIC_DRAWING_HEIGHT,
  SCHEMATIC_HEIGHT,
  TASK_NODE_SIZE,
} from "./layout";
import { Direction, KIND_LABEL, LENS_TYPENAME, lensHandle, LineageNodeData, OUT_HANDLE } from "./lineageGraph";

export const KIND_ICON: Record<LineageNodeKind, LucideIcon> = {
  [LineageNodeKind.Dataset]: Box,
  [LineageNodeKind.File]: FileText,
  [LineageNodeKind.TableDataset]: Table2,
  [LineageNodeKind.SparseDataset]: Grid3x3,
  [LineageNodeKind.MeshCollection]: Shapes,
  [LineageNodeKind.NetworkCollection]: Network,
  [LineageNodeKind.AnnotationCollection]: PenTool,
  [LineageNodeKind.Fixture]: Box,
};

/**
 * The smart object behind a node kind: right-click menu, drag and selection
 * for free. A network or annotation collection has none, and is a plain tile.
 */
export const SMART_BY_KIND: Partial<Record<LineageNodeKind, typeof MikroArrayDataset>> = {
  [LineageNodeKind.Dataset]: MikroArrayDataset,
  [LineageNodeKind.File]: MikroFile,
  [LineageNodeKind.TableDataset]: MikroTableDataset,
  [LineageNodeKind.SparseDataset]: MikroSparseDataset,
  [LineageNodeKind.MeshCollection]: MikroMeshCollection,
};

export type DataNodeType = Node<
  {
    node: LineageNodeData;
    isRoot: boolean;
    selected: boolean;
    expanding: Direction | null;
    onExpand: (key: string, direction: Direction) => void;
  },
  "data"
>;

export type TaskNodeType = Node<
  { taskId: string; inputs: number; outputs: number; selected: boolean },
  "task"
>;

export type LineageEdgeType = Edge<{ label?: string; unmappable: boolean }, "lineage">;

// Zero-size and invisible: the line ends on the tile's edge, and there is
// nothing to grab — nothing here is connectable.
const HIDDEN_HANDLE = "!h-0 !w-0 !min-h-0 !min-w-0 !border-0 !bg-transparent";

const ExpandButton = ({
  side,
  busy,
  onClick,
}: {
  side: "left" | "right";
  busy: boolean;
  onClick: () => void;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        style={{ top: HEADER_CENTRE }}
        aria-label={side === "left" ? "Show what this was made from" : "Show what was made from this"}
        onClick={(event) => {
          event.stopPropagation();
          if (!busy) onClick();
        }}
        className={cn(
          // `nodrag nopan`: a click here is a click, not the start of a pan.
          "nodrag nopan pointer-events-auto absolute z-20 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
          side === "left" ? "-left-2.5" : "-right-2.5",
        )}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
      </button>
    </TooltipTrigger>
    <TooltipContent className="border bg-popover text-popover-foreground">
      {side === "left" ? "Show what this was made from" : "Show what was made from this"}
    </TooltipContent>
  </Tooltip>
);

const formatDate = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
};

/** An array dataset's axes as its schematic draws them; undefined where a size is unknown (or it is no array). */
export const schematicAxesOf = (node: LineageNodeData): SchematicAxis[] | undefined =>
  node.axes.length > 0 && node.axes.every((axis) => axis.size != null)
    ? node.axes.map((axis) => ({ name: axis.name, size: axis.size!, chunk: axis.chunk }))
    : undefined;

/** The band between header and lenses: the schematic, for an array dataset whose shape is known. */
export const bandOf = (node: LineageNodeData) => (schematicAxesOf(node) ? SCHEMATIC_HEIGHT : 0);

/** How tall a data node draws, for React Flow and ELK alike. */
export const heightOf = (node: LineageNodeData) =>
  dataNodeHeight(node.lenses.length, node.lensCount > node.lenses.length, bandOf(node));

const product = (values: readonly number[]) => values.reduce((total, value) => total * value, 1);

/**
 * What dask's table beside the picture says, in one line: dtype, bytes,
 * chunk count, levels. The per-axis table is behind a hover.
 */
const SchematicFacts = ({ node, axes }: { node: LineageNodeData; axes: SchematicAxis[] }) => {
  const width = dtypeBytes(node.dtype);
  const bytes = width === undefined ? undefined : product(axes.map((axis) => axis.size)) * width;
  const chunks = chunkCount(axes);
  const facts = [
    node.dtype,
    bytes === undefined ? undefined : formatBytes(bytes),
    chunks === undefined ? undefined : `${chunks} ${chunks === 1 ? "chunk" : "chunks"}`,
    node.levels > 1 ? `${node.levels} levels` : undefined,
  ].filter(Boolean);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex items-center justify-center truncate px-3 font-mono text-[10px] text-muted-foreground"
          style={{ height: SCHEMATIC_CAPTION_HEIGHT }}
        >
          {facts.join(" · ") || axes.map((axis) => axis.size).join(" × ")}
        </div>
      </TooltipTrigger>
      <TooltipContent className="border bg-popover text-popover-foreground">
        <table className="font-mono text-[11px]">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pr-3 text-left font-normal">Axis</th>
              <th className="pr-3 text-right font-normal">Size</th>
              <th className="text-right font-normal">Chunk</th>
            </tr>
          </thead>
          <tbody>
            {node.axes.map((axis) => (
              <tr key={axis.name}>
                <td className="pr-3">
                  {axis.name} <span className="text-muted-foreground">{axis.type.toLowerCase()}</span>
                </td>
                <td className="pr-3 text-right">{axis.size ?? "?"}</td>
                <td className="text-right">{axis.chunk ?? "?"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * One container or file: a header, then every lens as a row. A lens is the
 * port its data is used through, so each row is its own handle and every edge
 * computed from that lens leaves from that row; and each row is the lens'
 * structure, so right-clicking it offers what can run on that lens.
 *
 * A "+" on either side of the header when the walk left something out that
 * way; it steps one hop further from here.
 */
export const DataNode = memo(({ data }: NodeProps<DataNodeType>) => {
  const { node, isRoot, selected, expanding, onExpand } = data;
  const Icon = KIND_ICON[node.kind];
  const SmartObject = SMART_BY_KIND[node.kind];
  const LensSmart = lensSmart(LENS_TYPENAME[node.kind]);
  const hidden = node.lensCount - node.lenses.length;
  const axes = useMemo(() => schematicAxesOf(node), [node]);
  // The lens under the pointer, drawn inside the array it selects from.
  const [hovered, setHovered] = useState<string | null>(null);
  const highlight = useMemo(() => {
    const lens = hovered ? node.lenses.find((candidate) => candidate.id === hovered) : undefined;
    // The whole lens is the whole array: filling all of it would only hide the chunk grid.
    return axes && lens && !lens.whole ? sliceIntervals(axes, lens.slices) : undefined;
  }, [axes, hovered, node.lenses]);

  const header = (
    <div className="flex items-center gap-2 px-3" style={{ height: DATA_NODE_SIZE.height }}>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{node.name || "Unnamed"}</span>
        <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
          {[KIND_LABEL[node.kind], formatDate(node.createdAt)].filter(Boolean).join(" · ")}
        </span>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "relative rounded-md border bg-card text-card-foreground shadow-sm",
        isRoot && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        selected && "border-primary",
      )}
      style={{ width: DATA_NODE_SIZE.width, height: heightOf(node) }}
    >
      <Handle type="target" position={Position.Left} style={{ top: HEADER_CENTRE }} className={HIDDEN_HANDLE} isConnectable={false} />
      {/* A file has no lens: its edges leave from the tile. */}
      <Handle id={OUT_HANDLE} type="source" position={Position.Right} style={{ top: HEADER_CENTRE }} className={HIDDEN_HANDLE} isConnectable={false} />

      {SmartObject ? <SmartObject.Smart object={{ id: node.id }}>{header}</SmartObject.Smart> : header}

      {axes && (
        <div className="border-t" style={{ height: SCHEMATIC_HEIGHT }}>
          {/* Inside the tile's 1px border. */}
          <ArraySchematic axes={axes} width={DATA_NODE_SIZE.width - 2} height={SCHEMATIC_DRAWING_HEIGHT} highlight={highlight} />
          <SchematicFacts node={node} axes={axes} />
        </div>
      )}

      {node.lenses.length > 0 && (
        <div className="flex flex-col rounded-b-md bg-muted/30" style={{ paddingBottom: LENS_ROWS_PADDING }}>
          {node.lenses.map((lens) => (
            <div
              key={lens.id}
              className="relative"
              style={{ height: LENS_ROW_HEIGHT }}
              onMouseEnter={() => setHovered(lens.id)}
              onMouseLeave={() => setHovered((current) => (current === lens.id ? null : current))}
            >
              <LensSmart.Smart object={{ id: lens.id }} className="h-full">
                <div className="flex h-full items-center gap-2 px-3 text-xs hover:bg-accent/50">
                  <Aperture className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className={cn("min-w-0 flex-1 truncate", lens.whole && "font-medium")}>{lens.label}</span>
                  {lens.shape && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{lens.shape.join("×")}</span>
                  )}
                </div>
              </LensSmart.Smart>
              <Handle
                id={lensHandle(lens.id)}
                type="source"
                position={Position.Right}
                // Centred on its row (React Flow's default `top: 50%`, of the row):
                // the same y `lensRowCentre` gives ELK for this port.
                className="!right-0 !h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-muted-foreground/60"
                isConnectable={false}
              />
            </div>
          ))}
          {hidden > 0 && (
            <div className="flex items-center px-3 text-[10px] text-muted-foreground" style={{ height: LENS_ROW_HEIGHT }}>
              +{hidden} more {hidden === 1 ? "lens" : "lenses"}
            </div>
          )}
        </div>
      )}

      {node.hasMoreUp && (
        <ExpandButton side="left" busy={expanding === "up"} onClick={() => onExpand(node.key, "up")} />
      )}
      {node.hasMoreDown && (
        <ExpandButton side="right" busy={expanding === "down"} onClick={() => onExpand(node.key, "down")} />
      )}
    </div>
  );
});

/**
 * The task that made something: what ran, where it stands and on which agent,
 * shown by rekuest through the host's display slot. Without rekuest it is a
 * plain "Task".
 */
export const TaskNode = memo(({ data }: NodeProps<TaskNodeType>) => (
  <div
    style={TASK_NODE_SIZE}
    className={cn(
      "flex items-center gap-2 overflow-hidden rounded-full border border-dashed bg-muted/60 px-3 text-xs",
      data.selected && "border-solid border-primary",
    )}
  >
    <Handle type="target" position={Position.Left} className={HIDDEN_HANDLE} isConnectable={false} />
    <Cog className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
      <StructureDisplay
        identifier="@rekuest/task"
        id={data.taskId}
        variant="inline"
        small
        fallback={<span className="text-muted-foreground">Task</span>}
      />
    </div>
    <Handle type="source" position={Position.Right} className={HIDDEN_HANDLE} isConnectable={false} />
  </div>
));

/**
 * Parent to child. Dashed where no geometry survived the step (UNMAPPABLE):
 * the data came from there, but cannot be placed through it.
 */
export const LineageEdge = memo(
  ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }: EdgeProps<LineageEdgeType>) => {
    const [path, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    return (
      <>
        <BaseEdge
          id={id}
          path={path}
          markerEnd={markerEnd}
          style={{
            stroke: "currentColor",
            strokeWidth: 1.5,
            strokeDasharray: data?.unmappable ? "5 4" : undefined,
          }}
        />
        {data?.label && (
          <EdgeLabelRenderer>
            <div
              style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
              className="pointer-events-none absolute rounded bg-background px-1 text-[10px] text-muted-foreground"
            >
              {data.label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  },
);

export const nodeTypes = { data: DataNode, task: TaskNode };
export const edgeTypes = { lineage: LineageEdge };

export type FlowNodeType = DataNodeType | TaskNodeType;
