/**
 * Reading ONE slice of a sparse matrix, from the browser — for any service.
 *
 * Shared by mikro (sparse colourings and profiles) and elektro (spike rasters):
 * the anndata CSR/CSC layout is the same format in both, and so is the cost
 * model. What differs is only WHO grants the credentials, so that is injected
 * (`SparseStoreAccess`) rather than imported. Choosing the layout is the
 * caller's business too: a colouring wants the layout indexed on the named
 * position (mikro's `pickLayout`), a raster the one indexed on the unit axis.
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
 * **It does not request its own credentials.** The caller passes a
 * `SparseStoreAccess` — mikro's binds its general zarr grant (bucket-wide, so it
 * covers every sparse store), elektro's its sparse grant. One provider per
 * service, one rotation.
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
 *
 * ## Where the reads run
 *
 * Every read goes through the shared worker runner (`readArrayWindow`), never
 * zarrita's main-thread `get()`, and at `fidelity: "exact"`: `indptr` and
 * `indices` are integer offsets that the runner's default float32 promotion
 * would round past 2^24, and an offset off by one reads a different cell.
 */
import { root } from "zarrita";

import { ByteBudgetChunkCache } from "@/lib/zarr/caches/byteBudgetChunkCache";
import { openZarrArray, type OpenedZarrArray } from "@/lib/zarr/openArray";
import { workerPool } from "@/lib/zarr/pool/sharedWorkerPool";
import { readArrayWindow } from "@/lib/zarr/readArrayWindow";
import { ConfiguredS3Store } from "@/lib/zarr/store/s3Store";
import type { S3FetchConfig } from "@/lib/zarr/runner/s3-request";
import { LruMap } from "@/lib/generic/lruMap";

/**
 * Where a service's sparse stores are, and the credentials to read them.
 *
 * `namespace` scopes the handle cache: store ids are only unique within one
 * service, and a mikro id and an elektro id must never share an open handle.
 * `configFor` is called on open and again on every credential rotation
 * (`forceRefresh` when S3 rejected a grant still believed valid).
 */
export type SparseStoreAccess = {
  namespace: string;
  configFor: (
    store: { id: string; key: string },
    options?: { forceRefresh?: boolean },
  ) => Promise<S3FetchConfig>;
};

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
  rangeReadable?: boolean | null;
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
 * Decoded chunks of sparse reads. Exact-dtype chunks, so they must not share a
 * cache with any promoting reader (the chunk key does not carry the fidelity).
 */
const SPARSE_CHUNK_CACHE = new ByteBudgetChunkCache(64 * 1024 * 1024);

export type SparseLayoutHandle = {
  choice: SparseLayoutChoice;
  indices: OpenedZarrArray;
  data: OpenedZarrArray;
  /**
   * The whole `indptr`, decoded and held.
   *
   * Feature-major it is one entry per feature — 19,060 for a transcriptome,
   * about 150 KB, one chunk at the writer's sizing — so the first gene warms it
   * and every gene after is a memory hit. Held HERE rather than left to the
   * store's chunk cache, which is shared with brick streaming and will evict it
   * during a pan.
   */
  indptr: ArrayLike<number | bigint>;
  /** How many objects a slice covers: the extent of the object axis. */
  slotCount: number;
};

const handles = new LruMap<Promise<SparseLayoutHandle>>(8);
const keyOf = (access: SparseStoreAccess, choice: SparseLayoutChoice) =>
  `${access.namespace}:${choice.store.id}:${choice.layout.path}`;

/**
 * Open a layout's three arrays and take its `indptr`, once.
 *
 * Cached as the PROMISE, and self-evicting on rejection — the same shape
 * `columnValueCache` uses, so two colourings racing on one dataset share the
 * open rather than doubling it, and a failure does not stick.
 */
export const openSparseLayout = async (
  access: SparseStoreAccess,
  choice: SparseLayoutChoice,
): Promise<SparseLayoutHandle> => {
  const key = keyOf(access, choice);
  const cached = handles.get(key);
  if (cached) return cached;

  const opening = (async (): Promise<SparseLayoutHandle> => {
    const target = { id: choice.store.id, key: choice.store.key };
    const store = new ConfiguredS3Store(await access.configFor(target), {
      // The group root holds no array metadata to prime, and the arrays are
      // opened explicitly below.
      preloadMetadata: false,
      // A viewer left open outlives its credentials; rotation goes through
      // the same provider the service uses everywhere else.
      refreshConfig: (options) => access.configFor(target, options),
    });
    await store.ready();

    // `path` is the layout's own value — `layouts/axis{k}`, never a guess.
    // `openZarrArray` opens v3 only (on a fresh store zarrita's auto-detect
    // probes v2 first, two 404s per open) and reads the fetch metadata, so the
    // runner plans against the INNER chunk shape of a sharded layout.
    const at = root(store).resolve(`/${choice.layout.path.replace(/^\/+/, "")}`);
    const [indptrArray, indices, data] = await Promise.all([
      openZarrArray(at.resolve("indptr")),
      openZarrArray(at.resolve("indices")),
      openZarrArray(at.resolve("data")),
    ]);
    const indptr = (await readSparseRun(indptrArray, null)).data;

    const shape = choice.store.shape ?? [];
    return {
      choice,
      indices,
      data,
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
    readSparseRun(handle.indices, { start: lo, stop: hi }),
    readSparseRun(handle.data, { start: lo, stop: hi }),
  ]);
  return { indices: asNumbers(indices.data), values: asNumbers(values.data) };
};

/**
 * The runs for a CONTIGUOUS block of positions `[from, to)` along the indexed
 * axis, in one read of `indices` and one of `data`.
 *
 * Adjacent positions' runs are adjacent in the arrays (that is what `indptr`
 * says), so a block of units is one range, not one per unit — the difference
 * between two requests for a raster and two hundred. `offsets[k]..offsets[k+1]`
 * is position `from + k`'s run within the returned arrays.
 */
export type SparseBlock = {
  from: number;
  to: number;
  offsets: Float64Array;
  indices: ArrayLike<number>;
  values: ArrayLike<number>;
};

export const readSparseBlock = async (
  handle: SparseLayoutHandle,
  from: number,
  to: number,
): Promise<SparseBlock> => {
  const positions = handle.indptr.length - 1;
  const lo = Math.max(0, Math.min(positions, from));
  const hi = Math.max(lo, Math.min(positions, to));
  const offsets = new Float64Array(hi - lo + 1);
  const base = boundAt(handle.indptr, lo);
  for (let k = 0; k <= hi - lo; k++) offsets[k] = boundAt(handle.indptr, lo + k) - base;
  const end = base + offsets[hi - lo];
  if (end <= base) {
    return { from: lo, to: hi, offsets, indices: new Int32Array(0), values: new Float32Array(0) };
  }
  const [indices, values] = await Promise.all([
    readSparseRun(handle.indices, { start: base, stop: end }),
    readSparseRun(handle.data, { start: base, stop: end }),
  ]);
  return { from: lo, to: hi, offsets, indices: asNumbers(indices.data), values: asNumbers(values.data) };
};

/** Nonzeros in a block of positions — what a read of it would cost, before making it. */
export const blockNnz = (handle: SparseLayoutHandle, from: number, to: number): number =>
  boundAt(handle.indptr, Math.min(handle.indptr.length - 1, to)) -
  boundAt(handle.indptr, Math.max(0, from));

/** One exact-dtype 1-D read through the worker runner (null = the whole array). */
const readSparseRun = (array: OpenedZarrArray, range: { start: number; stop: number } | null) =>
  readArrayWindow(array, [range], {
    pool: workerPool,
    cache: SPARSE_CHUNK_CACHE,
    fidelity: "exact",
  });

/**
 * A run as plain numbers. An int64 run arrives as a BigInt64Array; positions
 * and values sit far below 2^53, so `Number()` is exact here. (`indptr` is kept
 * as read and converted per lookup in `boundAt`.)
 */
const asNumbers = (data: ArrayLike<number | bigint>): ArrayLike<number> => {
  if (
    typeof BigInt64Array !== "undefined" &&
    (data instanceof BigInt64Array || data instanceof BigUint64Array)
  ) {
    return Float64Array.from(data, Number);
  }
  return data as ArrayLike<number>;
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
