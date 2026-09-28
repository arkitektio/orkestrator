import type * as THREE from "three";
import type { AttributePlanLike } from "@/mikro/lib/attributes/attributeTypes";
import type { AttributeLookupEngine } from "@/mikro/lib/attributes/lookupEngine";
import {
  resolveColumnValues,
  type ColumnLutEntryColorBy,
  type ColumnLutEntryFilterBy,
} from "../../platform/attributes/columnLut";
import {
  VALUE_LUT_BYTES_PER_TEXEL,
  acquireValueLut,
  encodeValue,
  idRangeOf,
  paintValueLut,
  valueCount,
  valueLutTexels,
  type ValueLutArena,
  type ValueSource,
} from "../../platform/attributes/valueLut";
import type { SparseReadRequest, SparseReader, SparseSliceRead } from "@/mikro/lib/sparse/sparseSource";
import {
  readColumnByObjectIdBatchedCached,
  readColumnValuesBatchedCached,
} from "../../platform/attributes/columnValueCache";
import type { AttributeLookupEngine as Engine } from "@/mikro/lib/attributes/lookupEngine";
import type { TableAccess } from "../../platform/attributes/columnLut";

export { LUT_WIDTH } from "../../platform/attributes/columnLut";

/**
 * The id → RGBA lookup a LABEL layer's stored `colorBys` / `filterBys` resolve
 * to — the mesh feature's twin, over the same relation and with the same
 * semantics (they live in `platform/attributes/columnLut.ts`, shared).
 *
 * THE ONE REAL DIFFERENCE: fabriks indexes the LUT by a DENSE ordinal its
 * vertices carry, and a mask's pixels carry SPARSE raw ids with no ordinal
 * anywhere. So this indexes directly by the id, offset to the smallest one
 * present:
 *
 *     slot = id - idOffset        (idOffset = the smallest id, so it lands at 0)
 *
 * Why direct indexing rather than a hash table in the texture: real segmentation
 * ids are dense small integers (skimage, cellpose and friends label 1..N), so the
 * texture is usually a few hundred KB, and the shader stays the same four lines
 * fabriks uses. A shader-side hash would be correct at any sparsity but costs a
 * data-dependent probe loop per fragment — in a shader we cannot unit-test
 * without a GPU — to solve a case that essentially does not occur. The offset
 * handles the one cheap generalisation (ids that all sit above some floor), and
 * `LABEL_LUT_MAX_TEXELS` refuses the pathological rest rather than allocating
 * hundreds of MB.
 *
 * WHERE THE IDS COME FROM: the lookup table's ROWS, not the mask's pixels. A
 * pixel scan would mean reading the whole mask back off the GPU; the table
 * already answers it, because `readColumnByObjectId`'s keys ARE the ids that have
 * a row. An id in the mask with no row keeps the identity texel (white, opaque)
 * and therefore its hue hash and its visibility — a filter must never hide
 * something because a read did not cover it.
 */

/**
 * The largest LUT this will build, as what it has always actually been: a
 * MEMORY budget.
 *
 * A cap rather than a fallback, and a LOUD one: over it nothing is built and the
 * reason lands on `skipped`, which the layer surfaces. Silently building a
 * 500 MB texture, or silently painting nothing, are both worse than refusing.
 *
 * It used to be spelled as a texel count (4,194,304) with "≈ 16 MB at RGBA8" in
 * the comment, which tied the budget to an encoding that is about to change.
 * Stated in bytes it survives that: at RGBA8 it is the same 4,194,304 texels it
 * always was, and a narrower texel buys proportionally more of them.
 *
 * The device is NOT the binding constraint. `LUT_WIDTH` is 2048 and WebGPU
 * guarantees `maxTextureDimension2D >= 8192`, so the smallest legal device
 * still addresses 16,777,216 slots — three times what a 2 µm bin lattice needs.
 * What we are actually rationing is host and GPU memory.
 */
export const LABEL_LUT_MAX_BYTES = 16 * 1024 * 1024;

/** How many slots that budget buys at a given texel width. */
export const labelLutMaxTexels = (bytesPerTexel: number): number =>
  Math.floor(LABEL_LUT_MAX_BYTES / Math.max(1, bytesPerTexel));

/**
 * The budget in texels for the RG8 value table this module builds.
 *
 * Two bytes a slot rather than four is what brings a 2 µm bin lattice
 * (5,479,660 slots, 11.0 MB) inside the same 16 MB budget that refused it at
 * RGBA8 (21.9 MB). The budget did not move; the texel got narrower.
 */
export const LABEL_LUT_MAX_TEXELS = labelLutMaxTexels(VALUE_LUT_BYTES_PER_TEXEL);

/** One slice of a matrix, as both a colouring and a rule consume it.
 *  Defined with the reader that produces it; re-exported here because this
 *  module's request type is where most callers meet it. */
export type { SparseSliceRead } from "@/mikro/lib/sparse/sparseSource";

export type LabelColorLutRequest = {
  colorBy: ColumnLutEntryColorBy | null;
  /** Present only when the active colouring reads a sparse matrix. */
  sparse?: SparseReadRequest | null;
  /**
   * Reads one slice of ANY matrix, for the RULES.
   *
   * Separate from `sparse` because a rule need not name the matrix the
   * colouring does — "colour by ion A, keep the cells where ion B is above x"
   * is two matrices, or one matrix and one column — so a rule's source is
   * resolved by id at read time rather than fetched once by the caller.
   * Absent (no datalayer) means a sparse rule cannot be read; it is then
   * `skipped` rather than silently applied to nothing.
   */
  readSparse?: SparseReader | null;
  filterBys: readonly ColumnLutEntryFilterBy[];
  /** The mask's attribute plans, for each table's store and key column. */
  plans: readonly AttributePlanLike[];
  /** The zarr store of the mask's level 0 — which ARRAY plan answers for it. */
  storeId: string;
  engine: AttributeLookupEngine;
  /**
   * The previous build's table, to refill instead of allocating.
   *
   * Only adopted when the slot count matches, which for a gene switch over one
   * dataset it always does — the table spans the object axis and the gene only
   * decides what goes in it.
   */
  reuse?: ValueLutArena | null;
  /**
   * Checked once, after the reads and BEFORE anything is written.
   *
   * The reads are the slow part and the paint is synchronous, so this is the
   * only point at which a superseded build can bow out — and with `reuse` it is
   * the point at which it MUST: two builds racing on one shared buffer would
   * otherwise interleave, and the last one to finish reading would not be the
   * last one to write. Returning false here means nothing was allocated and
   * nothing was touched, so the caller has nothing to free.
   */
  stillWanted?: () => boolean;
};

export type LabelColorLutResult = {
  /**
   * Null when nothing could be built — no readable entry, ids too sparse to
   * index, or the build was superseded. The caller switches the LUT off and the
   * mask falls back to its hue hash; `skipped` says why, so a refusal is never
   * silent.
   */
  texture: THREE.DataTexture | null;
  width: number;
  height: number;
  /** Subtract from an id to get its slot. The shader's `uLutIdOffset`. */
  idOffset: number;
  /** Entries that were not rendered, and why. */
  skipped: string[];
  /** The range the codes were quantised over — `uLutValueMin`/`Max`. */
  valueMin: number;
  valueMax: number;
  /**
   * The table this build painted into — the next build's `reuse`.
   *
   * Null when nothing was built. When it is the SAME object the caller passed as
   * `reuse`, the texture was refilled in place and must not be disposed.
   */
  arena?: ValueLutArena | null;
  /**
   * `stillWanted()` said no. Nothing was allocated and nothing was written;
   * the caller should drop this result without binding or disposing anything.
   */
  superseded?: boolean;
};

/** The result a superseded or empty build returns. Nothing to bind, nothing to free. */
const nothing = (skipped: string[], superseded = false): LabelColorLutResult => ({
  texture: null,
  width: 0,
  height: 0,
  idOffset: 0,
  skipped,
  valueMin: 0,
  valueMax: 1,
  arena: null,
  superseded,
});

/**
 * The extent of the ids that have a row in any entry we managed to read.
 *
 * The extent is all the allocation needs — `slot = id - idOffset` addresses the
 * whole range whether or not every id in it has a row. This used to also return
 * the ids themselves, as a `Set` spread into an `Array`, which at a bin
 * lattice's scale was two structures as long as the id range built only to be
 * walked once. The painter iterates the value maps directly instead.
 */
const idExtent = (
  colorValues: ValueSource | null,
  ruleValues: readonly (ValueSource | null)[],
): { min: number; max: number } | null => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let seen = false;
  const consider = (values: ValueSource | null) => {
    if (!values) return;
    const range = idRangeOf(values);
    if (!range) return;
    seen = true;
    if (range.min < min) min = range.min;
    if (range.max > max) max = range.max;
  };
  consider(colorValues);
  for (const values of ruleValues) consider(values);
  return seen ? { min, max } : null;
};

/**
 * The column reader the label path uses: columnar, falling back to rows.
 *
 * The columnar read is the whole point — over 5.5 M rows the row path spends
 * about 1.1 s building a `Map<number, unknown>` that then holds ~320 MB, and
 * this reads the same column as two typed arrays with no per-row object. But it
 * can decline (a result with no columnar view, a non-numeric key column), and a
 * colouring that declines must still paint, so the map reader stays as the
 * fallback rather than as a second code path anyone has to choose between.
 */
const readLabelColumn = async (
  engine: Engine,
  access: TableAccess,
  column: string,
): Promise<ValueSource | null> =>
  (await readColumnValuesBatchedCached(engine, access, column)) ??
  (await readColumnByObjectIdBatchedCached(engine, access, column));

export const buildLabelColorLut = async (
  request: LabelColorLutRequest,
): Promise<LabelColorLutResult> => {
  const { colorBy, filterBys, plans, storeId, engine, sparse, readSparse, reuse, stillWanted } =
    request;
  const wanted = () => (stillWanted ? stillWanted() : true);

  /**
   * Every RULE that reads a matrix, read.
   *
   * Kept here rather than inside `resolveColumnValues`, which is the DuckDB
   * path and is deliberately free of Apollo and of the store: it narrows a
   * sparse entry away and answers null for it. These reads then take those
   * nulls' places below.
   *
   * A rule that cannot be read is `skipped`, never silently dropped: a filter
   * that quietly applies to nothing reads on screen as a filter that is
   * working.
   */
  const readSparseRules = async (
    skipped: string[],
  ): Promise<(SparseSliceRead | null)[]> =>
    Promise.all(
      filterBys.map(async (rule) => {
        if (rule.dataset == null) return null;
        if (!readSparse) {
          skipped.push(
            `rule over matrix ${rule.dataset}: no datalayer connection, so the slice could not be read`,
          );
          return null;
        }
        try {
          return await readSparse(rule.dataset, rule.at ?? []);
        } catch (error) {
          skipped.push(
            `rule over matrix ${rule.dataset}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          return null;
        }
      }),
    );

  // A sparse colouring reads a slice of a matrix, not a column of a table, so
  // it bypasses the DuckDB path entirely — there is no SQL and no database in
  // it. Everything downstream is indifferent: the painter takes a
  // `Map<objectId, value>` and does not care where it came from.
  if (colorBy && sparse) {
    const at = (colorBy.at ?? []).map((position) => ({
      axis: position.axis,
      value: position.value,
    }));
    const { values, slotCount: extent } = await sparse.read(sparse.source, at);
    // The slot table spans the OBJECT axis, not the ids that happened to carry
    // a value. That is what makes it gene-independent, and therefore reusable
    // across gene switches.
    const slotCount = Math.max(1, extent);
    const skipped: string[] = [];
    // KNOWN LIMITATION, stated loudly rather than silently: this path writes
    // the whole table from one slice and never reaches the visibility pass, so
    // rules are not applied while the COLOURING is sparse. (They apply to a
    // sparse colouring's siblings — a column colouring with a sparse rule goes
    // through the generic path below and works.) Lifting it means folding this
    // path into that one, which is a change to how the table is allocated and
    // quantised, not an addition.
    if (filterBys.length > 0) {
      skipped.push(
        `${filterBys.length} rule(s): a colouring that reads a matrix paints every slot from that slice, so no filter is applied while it is the active colouring`,
      );
    }
    if (valueLutTexels(slotCount) > LABEL_LUT_MAX_TEXELS) {
      skipped.push(
        `'${sparse.source.name}' runs to ${slotCount} objects, so the lookup table is ${Math.round((slotCount * VALUE_LUT_BYTES_PER_TEXEL) / 1e6)} MB against a budget of ${Math.round(LABEL_LUT_MAX_BYTES / 1e6)} MB — no colouring is applied`,
      );
      return nothing(skipped);
    }

    // A bin absent from the slice has expression exactly ZERO — a slice is the
    // complete truth for its feature — so the window must include 0 or an
    // all-positive gene would start its ramp at its own minimum.
    let min = 0;
    let max = 0;
    for (const value of values.values()) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (max === min) max = min + 1;

    // The read is done; from here nothing awaits. Bow out before the first
    // write, because `reuse`'s buffer is the LIVE one.
    if (!wanted()) return nothing(skipped, true);

    // The baseline IS the code for zero, written as the fill.
    // This used to allocate at `CODE_NO_VALUE` and then walk every slot testing
    // for it — two full passes over up to eight million slots, the second one
    // branchy, to express what one memset says.
    const arena = acquireValueLut(reuse, slotCount, encodeValue(0, min, max));
    const { lut } = arena;
    for (const [objectId, value] of values) {
      if (objectId < 0 || objectId >= slotCount) continue;
      lut.view[objectId] = encodeValue(value, min, max);
    }

    return {
      texture: arena.texture,
      width: lut.width,
      height: lut.height,
      // `indptr[id]` IS the object-axis position, so the ids are the slots.
      idOffset: 0,
      skipped,
      valueMin: min,
      valueMax: max,
      arena,
    };
  }

  const { colorValues, ruleValues, skipped } = await resolveColumnValues<ValueSource>({
    colorBy,
    filterBys,
    plans,
    engine,
    want: { kind: "array", storeId },
    // Cached for the same reason as the mesh builder: knob nudges rebuild the
    // LUT, the column values change with none of them.
    readColumn: readLabelColumn,
  });

  // The sparse rules take the nulls `resolveColumnValues` left for them. From
  // here nothing downstream knows the difference: a slice arrives as
  // `objectId -> value`, which is one of the two shapes a `ValueSource` is.
  const sparseRules = await readSparseRules(skipped);
  let sparseSlots = 0;
  for (let index = 0; index < sparseRules.length; index += 1) {
    const read = sparseRules[index];
    if (!read) continue;
    ruleValues[index] = read.values as ValueSource;
    if (read.slotCount > sparseSlots) sparseSlots = read.slotCount;
  }

  const present = idExtent(colorValues, ruleValues);
  if (!present && sparseSlots === 0) {
    // Nothing readable resolved. No texture rather than an all-identity one: the
    // caller switches the LUT off entirely, which is cheaper than binding a
    // texture that says "change nothing".
    return nothing(skipped);
  }

  // `slot = id - idOffset`, so the offset is the smallest id present and the
  // lowest id always lands at slot 0. Clamped at 0 because a negative offset
  // would push slots PAST the allocation, and a negative id is not something a
  // segmentation produces anyway.
  //
  // A SPARSE RULE widens both. Its ids are positions along the matrix's object
  // axis — `indptr[id]`, so id 0 is a real object — and the objects it does NOT
  // mention are the zeros the rule still judges. They need slots to be hidden
  // in, so the table spans the matrix's whole object axis whether or not the
  // slice touched every one of it.
  const idOffset = sparseSlots > 0 ? 0 : Math.max(0, present?.min ?? 0);
  const slotCount = Math.max(
    sparseSlots,
    present ? present.max - idOffset + 1 : 0,
  );

  if (slotCount <= 0 || valueLutTexels(slotCount) > LABEL_LUT_MAX_TEXELS) {
    // Two different failures wore one message. "Too sparse to index directly" is
    // right for a handful of ids scattered over a huge range, and wrong for a
    // bin lattice, whose ids are contiguous and maximally dense — there the
    // table is simply bigger than the budget.
    const rows = colorValues ? valueCount(colorValues) : 0;
    const dense = rows > 0 && rows * 4 > slotCount;
    const present_ = present ?? { min: 0, max: slotCount - 1 };
    skipped.push(
      dense
        ? `ids run ${present_.min}…${present_.max}, so the lookup table is ${slotCount} slots (${Math.round((slotCount * VALUE_LUT_BYTES_PER_TEXEL) / 1e6)} MB) against a budget of ${Math.round(LABEL_LUT_MAX_BYTES / 1e6)} MB — no colouring or filter is applied`
        : `ids run ${present_.min}…${present_.max} but only ${rows} of them have a row, so indexing them directly would spend ${slotCount} slots on ${rows} values — too sparse to index this way, and no colouring or filter is applied`,
    );
    return nothing(skipped);
  }

  // The reads are done; from here nothing awaits. Bow out before the first
  // write, because `reuse`'s buffer is the LIVE one.
  if (!wanted()) return nothing(skipped, true);

  const arena = acquireValueLut(reuse, slotCount);
  const { lut } = arena;

  const { valueMin, valueMax } = paintValueLut({
    lut,
    // The label slot mapping — the whole difference from fabriks. A function
    // rather than a materialised array: at a bin lattice's scale that array was
    // one heap object per id, allocated only to express `id - idOffset`.
    slotOf: (objectId) => {
      const slot = objectId - idOffset;
      return slot >= 0 && slot < slotCount ? slot : -1;
    },
    colorBy,
    filterBys,
    colorValues,
    ruleValues,
  });

  return {
    texture: arena.texture,
    width: lut.width,
    height: lut.height,
    idOffset,
    skipped,
    arena,
    valueMin,
    valueMax,
  };
};
