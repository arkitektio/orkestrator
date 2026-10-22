/**
 * What goes into a collaboration alongside the objects put in it: the data
 * derived from them, down to a depth, or a hand-picked part of it.
 *
 * The walk is the server's (`descendants`, as the scene's "Add derived" list
 * reads it); this module only turns it into a tree to tick and into the
 * ordered refs `addManyToCollaboration` takes.
 *
 * Pure: type-only imports from the generated api, so it runs in vitest's
 * `node` environment.
 */

import type { LineageNodeKind, LineageRootInput } from "../../api/graphql";
import type { DescendantsLike } from "../addLayer/derived";

export type DerivedMode = "none" | "all" | "custom";

export const MIN_DEPTH = 1;
export const MAX_DEPTH = 10;
export const DEFAULT_DEPTH = 3;

/** The structure each lineage kind is put in a collaboration as. */
export const LINEAGE_IDENTIFIER: Record<`${LineageNodeKind}`, string> = {
  DATASET: "@mikro/arraydataset",
  TABLE_DATASET: "@mikro/tabledataset",
  SPARSE_DATASET: "@mikro/sparsedataset",
  MESH_COLLECTION: "@mikro/meshcollection",
  NETWORK_COLLECTION: "@mikro/networkcollection",
  ANNOTATION_COLLECTION: "@mikro/annotationcollection",
  FILE: "@mikro/file",
};

const KIND_OF_IDENTIFIER = Object.fromEntries(
  Object.entries(LINEAGE_IDENTIFIER).map(([kind, identifier]) => [identifier, kind]),
) as Record<string, `${LineageNodeKind}`>;

export type CollaborationRef = { identifier: string; id: string };

/** Where the walk starts for an object, or null when it has no lineage of its own (a scene, a folder). */
export const lineageRootOf = (object: CollaborationRef): LineageRootInput | null => {
  const kind = KIND_OF_IDENTIFIER[object.identifier];
  return kind ? { kind: kind as LineageNodeKind, id: object.id } : null;
};

export type DerivedNode = CollaborationRef & {
  key: string;
  kind: `${LineageNodeKind}`;
  name: string;
  /** Hops below the object it was made from. */
  depth: number;
  /** The node key it hangs from in the tree: its parent, or the object the walk started at. */
  parent: string;
  children: DerivedNode[];
};

export type DerivedForest = {
  /** The node keys of the objects the walk started at, which the trees hang from. */
  roots: string[];
  /** The trees, every root's in turn; the roots themselves are not in them. */
  trees: DerivedNode[];
  /** The walk stopped before the end: by depth, fan-out or limit. */
  more: boolean;
};

/**
 * The walk as trees under the objects it started from. A node reached from
 * two of them is listed under the first; one that is itself being put in is
 * left out (it goes in anyway, with its own tree).
 */
export const derivedForest = (descendants: readonly DescendantsLike[]): DerivedForest => {
  const roots = new Set(descendants.map((entry) => entry.root));
  const listed = new Set<string>();
  const trees: DerivedNode[] = [];
  let more = false;

  for (const entry of descendants) {
    more ||= entry.more;
    const nodes = entry.nodes.filter((node) => !roots.has(node.key) && !listed.has(node.key));
    const present = new Set(nodes.map((node) => node.key));
    const byParent = new Map<string, typeof nodes>();
    for (const node of nodes) {
      // A parent left out (another root, listed already) hands its children up.
      const parent = present.has(node.parent) ? node.parent : entry.root;
      byParent.set(parent, [...(byParent.get(parent) ?? []), node]);
    }
    const build = (parent: string): DerivedNode[] =>
      (byParent.get(parent) ?? []).map((node) => {
        listed.add(node.key);
        return {
          key: node.key,
          kind: node.kind,
          identifier: LINEAGE_IDENTIFIER[node.kind],
          id: node.id,
          name: node.name,
          depth: node.depth,
          parent,
          children: build(node.key),
        };
      });
    trees.push(...build(entry.root));
  }
  return { roots: [...roots], trees, more };
};

/** Every node, parents before their children. */
export const flatten = (trees: readonly DerivedNode[]): DerivedNode[] =>
  trees.flatMap((node) => [node, ...flatten(node.children)]);

/** The keys of a node and everything below it. */
export const subtreeKeys = (node: DerivedNode): string[] => flatten([node]).map((n) => n.key);

/**
 * Whether a row is ticked in the custom tree: what the user ticked or
 * unticked, else whether it lies within the depth. Changing the depth only
 * seeds the rows it reaches; a choice made by hand stays.
 */
export const isPicked = (node: DerivedNode, depth: number, overrides: ReadonlyMap<string, boolean>) =>
  overrides.get(node.key) ?? node.depth <= depth;

/** What goes in with the objects, parents first. */
export const pickDerived = (
  forest: DerivedForest,
  mode: DerivedMode,
  depth: number,
  overrides: ReadonlyMap<string, boolean>,
): DerivedNode[] => {
  if (mode === "none") return [];
  const nodes = flatten(forest.trees);
  return mode === "all"
    ? nodes.filter((node) => node.depth <= depth)
    : nodes.filter((node) => isPicked(node, depth, overrides));
};

/** The refs `addManyToCollaboration` takes: the objects, then what was picked, each once. */
export const collaborationRefs = (
  objects: readonly CollaborationRef[],
  derived: readonly CollaborationRef[],
): CollaborationRef[] => {
  const seen = new Set<string>();
  return [...objects, ...derived].filter((ref) => {
    const key = `${ref.identifier}:${ref.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
