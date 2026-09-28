/**
 * The VALUE lookup table — the label path's half of `columnLut`.
 *
 * `columnLut` bakes a colour per slot. That is right for a mesh collection,
 * whose LUT is thousands of texels and rebuilt rarely, and wrong for a mask,
 * where it ties a multi-megabyte table to the colormap and the contrast window:
 * nudging a clim rebuilt and re-uploaded the whole thing to change nothing but
 * how a number becomes a hue. `columnLut.ts`'s own note about `uLutColorize`
 * already makes this argument for the base colour ("would tie the texture to
 * `uSeed` / `uSaturation` / `uValue`, which are LIVE uniforms") — this applies
 * it to the colormap as well.
 *
 * So this table holds a VALUE, and the colormap, the window and the palette
 * become uniforms. A gene switch rewrites the table; a clim or colormap change
 * does not touch it.
 *
 * ## The encoding
 *
 * RG8, holding one 16-bit code per slot, `code = G * 256 + R`:
 *
 *     0 … 65533   a value, quantised over [valueMin, valueMax]
 *     65534       visible, no value  -> the base colour (the id hash)
 *     65535       hidden             -> discarded when the filter is on
 *
 * Sixteen bits rather than eight because the quantisation window is now the
 * DATA's range rather than the user's: 8 bits over counts running 0…200 leaves
 * about six levels once a clim is dragged to 0…5, which is visible banding and
 * a regression on what is drawn today. 65,534 levels leave the window free.
 *
 * Two bytes per slot also halves the table against the RGBA8 one, which is what
 * brings a 2 µm bin lattice (5,479,660 slots, 11.0 MB) inside the budget.
 */
import * as THREE from "three";
import { ColorMap } from "@/mikro/api/graphql";
import { buildColormapAtlas } from "../gpu/colormaps";
import { qualitativePalette } from "../layerui/colormap-utils";
import { classColorFor, looksNumeric } from "./columnLut";
import {
  absentValueOf,
  LUT_WIDTH,
  ruleKeeps,
  type ColumnLutEntryColorBy,
  type ColumnLutEntryFilterBy,
} from "./columnLut";
import type { ColumnValues } from "@/mikro/lib/attributes/columnarReads";

/** The largest code that carries a value. */
export const VALUE_CODE_MAX = 65533;
/** Visible, but this slot has no value: keep the base colour. */
export const CODE_NO_VALUE = 65534;
/** Hidden by a filter. */
export const CODE_HIDDEN = 65535;

/** Bytes per slot. The whole point of the encoding. */
export const VALUE_LUT_BYTES_PER_TEXEL = 2;

export type ValueLut = {
  /** The texel bytes, as the texture wants them. */
  data: Uint8Array;
  /** The same buffer as 16-bit codes. Little-endian, so byte 0 is R (low). */
  view: Uint16Array;
  width: number;
  height: number;
  slotCount: number;
};

/** Texels a `slotCount` would allocate. */
export const valueLutTexels = (slotCount: number): number => {
  const count = Math.max(1, slotCount);
  const width = Math.min(LUT_WIDTH, count);
  return width * Math.max(1, Math.ceil(count / width));
};

/**
 * Allocate the table, every slot "visible, no value".
 *
 * That baseline is the identity: a slot no read covered keeps its hue hash and
 * stays visible, exactly as it would with no table bound at all — a filter must
 * never hide something it never saw.
 *
 * `fillCode` overrides that baseline for the one caller whose "no read covered
 * this slot" means something else: a sparse colouring, where a bin absent from
 * the slice has the value ZERO rather than no value at all. Writing it as the
 * fill rather than as a second pass matters — `TypedArray.fill` is a memset,
 * and the pass it replaces was a compare and a branch on every one of up to
 * eight million slots.
 */
export const allocateValueLut = (slotCount: number, fillCode = CODE_NO_VALUE): ValueLut => {
  const count = Math.max(1, slotCount);
  const width = Math.min(LUT_WIDTH, count);
  const height = Math.max(1, Math.ceil(count / width));
  const data = new Uint8Array(width * height * VALUE_LUT_BYTES_PER_TEXEL);
  const view = new Uint16Array(data.buffer);
  view.fill(fillCode);
  return { data, view, width, height, slotCount: count };
};

/** Quantise a value in `[min, max]` onto `0 … VALUE_CODE_MAX`. */
export const encodeValue = (value: number, min: number, max: number): number => {
  const span = max - min;
  // A constant column is not a gradient; put it mid-range rather than dividing
  // by a zero span — the same rule the colour painter has always used.
  const t = span > 0 ? Math.min(Math.max((value - min) / span, 0), 1) : 0.5;
  return Math.round(t * VALUE_CODE_MAX);
};

/** The value a code stands for. The CPU twin of the shader's decode. */
export const decodeValue = (code: number, min: number, max: number): number =>
  min + ((max - min) * code) / VALUE_CODE_MAX;

export type ValueLutWindow = {
  /** The range the codes were quantised over. Feeds `uLutValueMin`/`Max`. */
  valueMin: number;
  valueMax: number;
};

/**
 * A column's values, in either shape the readers produce.
 *
 * `ColumnValues` is the columnar read — two parallel arrays, no per-row object
 * — and is what the label path asks for. The `Map` is the row path's answer,
 * kept because a column the columnar reader refuses (a non-numeric key, a
 * result with no columnar view) still has to paint.
 */
export type ValueSource = ColumnValues | Map<number, unknown>;

const isColumnar = (source: ValueSource): source is ColumnValues =>
  (source as ColumnValues).ids !== undefined;

/** How many values a source carries. */
export const valueCount = (source: ValueSource): number =>
  isColumnar(source) ? source.count : source.size;

/** Ids and values addressed by one shared index. */
type IndexedValues = {
  ids: ArrayLike<number>;
  values: ArrayLike<unknown>;
  count: number;
};

const NO_VALUES: readonly unknown[] = [];

/**
 * A source as two arrays a plain indexed `for` can walk — whichever shape it
 * arrived in.
 *
 * That the loops below are indexed is the whole point. An earlier cut of this
 * exposed a `forEachValue(source, callback)` instead, and it gave back the
 * entire win: with two source shapes the call site is megamorphic, V8 stops
 * inlining, and painting 5.5 M rows measured 129 ms — exactly what the `Map`
 * it replaced cost. Normalising once and looping directly measures 34 ms.
 *
 * The columnar branch is free, a view onto the arrays Arrow already handed
 * back. The `Map` branch COPIES, which is real work — about 110 ms at that
 * scale — but it is the FALLBACK, taken only for a column the columnar reader
 * declined, and paying it once buys every loop after it the indexed form.
 */
const columnsOf = (source: ValueSource): IndexedValues => {
  if (isColumnar(source)) {
    return {
      ids: source.ids,
      // Exactly one of the two is set; an empty column has neither.
      values: source.numeric ?? source.text ?? NO_VALUES,
      count: source.count,
    };
  }
  const ids = new Float64Array(source.size);
  const values = new Array<unknown>(source.size);
  let at = 0;
  for (const [objectId, raw] of source) {
    ids[at] = objectId;
    values[at] = raw;
    at += 1;
  }
  return { ids, values, count: source.size };
};

/** The smallest and largest id a source carries, or null when it carries none. */
export const idRangeOf = (source: ValueSource): { min: number; max: number } | null => {
  const { ids, count } = columnsOf(source);
  if (count === 0) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < count; i += 1) {
    const id = ids[i];
    if (id < min) min = id;
    if (id > max) max = id;
  }
  return { min, max };
};

/**
 * A source as something with random access by id.
 *
 * Only the multi-rule path needs this — it asks every rule about an id one of
 * the others mentioned — and only there is materialising a map worth it. With
 * a single rule the painter walks that rule's own rows and never asks.
 */
const asLookup = (source: ValueSource): Map<number, unknown> => {
  if (!isColumnar(source)) return source;
  const rows = columnsOf(source);
  const byId = new Map<number, unknown>();
  for (let i = 0; i < rows.count; i += 1) byId.set(rows.ids[i], rows.values[i]);
  return byId;
};

export const paintValueLut = ({
  lut,
  slotOf,
  colorBy,
  filterBys,
  colorValues,
  ruleValues,
}: {
  lut: ValueLut;
  slotOf: (objectId: number) => number;
  colorBy: ColumnLutEntryColorBy | null;
  filterBys: readonly ColumnLutEntryFilterBy[];
  /** The active colouring's values, or null when it could not be read. */
  colorValues: ValueSource | null;
  /** Per active rule, in order; a null entry could not be read. */
  ruleValues: readonly (ValueSource | null)[];
}): ValueLutWindow => {
  const { view, slotCount } = lut;
  let valueMin = 0;
  let valueMax = 1;

  // ------------------------------------------------------------- visibility
  //
  // FIRST, unlike the colour table. There, visibility is its own channel and
  // can be decided after the colour; here one 16-bit code carries both, so a
  // blanket "hide everything" would erase the values it was meant to sit
  // alongside. Deciding visibility first and then declining to write a value
  // into a hidden slot keeps the two from fighting over the same bits.
  //
  // The answer for an id no rule mentions is a constant, and
  // `ruleKeeps(rule, absentValueOf(rule))` is that constant — derived rather
  // than reasoned about, so it cannot drift from the rule semantics. What an
  // unmentioned id is WORTH depends on the rule's source: nothing for a table
  // column, zero for a slice of a sparse matrix (see `absentValueOf`).
  const active = filterBys
    .map((rule, index) => ({ rule, values: ruleValues[index] }))
    // A rule whose column could not be read applies to nothing rather than to
    // everything: silently hiding every object because a read failed is the
    // worst possible reading of "filter".
    .filter((entry): entry is { rule: ColumnLutEntryFilterBy; values: ValueSource } =>
      Boolean(entry.values),
    );

  if (active.length > 0) {
    if (!active.every(({ rule }) => ruleKeeps(rule, absentValueOf(rule)))) {
      // `fill` rather than a loop: a bin lattice's table is millions of slots
      // and this is a memset, not a walk.
      view.fill(CODE_HIDDEN, 0, slotCount);
    }

    if (active.length === 1) {
      // ONE rule is the overwhelmingly common case, and there the ids it
      // mentions are simply its own rows. Walking them directly is what lets a
      // columnar read stay columnar: the union used to go through a `Set` — one
      // hash entry per row of the table, measured at 683 ms over 5.5 M rows —
      // and asking a rule about an id it just yielded needed a map to ask.
      const { rule, values } = active[0];
      const rows = columnsOf(values);
      for (let i = 0; i < rows.count; i += 1) {
        const slot = slotOf(rows.ids[i]);
        if (slot < 0 || slot >= slotCount) continue;
        view[slot] = ruleKeeps(rule, rows.values[i]) ? CODE_NO_VALUE : CODE_HIDDEN;
      }
    } else {
      // Several rules AND together, so an id ANY of them mentions has to be put
      // to ALL of them — which needs random access, and therefore a map. Paid
      // only here, and only for the rules that are not the one being walked.
      const lookups = active.map(({ rule, values }) => ({ rule, values: asLookup(values) }));
      const mentioned = new Set<number>();
      for (const { values } of lookups) for (const objectId of values.keys()) mentioned.add(objectId);
      for (const objectId of mentioned) {
        const slot = slotOf(objectId);
        if (slot < 0 || slot >= slotCount) continue;
        let keeps = true;
        for (const { rule, values } of lookups) {
          // An id this rule does not mention is not thereby exempt from it —
          // the union is over every rule — and what it is worth here is its
          // own source's business.
          const raw = values.has(objectId) ? values.get(objectId) : absentValueOf(rule);
          if (!ruleKeeps(rule, raw)) {
            keeps = false;
            break;
          }
        }
        view[slot] = keeps ? CODE_NO_VALUE : CODE_HIDDEN;
      }
    }
  }

  // ------------------------------------------------------------------ value
  if (colorBy && colorValues) {
    // Branch on the ENTRY where it says anything — a named colormap is
    // authoritative (the server enforces which sort a column admits). An entry
    // naming NO colormap is the one case the entry cannot answer, and there
    // the values are the only signal there is — the RGBA painter's rule
    // (`paintColumnLut`), which this table must not drift from.
    const named = colorBy.colormap ?? null;
    const qualitative =
      named !== null
        ? qualitativePalette(named) !== null
        : !looksNumeric(columnsOf(colorValues).values as unknown as Iterable<unknown>);

    if (qualitative) {
      // Categorical: the code IS the rank, normalised onto the same 0..1 the
      // measure path uses, so the shader keeps exactly one path and the
      // difference lives entirely in what the palette row holds.
      const rows = columnsOf(colorValues);
      const distinct = new Set<string>();
      for (let i = 0; i < rows.count; i += 1) distinct.add(String(rows.values[i]));
      const ranks = new Map<string, number>();
      for (const value of [...distinct].sort()) ranks.set(value, ranks.size);
      for (let i = 0; i < rows.count; i += 1) {
        const raw = rows.values[i];
        if (raw === undefined || raw === null) continue;
        const slot = slotOf(rows.ids[i]);
        if (slot < 0 || slot >= slotCount || view[slot] === CODE_HIDDEN) continue;
        // Texel centres: `(rank + 0.5) / 256` lands on the intended texel of a
        // 256-entry palette row rather than on the seam between two.
        const rank = (ranks.get(String(raw)) ?? 0) % 256;
        view[slot] = encodeValue((rank + 0.5) / 256, 0, 1);
      }
    } else {
      // Measure: quantise over the DATA's range, never the user's window. The
      // window is a uniform now, and a table quantised to it could not be
      // reused when it moved.
      const rows = columnsOf(colorValues);
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < rows.count; i += 1) {
        const candidate = Number(rows.values[i]);
        if (!Number.isFinite(candidate)) continue;
        if (candidate < min) min = candidate;
        if (candidate > max) max = candidate;
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        min = 0;
        max = 1;
      }
      valueMin = min;
      valueMax = max;
      for (let i = 0; i < rows.count; i += 1) {
        const raw = rows.values[i];
        if (raw === undefined || raw === null) continue;
        const slot = slotOf(rows.ids[i]);
        if (slot < 0 || slot >= slotCount || view[slot] === CODE_HIDDEN) continue;
        const value = Number(raw);
        if (!Number.isFinite(value)) continue;
        view[slot] = encodeValue(value, min, max);
      }
    }
  }

  return { valueMin, valueMax };
};

/**
 * Wrap the bytes as an RG8 texture.
 *
 * `NearestFilter` for the same reason the colour table uses it: this is a table
 * indexed by an exact integer, not an image, and any filtering would blend one
 * object's code into its neighbour's — which here would not merely blur a
 * colour, it would invent a value.
 */
export const valueLutTexture = (data: Uint8Array, width: number, height: number): THREE.DataTexture => {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
};

/**
 * A table and the texture bound to its bytes, kept together so they can be
 * REFILLED rather than rebuilt.
 *
 * The two must travel as one: a `DataTexture` holds its `image.data` by
 * reference, so reusing the buffer without reusing the texture would upload a
 * buffer nothing is bound to, and reusing the texture without the buffer is not
 * a thing that can happen. Owning them jointly makes the invalid combinations
 * unrepresentable.
 */
export type ValueLutArena = {
  lut: ValueLut;
  texture: THREE.DataTexture;
};

/**
 * The table to paint into: `reuse`, refilled, when it is the right size.
 *
 * Every rebuild used to allocate — a fresh `Uint8Array` and a fresh
 * `DataTexture`, with the previous one disposed. At a bin lattice's scale that
 * is 11 MB of garbage and a GPU texture destroyed and recreated to change a
 * colouring, and the sparse builder's own note already says the slot table
 * "spans the OBJECT axis, not the ids that happened to carry a value... and is
 * therefore reusable across gene switches". This is that reuse.
 *
 * Rebinding matters as much as reallocating: `setLabelColorStyle` records that
 * under WebGPU, rebinding and disposing leaves the bind group pointing at a
 * destroyed `GPUTexture` which three silently replaces with white. Keeping the
 * same texture object across a refill sidesteps that entirely.
 *
 * A size change still allocates. The caller binds the new texture, and
 * `setLabelColorLut` disposes the one it replaces — the existing protocol,
 * unchanged.
 */
export const acquireValueLut = (
  reuse: ValueLutArena | null | undefined,
  slotCount: number,
  fillCode = CODE_NO_VALUE,
): ValueLutArena => {
  const count = Math.max(1, slotCount);
  if (reuse && reuse.lut.slotCount === count) {
    reuse.lut.view.fill(fillCode);
    reuse.texture.needsUpdate = true;
    return reuse;
  }
  const lut = allocateValueLut(count, fillCode);
  return { lut, texture: valueLutTexture(lut.data, lut.width, lut.height) };
};

/** The default colormap a measure colouring takes when it names none. */
export const DEFAULT_MEASURE_COLORMAP = ColorMap.Viridis;


/**
 * The 256-entry row the shader samples, for either sort of colormap.
 *
 * One row serves both, which is what keeps the shader on a single path: a
 * measure colouring ramps across it and a categorical one lands on one texel of
 * it, and the difference lives entirely in what the CPU wrote into the table.
 *
 * The continuous half reuses `buildColormapAtlas`, so a row is the same bytes
 * the image compositor draws with and comes out of the same `atlasRowCache`.
 * The qualitative half bakes `classColorFor(colormap, rank)` — the palette the
 * mesh instance colouring and the id hash already share.
 */
export const paletteRowFor = (colormap: ColorMap): THREE.DataTexture => {
  if (qualitativePalette(colormap) === null) return buildColormapAtlas([{ colormap }]);

  const width = 256;
  const data = new Uint8Array(width * 4);
  for (let rank = 0; rank < width; rank += 1) {
    const [r, g, b] = classColorFor(colormap, rank);
    const at = rank * 4;
    data[at] = r;
    data[at + 1] = g;
    data[at + 2] = b;
    data[at + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
  // NEAREST, unlike the continuous row: adjacent ranks are unrelated classes and
  // blending two of them would invent a colour belonging to neither.
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
};
