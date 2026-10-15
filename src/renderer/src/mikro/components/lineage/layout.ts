import ELKWorker from "elkjs/lib/elk-api.js";
import ELK from "elkjs/lib/elk.bundled.js";
import elkWorkerUrl from "elkjs/lib/elk-worker.min.js?url";

/**
 * Fixed sizes, so React Flow draws every node and edge without measuring
 * anything and ELK gets the same boxes the nodes paint.
 */
export const DATA_NODE_SIZE = { width: 232, height: 52 } as const;
export const TASK_NODE_SIZE = { width: 208, height: 36 } as const;

/**
 * A data tile is its header (`DATA_NODE_SIZE.height`), then a `band` (an
 * array dataset's schematic, `SCHEMATIC_HEIGHT`; nothing for any other kind),
 * then one row per lens, each row a port. A "+N more" row closes a tile that
 * lists fewer lenses than it has.
 */
export const LENS_ROW_HEIGHT = 24;
export const LENS_ROWS_PADDING = 6;

/** The array schematic under an array dataset's header: the drawing, then one line of facts. */
export const SCHEMATIC_DRAWING_HEIGHT = 92;
export const SCHEMATIC_CAPTION_HEIGHT = 18;
export const SCHEMATIC_HEIGHT = SCHEMATIC_DRAWING_HEIGHT + SCHEMATIC_CAPTION_HEIGHT;

export const dataNodeHeight = (rows: number, more: boolean, band = 0) =>
  DATA_NODE_SIZE.height + band + (rows + (more ? 1 : 0)) * LENS_ROW_HEIGHT + (rows > 0 ? LENS_ROWS_PADDING : 0);

/** The vertical centre of a tile's header: where its own in- and out-handle sit. */
export const HEADER_CENTRE = DATA_NODE_SIZE.height / 2;

/** The vertical centre of lens row `index`, measured from the tile's top, below a `band` that tall. */
export const lensRowCentre = (index: number, band = 0) =>
  DATA_NODE_SIZE.height + band + index * LENS_ROW_HEIGHT + LENS_ROW_HEIGHT / 2;

/**
 * ELK `layered`, left to right: provenance reads as a direction — the file on
 * the left, what came of it to the right — and layered is the one ELK
 * algorithm that keeps a DAG's direction and routes around crossings.
 *
 * Layered is near-linear, unlike the coordinate graph's stress layout (3s at
 * 150 nodes; see `coordinates/layout.ts`) — but the test beside this still
 * measures ~70ms at the walk's 300-node limit, a visible hitch on every step
 * of an expansion. So it runs in ELK's own worker, loaded the way duckdb loads
 * its worker (`?url`, which survives the packaged app's file://).
 */
export const LAYOUT_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.layered.spacing.nodeNodeBetweenLayers": "56",
  "elk.spacing.nodeNode": "20",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  // Disconnected pieces (a file reached through a node the walk later
  // dropped) pack beside the rest instead of stacking far below it.
  "elk.separateConnectedComponents": "true",
} as const;

// One engine each, module-scoped, as the coordinate graph does: each serialises
// its own work. The inline one is what the tests use (no Worker there) and what
// takes over if the worker never answers.
const inline = new ELK();
const worker = typeof Worker === "undefined" ? null : new ELKWorker({ workerUrl: elkWorkerUrl });

// `elk-api` does not reject when its worker script fails to load (a packaged
// build that lost the asset): the layout just never settles. So the worker gets
// a deadline far above any real layout (~70ms at the walk's limit), and once it
// misses one the inline engine does every layout after it.
const WORKER_DEADLINE_MS = 5000;
let workerFailed = false;

/**
 * A data node says how tall it is and where its out-ports are (handle id and
 * y, from `lensRowCentre` / `HEADER_CENTRE`), so ELK orders the edges by the
 * row they leave from instead of crossing them inside the tile.
 */
export type LayoutNode = {
  id: string;
  type: "data" | "task";
  height?: number;
  ports?: { handle: string; y: number }[];
};
export type LayoutEdge = { id: string; source: string; sourceHandle?: string; target: string };

const IN_PORT = "in";
const portId = (node: string, handle: string) => `${node}::${handle}`;

const graphOf = (nodes: LayoutNode[], edges: LayoutEdge[]) => {
  const dataNodes = new Set(nodes.filter((node) => node.type === "data").map((node) => node.id));
  const portsOf = new Map(nodes.map((node) => [node.id, new Set((node.ports ?? []).map((port) => port.handle))]));
  return {
    id: "root",
    layoutOptions: LAYOUT_OPTIONS,
    children: nodes.map((node) =>
      node.type === "task"
        ? { id: node.id, ...TASK_NODE_SIZE }
        : {
            id: node.id,
            width: DATA_NODE_SIZE.width,
            height: node.height ?? DATA_NODE_SIZE.height,
            layoutOptions: { "elk.portConstraints": "FIXED_POS" },
            ports: [
              { id: portId(node.id, IN_PORT), x: 0, y: HEADER_CENTRE, width: 0, height: 0, layoutOptions: { "elk.port.side": "WEST" } },
              ...(node.ports ?? []).map((port) => ({
                id: portId(node.id, port.handle),
                x: DATA_NODE_SIZE.width,
                y: port.y,
                width: 0,
                height: 0,
                layoutOptions: { "elk.port.side": "EAST" },
              })),
            ],
          },
    ),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.sourceHandle && portsOf.get(edge.source)?.has(edge.sourceHandle) ? portId(edge.source, edge.sourceHandle) : edge.source],
      targets: [dataNodes.has(edge.target) ? portId(edge.target, IN_PORT) : edge.target],
    })),
  };
};

const inWorker = async (nodes: LayoutNode[], edges: LayoutEdge[]) => {
  if (!worker || workerFailed) return undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      worker.layout(graphOf(nodes, edges)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer in ${WORKER_DEADLINE_MS}ms`)), WORKER_DEADLINE_MS);
      }),
    ]);
  } catch (error) {
    console.warn("[Lineage] ELK worker failed; laying out on the main thread from now on", error);
    workerFailed = true;
    return undefined;
  } finally {
    clearTimeout(timer);
  }
};

export const layoutLineage = async (
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Promise<Map<string, { x: number; y: number }>> => {
  const result = (await inWorker(nodes, edges)) ?? (await inline.layout(graphOf(nodes, edges)));
  return new Map((result.children ?? []).map((child) => [child.id, { x: child.x ?? 0, y: child.y ?? 0 }]));
};

/**
 * Where nodes go when ELK fails outright: data in columns by depth, tasks in a
 * column of their own. Overlapping edges, but every node visible and clickable,
 * which beats a canvas stuck on "Laying out…".
 */
export const fallbackPositions = (
  nodes: { id: string; type: "data" | "task"; depth?: number; height?: number }[],
): Map<string, { x: number; y: number }> => {
  const tops = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();
  const column = (depth: number) => depth * (DATA_NODE_SIZE.width + TASK_NODE_SIZE.width + 80);
  const lastColumn = Math.max(0, ...nodes.map((node) => node.depth ?? 0)) + 1;
  for (const node of nodes) {
    const depth = node.type === "task" ? lastColumn : (node.depth ?? 0);
    const top = tops.get(depth) ?? 0;
    const height = node.type === "task" ? TASK_NODE_SIZE.height : (node.height ?? DATA_NODE_SIZE.height);
    tops.set(depth, top + height + 24);
    positions.set(node.id, { x: column(depth), y: top });
  }
  return positions;
};
