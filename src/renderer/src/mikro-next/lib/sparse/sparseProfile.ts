/**
 * Reading ONE object's whole profile out of a sparse matrix — the HOVER
 * direction, and the twin of `sparseSource.ts` (the colouring direction).
 *
 * A SPARSE attribute hop names a matrix and the object-major layout to read
 * (`lookup.sparseArray`); the held id — a cell's label — is the position along
 * the axis that layout's `indptr` indexes, and what comes back is every
 * position along the value axes that carries a value: a transcriptome, a
 * metabolite panel. Two reads answer it (`readSparseSlice`), exactly as for a
 * colouring; only the layout differs, and the plan already names it, so
 * nothing is picked here.
 *
 * What comes back is SORTED by value, descending, and CAPPED (`limit`): the
 * HUD shows the strongest entries and says how many there were. The whole
 * sorted profile is held per (hop, id) so a limit change re-slices without
 * re-reading, and the capped state is held per (hop, id, limit) so the
 * tracker's synchronous re-hover path (`peek`) answers without a promise.
 *
 * Errors become `PlanRowsState`s rather than rejections: one bad id — an id
 * past the matrix's extent, a layout the store does not hold — must not take
 * the other hops of the point down with it.
 */
import type { MikroClient } from "@/lib/zarr/store/types";
import type {
  AttributePlanLike,
  AttributeRow,
  PlanRowsState,
  SparseHopLike,
} from "../attributes/attributeTypes";
import { hopKey } from "../attributes/attributeTypes";
import type { SparseProfileReaderLike } from "../attributes/executePlan";
import { LruMap } from "../attributes/lruMap";
import type { HeldValue } from "../attributes/planExec";
import { openSparseLayout, readSparseSlice, unravel, type SparseLayoutChoice } from "./sparseSlice";

/** One nonzero of a profile: where it sits along the value axes, and what it holds. */
export type SparseProfileEntry = {
  /** The position along the FIRST value axis — the row of the table that axis references. */
  position: number;
  /** One coordinate per value axis, in `valueAxes` order. */
  coords: readonly number[];
  value: number;
};

export type SparseProfile = {
  /** Sorted by value, descending; NaN last. */
  entries: readonly SparseProfileEntry[];
};

export type SparseProfileReaderDeps = {
  client: MikroClient;
  datalayer: string;
  /** Cap on profiles held whole (one per hovered object). */
  profileCap?: number;
  /** Cap on capped states (one per hovered object and limit). */
  stateCap?: number;
};

const DEFAULT_PROFILE_CAP = 64;
const DEFAULT_STATE_CAP = 256;

/**
 * The layout a hop reads, or why it cannot be read. The plan names the layout
 * by `path`; the store's `layouts` carry what the read needs of it.
 */
export const profileLayoutChoice = (hop: SparseHopLike): SparseLayoutChoice | { error: string } => {
  const array = hop.lookup.sparseArray;
  const dataset = hop.sparseDataset;
  const layout = array.store.layouts.find((candidate) => candidate.path === array.path);
  if (!layout) {
    return {
      error: `'${dataset.name}' holds no layout at '${array.path}' — the store lists ${
        array.store.layouts.map((candidate) => candidate.path).join(", ") || "none"
      }`,
    };
  }
  if (layout.rangeReadable) {
    // One uncompressed chunk per array: a "range read" of `data[lo:hi]` is the
    // whole of `data`. Refused rather than served as a several-hundred
    // megabyte GET per hover — the same refusal a colouring makes.
    return {
      error: `'${dataset.name}' is stored byte-addressable, which a chunk-granular reader cannot slice — reading one object would download every value. Re-upload it without \`byte_addressable\`.`,
    };
  }
  const valueAxis = hop.lookup.valueAxes[0];
  const objectAxis = valueAxis === undefined ? -1 : dataset.axisNames.indexOf(valueAxis);
  if (objectAxis < 0) {
    return {
      error: `'${dataset.name}' names no value axis this profile is indexed by (axes: ${dataset.axisNames.join(", ")})`,
    };
  }
  // `objectAxis` is the axis a slice returns a value PER — for a profile that
  // is the feature axis, so the handle's `slotCount` is the feature count.
  return { store: array.store, layout, indexedAxis: layout.indexedAxis, objectAxis };
};

/** A held id as a matrix position: a safe non-negative integer, or null. */
const toPosition = (id: HeldValue): number | null => {
  const value = typeof id === "bigint" ? Number(id) : id;
  if (typeof id === "bigint" && !Number.isSafeInteger(value)) return null;
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
};

const compareDesc = (a: SparseProfileEntry, b: SparseProfileEntry): number => {
  const an = Number.isNaN(a.value);
  const bn = Number.isNaN(b.value);
  if (an || bn) return an === bn ? 0 : an ? 1 : -1;
  return b.value - a.value;
};

/**
 * A run of `(indices, values)` as profile entries: rank two takes an index as
 * the position along the one value axis; above that the raveled index is
 * unravelled through the layout's `indexOrder` into one coordinate per value
 * axis, in the hop's `valueAxes` order.
 */
export const runAsProfile = (
  hop: SparseHopLike,
  layout: { indexOrder: readonly number[] },
  run: { indices: ArrayLike<number>; values: ArrayLike<number> },
): SparseProfile => {
  const order = layout.indexOrder;
  const axisNames = hop.sparseDataset.axisNames;
  const shape = hop.sparseDataset.shape;
  const valueAxes = hop.lookup.valueAxes.map((axis) => axisNames.indexOf(axis));
  const entries: SparseProfileEntry[] = [];

  if (order.length <= 1) {
    for (let k = 0; k < run.indices.length; k += 1) {
      const position = Number(run.indices[k]);
      entries.push({ position, coords: [position], value: Number(run.values[k]) });
    }
  } else {
    const extents = order.map((axis) => shape[axis] ?? 1);
    for (let k = 0; k < run.indices.length; k += 1) {
      const unravelled = unravel(order, extents, Number(run.indices[k]));
      const coords = valueAxes.map((axis) => {
        const slot = order.indexOf(axis);
        return slot >= 0 ? unravelled[slot] : -1;
      });
      entries.push({ position: coords[0] ?? -1, coords, value: Number(run.values[k]) });
    }
  }
  entries.sort(compareDesc);
  return { entries };
};

/** The capped, row-shaped state the HUD renders. */
export const profileState = (
  hop: SparseHopLike,
  profile: SparseProfile,
  limit: number,
): PlanRowsState => {
  const cap = Math.max(1, Math.floor(limit));
  const shown = profile.entries.slice(0, cap);
  const rows: AttributeRow[] = shown.map((entry) => {
    const row: AttributeRow = { position: entry.position, value: entry.value };
    hop.lookup.valueAxes.forEach((axis, k) => {
      row[axis] = entry.coords[k];
    });
    return row;
  });
  const state: PlanRowsState = { status: "rows", rows };
  if (profile.entries.length > rows.length) {
    state.truncated = { shown: rows.length, total: profile.entries.length };
  }
  return state;
};

export function createSparseProfileReader(deps: SparseProfileReaderDeps): SparseProfileReaderLike {
  const profiles = new LruMap<Promise<SparseProfile>>(deps.profileCap ?? DEFAULT_PROFILE_CAP);
  const settled = new LruMap<SparseProfile>(deps.profileCap ?? DEFAULT_PROFILE_CAP);
  const states = new LruMap<PlanRowsState>(deps.stateCap ?? DEFAULT_STATE_CAP);
  let disposed = false;

  const profileKey = (plan: AttributePlanLike, hop: SparseHopLike, position: number) =>
    `${hopKey(plan, hop)}|${position}`;

  const profileFor = (
    plan: AttributePlanLike,
    hop: SparseHopLike,
    choice: SparseLayoutChoice,
    position: number,
  ): Promise<SparseProfile> => {
    const key = profileKey(plan, hop, position);
    const cached = profiles.get(key);
    if (cached) return cached;
    const pending = (async () => {
      const handle = await openSparseLayout(deps.client, deps.datalayer, choice);
      const run = await readSparseSlice(handle, position);
      const profile = runAsProfile(hop, choice.layout, run);
      settled.set(key, profile);
      return profile;
    })();
    profiles.set(key, pending);
    // Self-evict on failure, so a transient error does not stick for the
    // session — only if this promise is still the cached one.
    pending.catch(() => {
      if (profiles.get(key) === pending) profiles.take(key);
    });
    return pending;
  };

  const errorState = (error: unknown): PlanRowsState => ({
    status: "error",
    rows: [],
    error: error instanceof Error ? error.message : String(error),
  });

  return {
    async read(plan, hop, id, options) {
      if (disposed) return null;
      const position = toPosition(id);
      if (position === null) {
        return errorState(new Error(`a matrix position must be a non-negative integer, got ${String(id)}`));
      }
      const stateKey = `${profileKey(plan, hop, position)}|${options.limit}`;
      const cachedState = states.get(stateKey);
      if (cachedState) return cachedState;
      const choice = profileLayoutChoice(hop);
      if ("error" in choice) return errorState(new Error(choice.error));
      let profile: SparseProfile;
      try {
        profile = await profileFor(plan, hop, choice, position);
      } catch (error) {
        return errorState(error);
      }
      if (options.isStale?.() || disposed) return null;
      const state = profileState(hop, profile, options.limit);
      states.set(stateKey, state);
      return state;
    },

    peek(plan, hop, id, limit) {
      const position = toPosition(id);
      if (position === null) return null;
      const key = profileKey(plan, hop, position);
      const stateKey = `${key}|${limit}`;
      const cachedState = states.get(stateKey);
      if (cachedState) return cachedState;
      const profile = settled.get(key);
      if (!profile) return null;
      const state = profileState(hop, profile, limit);
      states.set(stateKey, state);
      return state;
    },

    warm(_plan, hop) {
      if (disposed) return;
      const choice = profileLayoutChoice(hop);
      if ("error" in choice) return;
      // Opening the layout decodes and holds `indptr` — the one read every
      // profile on this matrix shares. Failures resurface on the read path.
      void openSparseLayout(deps.client, deps.datalayer, choice).catch(() => undefined);
    },

    dispose() {
      disposed = true;
      profiles.drain();
      settled.drain();
      states.drain();
    },
  };
}
