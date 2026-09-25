import * as THREE from "three";
import type { AttributePlanLike } from "@/mikro/lib/attributes/attributeTypes";
import type { AttributeLookupEngine } from "@/mikro/lib/attributes/lookupEngine";
import {
  isDirectEntry as isDirectColumnEntry,
  looksNumeric,
  resolveColumnValues,
  accessForTable as tableAccessFor,
  type ColumnLutEntryColorBy,
  type ColumnLutEntryFilterBy,
  type TableAccess,
} from "../../../platform/attributes/columnLut";
import { qualitativePalette } from "../../../platform/layerui/colormap-utils";
import {
  DEFAULT_MEASURE_COLORMAP,
  VALUE_LUT_BYTES_PER_TEXEL,
  acquireValueLut,
  paintValueLut,
  paletteRowFor,
  valueLutTexels,
  type ValueLutArena,
  type ValueLutWindow,
} from "../../../platform/attributes/valueLut";
import type { SparseReadRequest, SparseReader } from "@/mikro/lib/sparse/sparseSource";
import { readColumnByObjectIdBatchedCached } from "../../../platform/attributes/columnValueCache";
import type { FabriksObjectEntry } from "./fabriksCatalogs";

export { LUT_WIDTH } from "../../../platform/attributes/columnLut";

/**
 * The ordinal → VALUE-CODE lookup a MESH layer's stored `colorBys` /
 * `filterBys` resolve to, and the one thing that makes them more than
 * metadata.
 *
 * The semantics — how a measure becomes a ramp, how a categorical becomes a
 * palette, what a rule keeps, what an unreadable column means — live in
 * `platform/attributes/columnLut.ts`, shared with the LABEL path: a mask's pixel
 * values dereference into a table by exactly the FIELD edge a collection's object
 * ids do, so two copies of those rules would mean one of them was wrong.
 *
 * What stays HERE is the one thing that is genuinely mesh-specific: the SLOT
 * MAPPING. Fabriks indexes by the DENSE ordinal its vertices carry (README,
 * "Ordinals, not ids, on the GPU") — object ids are sparse and would size the
 * texture by the largest id rather than by the object count. A label mask has no
 * ordinal and indexes by the id itself; that is the whole difference between the
 * two builders.
 *
 * ONE texture for both features, because both answer the same per-object
 * question and a second texture would be a second upload of the same walk. It
 * is the LABEL path's RG8 encoding now (`valueLut.ts`): a 16-bit code per
 * slot — a quantised VALUE, a visible-no-value sentinel, or the HIDDEN
 * sentinel every rule's AND resolves to. The colormap, the window and the
 * palette are uniforms, so nudging a clim or switching a colormap is two
 * uniform writes and a 1 KB palette row where it used to repaint and
 * re-upload the whole table.
 *
 * TWO-dimensional, not a strip: ordinals run to fabriks's 2^24 ceiling and no
 * backend accepts a texture that wide, so the ordinal decomposes into
 * `(ordinal % LUT_WIDTH, ordinal / LUT_WIDTH)`. The same decomposition has to be
 * done in the shader; `LUT_WIDTH` is the shared constant.
 *
 * Filtering paints alpha rather than removing geometry: pulling objects out of
 * the BatchedMesh would fight the batch's slot compaction and the byte-bounded
 * LOD eviction, and a filter that changes what is RESIDENT would re-plan and
 * re-fetch on every toggle. Fragment discard over-rasterizes; that is the right
 * trade here.
 *
 * The joined-entry limitation is stated once, in `resolveColumnValues`.
 */

export type ColorLutEntryColorBy = ColumnLutEntryColorBy;
export type ColorLutEntryFilterBy = ColumnLutEntryFilterBy;

export type ColorLutRequest = {
  objects: readonly FabriksObjectEntry[];
  colorBy: ColorLutEntryColorBy | null;
  filterBys: readonly ColorLutEntryFilterBy[];
  /** The collection's attribute plans, for each table's store and key column. */
  plans: readonly AttributePlanLike[];
  engine: AttributeLookupEngine;
  /**
   * Present only when the active colouring reads a sparse matrix. Supplied by
   * the caller rather than reached for here, so this module stays a pure
   * builder — the same reason `readColumn` is injected.
   */
  sparse?: SparseReadRequest | null;
  /**
   * Reads one slice of ANY matrix, for the RULES — the same injection, for the
   * same reason, as `sparse` is for the colouring. A rule need not name the
   * matrix the colouring does, so its source is resolved by id at read time.
   * Absent means a sparse rule cannot be read and is `skipped`.
   */
  readSparse?: SparseReader | null;
};

/**
 * The budget for a mesh colour table.
 *
 * The label path has had one of these all along; this one never did, and its
 * ordinal map below carries the assumption "which number in the thousands" as a
 * comment rather than a limit. A collection large enough would therefore have
 * silently allocated what the label builder loudly refuses. Same bytes, same
 * discipline, said out loud.
 */
export const MESH_LUT_MAX_BYTES = 16 * 1024 * 1024;

export type ColorLutPaint = {
  /** The painted table and the texture bound to its bytes (`valueLut.ts`);
   *  reused across rebuilds when the size fits, so a repaint is a refill and
   *  never a texture destroy/create. */
  arena: ValueLutArena;
  /** The range the codes were quantised over — feeds `uLutValueMin/Max`. */
  window: ValueLutWindow;
  /** True when the colouring took the RANK branch: appearance clims are then
   *  the unit interval, never the entry's bounds. */
  qualitative: boolean;
};

export type PreparedColorLut = {
  /** Entries that named a table no plan reaches, or that need an unbuilt join. */
  skipped: string[];
  /**
   * Paint the table, synchronously. Split from the async reads so the caller
   * can check its own cancellation AFTER the last await and only then touch
   * the (possibly live, possibly shared) `reuse` arena — two overlapping
   * builds painting one buffer is the race this signature closes.
   */
  paint: (reuse?: ValueLutArena | null) => ColorLutPaint;
};

/** An entry reaches its column directly when it takes no `references` hop. */
export const isDirectEntry = isDirectColumnEntry;

/**
 * Where a mesh entry's column is read from. MESH-sampled plans only: an
 * array-sampled plan keys the same table by a pixel's value, which a mesh object
 * id is not.
 */
export const accessForTable = (
  plans: readonly AttributePlanLike[],
  tableId: string,
): TableAccess | null => tableAccessFor(plans, tableId, { kind: "mesh" });

/**
 * Resolve the reads, and hand back a synchronous painter for the table —
 * indexed by the objects' dense ordinals.
 */
export const buildColorLut = async (request: ColorLutRequest): Promise<PreparedColorLut> => {
  const { objects, colorBy, filterBys, plans, engine, sparse, readSparse } = request;

  // BOTH halves can now read a matrix: `MeshFilterByInput` grew the same
  // `kind`/`dataset`/`at` arm its colouring sibling has, so "keep the objects
  // where this ion is above x" is expressible. `resolveColumnValues` is the
  // DuckDB path and narrows those entries away, answering null for each; the
  // reads below take those nulls' places.
  const { colorValues: columnValues, ruleValues, skipped } = await resolveColumnValues({
    colorBy: sparse ? null : colorBy,
    filterBys,
    plans,
    engine,
    want: { kind: "mesh" },
    // Cached: the LUT rebuilds on every knob nudge (colormap, clim, rule
    // bound), and the column VALUES change with none of them — only the
    // paint does. The full-table scan runs once per column per engine.
    // Batched: the colouring and every same-tick rule over one table share
    // ONE multi-column SELECT (`columnReadBatch.ts`); the row map is derived
    // from the columnar arrays rather than by a second scan.
    readColumn: readColumnByObjectIdBatchedCached,
  });

  // A SPARSE colouring reads a slice of a matrix rather than a column of a
  // table — no SQL and no database in that path. Everything below is
  // indifferent: the painter takes `objectId -> value` and does not care where
  // it came from.
  const colorValues = sparse
    ? ((
        await sparse.read(
          sparse.source,
          (colorBy?.at ?? []).map((position) => ({ axis: position.axis, value: position.value })),
        )
      ).values as Map<number, unknown>)
    : columnValues;

  // A rule that cannot be read is `skipped`, never silently dropped — a filter
  // quietly applying to nothing looks exactly like a filter that works.
  await Promise.all(
    filterBys.map(async (rule, index) => {
      if (rule.dataset == null) return;
      if (!readSparse) {
        skipped.push(
          `rule over matrix ${rule.dataset}: no datalayer connection, so the slice could not be read`,
        );
        return;
      }
      try {
        const read = await readSparse(rule.dataset, rule.at ?? []);
        ruleValues[index] = read.values as Map<number, unknown>;
      } catch (error) {
        skipped.push(
          `rule over matrix ${rule.dataset}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }),
  );

  const ordinalCeiling = objects.reduce((max, object) => Math.max(max, object.ordinal), -1);
  const slotCount = ordinalCeiling + 1;

  // Which branch the colouring takes decides the APPEARANCE contract, so it is
  // answered here — same rule as `paintValueLut`: a named colormap is
  // authoritative, an unnamed one falls back to sniffing the values.
  const named = colorBy?.colormap ?? null;
  const qualitative =
    colorBy != null &&
    colorValues != null &&
    (named !== null
      ? qualitativePalette(named as never) !== null
      : !looksNumeric(colorValues.values()));

  // The guard the label path has and this one never did: a collection large
  // enough would silently allocate what the label builder loudly refuses.
  // Half the old bytes — the table holds a 16-bit code now, not an RGBA texel.
  if (valueLutTexels(slotCount) * VALUE_LUT_BYTES_PER_TEXEL > MESH_LUT_MAX_BYTES) {
    skipped.push(
      `this collection runs to ${slotCount} objects, so the lookup table is ${Math.round((slotCount * VALUE_LUT_BYTES_PER_TEXEL) / 1e6)} MB against a budget of ${Math.round(MESH_LUT_MAX_BYTES / 1e6)} MB — no colouring or filter is applied`,
    );
    // A 1×1 identity rather than null: the result type is non-nullable, and
    // handing back a real (never-reused) arena keeps `setColorLut`'s contract
    // while colouring nothing.
    return {
      skipped,
      paint: () => ({
        arena: acquireValueLut(null, 1),
        window: { valueMin: 0, valueMax: 1 },
        qualitative: false,
      }),
    };
  }

  // The mesh slot mapping: the ordinal IS the slot. Unlike the label path this
  // is a genuine lookup rather than arithmetic, so it stays a map — built once
  // over the collection's objects, which number in the thousands.
  const ordinals = new Map<number, number>();
  for (const object of objects) ordinals.set(object.objectId, object.ordinal);

  return {
    skipped,
    paint: (reuse) => {
      const arena = acquireValueLut(reuse ?? null, slotCount);
      const window = paintValueLut({
        lut: arena.lut,
        slotOf: (objectId) => ordinals.get(objectId) ?? -1,
        colorBy,
        filterBys,
        colorValues,
        ruleValues,
      });
      arena.texture.needsUpdate = true;
      return { arena, window, qualitative };
    },
  };
};

/**
 * The APPEARANCE half of a mesh colouring: the palette row and the clim
 * window `setColorAppearance` takes. Split from the build for the reason
 * `useLabelColorLut` gives — a colormap or clim nudge must be two uniform
 * writes and a 1 KB row, never a repaint.
 *
 * A RANK colouring's codes are already normalised onto the unit interval, so
 * its window is 0..1 and the entry's bounds do not apply; a measure colouring
 * runs the ramp between the entry's bounds where it names them and the data's
 * own range where it does not.
 */
export const composeMeshLutAppearance = (
  colorBy: ColorLutEntryColorBy | null,
  paint: Pick<ColorLutPaint, "window" | "qualitative">,
): { palette: THREE.DataTexture | null; climMin: number; climMax: number } => {
  if (!colorBy) return { palette: null, climMin: 0, climMax: 1 };
  if (paint.qualitative) {
    return {
      palette: paletteRowFor((colorBy.colormap ?? "HUES") as never),
      climMin: 0,
      climMax: 1,
    };
  }
  return {
    palette: paletteRowFor((colorBy.colormap ?? DEFAULT_MEASURE_COLORMAP) as never),
    climMin: colorBy.min ?? paint.window.valueMin,
    climMax: colorBy.max ?? paint.window.valueMax,
  };
};
