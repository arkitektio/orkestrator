import { ColorMap } from "@/mikro-next/api/graphql";
import type {
  AttributePlanLike,
  AttributeRow,
  ParquetStoreLike,
} from "@/mikro-next/lib/attributes/attributeTypes";
import { isMeshSample, isNetworkSample, isTableHop, landingOf } from "@/mikro-next/lib/attributes/attributeTypes";
import type { AttributeLookupEngine } from "@/mikro-next/lib/attributes/lookupEngine";
import { escapeSqlIdentifier, escapeSqlLiteral } from "@/mikro-next/lib/attributes/sqlBind";
import { sampleColorMapRgb } from "../gpu/colormaps";
import { DEFAULT_INSTANCE_COLORMAP } from "../gpu/instanceColormaps";
import { instancePaletteColor, qualitativePalette } from "../layerui/colormap-utils";

/**
 * The `colorBys` / `filterBys` machinery, shared by MESH collections and LABEL
 * masks.
 *
 * Both answer the same per-object question over the same relation — a mask's
 * pixel values dereference into a table by exactly the FIELD edge a collection's
 * object ids do — so the semantics live here once. They are semantics that must
 * NOT drift between the two features: `exclude` inverts the test and not the
 * answer; an unconfigured rule keeps everything; a column that could not be read
 * applies to nothing; a categorical palette is keyed by the VALUE's rank so every
 * object sharing a value shares its colour; a constant column sits mid-ramp
 * rather than dividing by a zero span.
 *
 * What each caller keeps for itself is only the SLOT MAPPING — where an object's
 * texel lives:
 *
 *  - fabriks indexes by the dense `ordinal` its vertices carry;
 *  - a label mask indexes by `id - idMin`, because a mask's pixels carry SPARSE
 *    raw ids and there is no ordinal anywhere.
 *
 * Hence the two-phase shape: `resolveColumnValues` does the reads, the caller
 * derives its slots from whatever it now knows, and `paintColumnLut` writes the
 * texels. One texture serves both features, because both answer the same
 * per-object question and a second would be a second upload of the same walk:
 * `rgb` is the active colouring's colour (white = leave the base colour alone),
 * and `a` is visibility under the AND of every active rule.
 *
 * ---------------------------------------------------------------------------
 * WHY ONE TEXTURE, AND WHY TWO MODE UNIFORMS SURVIVE IT
 *
 * The fusion is the design and not a coincidence: colouring and filtering answer
 * the same per-object question over the same relation, so they are ONE build
 * pass, ONE upload and ONE `textureLoad` per fragment. A separate filter table
 * would be a second walk of the same rows to say something this one says already.
 *
 * The filter is `a = 0` and NOT "paint it no colour". Black is a legitimate
 * colormap output — it is the bottom of viridis — so an rgb sentinel cannot be
 * told apart from a real value; and a filtered object is not being
 * de-emphasised, it is not being drawn. Hence both materials `Discard` on alpha
 * rather than dimming a colour.
 *
 * The identity fill (white, opaque) is what makes that safe: a slot no read
 * covered renders exactly as it would with no LUT at all, so an id with no row in
 * the table keeps its base colour and stays VISIBLE. A filter must never hide
 * something it never saw.
 *
 * `uLutColorize` cannot be folded into the texture the way visibility was.
 * "Invisible" has an in-band identity (`a = 1`); "no colouring" has none, because
 * white is a legitimate colormap output too and there is no sentinel left to mean
 * "leave the base colour alone". Baking the base colour into `rgb` instead would
 * work — and would tie the texture to `uSeed` / `uSaturation` / `uValue` for a
 * label mask, which are LIVE uniforms, so every seed tweak would rebuild and
 * re-upload the whole table. One uniform and one `mix` is the cheap side of that
 * trade.
 *
 * `uLutFilter` is, under this painter, redundant: `allocateColumnLut` fills alpha
 * opaque and the visibility pass only zeroes it where a rule REJECTS, so with no
 * active rules nothing is transparent, and the fallback is a 1x1 white opaque
 * texel. It is kept as a deliberate one-branch statement of "alpha means
 * visibility here", not as an invariant that rests on the painter never changing
 * — worth knowing it is a choice rather than something load-bearing.
 */

/** Texture width; the slot's low bits. A power of two by habit, not need. */
export const LUT_WIDTH = 2048;

export type ColumnLutEntryColorBy = {
  /** A COLUMN entry names these; a SPARSE one leaves them null. */
  table?: string | null;
  column?: string | null;
  /** (SPARSE) the matrix, and the position along the axes it identifies. */
  dataset?: string | null;
  at?: readonly { axis: string; value: number }[] | null;
  colormap?: ColorMap | null;
  /** Clims: the ramp runs between these instead of the data's own min/max. */
  min?: number | null;
  max?: number | null;
  joinPath?: readonly { table: string; column: string }[] | null;
};

export type ColumnLutEntryFilterBy = {
  /** A COLUMN rule names these; a SPARSE one names `dataset`/`at` instead. */
  table?: string | null;
  column?: string | null;
  /** (SPARSE) the matrix, and the position along the axes it identifies itself by. */
  dataset?: string | null;
  at?: readonly { axis: string; value: number }[] | null;
  min?: number | null;
  max?: number | null;
  values?: readonly string[] | null;
  exclude: boolean;
  joinPath?: readonly { table: string; column: string }[] | null;
};

/** Where an entry's column is READ from, and what its rows are keyed by. */
export type TableAccess = { store: ParquetStoreLike; keyColumn: string };

/**
 * Which kind of attribute plan may answer for a table.
 *
 * A MESH plan keys the table by a geometry row's object id; an ARRAY plan keys it
 * by a sampled pixel value. The same table can be reached both ways in one scene,
 * and reading the wrong plan's key column returns the wrong rows — silently — so
 * this is not optional.
 *
 * `storeId` is likewise not optional for the array case: a scene can hold several
 * masks keyed into one table, and picking another mask's plan would resolve this
 * mask's ids against the wrong column.
 */
export type PlanWant =
  | { kind: "mesh" }
  | { kind: "network" }
  | { kind: "array"; storeId: string };

/** An entry reaches its column directly when it takes no `references` hop. */
export const isDirectEntry = (entry: {
  joinPath?: readonly { table: string; column: string }[] | null;
}): boolean => (entry.joinPath?.length ?? 0) === 0;

/**
 * The plan that may answer for a table, and the column its rows are keyed by.
 *
 * Comes off the attribute plans rather than a second GraphQL round trip: a plan
 * already names the table's parquet store and the column a sampled value binds
 * to — that is what a plan IS — and the options query publishes neither.
 */
export const accessForTable = (
  plans: readonly AttributePlanLike[],
  tableId: string,
  want: PlanWant,
): TableAccess | null => {
  // The LANDING is what keys a table by a sampled or picked id; a later hop
  // binds from rows, which a LUT cannot supply.
  const plan = plans.find((candidate) => {
    const landing = landingOf(candidate);
    if (!isTableHop(landing) || landing.table.id !== tableId) return false;
    if (want.kind === "mesh") return isMeshSample(candidate.sample);
    if (want.kind === "network") return isNetworkSample(candidate.sample);
    // An array-sampled plan over THIS array. `sample.store` is the zarr store
    // the values are sampled from, which is what identifies the mask.
    if (isMeshSample(candidate.sample) || isNetworkSample(candidate.sample)) return false;
    return candidate.sample.store?.id === want.storeId;
  });
  const landing = plan ? landingOf(plan) : null;
  if (!landing || !isTableHop(landing)) return null;
  const keyColumn = landing.lookup.keyColumns[0]?.column.name;
  if (!keyColumn) return null;
  return { store: landing.lookup.store, keyColumn };
};

/** Where a COMPOSITE-keyed column is read from: the store and the key columns
 *  IN ORDER. The order is meaning — for a network node table it is
 *  (object axis, node axis…), and the map keys below join the values in
 *  exactly that order. */
export type CompositeTableAccess = { store: ParquetStoreLike; keyColumns: readonly string[] };

/** The map key for one composite-keyed row: the key values joined with `:`.
 *  One function rather than a convention, so the reader and every consumer
 *  (the styling's ordinal rekey, the packer's per-slot lookup) cannot drift. */
export const compositeKeyOf = (parts: readonly (number | string)[]): string => parts.join(":");

/**
 * `"k1:k2[:k3]" → value` for one column of a composite-keyed table — a network
 * NODE table's `(object_id, node_id)` or an EDGE table's
 * `(object_id, source, target)`. The single-key twin of
 * `readColumnByObjectId`, kept separate rather than unified because the key
 * TYPE differs (a string, since a tuple cannot be a Map key) and every
 * single-key caller would pay the join for nothing.
 *
 * Keys are stringified from the RAW values (ids, so integers); a row whose key
 * columns hold anything non-finite is dropped, the same tolerance the
 * single-key reader shows a malformed id.
 */
export const readColumnByCompositeKey = async (
  engine: AttributeLookupEngine,
  access: CompositeTableAccess,
  column: string,
): Promise<Map<string, unknown>> => {
  const keys = access.keyColumns.map(
    (name, index) => `${escapeSqlIdentifier(name)} AS key${index}`,
  );
  const value = escapeSqlIdentifier(column);
  const rows: readonly AttributeRow[] = await engine.readAcross(
    [access.store],
    (urlOf) =>
      `SELECT ${keys.join(", ")}, ${value} AS value FROM read_parquet(${escapeSqlLiteral(
        urlOf(access.store.id),
      )})`,
  );
  const byKey = new Map<string, unknown>();
  outer: for (const row of rows) {
    const parts: number[] = [];
    for (let index = 0; index < access.keyColumns.length; index++) {
      const part = Number(row[`key${index}`]);
      if (!Number.isFinite(part)) continue outer;
      parts.push(part);
    }
    byKey.set(compositeKeyOf(parts), row.value);
  }
  return byKey;
};

/** `objectId → value` for one column of one table. */
export const readColumnByObjectId = async (
  engine: AttributeLookupEngine,
  access: TableAccess,
  column: string,
): Promise<Map<number, unknown>> => {
  const key = escapeSqlIdentifier(access.keyColumn);
  const value = escapeSqlIdentifier(column);
  const rows: readonly AttributeRow[] = await engine.readAcross(
    [access.store],
    (urlOf) =>
      `SELECT ${key} AS object_id, ${value} AS value FROM read_parquet(${escapeSqlLiteral(
        urlOf(access.store.id),
      )})`,
  );
  const byId = new Map<number, unknown>();
  for (const row of rows) {
    const id = Number(row.object_id);
    if (Number.isFinite(id)) byId.set(id, row.value);
  }
  return byId;
};

/**
 * Whether a column's values are measured or naming, from the values themselves.
 *
 * The stored entry does not carry its `ColumnControl` — it carries a table id and
 * a column name — and the column's declared role lives behind another query. The
 * values already in hand answer it directly and without one: what decides the
 * rendering is whether a colormap over these values means anything, and for a
 * column of non-numbers it does not.
 */
export const looksNumeric = (values: Iterable<unknown>): boolean => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    return typeof value === "number" || Number.isFinite(Number(value));
  }
  return false;
};

export const classColorFor = (
  colormap: ColorMap | null | undefined,
  ordinalOfValue: number,
): [number, number, number] =>
  // Keyed by the VALUE's rank rather than the object's, so every object sharing a value shares
  // its colour — which is the whole point of colouring by a categorical column. The palette
  // comes from the entry's colormap; `hues` is what an entry that names none has always drawn
  // as, and is the same scatter the id hash itself uses.
  instancePaletteColor(qualitativePalette(colormap) ?? DEFAULT_INSTANCE_COLORMAP, ordinalOfValue);

/**
 * What an object the rule's source never MENTIONED is worth.
 *
 * The two sources answer this differently, and the difference decides whether a
 * rule hides half the scene:
 *
 *  - a COLUMN rule reads a table, and an object with no row there has no value.
 *    `undefined` is right: `ruleKeeps` reads it as "does not match", which is
 *    the honest answer for a bound over a value that does not exist.
 *  - a SPARSE rule reads one slice of a matrix, which stores its NONZEROS. An
 *    object missing from the read has value exactly ZERO — the slice is the
 *    complete truth for its feature — so `undefined` would be a lie, and an
 *    expensive one: the widest legal rule a picker can seed is the slice's own
 *    range, which contains 0, and reading the absent objects as "no value"
 *    would hide every cell the ion was not detected in the moment that rule was
 *    switched on.
 *
 * Derived from the entry rather than passed in, so a caller cannot forget it.
 */
export const absentValueOf = (rule: ColumnLutEntryFilterBy): unknown =>
  rule.dataset != null ? 0 : undefined;

/** Does this rule KEEP the object? `exclude` inverts the answer, not the test. */
export const ruleKeeps = (rule: ColumnLutEntryFilterBy, raw: unknown): boolean => {
  let matches: boolean;
  if (rule.values && rule.values.length > 0) {
    matches = raw !== null && raw !== undefined && rule.values.includes(String(raw));
  } else if (rule.min != null || rule.max != null) {
    const numeric = Number(raw);
    matches =
      Number.isFinite(numeric) &&
      (rule.min == null || numeric >= rule.min) &&
      (rule.max == null || numeric <= rule.max);
  } else {
    // An unconfigured rule states nothing, so it keeps everything. Reading it as
    // "keep nothing" would blank the layer the moment one is switched on.
    return true;
  }
  return rule.exclude ? !matches : matches;
};

export type ResolvedColumnValues<V = Map<number, unknown>> = {
  /** The active colouring's values, or null when it could not be read. */
  colorValues: V | null;
  /** Per active rule, in order; a null entry could not be read. */
  ruleValues: (V | null)[];
  /** Entries that named an unreachable table, or that need an unbuilt join. */
  skipped: string[];
};

/**
 * PHASE 1 — read every active entry's column out of the parquet.
 *
 * Every read is one full-column scan of a parquet the client already has a grant
 * for; they run concurrently because they hit different columns and the engine
 * serializes the connection itself.
 *
 * ---------------------------------------------------------------------------
 * LIMITATION, deliberate: only entries with an EMPTY `joinPath` are read.
 *
 * A joined entry reads a column one or more `references` hops away from the table
 * the ids key into, and executing that hop means knowing each target table's key
 * column. The server publishes the key column for the BASE table (as a plan's
 * `keyColumns`) and not for the hop targets, so the join would rest on inferring
 * "the single INDEX coordinate column" from a docstring — and a wrong join key
 * does not fail, it returns the wrong rows and paints plausible garbage.
 *
 * Joined entries therefore stay fully authorable and fully persisted; they just
 * do not render yet, and the cards badge them so. `readAcross` already takes a
 * store ARRAY, so lifting this is an addition rather than a rewrite.
 */
export const resolveColumnValues = async <V = Map<number, unknown>>({
  colorBy,
  filterBys,
  plans,
  engine,
  want,
  readColumn = readColumnByObjectId as unknown as (
    engine: AttributeLookupEngine,
    access: TableAccess,
    column: string,
  ) => Promise<V | null>,
}: {
  colorBy: ColumnLutEntryColorBy | null;
  filterBys: readonly ColumnLutEntryFilterBy[];
  plans: readonly AttributePlanLike[];
  engine: AttributeLookupEngine;
  want: PlanWant;
  /** The column reader — injectable so callers on a rebuild-heavy path can
   * pass the cached one (`columnValueCache.ts`) while this module stays pure
   * and its tests stay stub-only. Defaults to the direct scan.
   *
   * Generic in what it RETURNS, because the two consumers want different
   * shapes of the same answer: the mesh and point paths read tens of thousands
   * of rows and a `Map` is the convenient shape, while the label path reads
   * millions and wants them columnar (`lib/attributes/columnarReads.ts`). The
   * resolution logic — which entries are direct, which table each reaches — is
   * identical either way, and is the reason this stays one function. */
  readColumn?: (
    engine: AttributeLookupEngine,
    access: TableAccess,
    column: string,
  ) => Promise<V | null>;
}): Promise<ResolvedColumnValues<V>> => {
  const skipped: string[] = [];

  const resolve = async (
    entry: { table: string; column: string; joinPath?: readonly { table: string; column: string }[] | null },
    what: string,
  ): Promise<V | null> => {
    if (!isDirectEntry(entry)) {
      skipped.push(`${what} ${entry.column}: reached through a join, not rendered yet`);
      return null;
    }
    const access = accessForTable(plans, entry.table, want);
    if (!access) {
      skipped.push(`${what} ${entry.column}: no attribute plan reaches table ${entry.table}`);
      return null;
    }
    return readColumn(engine, access, entry.column);
  };

  const [colorValues, ruleValues] = await Promise.all([
    // A SPARSE entry names no table or column and never reaches here — the
    // builder answers it from the matrix before calling this. Narrowing rather
    // than asserting keeps that true if a caller ever forgets.
    colorBy && colorBy.table != null && colorBy.column != null
      ? resolve({ ...colorBy, table: colorBy.table, column: colorBy.column }, "colouring")
      : Promise.resolve(null),
    // A SPARSE rule reads a matrix and never reaches here, the same as a sparse colouring.
    // Narrowing rather than asserting keeps that true if a caller forgets.
    Promise.all(
      filterBys.map((rule) =>
        rule.table != null && rule.column != null
          ? resolve({ ...rule, table: rule.table, column: rule.column }, "rule")
          : Promise.resolve(null),
      ),
    ),
  ]);

  return { colorValues, ruleValues, skipped };
};

/** One object and the texel it owns. `slot` is the caller's own mapping. */
/**
 * PHASE 2 — allocate the RGBA8 texel buffer, white and opaque.
 *
 * That fill is the IDENTITY: the materials multiply the colour and discard on
 * zero alpha, so a slot no read covered renders exactly as it would with no LUT
 * at all. It is why an object whose id has no row in the table keeps its base
 * colour and stays visible, rather than vanishing because a read did not reach
 * it — a filter must never hide something it never saw.
 */
export const allocateColumnLut = (
  slotCount: number,
): {
  data: Uint8Array;
  width: number;
  height: number;
} => {
  const count = Math.max(1, slotCount);
  const width = Math.min(LUT_WIDTH, count);
  const height = Math.max(1, Math.ceil(count / width));
  const data = new Uint8Array(width * height * 4);
  data.fill(255);
  return { data, width, height };
};

/** Texels a `slotCount` would allocate — for a caller that wants to refuse first. */
export const columnLutTexels = (slotCount: number): number => {
  const count = Math.max(1, slotCount);
  const width = Math.min(LUT_WIDTH, count);
  return width * Math.max(1, Math.ceil(count / width));
};

/**
 * PHASE 3 — write the colour into `rgb` and the AND of every rule into `a`.
 *
 * Mutates `data` in place; the caller wraps it in a texture.
 */
export const paintColumnLut = ({
  data,
  slotCount,
  slotOf,
  colorBy,
  filterBys,
  colorValues,
  ruleValues,
}: {
  data: Uint8Array;
  /** How many slots the buffer holds. Only used to bound the visibility baseline. */
  slotCount: number;
  /** An object id's slot, or -1 for an id this table does not address. */
  slotOf: (objectId: number) => number;
  colorBy: ColumnLutEntryColorBy | null;
  filterBys: readonly ColumnLutEntryFilterBy[];
} & Pick<ResolvedColumnValues, "colorValues" | "ruleValues">): void => {
  // ------------------------------------------------------------------ colour
  if (colorBy && colorValues) {
    // Branch on the ENTRY where it says anything. Which sort of colormap a column admits
    // follows from its declared role and is enforced server-side, so a colormap that IS named
    // is authoritative: a qualitative one can only have come from a categorical column and a
    // continuous one only from a measure column. Sniffing the values instead — which is what
    // this did — silently ignored a colormap on a column whose ids happened to parse as
    // numbers, and silently ignored a palette on one whose classes did.
    //
    // An entry naming NO colormap is the one case the entry cannot answer, and both roles
    // allow it (the viewer picks). There the values are the only signal there is, so the old
    // test stays as the fallback rather than as the rule.
    const named = colorBy.colormap ?? null;
    const measured =
      named !== null ? qualitativePalette(named) === null : looksNumeric(colorValues.values());
    if (measured) {
      // The range comes from the DATA unless the entry carries CLIMS: a
      // colormap over an unknown range would paint every object the same end
      // of the ramp, so the data's min/max is the fallback — and an entry
      // that names its own bounds means "run the ramp between THESE", with
      // values outside clamped to the ends rather than wrapped or hidden.
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (const value of colorValues.values()) {
        const candidate = Number(value);
        if (!Number.isFinite(candidate)) continue;
        if (candidate < min) min = candidate;
        if (candidate > max) max = candidate;
      }
      if (colorBy.min != null && Number.isFinite(colorBy.min)) min = colorBy.min;
      if (colorBy.max != null && Number.isFinite(colorBy.max)) max = colorBy.max;
      const span = max - min;
      // Iterate the ROWS, not the slots. A table addresses a bounded number of
      // objects; the slot space is the id range, which for a bin lattice is
      // millions. Walking slots meant a `Map.get` per slot and an id array as
      // long as the range — hundreds of MB before a texture existed.
      for (const [objectId, raw] of colorValues) {
        if (raw === undefined || raw === null) continue;
        const slot = slotOf(objectId);
        if (slot < 0) continue;
        const value = Number(raw);
        if (!Number.isFinite(value)) continue;
        // A constant column is not a gradient; put it mid-ramp rather than
        // dividing by a zero span.
        const t = span > 0 ? Math.min(Math.max((value - min) / span, 0), 1) : 0.5;
        // `sampleColorMapRgb` answers in 0..1 floats (it feeds shader uniforms
        // and CSS gradients); this texture is RGBA8, and writing the float
        // straight into a Uint8Array truncates every channel to black.
        const [r, g, b] = sampleColorMapRgb(colorBy.colormap ?? ColorMap.Viridis, t);
        const at = slot * 4;
        data[at] = Math.round(r * 255);
        data[at + 1] = Math.round(g * 255);
        data[at + 2] = Math.round(b * 255);
      }
    } else {
      // Stable value → rank, so the palette does not reshuffle between builds.
      const distinct = new Set<string>();
      for (const value of colorValues.values()) distinct.add(String(value));
      const ranks = new Map<string, number>();
      for (const value of [...distinct].sort()) ranks.set(value, ranks.size);
      for (const [objectId, raw] of colorValues) {
        if (raw === undefined || raw === null) continue;
        const slot = slotOf(objectId);
        if (slot < 0) continue;
        const [r, g, b] = classColorFor(colorBy.colormap, ranks.get(String(raw)) ?? 0);
        const at = slot * 4;
        data[at] = r;
        data[at + 1] = g;
        data[at + 2] = b;
      }
    }
  }

  // ------------------------------------------------------------- visibility
  //
  // The alpha channel is the AND of every rule. Walking slots per rule meant
  // `rules x slots` map lookups; instead take the answer for an id NO rule
  // mentions once — it is a constant — and then correct only the slots some
  // rule does mention.
  //
  // `ruleKeeps(rule, absentValueOf(rule))` IS that constant, and deriving it
  // that way rather than reasoning about the rule's shape keeps the two in
  // step: for a COLUMN rule the absent value is `undefined`, so a bounds rule
  // fails `Number.isFinite(NaN)` and a values rule fails the null check, both
  // landing on `exclude ? true : false`, while an unconfigured rule keeps
  // everything. For a SPARSE rule it is 0 — see `absentValueOf`.
  const active = filterBys
    .map((rule, index) => ({ rule, values: ruleValues[index] }))
    // A rule whose column could not be read applies to nothing rather than to
    // everything: silently hiding every object because a read failed is the
    // worst possible reading of "filter".
    .filter((entry): entry is { rule: ColumnLutEntryFilterBy; values: Map<number, unknown> } =>
      Boolean(entry.values),
    );

  if (active.length > 0) {
    const baseline = active.every(({ rule }) => ruleKeeps(rule, absentValueOf(rule)));
    if (!baseline) {
      // Every slot starts hidden; the loop below re-admits the ones some rule
      // actually mentions. One strided write over the buffer, not one per rule.
      for (let slot = 0; slot < slotCount; slot += 1) data[slot * 4 + 3] = 0;
    }

    // The union of ids any rule mentions. Bounded by the rows read, never by
    // the slot count.
    const mentioned = new Set<number>();
    for (const { values } of active) for (const objectId of values.keys()) mentioned.add(objectId);

    for (const objectId of mentioned) {
      const slot = slotOf(objectId);
      if (slot < 0) continue;
      let keeps = true;
      for (const { rule, values } of active) {
        // An id THIS rule does not mention still has to be put to it — the
        // union is over every rule — and what it is worth to this rule is its
        // own source's business.
        const raw = values.has(objectId) ? values.get(objectId) : absentValueOf(rule);
        if (!ruleKeeps(rule, raw)) {
          keeps = false;
          break;
        }
      }
      data[slot * 4 + 3] = keeps ? 255 : 0;
    }
  }
};

