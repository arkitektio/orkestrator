/**
 * Reading ONE slice of a sparse matrix, from the browser.
 *
 * A `SPARSE` colouring names a matrix and a position along the axis it
 * identifies itself — `{gene: 4711}` — and what comes back is one value per
 * object, which is exactly what a colouring is. Two reads answer it:
 *
 *     lo, hi = indptr[i], indptr[i + 1]     where the run for position i is
 *     indices[lo:hi], data[lo:hi]           the run
 *
 * Nothing else is fetched. Ask the layout whose `indptr` indexes the OTHER axis
 * and there is no range to read at all, only a scan — measured at 1,777 ms
 * against 2.2 ms on a 16 µm matrix. `pickLayout` refuses that rather than
 * serving it slowly, which is the same refusal the server makes when the
 * colouring is authored.
 *
 * ## What this deliberately does not do
 *
 * **It never reads `zarr.json` for the block.** The reference reader's
 * `describe()` costs five metadata GETs per layout to recover the path, the
 * indexed axis, the dtype and the chunking — all of which the server already
 * read off the artifact at `finishSparseUpload` and publishes on `SparseLayout`.
 * Selecting them (see `fragments/sparsedataset.graphql`) turns five round trips
 * into zero.
 *
 * **It does not request its own credentials.** `SparseStore.bucketKey` is
 * `"zarr"`, and a general zarr grant is bucket-wide, so the grant the scene
 * already holds and rotates covers every sparse store too. One provider, one
 * rotation, no second mutation.
 *
 * ## The cost, honestly
 *
 * First gene on a dataset: three array opens, one `indptr` chunk, two data
 * chunks. Every gene after: two chunk GETs against a warm store, because
 * `indptr` is held decoded on the handle. The payload is small at every pitch —
 * a feature slice averages 4,616 nonzeros at 16 µm and 6,718 at 2 µm, tens of
 * kilobytes — so what is being spent is round trips, not bytes.
 *
 * None of the millisecond figures published for this format are network
 * numbers: they are local-disk, warm-cache, and measured with `indptr` excluded
 * from the timer. Do not quote them here.
 */
import { get, open, root, slice, type Array as ZarrArray } from "zarrita";

import { ConfiguredS3Store } from "@/lib/zarr/store/s3Store";
import type { MikroClient } from "@/lib/zarr/store/types";
import type { SparseColouringSourceFragment } from "@/mikro-next/api/graphql";
import { buildS3FetchConfig, getGeneralAccess } from "../zarr/access";
import { LruMap } from "../attributes/lruMap";

/** A layout, paired with the store it lives in. */
/** What `openSparseLayout` needs of a store: where it is, and its shape. */
export type SparseLayoutChoiceStore = {
  id: string;
  key: string;
  shape?: readonly number[] | null;
};

/** What a read needs of a layout: where it sits, and how to unravel it. */
export type SparseLayoutChoiceLayout = {
  path: string;
  indexedAxis: number;
  indexOrder: readonly number[];
  rangeReadable?: boolean;
};

/** A layout, paired with the store it lives in. Structural, so both the
 * colouring's dataset fragment and an attribute plan's hop satisfy it. */
export type SparseLayoutChoice = {
  store: SparseLayoutChoiceStore;
  layout: SparseLayoutChoiceLayout;
  /** The axis `indptr` walks — the one a slice selects along. */
  indexedAxis: number;
  /** The axis a slice returns a value per: the mask's ids for a colouring,
   * the feature axis for a profile. */
  objectAxis: number;
};

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

export type SparseLayoutHandle = {
  choice: SparseLayoutChoice;
  indices: ZarrArray<never, never>;
  data: ZarrArray<never, never>;
  /**
   * The whole `indptr`, decoded and held.
   *
   * Feature-major it is one entry per feature — 19,060 for a transcriptome,
   * about 150 KB, one chunk at the writer's sizing — so the first gene warms it
   * and every gene after is a memory hit. Held HERE rather than left to the
   * store's chunk cache, which is shared with brick streaming and will evict it
   * during a pan.
   */
  indptr: Int32Array | BigInt64Array | Float64Array;
  /** How many objects a slice covers: the extent of the object axis. */
  slotCount: number;
};

const handles = new LruMap<Promise<SparseLayoutHandle>>(8);
const keyOf = (choice: SparseLayoutChoice) => `${choice.store.id}:${choice.layout.path}`;

/**
 * Open a layout's three arrays and take its `indptr`, once.
 *
 * Cached as the PROMISE, and self-evicting on rejection — the same shape
 * `columnValueCache` uses, so two colourings racing on one dataset share the
 * open rather than doubling it, and a failure does not stick.
 */
export const openSparseLayout = async (
  client: MikroClient,
  datalayer: string,
  choice: SparseLayoutChoice,
): Promise<SparseLayoutHandle> => {
  const key = keyOf(choice);
  const cached = handles.get(key);
  if (cached) return cached;

  const opening = (async (): Promise<SparseLayoutHandle> => {
    const descriptor = { key: choice.store.key, storeId: choice.store.id };
    const store = new ConfiguredS3Store(
      buildS3FetchConfig(await getGeneralAccess(client), descriptor, datalayer),
      {
        // The group root holds no array metadata to prime, and the arrays are
        // opened explicitly below.
        preloadMetadata: false,
        // A viewer left open outlives its credentials; rotation goes through
        // the same provider every other store uses.
        refreshConfig: async (options) =>
          buildS3FetchConfig(await getGeneralAccess(client, options), descriptor, datalayer),
      },
    );
    await store.ready();

    // `path` is the layout's own value — `layouts/axis{k}`, never a guess.
    const at = root(store).resolve(`/${choice.layout.path.replace(/^\/+/, "")}`);
    // `open.v3`, never bare `open()`: on a fresh store zarrita's auto-detect
    // probes v2 FIRST (`.zattrs`, then `.zarray`) before trying `zarr.json`,
    // and these three run concurrently, so each paid two 404s per open.
    const [indptrArray, indices, data] = await Promise.all([
      open.v3(at.resolve("indptr"), { kind: "array" }),
      open.v3(at.resolve("indices"), { kind: "array" }),
      open.v3(at.resolve("data"), { kind: "array" }),
    ]);
    const indptr = (await get(indptrArray as never)).data as SparseLayoutHandle["indptr"];

    const shape = choice.store.shape ?? [];
    return {
      choice,
      indices: indices as never,
      data: data as never,
      indptr,
      slotCount: shape[choice.objectAxis] ?? 0,
    };
  })();

  handles.set(key, opening);
  // Self-evict on failure, but only if this promise is still the cached one, so
  // a retry that already replaced it is left alone — `columnValueCache`'s rule.
  opening.catch(() => {
    if (handles.get(key) === opening) handles.take(key);
  });
  return opening;
};

export type SparseSlice = {
  /** The object-axis positions that carry a value. */
  indices: ArrayLike<number>;
  /** The values, parallel to `indices`. */
  values: ArrayLike<number>;
};

/** `indptr[position]`, whatever integer width it was stored at. */
const boundAt = (indptr: SparseLayoutHandle["indptr"], position: number): number =>
  Number(indptr[position] as number | bigint);

/**
 * The run for one position along the indexed axis.
 *
 * `indices` and `data` are fetched together rather than in sequence: they are
 * two independent ranges and the cost here is round trips.
 */
export const readSparseSlice = async (
  handle: SparseLayoutHandle,
  position: number,
): Promise<SparseSlice> => {
  const positions = handle.indptr.length - 1;
  if (!Number.isInteger(position) || position < 0 || position >= positions) {
    throw new Error(
      `position ${position} is outside the ${positions} this layout indexes — a position is a row of the table its axis references, not an id of its own`,
    );
  }
  const lo = boundAt(handle.indptr, position);
  const hi = boundAt(handle.indptr, position + 1);
  if (hi <= lo) return { indices: new Int32Array(0), values: new Float32Array(0) };

  const [indices, values] = await Promise.all([
    get(handle.indices as never, [slice(lo, hi)]),
    get(handle.data as never, [slice(lo, hi)]),
  ]);
  return {
    indices: (indices as { data: ArrayLike<number> }).data,
    values: (values as { data: ArrayLike<number> }).data,
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

/**
 * One raveled `indices` entry back into a coordinate per uncompressed axis,
 * in `order` — C order, last axis fastest, exactly as the writer raveled it.
 * `extents[d]` is the extent of `order[d]`. At rank two (`order` of one) the
 * entry IS the coordinate.
 */
export const unravel = (
  order: readonly number[],
  extents: readonly number[],
  raveled: number,
): number[] => {
  const coordinates = new Array<number>(order.length);
  let remainder = raveled;
  for (let d = order.length - 1; d >= 0; d -= 1) {
    const extent = extents[d] ?? 1;
    coordinates[d] = remainder % extent;
    remainder = Math.floor(remainder / extent);
  }
  return coordinates;
};
