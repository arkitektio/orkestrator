/**
 * The coordinate-system graph the Add Layer engine walks.
 *
 * Two kinds of node, one kind of edge:
 *
 *   SPACES       coordinate systems — what an edge actually joins. The picker
 *                fetches the world's component flat (`coordinateGraph`) and
 *                walks the CHILDREN from the world: an edge lands in its
 *                `output`, so a space's children are the spaces whose edges
 *                land in it. The world's children are the grids registered
 *                into it; a grid's children are the derived datasets, crops
 *                and pyramid levels landing in it. A space the walk does not
 *                reach (a second world's data) is off the tree: known, not
 *                listed.
 *   CONTAINERS   a dataset, a table, a mesh collection — what a row of the
 *                picker IS, and what the scene's layers draw. A dataset owns
 *                several spaces (its grid, its lenses' crops, its levels), so
 *                every container carries the set of spaces it is a space of,
 *                and `spaceOwner` maps a space back to its container.
 *   EDGES        transformations, in their stored direction: `input` is the
 *                child's space, `output` the space it maps into. An edge the
 *                child's resident lists in its own `derivedFrom` (or a lens's
 *                and a level's `toParent`) is a DERIVATION, and carries the
 *                ordinal that says which parent is primary; any other edge is
 *                a placement — a registration into a frame — which says where
 *                the data sits and nothing about its values.
 *
 * `graphFromComponent` builds it; `graphFromLineage` is the helper
 * that adds the server's provenance component around one candidate — the
 * ancestor that lives outside this world's tree — and `mergeGraphs` unions
 * the two, so the engine runs the same rules before and after.
 *
 * Pure: no runtime import from the generated api (that module pulls in the
 * Apollo client and with it `window`), so enum members are spelled as their
 * wire values and inputs are typed structurally.
 */

export type NodeKind =
  | "dataset"
  | "table"
  | "mesh"
  | "network"
  | "annotation"
  | "sparse";

/** `${__typename}:${id}` — what the scene's staged layers are matched on too. */
export type NodeKey = string;

/** A container: the unit the engine reasons about and the picker lists. */
export type GraphNode = {
  key: NodeKey;
  kind: NodeKind;
  id: string;
  name: string;
  /** Every coordinate system this container is a space of. */
  spaces: Set<string>;
  /** ArrayDatasetSpec wire values, for a dataset. */
  spec?: readonly string[];
  /** The content types of the files a dataset was read out of. */
  sourceContentTypes?: readonly string[];
  /** ColumnRole wire values, for a table. */
  columnRoles?: readonly string[];
  /**
   * A container the graph only knows from the far end of an edge: it names
   * the space and, when a resident said so, the container — but nothing else.
   */
  stub?: boolean;
};

export type SpaceNode = {
  id: string;
  name: string;
  /** Who lives here, as the picker fetched them. */
  residents: readonly ResidentLike[];
  /** How far below the world this space was reached, or null off the tree. */
  depth: number | null;
};

export type GraphEdge = {
  id: string;
  /** TransformKind wire value: IDENTITY, TRANSLATION, FIELD, UNMAPPABLE, … */
  kind: string;
  /** ValueRelation wire value, or null when the author did not say. */
  valueRelation: string | null;
  /** The child's space — the edge's `input`. */
  input: string | null;
  /** The space it maps into — the edge's `output`. */
  output: string | null;
  /** For a FIELD edge, the space of the array whose values are the map. */
  fieldId?: string | null;
  reason?: string | null;
  /**
   * Whether the child's resident claims this edge as a derivation — the data
   * was COMPUTED across it — rather than a registration that merely places it.
   */
  derivation: boolean;
  /**
   * Position in the child's `derivedFrom`: 0 is the primary parent, the one
   * that places it. Null when the graph does not know.
   */
  ordinal: number | null;
};

export type DerivationGraph = {
  spaces: Map<string, SpaceNode>;
  nodes: Map<NodeKey, GraphNode>;
  edges: Map<string, GraphEdge>;
  spaceOwner: Map<string, NodeKey>;
  /** Whether the server's transitive lineage has been merged in. */
  depth: "tree" | "lineage";
};

// ---------------------------------------------------------------------------
// Structural input shapes — the subset of the generated fragments this reads
// ---------------------------------------------------------------------------

export type EdgeLike = {
  id: string;
  kind: string;
  valueRelation?: string | null;
  input?: { id: string } | null;
  output?: { id: string } | null;
  field?: { id: string } | null;
  reason?: string | null;
};

export type DatasetLike = {
  id: string;
  name: string;
  spec?: readonly string[];
  intrinsicSystem?: { id: string } | null;
  derivedFrom: readonly EdgeLike[];
  sourceFiles?: readonly { file: { contentType?: string | null } }[];
};

type Spaced = { coordinateSystem?: { id: string } | null };

/** One resident of a space, as `AddLayerCandidate` selects it. */
export type ResidentLike =
  | {
      __typename: "Lens";
      id: string;
      lensSpace?: { id: string } | null;
      toParent?: { id: string } | null;
      dataset: DatasetLike;
    }
  | ({ __typename: "ArrayDataset" } & DatasetLike)
  | ({
      __typename: "TableDataset";
      id: string;
      name: string;
      derivedFrom?: readonly EdgeLike[];
      columns?: readonly { role: string }[];
    } & Spaced)
  | ({ __typename: "MeshCollection"; id: string; version: string; derivedFrom?: readonly EdgeLike[] } & Spaced)
  | ({ __typename: "NetworkCollection"; id: string; version: string; derivedFrom?: readonly EdgeLike[] } & Spaced)
  | ({ __typename: "AnnotationCollection"; id: string; name: string; derivedFrom?: readonly EdgeLike[] } & Spaced)
  | ({ __typename: "SparseDataset"; id: string; name: string; derivedFrom?: readonly EdgeLike[] } & Spaced)
  | { __typename: "DataArray"; id: string; level: number; toParent?: { id: string } | null }
  | { __typename: string };

/** One space of the world's component, as `AddLayerSpace` selects it. */
export type SpaceLike = {
  id: string;
  name: string;
  residents: readonly ResidentLike[];
};

/** The world's component, as `AddLayerWorldGraph` returns it. */
export type ComponentLike = {
  root: { id: string };
  systems: readonly SpaceLike[];
  transformations: readonly EdgeLike[];
};

/** Who lives at the far end of a lineage edge, as `AddLayerSpaceOwner` selects it. */
export type OwnerLike = {
  __typename: string;
  id?: string;
  dataset?: { id: string } | null;
};

export type LineageEdgeLike = EdgeLike & {
  input?: { id: string; residents?: readonly OwnerLike[] } | null;
  output?: { id: string; residents?: readonly OwnerLike[] } | null;
};

/** One node of the lineage component, as `AddLayerLineageNode` selects it. */
export type LineageNodeLike =
  | ({ __typename: "ArrayDataset" } & DatasetLike)
  | ({
      __typename: "TableDataset" | "AnnotationCollection" | "SparseDataset";
      id: string;
      name: string;
      derivedFrom?: readonly { id: string }[];
      columns?: readonly { role: string }[];
    } & Spaced)
  | ({
      __typename: "MeshCollection" | "NetworkCollection";
      id: string;
      version: string;
      derivedFrom?: readonly { id: string }[];
    } & Spaced)
  | { __typename: string };

export type LineageLike = {
  root: { id: string };
  nodes: readonly LineageNodeLike[];
  edges: readonly LineageEdgeLike[];
};

// ---------------------------------------------------------------------------
// Keys and names
// ---------------------------------------------------------------------------

export const nodeKeyOf = (resident: { __typename: string; id: string }): NodeKey =>
  `${resident.__typename}:${resident.id}`;

export const datasetKey = (id: string): NodeKey => `ArrayDataset:${id}`;

const KIND_OF_TYPENAME: Record<string, NodeKind> = {
  ArrayDataset: "dataset",
  Lens: "dataset",
  DataArray: "dataset",
  TableDataset: "table",
  MeshCollection: "mesh",
  NetworkCollection: "network",
  AnnotationCollection: "annotation",
  SparseDataset: "sparse",
};

const KIND_LABEL: Record<NodeKind, string> = {
  dataset: "dataset",
  table: "table",
  mesh: "mesh collection",
  network: "network",
  annotation: "annotations",
  sparse: "sparse dataset",
};

// The same naming `residentName` gives a picker row: a mesh or a network has
// only a version to show.
const collectionName = (kind: NodeKind, version: string) =>
  `${KIND_LABEL[kind]} ${version}`.trim();

export const emptyGraph = (): DerivationGraph => ({
  spaces: new Map(),
  nodes: new Map(),
  edges: new Map(),
  spaceOwner: new Map(),
  depth: "tree",
});

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

const upsertNode = (
  graph: DerivationGraph,
  node: Omit<GraphNode, "spaces"> & { spaces?: Iterable<string> },
): GraphNode => {
  const existing = graph.nodes.get(node.key);
  const target: GraphNode = existing ?? {
    key: node.key,
    kind: node.kind,
    id: node.id,
    name: node.name,
    spaces: new Set(),
  };
  if (existing) {
    // A real resident overrides what a stub knew, and never the other way.
    if (!node.stub) {
      target.name = node.name;
      target.stub = undefined;
    }
  } else {
    target.stub = node.stub;
    graph.nodes.set(node.key, target);
  }
  if (node.spec?.length) target.spec = node.spec;
  if (node.sourceContentTypes?.length)
    target.sourceContentTypes = node.sourceContentTypes;
  if (node.columnRoles) target.columnRoles = node.columnRoles;
  for (const space of node.spaces ?? []) claimSpace(graph, target, space);
  return target;
};

const claimSpace = (graph: DerivationGraph, node: GraphNode, space: string) => {
  node.spaces.add(space);
  graph.spaceOwner.set(space, node.key);
};

const upsertSpace = (
  graph: DerivationGraph,
  space: { id: string; name?: string; residents?: readonly ResidentLike[] },
  depth: number | null,
): SpaceNode => {
  const existing = graph.spaces.get(space.id);
  if (existing) {
    if (space.name) existing.name = space.name;
    if (space.residents?.length) existing.residents = space.residents;
    if (depth !== null && (existing.depth === null || depth < existing.depth))
      existing.depth = depth;
    return existing;
  }
  const created: SpaceNode = {
    id: space.id,
    name: space.name ?? "",
    residents: space.residents ?? [],
    depth,
  };
  graph.spaces.set(space.id, created);
  return created;
};

const addEdge = (
  graph: DerivationGraph,
  edge: EdgeLike,
  claim: { derivation: boolean; ordinal: number | null },
): GraphEdge => {
  const existing = graph.edges.get(edge.id);
  if (existing) {
    if (claim.derivation) existing.derivation = true;
    if (existing.ordinal === null && claim.ordinal !== null)
      existing.ordinal = claim.ordinal;
    if (!existing.fieldId && edge.field?.id) existing.fieldId = edge.field.id;
    if (!existing.reason && edge.reason) existing.reason = edge.reason;
    if (!existing.valueRelation && edge.valueRelation)
      existing.valueRelation = edge.valueRelation;
    return existing;
  }
  const created: GraphEdge = {
    id: edge.id,
    kind: edge.kind,
    valueRelation: edge.valueRelation ?? null,
    input: edge.input?.id ?? null,
    output: edge.output?.id ?? null,
    fieldId: edge.field?.id ?? null,
    reason: edge.reason ?? null,
    derivation: claim.derivation,
    ordinal: claim.ordinal,
  };
  graph.edges.set(edge.id, created);
  return created;
};

const contentTypesOf = (dataset: DatasetLike) =>
  (dataset.sourceFiles ?? [])
    .map((link) => link.file.contentType)
    .filter((type): type is string => !!type);

const addDataset = (
  graph: DerivationGraph,
  dataset: DatasetLike,
  extraSpaces: readonly string[] = [],
): GraphNode => {
  const node = upsertNode(graph, {
    key: datasetKey(dataset.id),
    kind: "dataset",
    id: dataset.id,
    name: dataset.name,
    spec: dataset.spec,
    sourceContentTypes: contentTypesOf(dataset),
    spaces: [
      ...(dataset.intrinsicSystem ? [dataset.intrinsicSystem.id] : []),
      ...extraSpaces,
    ],
  });
  dataset.derivedFrom.forEach((edge, index) =>
    addEdge(graph, edge, { derivation: true, ordinal: index }),
  );
  return node;
};

const addCollection = (
  graph: DerivationGraph,
  resident: {
    __typename: string;
    id: string;
    name?: string;
    version?: string;
    derivedFrom?: readonly EdgeLike[];
    columns?: readonly { role: string }[];
  } & Spaced,
  extraSpaces: readonly string[] = [],
): GraphNode | undefined => {
  const kind = KIND_OF_TYPENAME[resident.__typename];
  if (!kind || kind === "dataset") return undefined;
  const node = upsertNode(graph, {
    key: nodeKeyOf(resident),
    kind,
    id: resident.id,
    name: resident.name ?? collectionName(kind, resident.version ?? ""),
    columnRoles: resident.columns?.map((column) => column.role),
    spaces: [
      ...(resident.coordinateSystem ? [resident.coordinateSystem.id] : []),
      ...extraSpaces,
    ],
  });
  resident.derivedFrom?.forEach((edge, index) =>
    addEdge(graph, edge, { derivation: true, ordinal: index }),
  );
  return node;
};

/**
 * File one space's residents under their containers. A Lens joins its
 * dataset (the space it sits in is one of the dataset's); a DataArray is a
 * level whose container is only known once its `toParent` edge is — it is
 * returned for a second pass.
 */
const addResidents = (
  graph: DerivationGraph,
  space: { id: string; residents: readonly ResidentLike[] },
): { levelEdges: string[] } => {
  const levelEdges: string[] = [];
  for (const resident of space.residents) {
    switch (resident.__typename) {
      case "Lens": {
        const lens = resident as Extract<ResidentLike, { __typename: "Lens" }>;
        addDataset(graph, lens.dataset, [space.id, ...(lens.lensSpace ? [lens.lensSpace.id] : [])]);
        // A crop is a derivation that keeps the values: the child grid IS a
        // window of the parent's.
        if (lens.toParent) {
          const existing = graph.edges.get(lens.toParent.id);
          if (existing) {
            existing.derivation = true;
            existing.ordinal ??= 0;
            existing.valueRelation ??= "IDENTICAL";
          } else {
            addEdge(
              graph,
              { id: lens.toParent.id, kind: "TRANSLATION", valueRelation: "IDENTICAL", input: { id: space.id } },
              { derivation: true, ordinal: 0 },
            );
          }
        }
        break;
      }
      case "ArrayDataset":
        addDataset(graph, resident as DatasetLike, [space.id]);
        break;
      case "TableDataset":
      case "MeshCollection":
      case "NetworkCollection":
      case "AnnotationCollection":
      case "SparseDataset":
        addCollection(graph, resident as Parameters<typeof addCollection>[1], [space.id]);
        break;
      case "DataArray": {
        const level = resident as Extract<ResidentLike, { __typename: "DataArray" }>;
        if (level.toParent) levelEdges.push(level.toParent.id);
        break;
      }
      default:
        break;
    }
  }
  return { levelEdges };
};

/**
 * The graph from the world's component.
 *
 * Files every space and every resident, records every edge in its stored
 * direction, then walks the CHILDREN down from the world — an edge's `output`
 * is the space it lands in, so the children of a space are the inputs of the
 * edges landing there — to give each reached space its depth. An edge is a
 * derivation when the resident at its child end lists it: that is what tells
 * "cells.zarr was segmented from dapi.zarr" apart from "dapi.zarr was
 * registered into the stage frame". A pyramid level's space is filed under the
 * dataset its `toParent` edge lands in, since the level itself cannot say
 * whose it is.
 */
export const graphFromComponent = (component: ComponentLike): DerivationGraph => {
  const graph = emptyGraph();
  const levelEdges: string[] = [];

  for (const system of component.systems) {
    upsertSpace(graph, system, null);
    levelEdges.push(...addResidents(graph, system).levelEdges);
  }
  for (const edge of component.transformations) {
    addEdge(graph, edge, { derivation: false, ordinal: null });
  }
  // Every space an edge names exists, whether or not the walk reaches it — a
  // second world a grid is also registered into, say — so the engine can tell
  // "off the tree" from "unknown".
  for (const edge of graph.edges.values()) {
    for (const end of [edge.input, edge.output]) {
      if (end) upsertSpace(graph, { id: end }, null);
    }
  }

  // Pyramid levels: a level's space belongs to the container its edge lands in.
  for (const edgeId of levelEdges) {
    const edge = graph.edges.get(edgeId);
    if (!edge?.input) continue;
    edge.derivation = true;
    edge.ordinal ??= 0;
    edge.valueRelation ??= "IDENTICAL";
    const owner = ownerOf(graph, edge.output);
    if (owner) claimSpace(graph, owner, edge.input);
  }

  // The children tree: depth from the world, breadth first, so a space reached
  // two ways keeps the shorter. A dereference is not a child — a table is not
  // "under" the mask that keys it, it is beside it.
  const root = upsertSpace(graph, { id: component.root.id }, 0);
  let frontier = [root.id];
  while (frontier.length) {
    const next: string[] = [];
    for (const parent of frontier) {
      for (const edge of graph.edges.values()) {
        if (edge.output !== parent || !edge.input || isDereference(edge, graph)) continue;
        const child = upsertSpace(graph, { id: edge.input }, null);
        if (child.depth !== null) continue;
        child.depth = (graph.spaces.get(parent)?.depth ?? 0) + 1;
        next.push(child.id);
      }
    }
    frontier = next;
  }
  return graph;
};

/**
 * The container at the far end of a lineage edge, from the residents of the
 * space it names. Prefers a dataset over a lens of one (the space IS the grid
 * then), and a lens's dataset over the lens itself — the same preference
 * `parentDatasetOfEdge` has on the dataset page.
 */
const ownerFromResidents = (
  residents: readonly OwnerLike[] | undefined,
): { key: NodeKey; kind: NodeKind; id: string } | null => {
  if (!residents) return null;
  const direct = residents.find(
    (resident) => resident.__typename === "ArrayDataset" && resident.id,
  );
  if (direct) return { key: datasetKey(direct.id!), kind: "dataset", id: direct.id! };
  const lens = residents.find(
    (resident) => resident.__typename === "Lens" && resident.dataset?.id,
  );
  if (lens) {
    const id = lens.dataset!.id;
    return { key: datasetKey(id), kind: "dataset", id };
  }
  for (const resident of residents) {
    const kind = KIND_OF_TYPENAME[resident.__typename];
    if (kind && kind !== "dataset" && resident.id) {
      return { key: nodeKeyOf({ __typename: resident.__typename, id: resident.id }), kind, id: resident.id };
    }
  }
  return null;
};

/**
 * The provenance helper: the server's lineage component around one candidate.
 *
 * Its nodes are containers with no lens among them, while its edges keep
 * naming lens spaces — so every endpoint is resolved through the residents of
 * the space it names, and a space whose owner is not among the nodes (cut off
 * by `maxDepth`) gets a stub. Every edge here is a derivation by definition
 * (the walk crosses derivation edges only); `lineageGraph.edges` are ordered
 * by id, so the primary-parent ordinal is read back from each node's own
 * `derivedFrom`.
 */
export const graphFromLineage = (lineage: LineageLike): DerivationGraph => {
  const graph = emptyGraph();
  graph.depth = "lineage";

  const ordinalOf = new Map<string, number>();
  for (const node of lineage.nodes) {
    const derivedFrom = (node as { derivedFrom?: readonly { id: string }[] }).derivedFrom;
    derivedFrom?.forEach((edge, index) => ordinalOf.set(edge.id, index));
  }

  for (const node of lineage.nodes) {
    switch (node.__typename) {
      case "ArrayDataset":
        addDataset(graph, node as DatasetLike);
        break;
      case "TableDataset":
      case "MeshCollection":
      case "NetworkCollection":
      case "AnnotationCollection":
      case "SparseDataset":
        // Their `derivedFrom` here is ids only; the edges themselves come from
        // `lineage.edges` below, so pass none through.
        addCollection(graph, {
          ...(node as Parameters<typeof addCollection>[1]),
          derivedFrom: undefined,
        });
        break;
      default:
        break;
    }
  }

  for (const edge of lineage.edges) {
    addEdge(graph, edge, { derivation: true, ordinal: ordinalOf.get(edge.id) ?? null });
    for (const end of [edge.input, edge.output]) {
      if (!end?.id) continue;
      upsertSpace(graph, { id: end.id }, null);
      const owner = ownerFromResidents(end.residents);
      if (!owner) continue;
      const known = graph.nodes.get(owner.key);
      if (known) {
        claimSpace(graph, known, end.id);
      } else {
        upsertNode(graph, {
          key: owner.key,
          kind: owner.kind,
          id: owner.id,
          name: `${KIND_LABEL[owner.kind]} ${owner.id}`,
          stub: true,
          spaces: [end.id],
        });
      }
    }
  }
  return graph;
};

/**
 * The union of two graphs. The overlay wins on node detail (it is the deeper
 * answer), a derivation claim from either side stands, and an ordinal one
 * side knew is kept when the other has none.
 */
export const mergeGraphs = (
  base: DerivationGraph,
  overlay: DerivationGraph,
): DerivationGraph => {
  const merged = emptyGraph();
  merged.depth =
    base.depth === "lineage" || overlay.depth === "lineage" ? "lineage" : "tree";
  for (const source of [base, overlay]) {
    for (const space of source.spaces.values()) upsertSpace(merged, space, space.depth);
    for (const node of source.nodes.values()) {
      upsertNode(merged, { ...node, spaces: [...node.spaces] });
    }
    for (const edge of source.edges.values()) {
      const existing = merged.edges.get(edge.id);
      if (!existing) {
        merged.edges.set(edge.id, { ...edge });
      } else {
        if (edge.derivation) existing.derivation = true;
        if (existing.ordinal === null && edge.ordinal !== null) existing.ordinal = edge.ordinal;
        if (!existing.fieldId && edge.fieldId) existing.fieldId = edge.fieldId;
        if (!existing.valueRelation && edge.valueRelation) existing.valueRelation = edge.valueRelation;
      }
    }
  }
  return merged;
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export const ownerOf = (
  graph: DerivationGraph,
  space: string | null | undefined,
): GraphNode | undefined => {
  if (!space) return undefined;
  const key = graph.spaceOwner.get(space);
  return key ? graph.nodes.get(key) : undefined;
};

/**
 * The children of a space: the spaces whose edges land in it. What the
 * world's children tree literally is.
 */
export const childSpacesOf = (graph: DerivationGraph, space: string): GraphEdge[] =>
  [...graph.edges.values()].filter((edge) => edge.output === space && !!edge.input);

/**
 * A FIELD edge that keys a mask's pixels to a table of objects. The schema's
 * own definition is "the field IS the input"; where the tree gave the edge
 * without its field (the interface-only `TreeEdge`), it is told apart by
 * where it lands — a dereference maps INTO a table's space, a warp maps a grid
 * into another grid. It runs mask → table, the opposite way to every
 * derivation, and it is a dereference rather than a parent: the upstream walk
 * skips it, or a mask would read as derived from its own object table.
 */
export const isDereference = (edge: GraphEdge, graph?: DerivationGraph): boolean => {
  if (edge.kind !== "FIELD") return false;
  if (edge.fieldId) return edge.fieldId === edge.input;
  if (!graph) return false;
  const landing = ownerOf(graph, edge.output);
  return !!landing && landing.kind !== "dataset";
};

const byOrdinal = (a: GraphEdge, b: GraphEdge) =>
  (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER) ||
  a.id.localeCompare(b.id);

/**
 * The derivation edges from this container's spaces back into what it was
 * computed from — never a registration, which places without computing.
 */
export const parentEdgesOf = (graph: DerivationGraph, node: GraphNode): GraphEdge[] =>
  [...graph.edges.values()]
    .filter(
      (edge) =>
        edge.derivation &&
        !!edge.input &&
        node.spaces.has(edge.input) &&
        !node.spaces.has(edge.output ?? "") &&
        !isDereference(edge, graph),
    )
    .sort(byOrdinal);

/**
 * The edges from what was computed from this container back into it, plus
 * any dereference edge that keys this container's pixels to a table. A
 * registration INTO one of its spaces from a frame is not a child.
 */
export const childEdgesOf = (graph: DerivationGraph, node: GraphNode): GraphEdge[] =>
  [...graph.edges.values()]
    .filter((edge) => {
      if (isDereference(edge, graph)) return !!edge.input && node.spaces.has(edge.fieldId ?? edge.input);
      if (!edge.output || !node.spaces.has(edge.output)) return false;
      if (!!edge.input && node.spaces.has(edge.input)) return false;
      // A child the tree knows only as an edge still counts; a registration
      // from a reference frame (no container) does not.
      const child = ownerOf(graph, edge.input);
      return edge.derivation || !!child;
    })
    .sort(byOrdinal);

/** The container a child edge leads to: the child, or the keyed table. */
export const childOfEdge = (graph: DerivationGraph, edge: GraphEdge): GraphNode | undefined =>
  ownerOf(graph, isDereference(edge, graph) ? edge.output : edge.input);

export type ChainStep = {
  edge: GraphEdge;
  /** The parent the edge lands on, or undefined when nothing known lives there. */
  parent: GraphNode | undefined;
};

/**
 * The primary lineage of a container: its primary parent, that parent's
 * primary parent, and so on up to the root, an unknown space, an UNMAPPABLE
 * edge, a cycle, or `maxDepth`. The chain the value domain propagates along.
 */
export const primaryChain = (
  graph: DerivationGraph,
  node: GraphNode,
  maxDepth = 8,
): ChainStep[] => {
  const steps: ChainStep[] = [];
  const seen = new Set<NodeKey>([node.key]);
  let current: GraphNode | undefined = node;
  while (current && steps.length < maxDepth) {
    const edge: GraphEdge | undefined = parentEdgesOf(graph, current)[0];
    if (!edge) break;
    const parent = ownerOf(graph, edge.output);
    steps.push({ edge, parent });
    if (!parent || edge.kind === "UNMAPPABLE" || seen.has(parent.key)) break;
    seen.add(parent.key);
    current = parent;
  }
  return steps;
};

export type Reached = { node: GraphNode; edge: GraphEdge; depth: number };

/** Every container this one was computed from, transitively, nearest first. */
export const ancestors = (
  graph: DerivationGraph,
  node: GraphNode,
  maxDepth = 8,
): Reached[] => walk(graph, node, maxDepth, parentEdgesOf, (edge) => ownerOf(graph, edge.output));

/** Every container computed from this one, transitively, nearest first. */
export const descendants = (
  graph: DerivationGraph,
  node: GraphNode,
  maxDepth = 8,
): Reached[] => walk(graph, node, maxDepth, childEdgesOf, (edge) => childOfEdge(graph, edge));

const walk = (
  graph: DerivationGraph,
  start: GraphNode,
  maxDepth: number,
  edgesOf: (graph: DerivationGraph, node: GraphNode) => GraphEdge[],
  farEnd: (edge: GraphEdge) => GraphNode | undefined,
): Reached[] => {
  const reached: Reached[] = [];
  const seen = new Set<NodeKey>([start.key]);
  let frontier: { node: GraphNode; depth: number }[] = [{ node: start, depth: 0 }];
  while (frontier.length && frontier[0].depth < maxDepth) {
    const next: { node: GraphNode; depth: number }[] = [];
    for (const { node, depth } of frontier) {
      for (const edge of edgesOf(graph, node)) {
        const far = farEnd(edge);
        if (!far || seen.has(far.key)) continue;
        seen.add(far.key);
        reached.push({ node: far, edge, depth: depth + 1 });
        next.push({ node: far, depth: depth + 1 });
      }
    }
    frontier = next;
  }
  return reached;
};

/** The container a picker candidate is, in this graph. */
export const nodeOfCandidate = (
  graph: DerivationGraph,
  candidate: { __typename: string; id: string; dataset?: { id: string } },
): GraphNode | undefined => {
  const key =
    candidate.__typename === "Lens" && candidate.dataset
      ? datasetKey(candidate.dataset.id)
      : nodeKeyOf(candidate);
  return graph.nodes.get(key);
};

/**
 * The spaces of the tree in walking order — the world first, then each level
 * of children — with their residents, for a picker that lists by space.
 * Restricted to `placeable` when given: the server's own answer to what can
 * be composed here, which a tree walk cannot replicate (it would have to know
 * which chains condense to one affine map).
 */
export const treeSpaces = (
  graph: DerivationGraph,
  placeable?: ReadonlySet<string>,
): SpaceNode[] =>
  [...graph.spaces.values()]
    .filter((space) => space.depth !== null)
    .filter((space) => !placeable || space.depth === 0 || placeable.has(space.id))
    .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
