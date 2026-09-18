/**
 * Colour-by and filter-by for spikes and events layers — what an entry MEANS,
 * as pure functions: which tables it walks, the SQL that reads its values, how
 * a value becomes a colour, and whether a filter keeps a row.
 *
 * An entry names a column (`table`, `column`) reached from the layer's ROOT
 * table — the unit table of a raster, the event table itself — through
 * `joinPath`: each step is `{table, column}`, the column of that table whose
 * values identify rows of the NEXT table (by that table's INDEX coordinate
 * column). An empty path reads the root's own column. This is mikro's COLUMN
 * colour-by, field for field; mikro skips joined entries on the client, elektro
 * evaluates them — up to `MAX_HOPS`, beyond which an entry is badged, not drawn.
 *
 * Pure — runs in node. No generated types.
 */

export const MAX_HOPS = 2;

export type JoinStepLike = { table: string; column: string };

export type ColorByLike = {
  table: string;
  column: string;
  joinPath?: readonly JoinStepLike[] | null;
  colormap?: string | null;
  min?: number | null;
  max?: number | null;
  label?: string | null;
};

export type FilterByLike = {
  table: string;
  column: string;
  joinPath?: readonly JoinStepLike[] | null;
  min?: number | null;
  max?: number | null;
  values?: readonly string[] | null;
  exclude?: boolean | null;
  label?: string | null;
};

export type PickerEntry = ColorByLike | FilterByLike;

/** What a read needs of a table: its store and the column holding row identity. */
export type TableRef = { id: string; store: { id: string }; idColumn: string | null };

/** The tables an entry walks, root first, terminal last. */
export const chainOf = (entry: PickerEntry, rootId: string): string[] => {
  const path = entry.joinPath ?? [];
  if (path.length === 0) return [rootId];
  return [...path.map((step) => step.table), entry.table];
};

/** Why an entry cannot be evaluated, or null when it can. */
export const entryProblem = (entry: PickerEntry, rootId: string): string | null => {
  const path = entry.joinPath ?? [];
  if (path.length === 0) {
    return entry.table === rootId ? null : "names a table the layer's rows do not key";
  }
  if (path.length > MAX_HOPS) return `joins ${path.length} tables deep (at most ${MAX_HOPS} are drawn)`;
  if (path[0].table !== rootId) return "its join does not start at the layer's table";
  return null;
};

const ident = (name: string) => `"${name.replaceAll('"', '""')}"`;
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

/**
 * The read that maps a KEY to the entry's value, walking the chain from table
 * `from` of it (0 = the root). Each hop joins the next table on its identity
 * column. Answers `__key, __v`; the key is the identity of `chain[from]` — or,
 * with `keyColumn`, that column of it instead.
 */
export const chainSql = (
  entry: PickerEntry,
  rootId: string,
  tableOf: (id: string) => TableRef | null,
  urlOf: (storeId: string) => string,
  options: { from?: number; keyColumn?: string | null } = {},
): string | null => {
  const chain = chainOf(entry, rootId);
  const path = entry.joinPath ?? [];
  const from = options.from ?? 0;
  if (from >= chain.length) return null;
  const tables = chain.map(tableOf);
  if (tables.some((t) => t == null)) return null;
  const refs = tables as TableRef[];

  const start = refs[from];
  const keyColumn = options.keyColumn ?? start.idColumn;
  if (!keyColumn) return null;

  const parts = [`FROM read_parquet(${literal(urlOf(start.store.id))}) a${from}`];
  for (let i = from + 1; i < refs.length; i++) {
    const target = refs[i];
    if (!target.idColumn) return null;
    parts.push(
      `JOIN read_parquet(${literal(urlOf(target.store.id))}) a${i} ON a${i - 1}.${ident(path[i - 1].column)} = a${i}.${ident(target.idColumn)}`,
    );
  }
  const last = refs.length - 1;
  return `SELECT a${from}.${ident(keyColumn)} AS __key, a${last}.${ident(entry.column)} AS __v ${parts.join(" ")}`;
};

// --- values → colour ------------------------------------------------------------

/** Continuous colormaps take a range; these take a colour per distinct value. */
export const QUALITATIVE = new Set(["HUES", "DISTINCT", "PASTEL", "VIVID"]);

export const isNumericValue = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** The value range to colour over: the entry's own bounds, else the data's. */
export const domainOf = (
  entry: Pick<ColorByLike, "min" | "max">,
  values: Iterable<unknown>,
): { min: number; max: number } | null => {
  let min = entry.min ?? Infinity;
  let max = entry.max ?? -Infinity;
  if (entry.min == null || entry.max == null) {
    for (const v of values) {
      if (!isNumericValue(v)) continue;
      if (entry.min == null && v < min) min = v;
      if (entry.max == null && v > max) max = v;
    }
  }
  return max >= min && Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
};

/**
 * A stable colour per category: categories sorted, then walked round the hue
 * wheel by the golden ratio — the same value gets the same colour across reads
 * and windows, and neighbours land far apart.
 */
export const categoricalRgb = (ordinal: number, pastel = false): [number, number, number] => {
  const hue = ((ordinal * 0.6180339887498949) % 1) * 360;
  const s = pastel ? 0.45 : 0.72;
  const l = pastel ? 0.72 : 0.58;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
};

export type ColorResolver = (value: unknown) => [number, number, number] | null;

/**
 * How an entry turns values into colours. Numeric values under a continuous
 * colormap map through `sample` over the domain; anything else — strings, or a
 * qualitative colormap — gets a categorical colour by sorted distinct value.
 * A missing value is null (drawn in the layer's base colour).
 */
export const colorResolver = (
  entry: ColorByLike,
  values: readonly unknown[],
  sample: (colormap: string | null, t: number) => [number, number, number],
): ColorResolver => {
  const qualitative = entry.colormap != null && QUALITATIVE.has(entry.colormap);
  const numeric = !qualitative && values.some(isNumericValue);
  if (numeric) {
    const domain = domainOf(entry, values);
    const span = domain && domain.max > domain.min ? domain.max - domain.min : 1;
    return (value) =>
      isNumericValue(value) && domain ? sample(entry.colormap ?? null, (value - domain.min) / span) : null;
  }
  const categories = [...new Set(values.filter((v) => v != null).map(String))].sort();
  const ordinal = new Map(categories.map((c, i) => [c, i]));
  const pastel = entry.colormap === "PASTEL";
  return (value) => {
    if (value == null) return null;
    const i = ordinal.get(String(value));
    return i == null ? null : categoricalRgb(i, pastel);
  };
};

// --- filters --------------------------------------------------------------------

/**
 * Whether one filter keeps a value. A range bound applies to numbers; a value
 * set to their string form; a missing value is kept only by an EXCLUDE rule
 * (it is not among what is excluded). `exclude` inverts the rule.
 */
export const ruleKeeps = (filter: FilterByLike, value: unknown): boolean => {
  if (value == null) return filter.exclude === true;
  let match = true;
  if (filter.min != null || filter.max != null) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) match = false;
    else {
      if (filter.min != null && n < filter.min) match = false;
      if (filter.max != null && n > filter.max) match = false;
    }
  }
  if (match && filter.values && filter.values.length > 0) {
    match = filter.values.includes(String(value));
  }
  return filter.exclude ? !match : match;
};

/** AND across rules: kept when every active rule keeps it. */
export const rulesKeep = (
  rules: readonly { filter: FilterByLike; valueOf: (key: unknown) => unknown }[],
  key: unknown,
): boolean => rules.every(({ filter, valueOf }) => ruleKeeps(filter, valueOf(key)));

// --- writing back -----------------------------------------------------------------

/** An entry as the update input wants it — every field it was read with, so nothing drops. */
export const colorByInput = (entry: ColorByLike) => ({
  table: entry.table,
  column: entry.column,
  joinPath: (entry.joinPath ?? []).map((s) => ({ table: s.table, column: s.column })),
  colormap: entry.colormap ?? null,
  min: entry.min ?? null,
  max: entry.max ?? null,
  label: entry.label ?? null,
});

export const filterByInput = (entry: FilterByLike) => ({
  table: entry.table,
  column: entry.column,
  joinPath: (entry.joinPath ?? []).map((s) => ({ table: s.table, column: s.column })),
  min: entry.min ?? null,
  max: entry.max ?? null,
  values: entry.values ? [...entry.values] : null,
  exclude: entry.exclude ?? false,
  label: entry.label ?? null,
});

// --- options ----------------------------------------------------------------------

export type ColumnMetaLike = {
  name: string;
  role?: string | null;
  axisType?: string | null;
  dtype?: string | null;
  references?: { id: string; name: string } | null;
};

export type TableMetaLike = { id: string; name: string; columns?: readonly ColumnMetaLike[] | null };

export type PickerOption = {
  key: string;
  table: string;
  tableName: string;
  column: string;
  dtype: string | null;
  joinPath: JoinStepLike[];
  /** "column" or "table › column" for a joined one. */
  caption: string;
};

const PICKABLE_ROLES = new Set(["ATTRIBUTE", "LABEL", "COLOR", "GROUP_ID"]);
const NUMERIC = /^(u?int|float|double|decimal|number)/i;

/** Columns a picker may name: data columns (not coordinates), numeric first. */
export const pickableColumns = (table: TableMetaLike): ColumnMetaLike[] =>
  (table.columns ?? [])
    .filter((c) => c.role == null || PICKABLE_ROLES.has(c.role))
    .sort((a, b) => Number(NUMERIC.test(b.dtype ?? "")) - Number(NUMERIC.test(a.dtype ?? "")));

export const optionKey = (joinPath: readonly JoinStepLike[], table: string, column: string) =>
  `${joinPath.map((s) => `${s.table}.${s.column}`).join(">")}|${table}|${column}`;

/**
 * The options a picker offers: the root table's own columns, plus — for every
 * root column that `references` another table — that table's columns, one hop
 * away. Elektro has no options query; the columns and their references ARE the
 * options.
 */
export const pickerOptions = (
  root: TableMetaLike,
  referenced: (id: string) => TableMetaLike | null,
): PickerOption[] => {
  const out: PickerOption[] = pickableColumns(root).map((c) => ({
    key: optionKey([], root.id, c.name),
    table: root.id,
    tableName: root.name,
    column: c.name,
    dtype: c.dtype ?? null,
    joinPath: [],
    caption: c.name,
  }));
  for (const fk of root.columns ?? []) {
    if (!fk.references) continue;
    const target = referenced(fk.references.id);
    if (!target) continue;
    const joinPath = [{ table: root.id, column: fk.name }];
    for (const c of pickableColumns(target)) {
      out.push({
        key: optionKey(joinPath, target.id, c.name),
        table: target.id,
        tableName: target.name,
        column: c.name,
        dtype: c.dtype ?? null,
        joinPath,
        caption: `${fk.name} › ${c.name}`,
      });
    }
  }
  return out;
};

/** The entries a layer's `activeColorBy` / `activeFilterBys` select, keyed for reads. */
export const activeEntries = (layer: {
  colorBys?: readonly ColorByLike[] | null;
  filterBys?: readonly FilterByLike[] | null;
  activeColorBy?: number | null;
  activeFilterBys?: readonly number[] | null;
}): {
  colorBy: { key: string; entry: ColorByLike } | null;
  filters: { key: string; entry: FilterByLike }[];
} => {
  const color = layer.activeColorBy != null ? layer.colorBys?.[layer.activeColorBy] ?? null : null;
  return {
    colorBy: color ? { key: `c${layer.activeColorBy}`, entry: color } : null,
    filters: (layer.activeFilterBys ?? [])
      .map((i) => ({ key: `f${i}`, entry: layer.filterBys?.[i] }))
      .filter((f): f is { key: string; entry: FilterByLike } => f.entry != null),
  };
};
