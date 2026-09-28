import {
  ColorMap,
  ColorSourceKind,
  ColumnControl,
  ColumnRole,
  GraphTarget,
  type ColorByOptionFragment,
  type FilterByOptionFragment,
  type LabelColorByFragment,
  type LabelColorByInput,
  type LabelFilterByFragment,
  type LabelFilterByInput,
  type MeshColorByFragment,
  type MeshColorByInput,
  type MeshFilterByFragment,
  type MeshFilterByInput,
  type NetworkColorByFragment,
  type NetworkColorByInput,
  type NetworkFilterByFragment,
  type NetworkFilterByInput,
} from "@/mikro/api/graphql";
import { qualitativePalette } from "./colormap-utils";
import { isColumnEntry } from "../attributes/entryKeys";

/**
 * The bridge between what the server OFFERS and what a MESH OR LABEL layer
 * STORES.
 *
 * `colorByOptions` and `filterByOptions` return the same candidate set — one
 * coordinate-graph walk, two names — so `ColorByOption` and `FilterByOption`
 * are structurally identical and collapse into the one `ColumnOption` shape
 * every consumer here is written against. The LABEL roots
 * (`labelColorByOptions` / `labelFilterByOptions`, keyed by the lens rather than
 * by a mesh collection) return those same two types, which is why one module
 * serves both layer kinds: a mask's pixel values dereference into a table by
 * exactly the FIELD edge a collection's object ids do.
 *
 * The option and the input deliberately do NOT share a shape: an option carries
 * whole `TableDataset` / `Column` nodes (the picker needs their
 * names, roles, units and parquet stores), while the input names them by id and
 * by column name. `toColorByInput` / `toFilterByInput` are the single place
 * that translation happens — including the `joinPath`, whose step objects
 * collapse to `{ table: id, column: name }`.
 *
 * Why the entry→input mappers exist at all: `colorBys` / `filterBys` are
 * WHOLE-ARRAY replacements on `updateMeshLayer` and on `updateLabelLayer`'s
 * `render`, so adding or removing one entry means re-sending every other entry.
 * Round-tripping through `colorByEntryToInput` keeps `joinPath` alive — read an
 * entry without it and send it back and the join silently flattens to `[]`,
 * which resolves the same column name against the wrong table.
 */

type OfferedOption = ColorByOptionFragment | FilterByOptionFragment;

/**
 * A candidate this module can actually execute: one naming a TABLE COLUMN.
 *
 * The server offers two kinds of candidate over one type. A column candidate
 * carries `table` and `column`; a SPARSE one carries `sparseDataset` and the
 * `axes` a position is named along, and leaves both of the others null —
 * "present exactly when `table` and `column` are null … an option is one or
 * the other, never both". Nothing here reads a sparse matrix yet, so the
 * pickers narrow with `isColumnOption` and the sparse half never reaches a
 * consumer written against `option.table.id`.
 */
export type ColumnOption = OfferedOption & {
  table: NonNullable<OfferedOption["table"]>;
  column: NonNullable<OfferedOption["column"]>;
};

export const isColumnOption = (option: OfferedOption): option is ColumnOption =>
  option.table != null && option.column != null;

/**
 * The other arm: one slice of a matrix rather than a column of a table.
 *
 * `axes` names the axes a position has to be given along — one for a rank-two
 * matrix, two for a rank-three one — and the position itself is NOT part of the
 * option. That is deliberate on the server's side: a 19,059-feature matrix is
 * one row in the picker, and the position is looked up in the table the axis
 * references. So picking a sparse option is picking a MATRIX; picking the gene
 * is the step after.
 */
export type SparseOption = OfferedOption & {
  sparseDataset: NonNullable<OfferedOption["sparseDataset"]>;
};

export const isSparseOption = (option: OfferedOption): option is SparseOption =>
  option.sparseDataset != null && option.axes.length > 0;

/**
 * The third arm, network collections only: a per-node value the collection
 * ITSELF carries — strahler, degree, depth, component, a writer's own column,
 * or `radius` off the encoding. Present exactly when the other two arms are
 * null. Always MEASURE, and the one option kind with no parquet behind it:
 * its values ride the decoded geometry, so authoring one costs no store read
 * and rendering one costs no DuckDB.
 */
export type GraphOption = OfferedOption & {
  graphAttribute: NonNullable<OfferedOption["graphAttribute"]>;
};

export const isGraphOption = (option: OfferedOption): option is GraphOption =>
  option.graphAttribute != null;

/**
 * A stored colouring, either layer kind. `MeshColorByFragment` and
 * `LabelColorByFragment` are field-for-field identical — same relation, same
 * `joinPath`, same caption — so every consumer takes the union rather than
 * being written twice.
 */
export type ColorByEntry = MeshColorByFragment | LabelColorByFragment | NetworkColorByFragment;

/**
 * A stored colouring the renderers can execute: the COLUMN arm of the same
 * either/or the options carry. A `SPARSE` entry names a `dataset` and a
 * position `at` instead and leaves `table`/`column` null; it round-trips
 * through `colorByEntryToInput` untouched, but no LUT is built from it.
 */
export type ColumnColorByEntry = ColorByEntry & { table: string; column: string };

export const isColumnColorBy = (entry: ColorByEntry): entry is ColumnColorByEntry =>
  isColumnEntry(entry);

/** A stored filter rule, any picker-bearing layer kind. See `ColorByEntry`. */
export type FilterByEntry = MeshFilterByFragment | LabelFilterByFragment | NetworkFilterByFragment;

/**
 * A stored rule's COLUMN arm — the same either/or a colouring has. A `SPARSE`
 * rule bounds one slice of a matrix instead: it names a `dataset` and a
 * position `at`, leaves `table`/`column` null, and is read from the store
 * rather than from a parquet.
 */
export type ColumnFilterByEntry = FilterByEntry & { table: string; column: string };

export const isColumnFilterBy = (entry: FilterByEntry): entry is ColumnFilterByEntry =>
  entry.table != null && entry.column != null;

/**
 * What the mappers below RETURN, structurally.
 *
 * `MeshColorByInput` and `LabelColorByInput` are generated separately but have
 * identical fields, so the mappers are typed against the shape both satisfy
 * rather than against one of them (which would need a cast at every label call
 * site) or a generic parameter (which would make callers name the input type to
 * get anything back). A compile-time assertion below pins the equivalence, so
 * this stops being structurally true the moment the two inputs diverge on the
 * server — rather than silently sending a mesh-shaped entry to a label layer.
 */
export type ColorByInputLike = MeshColorByInput & LabelColorByInput;
export type FilterByInputLike = MeshFilterByInput & LabelFilterByInput;

/**
 * The equivalence the two aliases above rest on, asserted at compile time.
 *
 * An intersection is assignable to either half whatever they contain, so it
 * proves nothing on its own — hence the mutual-extends check. If the server
 * ever gives a label colouring a field a mesh one lacks (or vice versa),
 * `MutuallyAssignable` resolves to `false`, `= true` stops compiling, and that
 * is the signal to split the mappers rather than widen a cast.
 */
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _colorByInputsMatch: MutuallyAssignable<MeshColorByInput, LabelColorByInput> = true;
const _filterByInputsMatch: MutuallyAssignable<MeshFilterByInput, LabelFilterByInput> = true;
void _colorByInputsMatch;
void _filterByInputsMatch;

/** The `joinPath` shape both the options and the stored entries reduce to. */
type JoinStepLike = { table: string; column: string };

const optionJoinPath = (option: ColumnOption): JoinStepLike[] =>
  option.joinPath.map((step) => ({ table: step.table.id, column: step.column.name }));

/**
 * Field by field, never a spread: a step read back off the wire carries
 * `__typename`, and `JoinStepInput` has no such field — spreading it sends an
 * unknown key into the mutation's variables.
 */
const entryJoinPath = (entry: {
  joinPath?: readonly JoinStepLike[] | null;
}): JoinStepLike[] =>
  (entry.joinPath ?? []).map((step) => ({ table: step.table, column: step.column }));

/**
 * The identity of a candidate: the same (joinPath, table, column) triple the
 * server keys an option by. Two columns of the same name in two tables — or the
 * same column reached directly and through a hop — are different candidates,
 * so all three parts are in the key.
 */
const columnKey = (
  joinPath: readonly JoinStepLike[],
  table: string,
  column: string,
  target?: string | null,
): string =>
  // `target` is a fact of the TABLE's shape (a per-node table's columns are
  // always NODE), so it can never split one candidate into two — it rides the
  // key to keep an option's identity honest, not to disambiguate.
  `${joinPath.map((step) => `${step.table}.${step.column}`).join(">")}|${table}|${column}${target ? `|${target}` : ""}`;

/**
 * An offered option's identity, either arm.
 *
 * A sparse option keys on the MATRIX, not on a slice of it — the position is
 * not part of the option, so two entries over one matrix at different positions
 * are two entries and one option. That is what makes "already added" mean
 * "this matrix is in the picker", which is the useful reading here.
 */
export const optionKey = (option: ColumnOption | SparseOption | GraphOption): string => {
  if (isColumnOption(option))
    return columnKey(optionJoinPath(option), option.table.id, option.column.name, option.target);
  if (isGraphOption(option)) return `graph|${option.graphAttribute}`;
  return `sparse|${(option as SparseOption).sparseDataset.id}`;
};

/**
 * A stored entry's identity. A sparse entry names no column, so it keys on
 * what it does name — its dataset and position — rather than collapsing every
 * one of them onto the same empty `||` key.
 */
export const entryKey = (entry: {
  table?: string | null;
  column?: string | null;
  dataset?: string | null;
  at?: readonly { axis: string; value: number }[] | null;
  attribute?: string | null;
  target?: string | null;
  joinPath?: readonly JoinStepLike[] | null;
}): string => {
  // A COLUMN entry's `target` is the server's stamp (per-node/per-edge
  // tables); a GRAPH entry's is an aim and deliberately NOT in its key.
  if (entry.table != null && entry.column != null)
    return columnKey(entryJoinPath(entry), entry.table, entry.column, entry.target);
  // A graph entry keys on its attribute alone — like a sparse option and its
  // matrix, "already added" means "this attribute is in the picker", and the
  // target is a variation within it rather than a different candidate.
  if (entry.attribute != null) return `graph|${entry.attribute}`;
  return `sparse|${entry.dataset ?? "?"}|${(entry.at ?? [])
    .map((position) => `${position.axis}=${position.value}`)
    .join(",")}`;
};

/** Whether a stored entry is this option — same table, column and join. */
export const entryMatchesOption = (
  entry: {
    table?: string | null;
    column?: string | null;
    joinPath?: readonly JoinStepLike[] | null;
  },
  option: ColumnOption,
): boolean => entryKey(entry) === optionKey(option);

/** What a picker captions a candidate with; `longName` when the table has one. */
export const optionLabel = (option: ColumnOption): string =>
  option.column.longName?.trim() || option.column.name;

/**
 * The default `label` written onto a new entry. The server accepts null and
 * derives its own, but a joined column is ambiguous without its table — two
 * tables reached through one collection can both declare `area`.
 */
export const optionEntryLabel = (option: ColumnOption): string =>
  option.joinPath.length > 0
    ? `${option.table.name} · ${optionLabel(option)}`
    : optionLabel(option);

export const isMeasure = (option: ColumnOption): boolean =>
  option.control === ColumnControl.Measure;

/** A picker entry captions itself; the column is the fallback name. */
export const entryLabel = (entry: {
  label?: string | null;
  column?: string | null;
}): string => entry.label?.trim() || entry.column || "a sparse slice";

/**
 * A bound as a row wants to read it. An ion intensity carries fifteen digits
 * and none of them are the point; an integral count keeps every digit it has.
 */
const readableBound = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)));

/**
 * A filter rule in words, for its row's detail line and the toggle's tooltip.
 * Which half applies follows from the column's role: bounds for a measure, an
 * explicit set for a categorical — the same either/or the input models.
 */
export const describeFilterRule = (rule: {
  min?: number | null;
  max?: number | null;
  values?: readonly string[] | null;
}): string => {
  if (rule.values && rule.values.length > 0) {
    return `is one of ${rule.values.slice(0, 4).join(", ")}${
      rule.values.length > 4 ? `, +${rule.values.length - 4} more` : ""
    }`;
  }
  if (rule.min != null && rule.max != null)
    return `is between ${readableBound(rule.min)} and ${readableBound(rule.max)}`;
  if (rule.min != null) return `is at least ${readableBound(rule.min)}`;
  if (rule.max != null) return `is at most ${readableBound(rule.max)}`;
  return "matches";
};

/**
 * A colouring in words, for its row's second line. Which half applies is the
 * measure/categorical split again: a colormap is a ramp over the column's
 * range, and a categorical column takes a qualitative one -- a colour per distinct value, with
 * no range to run over and nothing to window.
 */
export const describeColouring = (entry: {
  colormap?: ColorMap | null;
  min?: number | null;
  max?: number | null;
}): string => {
  const palette = qualitativePalette(entry.colormap);
  if (palette) return `"${palette}" palette, a colour per distinct value`;
  if (entry.colormap) {
    return entry.min != null || entry.max != null
      ? `${entry.colormap.toLowerCase()} over ${
          entry.min != null ? readableBound(entry.min) : "…"
        } … ${entry.max != null ? readableBound(entry.max) : "…"}`
      : `${entry.colormap.toLowerCase()} over the column's range`;
  }
  return "a colour per distinct value";
};

/**
 * A joined entry is stored and honoured by the server, but neither renderer
 * executes the `references` hop yet (see the LIMITATION note in
 * `fabriksColorLut.ts`), so a card badges it rather than silently doing nothing
 * on screen.
 */
export const isJoinedEntry = (entry: {
  joinPath?: readonly unknown[] | null;
}): boolean => (entry.joinPath?.length ?? 0) > 0;

/** What that badge says, appended to a row's tooltip. */
export const JOINED_NOTE = " — reached through a join, not rendered yet";

/**
 * The same, for the SPARSE arm.
 *
 * It draws now — one slice of the matrix, a value per object — so this says what
 * the row IS rather than what it cannot do. The distinction still matters to a
 * reader: the value comes from a store read rather than a table lookup, so a
 * colouring is offered only along an axis the matrix has a layout for.
 */
export const SPARSE_NOTE = " — one slice of a sparse matrix";

/**
 * And for the GRAPH arm. It draws, and it is the one entry kind whose value
 * varies WITHIN an object — per node, off the collection's own geometry.
 */
export const GRAPH_NOTE = " — a per-node value the collection carries";

/**
 * A COLUMN entry over a table identified by the collection's NODE ids — the
 * post-hoc sibling of the GRAPH arm, read from parquet by (object, node) key.
 * The stamped `target` says which; the badges tell a reader why this entry
 * varies within an object where the other column entries cannot.
 */
export const PER_NODE_NOTE = " — a per-node table, keyed by (object, node)";

/**
 * The per-EDGE variant: two node axes, (source, target). Exact at level 0 and
 * on pruned levels; a simplification RE-LINKS edges, so on such a level a
 * drawn pair mostly has no row — it keeps its base colour, and a rule keeps
 * what it never saw. Said here because the card badge is where a user reading
 * a deep ladder's top level as "unmeasured" will look.
 */
export const PER_EDGE_NOTE =
  " — a per-edge table, keyed by (object, source, target); void on simplified levels";

/**
 * The note a stored COLUMN entry's stamped `target` earns, or "" for an
 * object-level entry (and for a GRAPH entry, whose target is an aim rather
 * than a table fact — its note is `GRAPH_NOTE`, keyed off `attribute`).
 * Structural on purpose: mesh and label fragments carry no `target` field and
 * fall straight through to "".
 */
export const targetNote = (entry: { table?: string | null; target?: string | null }): string =>
  entry.table == null
    ? ""
    : entry.target === "NODE"
      ? PER_NODE_NOTE
      : entry.target === "EDGE"
        ? PER_EDGE_NOTE
        : "";

/** What a picker captions a graph candidate with: the attribute's own name. */
export const graphOptionLabel = (option: GraphOption): string => option.graphAttribute;

/**
 * The control a column admits, from its declared role — the same rule the
 * server derives `ColumnControl` by, restated here because a STORED entry
 * carries only its table id and column name and has to be re-classified from
 * the table's own declaration when the picker that created it is long gone.
 *
 * Measured-and-ordered values take a colormap and a bound; naming values take
 * an explicit colour map and a value set, because a colormap or a range over
 * them would impose an order they do not have.
 */
export const controlForRole = (role: ColumnRole): ColumnControl =>
  role === ColumnRole.Coordinate || role === ColumnRole.Attribute
    ? ColumnControl.Measure
    : ColumnControl.Categorical;

// ---------------------------------------------------------------- option → input

export const toColorByInput = (
  option: ColumnOption,
  patch?: Partial<Omit<ColorByInputLike, "table" | "column" | "joinPath">>,
): ColorByInputLike => ({
  kind: ColorSourceKind.Column,
  table: option.table.id,
  column: option.column.name,
  joinPath: optionJoinPath(option),
  label: optionEntryLabel(option),
  ...patch,
});

/**
 * The SPARSE arm of the same mapping.
 *
 * Separate from `toColorByInput` rather than a branch inside it, because the
 * two take different second arguments: a column colouring is fully determined
 * by its option, and a sparse one is not — it needs a POSITION along each axis
 * the matrix identifies itself by, which the option deliberately does not carry.
 *
 * `at` must name every one of `option.axes`. Naming fewer, or naming the axis
 * the ids run along, is refused server-side — so it is refused here too, before
 * a mutation is in flight.
 */
/**
 * The position contract both sparse arms rest on, checked before a mutation is
 * in flight rather than after the server refuses it: `at` names every axis the
 * matrix identifies itself by — never fewer, and never the axis the ids run
 * along.
 */
const assertNamesEveryAxis = (
  option: SparseOption,
  at: readonly { axis: string; value: number }[],
): void => {
  const named = [...at.map((position) => position.axis)].sort();
  const wanted = [...option.axes].sort();
  if (named.length !== wanted.length || named.some((axis, index) => axis !== wanted[index])) {
    throw new Error(
      `an entry over '${option.sparseDataset.name}' names a position along ${wanted.join(", ")}, but got ${named.join(", ") || "none"}`,
    );
  }
};

export const toSparseColorByInput = (
  option: SparseOption,
  at: readonly { axis: string; value: number }[],
  patch?: Partial<Omit<ColorByInputLike, "kind" | "dataset" | "at">>,
): ColorByInputLike => {
  assertNamesEveryAxis(option, at);
  return {
    kind: ColorSourceKind.Sparse,
    dataset: option.sparseDataset.id,
    at: at.map((position) => ({ axis: position.axis, value: position.value })),
    // A slice is a value per object, so it is always measured — never a class map.
    colormap: ColorMap.Magma,
    label: option.sparseDataset.name,
    ...patch,
  };
};

/**
 * The GRAPH arm of the option → input mapping, network layers only.
 *
 * Fully determined by its option plus the aim: unlike a sparse entry there is
 * no position to pick — the attribute IS the value source. `target` defaults
 * to NODE (paint glyphs and segments); EDGE leaves glyphs at the base colour.
 * Always measured, so the default colormap is a ramp, never a palette.
 */
export const toGraphColorByInput = (
  option: GraphOption,
  patch?: Partial<Omit<NetworkColorByInput, "kind" | "attribute">>,
): NetworkColorByInput => ({
  kind: ColorSourceKind.Graph,
  attribute: option.graphAttribute,
  target: GraphTarget.Node,
  colormap: ColorMap.Viridis,
  label: graphOptionLabel(option),
  ...patch,
});

/**
 * A rule over a graph attribute: always `min`/`max` bounds (a per-node metric
 * is measured), and the one rule kind that hides individual nodes and their
 * segments rather than whole objects — "trunk only" is strahler with min 3.
 */
export const toGraphFilterByInput = (
  option: GraphOption,
  patch?: Partial<Omit<NetworkFilterByInput, "kind" | "attribute">>,
): NetworkFilterByInput => ({
  kind: ColorSourceKind.Graph,
  attribute: option.graphAttribute,
  target: GraphTarget.Node,
  label: graphOptionLabel(option),
  exclude: false,
  ...patch,
});

export const toFilterByInput = (
  option: ColumnOption,
  patch?: Partial<Omit<FilterByInputLike, "table" | "column" | "joinPath">>,
): FilterByInputLike => ({
  table: option.table.id,
  column: option.column.name,
  joinPath: optionJoinPath(option),
  label: optionEntryLabel(option),
  exclude: false,
  ...patch,
});

/**
 * The SPARSE arm of a RULE — `toSparseColorByInput`'s sibling, and the same
 * position contract: `at` must name every axis the matrix identifies itself by.
 *
 * A slice is always MEASURED, so a rule over one is always a `min`/`max` bound
 * and never a `values` set. Those bounds are the caller's: the write path
 * refuses a rule that states neither, and the widest legal one is the slice's
 * own range, which only a read of the slice knows.
 */
export const toSparseFilterByInput = (
  option: SparseOption,
  at: readonly { axis: string; value: number }[],
  patch?: Partial<Omit<FilterByInputLike, "kind" | "dataset" | "at">>,
): FilterByInputLike => {
  assertNamesEveryAxis(option, at);
  return {
    kind: ColorSourceKind.Sparse,
    dataset: option.sparseDataset.id,
    at: at.map((position) => ({ axis: position.axis, value: position.value })),
    label: option.sparseDataset.name,
    exclude: false,
    ...patch,
  };
};

// ----------------------------------------------------------------- entry → input

/**
 * Every field, including the ones no picker here authors: `colorBys` is a
 * WHOLE-ARRAY replace, so a `SPARSE` entry read back and re-sent without its
 * `kind`, `dataset` and `at` would come back a COLUMN entry naming nothing —
 * the `joinPath` hazard again, one arm further out.
 */
export const colorByEntryToInput = (entry: ColorByEntry): ColorByInputLike => ({
  kind: entry.kind,
  table: entry.table ?? null,
  column: entry.column ?? null,
  dataset: entry.dataset ?? null,
  at: (entry.at ?? []).map((position) => ({
    axis: position.axis,
    value: position.value,
  })),
  // The GRAPH arm, network entries only — and only WHEN CARRIED, both ways:
  // a network entry re-sent without them comes back a COLUMN entry naming
  // nothing (the joinPath hazard, one arm further out), while a mesh or label
  // mutation handed variables carrying unknown keys is refused whole by
  // GraphQL validation. Mesh and label fragments have no such fields, so the
  // spread is empty exactly where the keys would be refused.
  //
  // Gated on `attribute`, NOT on `target`: a COLUMN entry over a per-node/
  // per-edge table carries a target too, but that one is the server's STAMP —
  // derived from the table's shape, refused if a caller sends it — so a
  // whole-array re-send must strip it and let the server re-stamp.
  ...("attribute" in entry && entry.attribute != null
    ? { attribute: entry.attribute, target: entry.target ?? null }
    : {}),
  joinPath: entryJoinPath(entry),
  colormap: entry.colormap ?? null,
  label: entry.label ?? null,
  min: entry.min ?? null,
  max: entry.max ?? null,
});

/**
 * The same, for a rule — `kind`, `dataset` and `at` included for the same
 * reason they are on the colouring mapper: `filterBys` is a whole-array
 * replace, so a SPARSE rule read back and re-sent without them comes back a
 * COLUMN rule naming nothing, and the server refuses it (or worse, stores it).
 */
export const filterByEntryToInput = (entry: FilterByEntry): FilterByInputLike => ({
  kind: entry.kind,
  table: entry.table ?? null,
  column: entry.column ?? null,
  dataset: entry.dataset ?? null,
  at: (entry.at ?? []).map((position) => ({
    axis: position.axis,
    value: position.value,
  })),
  // Conditional for `colorByEntryToInput`'s reason exactly — the stamped
  // COLUMN target included: stripped on re-send, re-stamped by the server.
  ...("attribute" in entry && entry.attribute != null
    ? { attribute: entry.attribute, target: entry.target ?? null }
    : {}),
  joinPath: entryJoinPath(entry),
  min: entry.min ?? null,
  max: entry.max ?? null,
  values: entry.values ?? null,
  exclude: entry.exclude,
  label: entry.label ?? null,
});

// ------------------------------------------------------------- index bookkeeping

/**
 * `activeColorBy` and `activeFilterBys` are INDICES into the arrays being
 * resliced, so removing an entry has to repoint them in the same mutation:
 * dropping entry `k` shifts every later entry down by one, and an index left
 * pointing at `k` now names its successor.
 */
export const activeColorByAfterRemoval = (
  activeColorBy: number | null,
  removed: number,
): number | null => {
  if (activeColorBy === null) return null;
  if (activeColorBy === removed) return null;
  return activeColorBy > removed ? activeColorBy - 1 : activeColorBy;
};

export const activeFilterBysAfterRemoval = (
  activeFilterBys: readonly number[],
  removed: number,
): number[] =>
  activeFilterBys
    .filter((index) => index !== removed)
    .map((index) => (index > removed ? index - 1 : index))
    .sort((a, b) => a - b);
