/**
 * Mikro's side of sparse reads: which layout a COLOURING wants, how a run
 * becomes `objectId -> value`, and the credentials mikro reads sparse stores
 * with. The reader itself — opening a layout, `indptr`, reading a run — is
 * shared with elektro and lives in `@/lib/sparse/sparseReader`.
 */
import type { MikroClient } from "@/lib/zarr/store/types";
import type { SparseColouringSourceFragment } from "@/mikro-next/api/graphql";
import {
  openSparseLayout as openSparseLayoutWith,
  unravel,
  type SparseLayoutChoice,
  type SparseLayoutHandle,
  type SparseSlice,
  type SparseStoreAccess,
} from "@/lib/sparse/sparseReader";
import { buildS3FetchConfig, getGeneralAccess } from "../zarr/access";

export {
  readSparseSlice,
  unravel,
  type SparseLayoutChoice,
  type SparseLayoutChoiceLayout,
  type SparseLayoutChoiceStore,
  type SparseLayoutHandle,
  type SparseSlice,
} from "@/lib/sparse/sparseReader";

/**
 * Mikro's credentials for sparse stores. `SparseStore.bucketKey` is `"zarr"`,
 * and a general zarr grant is bucket-wide, so the grant the scene already holds
 * and rotates covers every sparse store too: one provider, no second mutation.
 *
 * Memoized per client and datalayer, so every read shares one access object
 * rather than building a fresh one per call.
 */
const accessByClient = new WeakMap<MikroClient, Map<string, SparseStoreAccess>>();
export const mikroSparseAccess = (client: MikroClient, datalayer: string): SparseStoreAccess => {
  let byDatalayer = accessByClient.get(client);
  if (!byDatalayer) {
    byDatalayer = new Map();
    accessByClient.set(client, byDatalayer);
  }
  let access = byDatalayer.get(datalayer);
  if (!access) {
    access = {
      namespace: `mikro:${datalayer}`,
      configFor: async (store, options) =>
        buildS3FetchConfig(
          await getGeneralAccess(client, options),
          { key: store.key, storeId: store.id },
          datalayer,
        ),
    };
    byDatalayer.set(datalayer, access);
  }
  return access;
};

/** Open a layout with mikro's credentials. */
export const openSparseLayout = (
  client: MikroClient,
  datalayer: string,
  choice: SparseLayoutChoice,
): Promise<SparseLayoutHandle> => openSparseLayoutWith(mikroSparseAccess(client, datalayer), choice);

/**
 * The layout that answers "one value per object for this position".
 *
 * That is the layout indexed on the axis the colouring names a position along,
 * NOT the one indexed on the object axis. The object-major layout answers the
 * other question — one object's whole profile, which is a hover — and asking it
 * for a colouring is the scan.
 */
export const pickLayout = (
  dataset: SparseColouringSourceFragment,
  at: readonly { axis: string; value: number }[],
): SparseLayoutChoice | { error: string } => {
  if (at.length === 0) return { error: "a sparse colouring names a position, and this one names none" };

  const named = new Set(at.map((position) => position.axis));
  const objectAxisName = dataset.axisNames.find((axis) => !named.has(axis));
  if (objectAxisName === undefined) {
    return {
      error: `\`at\` names every axis of '${dataset.name}' (${dataset.axisNames.join(", ")}), leaving none for the mask's ids to run along`,
    };
  }
  const objectAxis = dataset.axisNames.indexOf(objectAxisName);

  for (const array of dataset.arrays) {
    for (const layout of array.store.layouts) {
      if (layout.path !== array.path) continue;
      const axisName = dataset.axisNames[layout.indexedAxis];
      if (!named.has(axisName)) continue;
      if (layout.rangeReadable) {
        // One uncompressed chunk per array: a "range read" of `data[lo:hi]` is
        // the whole of `data`. Refused rather than served as a several-hundred
        // megabyte GET for one gene.
        return {
          error: `'${dataset.name}' is stored byte-addressable, which a chunk-granular reader cannot slice — reading one position would download every value. Re-upload it without \`byte_addressable\`.`,
        };
      }
      return { store: array.store, layout, indexedAxis: layout.indexedAxis, objectAxis };
    }
  }

  return {
    error: `'${dataset.name}' holds no layout indexed on any of ${[...named].sort().join(", ")}, so there is no contiguous slice to read. It is indexed on: ${dataset.indexableAxes.join(", ") || "none"}.`,
  };
};

/**
 * A slice as the LUT painter wants it: `objectId -> value`.
 *
 * At rank two an `indices` entry IS the object-axis position, so the map is the
 * run verbatim. At rank three and above the run covers every uncompressed axis
 * raveled together, and only the entries matching the other named positions
 * survive — which is what makes a rank-three colouring one value per object
 * rather than several.
 */
export const sliceAsValues = (
  handle: SparseLayoutHandle,
  sliceRead: SparseSlice,
  dataset: SparseColouringSourceFragment,
  at: readonly { axis: string; value: number }[],
): Map<number, number> => {
  const order = handle.choice.layout.indexOrder;
  const values = new Map<number, number>();

  if (order.length <= 1) {
    for (let k = 0; k < sliceRead.indices.length; k += 1) {
      values.set(sliceRead.indices[k], sliceRead.values[k]);
    }
    return values;
  }

  // Unravel through `indexOrder` — the one fact in the format that cannot be
  // recovered from the bytes, so reading it wrong does not fail, it reads a
  // different cell.
  const shape = dataset.shape;
  const extents = order.map((axis) => shape[axis] ?? 1);
  const wanted = new Map<number, number>();
  for (const position of at) {
    const axis = dataset.axisNames.indexOf(position.axis);
    if (axis >= 0) wanted.set(axis, position.value);
  }

  for (let k = 0; k < sliceRead.indices.length; k += 1) {
    const coordinates = unravel(order, extents, sliceRead.indices[k]);
    let objectPosition = -1;
    let keep = true;
    for (let d = 0; d < order.length; d += 1) {
      const axis = order[d];
      const coordinate = coordinates[d];
      if (axis === handle.choice.objectAxis) objectPosition = coordinate;
      else if (wanted.has(axis) && wanted.get(axis) !== coordinate) keep = false;
    }
    if (keep && objectPosition >= 0) values.set(objectPosition, sliceRead.values[k]);
  }
  return values;
};

