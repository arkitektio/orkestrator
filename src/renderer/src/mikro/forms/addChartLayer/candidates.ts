/**
 * What could be drawn in a chart, sorted into what a chart layer reads.
 *
 * The server answers with everything laid in the chart's world and in each
 * space registered into it (`ChartAddLayerCandidates`). This turns that into
 * the picker's three lists — arrays (lenses) for a trace, tables for a series,
 * annotation collections — and says, for each, whether it is already drawn and
 * whether it can be.
 *
 * "Can be" is a hint, read from data already in the answer: the SERVER decides
 * (and refuses with its own message). The hint only keeps a lens that plainly
 * cannot be a trace from being offered as if it could.
 *
 * Structural input — no generated types — so the sorting is testable in node.
 */

export type AxisLike = { name: string; type?: string | null };
export type SliceLike = { axis: string; start?: number | null; stop?: number | null };

export type ResidentLike =
  | {
      __typename: "ArrayLens";
      id: string;
      shape: readonly number[];
      axisNames: readonly string[];
      slices?: readonly SliceLike[] | null;
      coordinateSystem?: { axes?: readonly AxisLike[] | null } | null;
      dataset: { id: string; name: string };
    }
  | {
      __typename: "TableDataset";
      id: string;
      name: string;
      columns: readonly { name: string; role?: string | null; dtype?: string | null; unit?: string | null }[];
    }
  | { __typename: "AnnotationCollection"; id: string; name: string }
  // The rest of the `Resident` union: selected as a bare typename, not drawable.
  | { __typename: string; id?: undefined };

export type DrawnLayerLike = {
  __typename?: string;
  lens?: { id: string } | null;
  tableDataset?: { id: string } | null;
  valueColumn?: string | null;
  annotationCollection?: { id: string } | null;
};

export type CandidatesInput = {
  layers?: readonly DrawnLayerLike[] | null;
  worldCoordinateSystem: {
    residents?: readonly ResidentLike[] | null;
    placedSystems?: readonly { residents?: readonly ResidentLike[] | null }[] | null;
  };
};

export type LensCandidate = {
  id: string;
  datasetId: string;
  datasetName: string;
  axisNames: readonly string[];
  shape: readonly number[];
  /** The selection, for telling two lenses of one dataset apart. */
  slices: readonly SliceLike[];
  drawn: boolean;
  /** Why this lens is not a trace as it is, or null when it could be one. */
  reason: string | null;
};

export type TableCandidate = {
  id: string;
  name: string;
  /** Columns that could be read as the value, with their unit where declared. */
  valueColumns: { name: string; unit: string | null }[];
  /** The value columns of this table already drawn in the chart. */
  drawnColumns: string[];
};

export type CollectionCandidate = { id: string; name: string; drawn: boolean };

export type ChartCandidates = {
  lenses: LensCandidate[];
  tables: TableCandidate[];
  collections: CollectionCandidate[];
};

/** Axis kinds that enumerate rather than measure: one line per position. */
const ENUMERATING = new Set(["CHANNEL", "INDEX"]);

/**
 * A trace leaves ONE metric axis free — the one laid along the chart — and at
 * most one enumerating axis beside it, drawn as one line per position. Every
 * other axis must be sliced to a single position.
 */
export const traceShapeReason = (lens: {
  shape: readonly number[];
  axisNames: readonly string[];
  coordinateSystem?: { axes?: readonly AxisLike[] | null } | null;
}): string | null => {
  const typeOf = new Map((lens.coordinateSystem?.axes ?? []).map((a) => [a.name, a.type ?? null]));
  const free = lens.axisNames.filter((_, k) => (lens.shape[k] ?? 1) > 1);
  // Without axis types the shape alone cannot say which free axis measures.
  if (typeOf.size === 0) return free.length > 2 ? `${free.length} axes are free; slice it to one` : null;
  const enumerating = free.filter((name) => ENUMERATING.has(typeOf.get(name) ?? ""));
  const metric = free.filter((name) => !ENUMERATING.has(typeOf.get(name) ?? ""));
  if (metric.length === 0) return "no metric axis is free to lay along the chart";
  if (metric.length > 1) return `${metric.join(", ")} are all free; slice it to one`;
  if (enumerating.length > 1) return `${enumerating.join(", ")} are all free; one line axis at most`;
  return null;
};

/** A column a series could read as its value: a measurement, and not text. */
const isValueColumn = (column: { role?: string | null; dtype?: string | null }): boolean =>
  (column.role == null || column.role === "ATTRIBUTE") &&
  !/str|utf|char|bool|object|categor/i.test(column.dtype ?? "");

export const chartCandidates = (input: CandidatesInput): ChartCandidates => {
  const world = input.worldCoordinateSystem;
  const residents = [
    ...(world.residents ?? []),
    ...(world.placedSystems ?? []).flatMap((system) => system.residents ?? []),
  ];
  const layers = input.layers ?? [];
  const drawnLenses = new Set(layers.map((l) => l.lens?.id).filter(Boolean));
  const drawnCollections = new Set(layers.map((l) => l.annotationCollection?.id).filter(Boolean));

  const out: ChartCandidates = { lenses: [], tables: [], collections: [] };
  // A space can be reached twice (the world lists itself, or two paths lead in).
  const seen = new Set<string>();

  for (const resident of residents) {
    if (typeof resident.id !== "string") continue;
    const key = `${resident.__typename}:${resident.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (resident.__typename === "ArrayLens") {
      const lens = resident as Extract<ResidentLike, { __typename: "ArrayLens" }>;
      out.lenses.push({
        id: lens.id,
        datasetId: lens.dataset.id,
        datasetName: lens.dataset.name,
        axisNames: lens.axisNames,
        shape: lens.shape,
        slices: lens.slices ?? [],
        drawn: drawnLenses.has(lens.id),
        reason: traceShapeReason(lens),
      });
    } else if (resident.__typename === "TableDataset") {
      const table = resident as Extract<ResidentLike, { __typename: "TableDataset" }>;
      out.tables.push({
        id: table.id,
        name: table.name,
        valueColumns: table.columns
          .filter(isValueColumn)
          .map((column) => ({ name: column.name, unit: column.unit ?? null })),
        drawnColumns: layers
          .filter((l) => l.tableDataset?.id === table.id && l.valueColumn)
          .map((l) => l.valueColumn as string),
      });
    } else if (resident.__typename === "AnnotationCollection") {
      const collection = resident as Extract<ResidentLike, { __typename: "AnnotationCollection" }>;
      out.collections.push({
        id: collection.id,
        name: collection.name,
        drawn: drawnCollections.has(collection.id),
      });
    }
  }

  // What can be drawn first; what is already drawn last.
  out.lenses.sort((a, b) => Number(a.reason != null) - Number(b.reason != null) || Number(a.drawn) - Number(b.drawn));
  return out;
};
