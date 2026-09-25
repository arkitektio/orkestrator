import { GetCoordinateGraphQuery, PlacementValidity } from "@/mikro/api/graphql";
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  PanelPosition,
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import React from "react";
import CoordinateSystemNode, {
  OCCUPANCY_LABEL,
  OCCUPANCY_SWATCH,
  Occupancy,
} from "./CoordinateSystemNode";
import { facingHandles, sourceHandleId, targetHandleId } from "./handles";
import { layoutOptionsFor } from "./layout";
import { NODE_DIAMETER, NODE_SIZE } from "./nodeSize";
import ResidentNode, { RESIDENT_SWATCH } from "./ResidentNode";
import { describeTransformation, GraphEdge, GraphNode } from "./types";

export type CoordinateGraph = GetCoordinateGraphQuery["coordinateGraph"];

const nodeTypes = {
  coordinateSystem: CoordinateSystemNode,
  resident: ResidentNode,
};

// One engine, module-scoped — the same thing the kraph path graph has always
// done. `new ELK()` per effect meant every mounted graph on a page (a dataset
// page shows several) built its own, and they all contended for the one thread
// they share. Constructed once, reused, and it serialises its own work.
const elk = new ELK();

// `currentColor`, not `hsl(var(--muted-foreground))`: this app's design tokens
// are Tailwind v4 oklch() values, so wrapping one in hsl() yields an invalid
// color — the stroke is ignored and the arrow marker (an SVG <marker> with an
// invalid fill) renders nothing at all.
const marker = {
  type: MarkerType.ArrowClosed,
  width: 16,
  height: 16,
  color: "currentColor",
};

const transformationStyle = { stroke: "currentColor", strokeWidth: 1.5 };

// An identity is the one edge that says the two spaces ARE the same space under
// two names — nothing moves across it, and a chain that crosses it has not
// really gone anywhere. That deserves to be readable from across the graph
// rather than by reading a label, so it is the only coloured, heavy line in a
// picture of thin grey ones. `--chart-4` directly: the design tokens are
// complete `oklch()` values, so they can be handed to `stroke` as they are (the
// same reason `hsl(var(--…))` is wrong here).
const IDENTITY_COLOR = "var(--chart-4)";

const identityStyle = { stroke: IDENTITY_COLOR, strokeWidth: 3 };

// The arrowhead cannot inherit the line: React Flow hoists each distinct marker
// spec into one shared `<defs>` entry, so `currentColor` inside it resolves
// against the SVG wrapper's colour, not against the edge that references it. An
// identity edge therefore carries its own marker, with the colour spelled out.
const identityMarker = { ...marker, color: IDENTITY_COLOR };

// An assumed map must be visible without reading the label — the schema is
// emphatic about it — and an unmappable one is not a step the geometry can
// travel through at all. Composed onto whatever the edge already is rather than
// replacing it: validity is about whether the map HOLDS, identity is about what
// the map IS, and an assumed identity is both at once.
const DOUBTED = { strokeDasharray: "5 4" };

// Residency is not a map. It is drawn as the faintest possible tie so the eye
// reads the transformation chain first and "who lives here" second.
const residencyStyle = {
  stroke: "currentColor",
  strokeWidth: 1,
  strokeDasharray: "2 3",
  opacity: 0.5,
};

const residentNodeId = (systemId: string, resident: { __typename: string; id: string }) =>
  `r-${systemId}-${resident.__typename}-${resident.id}`;

/**
 * Coordinate systems and their residents are the nodes; the transformations
 * between systems are the edges, labelled with what the map actually does and
 * drawn in their true stored direction (input → output). An edge whose input or
 * output falls outside the returned component is dropped rather than drawn
 * dangling — which is a live case now that CoordinateGraphView bounds the walk
 * (DEFAULT_MAX_DEPTH). While the walk was unbounded it returned whole connected
 * components, so nothing could fall outside one and `dropped` was always 0.
 */
const buildGraph = (
  graph: CoordinateGraph,
): { nodes: GraphNode[]; edges: GraphEdge[]; dropped: number } => {
  const known = new Set(graph.systems.map((system) => system.id));
  let dropped = 0;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const system of graph.systems) {
    nodes.push({
      id: system.id,
      type: "coordinateSystem" as const,
      position: { x: 0, y: 0 },
      data: { system, isRoot: system.id === graph.root.id },
    });

    // Who lives in this space, as its own node hanging off it. A resident can
    // only live in one system, so the id is per (system, resident) and never
    // collides.
    for (const resident of system.residents) {
      const id = residentNodeId(system.id, resident);
      nodes.push({
        id,
        type: "resident" as const,
        position: { x: 0, y: 0 },
        data: { resident, systemId: system.id },
      });
      edges.push({
        id: `lives-in-${id}`,
        source: system.id,
        target: id,
        // Straight: residency is a tie, not a route.
        type: "straight" as const,
        style: residencyStyle,
      });
    }
  }

  for (const transformation of graph.transformations) {
    const input = transformation.input;
    const output = transformation.output;
    // Not silent: a transformation with an endpoint missing from the walk
    // cannot be drawn, and a graph that quietly renders fewer edges than the
    // server returned is worse than one that says so.
    if (!input || !output || !known.has(input.id) || !known.has(output.id)) {
      dropped++;
      continue;
    }

    const unmappable = transformation.__typename === "UnmappableTransformation";
    const assumed = transformation.validity === PlacementValidity.Unknown;
    const identity = transformation.__typename === "IdentityTransformation";
    const base = identity ? identityStyle : transformationStyle;

    edges.push({
      id: transformation.id,
      source: input.id,
      target: output.id,
      // Bezier, not smoothstep: right angles read as a routed pipeline, and
      // nothing about where these spaces landed is orthogonal any more.
      type: "default" as const,
      // React Flow draws the label on the line itself, which is all a
      // transformation needs to say from across the graph. The rest — axes,
      // validity, a composite's children — is the edge table's job.
      // The one label that is not just what the map does: `≡` says "the same
      // space" in one glyph, and an identity has no numbers to show anyway.
      label: identity ? "≡ identity" : describeTransformation(transformation),
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      // Fully opaque, like the nodes: a chip you can see the line through is a
      // chip with a stroke drawn across its text.
      labelBgStyle: { fill: "var(--background)", fillOpacity: 1 },
      // `fill` explicitly, paired with the chip's `--background`. React Flow's
      // default for the label is `fill: inherit`, and nothing up the SVG chain
      // sets one — so it lands on SVG's initial black, which is invisible on a
      // dark chip. `currentColor` would not fix it either: that resolves to the
      // wrapper's muted-foreground, which is chosen to contrast with the PAGE,
      // and this text sits on the chip.
      labelStyle: identity
        ? { fontSize: 10, fill: IDENTITY_COLOR, fontWeight: 700 }
        : { fontSize: 10, fill: "var(--foreground)" },
      style: unmappable || assumed ? { ...base, ...DOUBTED } : base,
      markerEnd: unmappable ? undefined : identity ? identityMarker : marker,
    });
  }

  return { nodes, edges, dropped };
};

const Legend = ({
  systems,
  residents,
  transformations,
  dropped,
}: {
  systems: number;
  residents: number;
  transformations: number;
  dropped: number;
}) => (
  <div className="flex max-w-[440px] flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-foreground backdrop-blur">
    {/* Each swatch is its node in miniature — the ring for a space, the small
        solid disc for a resident — so the key teaches the same shape language
        the canvas uses rather than a parallel one made of dots. */}
    {(Object.keys(OCCUPANCY_SWATCH) as Occupancy[]).map((occupancy) => (
      <span key={occupancy} className="flex items-center gap-1">
        <span className={OCCUPANCY_SWATCH[occupancy]} />
        {OCCUPANCY_LABEL[occupancy]}
      </span>
    ))}
    <span className="flex items-center gap-1">
      <span className={RESIDENT_SWATCH} />
      resident
    </span>
    <span className="flex items-center gap-1">
      <span
        className="h-0 w-4 border-t-[3px]"
        style={{ borderColor: IDENTITY_COLOR }}
      />
      identity — the same space
    </span>
    <span className="flex items-center gap-1">
      <span className="h-0 w-4 border-t-2 border-dashed border-muted-foreground/60" />
      assumed or unmappable
    </span>
    <span className="w-full border-t pt-1 font-mono text-muted-foreground">
      {systems} systems · {residents} residents · {transformations}{" "}
      transformations
      {dropped > 0 && (
        <span className="text-amber-500">
          {" "}
          · {dropped} not drawn (endpoint outside the walk)
        </span>
      )}
    </span>
  </div>
);

export const CoordinateGraphFlow = ({
  graph,
  legendPosition = "top-left",
}: {
  graph: CoordinateGraph;
  /**
   * Where the legend parks. A page that puts its own title over the canvas owns
   * that corner, and the flow cannot know — so the caller says. Default is the
   * corner it has always used, for the sidebar tabs that overlay nothing.
   */
  legendPosition?: PanelPosition;
}) => {
  const [instance, setInstance] =
    React.useState<ReactFlowInstance<GraphNode, GraphEdge> | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GraphEdge>([]);
  const [dropped, setDropped] = React.useState(0);
  const [laidOut, setLaidOut] = React.useState(false);

  React.useEffect(() => {
    const { nodes: rawNodes, edges: rawEdges, dropped } = buildGraph(graph);
    let cancelled = false;

    // Nothing is painted until ELK answers. The previous version put the nodes
    // in FIRST so that a rejected layout would still show the graph — but every
    // node starts at {x:0,y:0}, so what that actually rendered was the whole
    // graph in one stack at the origin, held there for as long as the layout
    // took. The failure it was guarding against is handled in `catch` instead,
    // where it costs nothing on the path that works.
    setDropped(dropped);
    setLaidOut(false);

    elk
      .layout({
        id: "root",
        // Chosen by size: the stress layout tells the truth about a web of
        // registrations but stalls the thread superlinearly, so it is used
        // only while that stall is affordable. See layout.ts.
        layoutOptions: layoutOptionsFor(rawNodes.length),
        // One size for everything — see nodeSize.ts. Stress ignores these
        // outright (the uniform footprint is what compensates); mrtree honours
        // them.
        children: rawNodes.map((node) => ({ id: node.id, ...NODE_SIZE })),
        edges: rawEdges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      })
      .then(({ children }) => {
        if (cancelled) return;

        const at = new Map((children ?? []).map((child) => [child.id, child]));
        const positions = new Map(
          rawNodes.map((node) => [
            node.id,
            { x: at.get(node.id)?.x ?? 0, y: at.get(node.id)?.y ?? 0 },
          ]),
        );

        setNodes(
          rawNodes.map((node) => ({
            ...node,
            position: positions.get(node.id)!,
          })),
        );

        // Which side each edge attaches to is only knowable once everything has
        // settled. Same size for every node, so the centre is the position plus
        // one radius. This is O(edges) bookkeeping over ELK's answer, not a
        // layout of its own — the placement is entirely ELK's.
        const centre = (id: string) => {
          const position = positions.get(id)!;
          return {
            x: position.x + NODE_DIAMETER / 2,
            y: position.y + NODE_DIAMETER / 2,
          };
        };

        setEdges(
          rawEdges.map((edge) => {
            const from = centre(edge.source);
            const to = centre(edge.target);
            const sides = facingHandles(to.x - from.x, to.y - from.y);
            return {
              ...edge,
              sourceHandle: sourceHandleId(sides.source),
              targetHandle: targetHandleId(sides.target),
            };
          }),
        );

        setLaidOut(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[CoordinateGraph] ELK layout failed", error);
        // A failed layout should read as "these are the nodes, badly placed",
        // not as an empty canvas that never resolves.
        setNodes(rawNodes);
        setEdges(rawEdges);
        setLaidOut(true);
      });

    return () => {
      cancelled = true;
    };
    // NOT `instance`: including it re-ran the entire layout a second time the
    // moment React Flow mounted, doubling the cost of the thing that was
    // already too slow. Fitting the view is a separate concern, below.
  }, [graph]);

  React.useEffect(() => {
    if (laidOut) instance?.fitView({ padding: 0.2 });
  }, [laidOut, nodes, instance]);

  const residents = React.useMemo(
    () =>
      graph.systems.reduce((sum, system) => sum + system.residents.length, 0),
    [graph],
  );

  return (
    // `text-muted-foreground` on the wrapper is load-bearing: the edges stroke
    // with `currentColor`, so this is what colours them.
    <div
      style={{ width: "100%", height: "100%" }}
      className="relative text-muted-foreground"
    >
      <ReactFlow<GraphNode, GraphEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={(reactFlow) => setInstance(reactFlow)}
        defaultEdgeOptions={{ type: "default" }}
        nodesConnectable={false}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        {/* The canvas is genuinely empty until ELK answers, and an empty canvas
            and an empty graph look identical. Says which one this is. */}
        {!laidOut && (
          <Panel position="top-center">
            <span className="rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
              Laying out {graph.systems.length} systems…
            </span>
          </Panel>
        )}
        <Controls showInteractive={false} />
        <Panel position={legendPosition}>
          <Legend
            systems={graph.systems.length}
            residents={residents}
            transformations={graph.transformations.length}
            dropped={dropped}
          />
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default CoordinateGraphFlow;
