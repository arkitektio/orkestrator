/**
 * The scene's "Add derived" list: what was computed from the containers the
 * scene draws, as trees under each of them.
 *
 * The walk is the server's (`descendants`, the same one the home page's result
 * chips read): every node down to a few hops, each naming the node it was made
 * from. This module only shapes it — drops what a scene cannot layer, marks
 * what it already draws and what its world does not reach — so the popover is
 * a plain render of the result.
 *
 * Pure: type-only imports from the generated api, like the rest of addLayer,
 * so it runs in vitest's `node` environment.
 */

import type { LineageNodeKind, LineageRootInput } from "../../api/graphql";

/** The layer kinds' containers, as `AddLayerStagedLayer` names them. */
export type DrawnLayerLike = {
  __typename?: string;
  lens?: { dataset: { id: string } } | null;
  tableDataset?: { id: string } | null;
  collection?: { id: string } | null;
  annotationCollection?: { id: string } | null;
};

/**
 * Which lineage kind a layer's container is: a mesh layer and a network layer
 * both call theirs `collection`.
 */
const containerOf = (layer: DrawnLayerLike): { kind: `${LineageNodeKind}`; id: string } | null => {
  switch (layer.__typename) {
    case "PointLayer":
    case "TrackLayer":
      return layer.tableDataset ? { kind: "TABLE_DATASET", id: layer.tableDataset.id } : null;
    case "MeshLayer":
      return layer.collection ? { kind: "MESH_COLLECTION", id: layer.collection.id } : null;
    case "NetworkLayer":
      return layer.collection ? { kind: "NETWORK_COLLECTION", id: layer.collection.id } : null;
    case "AnnotationLayer":
      return layer.annotationCollection
        ? { kind: "ANNOTATION_COLLECTION", id: layer.annotationCollection.id }
        : null;
    default:
      return layer.lens ? { kind: "DATASET", id: layer.lens.dataset.id } : null;
  }
};

/** A node key as the server spells it: `dataset:12`, `tabledataset:4`. */
const KEY_PREFIX: Record<`${LineageNodeKind}`, string> = {
  DATASET: "dataset",
  TABLE_DATASET: "tabledataset",
  SPARSE_DATASET: "sparsedataset",
  MESH_COLLECTION: "meshcollection",
  NETWORK_COLLECTION: "networkcollection",
  ANNOTATION_COLLECTION: "annotationcollection",
  FILE: "file",
};

export const nodeKey = (kind: `${LineageNodeKind}`, id: string) => `${KEY_PREFIX[kind]}:${id}`;

/** The containers the scene draws, once each: where the walk starts. */
export const drawnContainers = (layers: readonly DrawnLayerLike[]): LineageRootInput[] => {
  const seen = new Set<string>();
  const starts: LineageRootInput[] = [];
  for (const layer of layers) {
    const container = containerOf(layer);
    if (!container) continue;
    const key = nodeKey(container.kind, container.id);
    if (seen.has(key)) continue;
    seen.add(key);
    starts.push({ kind: container.kind as LineageNodeKind, id: container.id });
  }
  return starts;
};

/** The kinds a scene can draw as a layer. A sparse matrix is a chart; a file is not data. */
export const LAYERABLE: ReadonlySet<`${LineageNodeKind}`> = new Set([
  "DATASET",
  "TABLE_DATASET",
  "MESH_COLLECTION",
  "NETWORK_COLLECTION",
  "ANNOTATION_COLLECTION",
]);

export type DescendantsLike = {
  root: string;
  more: boolean;
  nodes: readonly {
    key: string;
    kind: `${LineageNodeKind}`;
    id: string;
    name: string;
    depth: number;
    parent: string;
  }[];
};

/** What the form needs of a child: the whole lens it opens on, and where that lens lives. */
export type ChildDetail = { wholeLens: string | null; space: string | null };

export type DerivedRow = {
  key: string;
  kind: `${LineageNodeKind}`;
  id: string;
  name: string;
  depth: number;
  /** The lens the Add layer form opens on. */
  wholeLens: string | null;
  /** Already a layer here: listed only to hold what was made from it. */
  drawn: boolean;
  /** Why it cannot be added, or null when it can. */
  blocked: "drawn" | "unplaced" | "loading" | null;
  children: DerivedRow[];
};

export type DerivedGroup = {
  /** The drawn container the tree hangs from. */
  root: string;
  rows: DerivedRow[];
  /** The walk stopped before the end: more lies below. */
  more: boolean;
};

/**
 * The walk as trees, one per drawn container. A node reached from two drawn
 * containers is listed under the first; a node the scene already draws stays
 * only when something it holds is still to add, so the tree keeps its shape.
 * `details` is keyed by node key and may lag the walk (its own request); a
 * row without one waits rather than guessing it unreachable.
 */
export const derivedTree = ({
  descendants,
  details,
  drawn,
  placed,
}: {
  descendants: readonly DescendantsLike[];
  details: ReadonlyMap<string, ChildDetail> | null;
  /** Node keys of the containers the scene draws. */
  drawn: ReadonlySet<string>;
  /** The spaces the scene's world reaches (`placedSystems`). */
  placed: ReadonlySet<string>;
}): DerivedGroup[] => {
  const listed = new Set<string>();
  const groups: DerivedGroup[] = [];

  for (const entry of descendants) {
    const nodes = entry.nodes.filter((node) => LAYERABLE.has(node.kind) && !listed.has(node.key));
    const byParent = new Map<string, typeof nodes>();
    const present = new Set(nodes.map((node) => node.key));
    for (const node of nodes) {
      // A parent the scene cannot layer (a sparse matrix in between) hands its
      // children to the root rather than losing them.
      const parent = present.has(node.parent) ? node.parent : entry.root;
      byParent.set(parent, [...(byParent.get(parent) ?? []), node]);
    }

    const build = (parent: string): DerivedRow[] =>
      (byParent.get(parent) ?? []).flatMap((node) => {
        const children = build(node.key);
        const isDrawn = drawn.has(node.key);
        if (isDrawn && children.length === 0) return [];
        const detail = details?.get(node.key);
        const blocked: DerivedRow["blocked"] = isDrawn
          ? "drawn"
          : !detail
            ? "loading"
            : !detail.wholeLens || !detail.space || !placed.has(detail.space)
              ? "unplaced"
              : null;
        return [
          {
            key: node.key,
            kind: node.kind,
            id: node.id,
            name: node.name,
            depth: node.depth,
            wholeLens: detail?.wholeLens ?? null,
            drawn: isDrawn,
            blocked,
            children,
          },
        ];
      });

    const rows = build(entry.root);
    const walk = (row: DerivedRow) => {
      listed.add(row.key);
      row.children.forEach(walk);
    };
    rows.forEach(walk);
    if (rows.length > 0 || entry.more) groups.push({ root: entry.root, rows, more: entry.more });
  }
  return groups;
};

const KIND_OF_PREFIX = Object.fromEntries(
  Object.entries(KEY_PREFIX).map(([kind, prefix]) => [prefix, kind]),
) as Record<string, `${LineageNodeKind}`>;

/** A node key read back: `dataset:12` → DATASET 12. */
export const parseNodeKey = (key: string): { kind: `${LineageNodeKind}`; id: string } | null => {
  const at = key.indexOf(":");
  const kind = KIND_OF_PREFIX[key.slice(0, at)];
  return at > 0 && kind ? { kind, id: key.slice(at + 1) } : null;
};

/**
 * What to look up, by the list each kind's details come from: every child,
 * and every drawn container (for its name).
 */
export const detailIds = (descendants: readonly DescendantsLike[]) => {
  const ids = {
    datasets: new Set<string>(),
    tables: new Set<string>(),
    meshes: new Set<string>(),
    networks: new Set<string>(),
    annotations: new Set<string>(),
  };
  const into: Partial<Record<`${LineageNodeKind}`, Set<string>>> = {
    DATASET: ids.datasets,
    TABLE_DATASET: ids.tables,
    MESH_COLLECTION: ids.meshes,
    NETWORK_COLLECTION: ids.networks,
    ANNOTATION_COLLECTION: ids.annotations,
  };
  for (const entry of descendants) {
    const root = parseNodeKey(entry.root);
    if (root) into[root.kind]?.add(root.id);
    for (const node of entry.nodes) into[node.kind]?.add(node.id);
  }
  return {
    datasets: [...ids.datasets],
    tables: [...ids.tables],
    meshes: [...ids.meshes],
    networks: [...ids.networks],
    annotations: [...ids.annotations],
  };
};
