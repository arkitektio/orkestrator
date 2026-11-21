import type { LineageNodeKind } from "@/mikro/api/graphql";
import type { ChildDetail, DescendantsLike } from "@/mikro/forms/addLayer/derived";

import type { NamedResident } from "../staging/DerivedResidents";

/**
 * What was made from a layer's dataset, for the "Derived" row of the layer's
 * float (`LayerRunFloat`): the server's lineage walk from the dataset, shaped
 * into the same residents a shape's card lists (`DerivedResident`), so both
 * floats draw them with one row (`ResidentItem`) — a dataset or a surface
 * shows itself in the scene, everything else opens its page.
 *
 * Pure: type-only imports, so it runs in vitest's `node` environment.
 */

/** How many hops below the dataset the row looks: as the scene's "Add derived". */
export const LAYER_DERIVED_DOWN = 3;

export type LayerDerived = {
  /** Made from the dataset itself. */
  direct: NamedResident[];
  /** Made from one of those, further down the same walk. */
  further: NamedResident[];
  /** The walk stopped before the end: more lies below. */
  more: boolean;
};

const residentOf = (
  node: DescendantsLike["nodes"][number],
  detail: ChildDetail | undefined,
): NamedResident | null => {
  const fullLens = detail?.wholeLens ? { id: detail.wholeLens } : null;
  switch (node.kind as `${LineageNodeKind}`) {
    case "DATASET":
      return { __typename: "ArrayDataset", id: node.id, name: node.name, fullLens } as NamedResident;
    case "TABLE_DATASET":
      return { __typename: "TableDataset", id: node.id, name: node.name } as NamedResident;
    case "SPARSE_DATASET":
      return { __typename: "SparseDataset", id: node.id, name: node.name } as NamedResident;
    case "MESH_COLLECTION":
      return { __typename: "MeshCollection", id: node.id, label: node.name, fullLens } as NamedResident;
    case "NETWORK_COLLECTION":
      return { __typename: "NetworkCollection", id: node.id, label: node.name } as NamedResident;
    case "ANNOTATION_COLLECTION":
      return { __typename: "AnnotationCollection", id: node.id, name: node.name } as NamedResident;
    default:
      // A file, a fixture, a single shape: not a container a float lists.
      return null;
  }
};

/**
 * The walk as two flat lists, each node once. `details` may lag the walk (its
 * own request): until it lands a dataset is listed without its whole lens, so
 * it opens its page rather than staging.
 */
export const layerDerived = (
  descendants: readonly DescendantsLike[],
  details: ReadonlyMap<string, ChildDetail> | null,
): LayerDerived => {
  const seen = new Set<string>();
  const result: LayerDerived = { direct: [], further: [], more: false };
  for (const entry of descendants) {
    result.more ||= entry.more;
    for (const node of entry.nodes) {
      if (seen.has(node.key) || node.key === entry.root) continue;
      const resident = residentOf(node, details?.get(node.key));
      if (!resident) continue;
      seen.add(node.key);
      (node.parent === entry.root ? result.direct : result.further).push(resident);
    }
  }
  return result;
};

export const layerDerivedCount = (derived: LayerDerived): number => derived.direct.length + derived.further.length;
