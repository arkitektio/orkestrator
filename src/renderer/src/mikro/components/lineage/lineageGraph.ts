import {
  GetLineageQuery,
  LineageEdgeKind,
  LineageNodeKind,
} from "@/mikro/api/graphql";

export type LineageAnswer = GetLineageQuery["lineage"];
export type LineageNodeData = LineageAnswer["nodes"][number];
export type LineageEdgeData = LineageAnswer["edges"][number];

export type Direction = "up" | "down";

/**
 * Everything walked so far, merged across answers. The first answer is rooted
 * at the page's object; every later one at the node someone stepped from, so
 * the graph only ever grows.
 *
 * Records, not Maps: this is React state and is replaced, never mutated.
 */
export type LineageState = {
  root: string;
  nodes: Record<string, LineageNodeData>;
  edges: Record<string, LineageEdgeData>;
  /** Whether any answer stopped at its limit before its depth. */
  truncated: boolean;
};

/** Where a later answer came from: the node it was rooted at, and which way it walked. */
export type Expansion = { key: string; direction: Direction };

/**
 * Fold one answer into the graph.
 *
 * **Depth** stays relative to the page's root: an answer rooted at a node
 * `d` hops out reports its own depths, which shift by `d`. A node reached
 * both ways keeps the nearer.
 *
 * **"More"** can only ever be cleared. An answer says a node has more when a
 * neighbour of it is outside THAT answer; the merged graph holds every answer,
 * so a node is missing something only if every answer that saw it said so —
 * `old && new`. The one exception is the node an expansion was rooted at, in
 * the direction it went: there the answer is authoritative (it saw all of that
 * node's neighbours that way, up to the fan-out cap, and says whether it was
 * capped).
 */
export const mergeLineage = (
  state: LineageState | null,
  answer: LineageAnswer,
  expansion?: Expansion,
): LineageState => {
  const nodes = { ...(state?.nodes ?? {}) };
  const edges = { ...(state?.edges ?? {}) };
  const offset = state ? (nodes[answer.root]?.depth ?? 0) : 0;

  for (const incoming of answer.nodes) {
    const depth = incoming.depth + offset;
    const known = nodes[incoming.key];
    if (!known) {
      nodes[incoming.key] = { ...incoming, depth };
      continue;
    }
    let hasMoreUp = known.hasMoreUp && incoming.hasMoreUp;
    let hasMoreDown = known.hasMoreDown && incoming.hasMoreDown;
    if (expansion?.key === incoming.key) {
      if (expansion.direction === "up") hasMoreUp = incoming.hasMoreUp;
      else hasMoreDown = incoming.hasMoreDown;
    }
    nodes[incoming.key] = {
      ...known,
      depth: Math.abs(depth) < Math.abs(known.depth) ? depth : known.depth,
      hasMoreUp,
      hasMoreDown,
    };
  }

  for (const edge of answer.edges) {
    edges[edge.key] = edge;
  }

  return {
    root: state?.root ?? answer.root,
    nodes,
    edges,
    truncated: (state?.truncated ?? false) || answer.truncated,
  };
};

/** The smart identifier for a node kind, where one exists. */
export const IDENTIFIER_BY_KIND: Partial<Record<LineageNodeKind, string>> = {
  [LineageNodeKind.Dataset]: "@mikro/arraydataset",
  [LineageNodeKind.File]: "@mikro/file",
  [LineageNodeKind.TableDataset]: "@mikro/tabledataset",
  [LineageNodeKind.SparseDataset]: "@mikro/sparsedataset",
  [LineageNodeKind.MeshCollection]: "@mikro/meshcollection",
};

/** The lens kind each container kind is cut with: the `__typename` its lens structures carry. */
export const LENS_TYPENAME: Partial<Record<LineageNodeKind, "ArrayLens" | "TableLens" | "SparseLens" | "MeshLens" | "NetworkLens" | "AnnotationLens">> = {
  [LineageNodeKind.Dataset]: "ArrayLens",
  [LineageNodeKind.TableDataset]: "TableLens",
  [LineageNodeKind.SparseDataset]: "SparseLens",
  [LineageNodeKind.MeshCollection]: "MeshLens",
  [LineageNodeKind.NetworkCollection]: "NetworkLens",
  [LineageNodeKind.AnnotationCollection]: "AnnotationLens",
};

/**
 * The handle a data node's outgoing edge leaves from: the row of the lens it
 * was computed from, or the tile itself where there is none (a file).
 */
export const OUT_HANDLE = "out";
export const lensHandle = (lensId: string) => `lens:${lensId}`;
export const sourceHandleOf = (edge: LineageEdgeData) => (edge.sourceLens ? lensHandle(edge.sourceLens) : OUT_HANDLE);

/** The route segment for a node kind, as `/mikro/lineage/:kind/:id` spells it. */
export const KIND_SEGMENT: Record<LineageNodeKind, string> = {
  [LineageNodeKind.Dataset]: "arraydataset",
  [LineageNodeKind.File]: "file",
  [LineageNodeKind.TableDataset]: "tabledataset",
  [LineageNodeKind.SparseDataset]: "sparsedataset",
  [LineageNodeKind.MeshCollection]: "meshcollection",
  [LineageNodeKind.NetworkCollection]: "networkcollection",
  [LineageNodeKind.AnnotationCollection]: "annotationcollection",
  [LineageNodeKind.Fixture]: "fixture",
};

export const kindFromSegment = (segment: string | undefined): LineageNodeKind | undefined =>
  (Object.entries(KIND_SEGMENT) as [LineageNodeKind, string][]).find(
    ([, value]) => value === segment,
  )?.[0];

export const lineageLink = (kind: LineageNodeKind, id: string) =>
  `/mikro/lineage/${KIND_SEGMENT[kind]}/${encodeURIComponent(id)}`;

export const KIND_LABEL: Record<LineageNodeKind, string> = {
  [LineageNodeKind.Dataset]: "Array dataset",
  [LineageNodeKind.File]: "File",
  [LineageNodeKind.TableDataset]: "Table",
  [LineageNodeKind.SparseDataset]: "Sparse dataset",
  [LineageNodeKind.MeshCollection]: "Mesh collection",
  [LineageNodeKind.NetworkCollection]: "Network collection",
  [LineageNodeKind.AnnotationCollection]: "Annotation collection",
  [LineageNodeKind.Fixture]: "Fixture",
};

export type FlowDataNode = {
  type: "data";
  id: string;
  node: LineageNodeData;
  isRoot: boolean;
};

export type FlowTaskNode = {
  type: "task";
  id: string;
  taskId: string;
  /** What it read and what it wrote, for the hover text. */
  inputs: number;
  outputs: number;
};

export type FlowEdge = {
  id: string;
  source: string;
  /** The port on a data node it leaves from; a task node has one and needs none. */
  sourceHandle?: string;
  target: string;
  /** Drawn on a direct data → data edge; a task in between already says what happened. */
  label?: string;
  kind: LineageEdgeKind;
  /** No geometry survived: drawn dashed. */
  unmappable: boolean;
};

export const taskNodeId = (taskId: string) => `task:${taskId}`;

const edgeLabel = (edge: LineageEdgeData): string => {
  if (edge.kind === LineageEdgeKind.Ingest) return "ingest";
  if (edge.kind === LineageEdgeKind.Export) return "export";
  return "derived";
};

/**
 * The picture: data nodes, and between them one node per TASK that made
 * something (PROV's entity → activity → entity).
 *
 * A task that fused two inputs into three outputs is one node with two edges
 * in and three out, not six labelled edges. Its inputs are the parents of what
 * it made — except a parent it ALSO made: a task that wrote a chain (A → X → Y,
 * X and Y both its outputs) would otherwise draw X → task → X. That inner step
 * stays a direct edge, which is also the honest picture: the task made X, then
 * Y out of X.
 *
 * Edges with no task (a manual upload, an ingest by hand) stay direct, with a
 * label for what they record.
 *
 * Every edge out of a data node leaves from its lens port (`sourceLens`), so
 * a task that read two lenses of one dataset has two lines in, one per lens.
 */
export const toFlow = (state: LineageState): { nodes: (FlowDataNode | FlowTaskNode)[]; edges: FlowEdge[] } => {
  const dataNodes: FlowDataNode[] = Object.values(state.nodes).map((node) => ({
    type: "data",
    id: node.key,
    node,
    isRoot: node.key === state.root,
  }));

  const byTask = new Map<string, LineageEdgeData[]>();
  const direct: LineageEdgeData[] = [];
  for (const edge of Object.values(state.edges)) {
    if (!(edge.source in state.nodes) || !(edge.target in state.nodes)) continue;
    if (edge.taskId) {
      const group = byTask.get(edge.taskId) ?? [];
      group.push(edge);
      byTask.set(edge.taskId, group);
    } else {
      direct.push(edge);
    }
  }

  const flowEdges: FlowEdge[] = direct.map((edge) => ({
    id: edge.key,
    source: edge.source,
    sourceHandle: sourceHandleOf(edge),
    target: edge.target,
    label: edgeLabel(edge),
    kind: edge.kind,
    unmappable: edge.transformationKind === "UNMAPPABLE",
  }));

  const taskNodes: FlowTaskNode[] = [];
  for (const [taskId, group] of byTask) {
    const id = taskNodeId(taskId);
    const outputs = new Set(group.map((edge) => edge.target));
    const inputs = new Set<string>();
    const seen = new Set<string>();

    for (const edge of group) {
      if (outputs.has(edge.source)) {
        // A step inside the task's own chain.
        flowEdges.push({
          id: edge.key,
          source: edge.source,
          sourceHandle: sourceHandleOf(edge),
          target: edge.target,
          label: edgeLabel(edge),
          kind: edge.kind,
          unmappable: edge.transformationKind === "UNMAPPABLE",
        });
        continue;
      }
      inputs.add(edge.source);
      const handle = sourceHandleOf(edge);
      const into = `${edge.source}|${handle}->${id}`;
      if (!seen.has(into)) {
        seen.add(into);
        flowEdges.push({ id: into, source: edge.source, sourceHandle: handle, target: id, kind: edge.kind, unmappable: false });
      }
      const out = `${id}->${edge.target}`;
      if (!seen.has(out)) {
        seen.add(out);
        flowEdges.push({
          id: out,
          source: id,
          target: edge.target,
          kind: edge.kind,
          unmappable: edge.transformationKind === "UNMAPPABLE",
        });
      }
    }

    // Every output gets its arrow from the task, inner-chain outputs included,
    // so "made by this task" is visible on each thing it made.
    for (const target of outputs) {
      const out = `${id}->${target}`;
      if (!seen.has(out)) {
        seen.add(out);
        const edge = group.find((candidate) => candidate.target === target)!;
        flowEdges.push({ id: out, source: id, target, kind: edge.kind, unmappable: false });
      }
    }

    taskNodes.push({ type: "task", id, taskId, inputs: inputs.size, outputs: outputs.size });
  }

  return { nodes: [...dataNodes, ...taskNodes], edges: flowEdges };
};
