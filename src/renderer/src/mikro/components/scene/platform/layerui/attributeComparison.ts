import type { HopMeta, PlanRowsState } from "@/mikro/lib/attributes/attributeTypes";

/** A settled block: what the HUD and the ROI panel both render one of. */
export type HopBlock = { meta: HopMeta; state: PlanRowsState };

/**
 * `position → label` for a sparse hop, read off its names hop: the first
 * child TABLE hop that ran, keyed by the axis it binds (`along <axis>`), its
 * label the first LABEL-role column, else the first text column that is not
 * the key.
 */
export const profileLabelsFor = (
  hop: HopMeta,
  blocks: readonly HopBlock[],
): ReadonlyMap<number, string> | null => {
  if (hop.kind !== "SPARSE") return null;
  const child = blocks.find(
    (block) =>
      block.meta.parentKey === hop.hopKey &&
      block.meta.kind === "TABLE" &&
      block.state.status === "rows",
  );
  if (!child) return null;
  const axis = hop.valueAxes[0];
  if (!axis) return null;
  const labelColumn =
    child.meta.attributes.find((column) => column.role === "LABEL")?.name ??
    child.meta.attributes.find((column) => column.name !== axis && column.dtype.toUpperCase().includes("VARCHAR"))?.name ??
    null;
  if (!labelColumn) return null;
  const labels = new Map<number, string>();
  for (const row of child.state.rows) {
    const position = row[axis];
    const label = row[labelColumn];
    if ((typeof position === "number" || typeof position === "bigint") && label != null) {
      labels.set(Number(position), String(label));
    }
  }
  return labels;
};

/**
 * Several points, one block per SOURCE.
 *
 * Each pinned probe point settles its own attribute blocks. Shown point by
 * point, three cells of the same table are three boxes with the same column
 * names, and three traces are three plots that cannot be compared. Merged,
 * the table is one grid with a column per point and the traces share one box.
 *
 * Blocks merge when they read the same source the same way — the same table,
 * matrix or array (`sourceId`) as the same kind of hop — whichever plan or
 * layer led there. Pure: the views in `AttributeComparisonViews.tsx` only draw
 * what this returns.
 */

export type ComparedPoint = {
  id: string;
  index: number;
  color: string;
  /** Shown instead of the number — the live probe's column is "live". */
  label?: string;
};

export const comparedPointName = (point: ComparedPoint): string =>
  point.label ?? String(point.index);

export type PointHopBlocks = { point: ComparedPoint; blocks: readonly HopBlock[] };

export type ComparedEntry = {
  point: ComparedPoint;
  state: PlanRowsState;
  /** (SPARSE) Position → label, when this point's names hop ran. */
  labels: ReadonlyMap<number, string> | null;
};

export type ComparedHop = {
  key: string;
  /** The first contributing point's metadata: the name, kind and columns. */
  meta: HopMeta;
  /** One per point that reached this source, in point order. */
  entries: readonly ComparedEntry[];
};

export const compareHopBlocks = (points: readonly PointHopBlocks[]): ComparedHop[] => {
  const groups = new Map<string, { key: string; meta: HopMeta; entries: ComparedEntry[] }>();
  for (const { point, blocks } of points) {
    for (const block of blocks) {
      // Unreachable hops are honest absences, not a column of dashes.
      if (block.state.status === "unreachable") continue;
      // A matrix's names hop is already in the grid, as the matrix's row
      // labels; its hundreds of rows are not a table to compare.
      if (
        block.meta.cardinality === "MANY" &&
        blocks.some(
          (parent) => parent.meta.hopKey === block.meta.parentKey && parent.meta.kind === "SPARSE",
        )
      ) {
        continue;
      }
      let key = `${block.meta.kind}:${block.meta.sourceId}`;
      // One point reaching the same source twice (two plans): the second
      // reading is its own block rather than a second column for one point.
      if (groups.get(key)?.entries.some((entry) => entry.point.id === point.id)) {
        key = `${key}#${block.meta.hopKey}`;
      }
      let group = groups.get(key);
      if (!group) {
        group = { key, meta: block.meta, entries: [] };
        groups.set(key, group);
      }
      group.entries.push({
        point,
        state: block.state,
        labels: profileLabelsFor(block.meta, blocks),
      });
    }
  }
  return [...groups.values()];
};

export type ComparedRow = {
  key: string;
  label: string;
  /** Aligned with the hop's `entries`; undefined where a point has no value. */
  cells: readonly unknown[];
};

/**
 * A TABLE hop as rows: one per column of the table, in the order the columns
 * first appear, each cell that point's value. A point with several rows (a
 * MANY hop) shows its first; `extraRows` says how many more it has.
 */
export const tableComparison = (
  hop: ComparedHop,
): { rows: ComparedRow[]; extraRows: readonly number[] } => {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const entry of hop.entries) {
    for (const name of Object.keys(entry.state.rows[0] ?? {})) {
      if (seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  const longNames = new Map(hop.meta.attributes.map((column) => [column.name, column.longName]));
  return {
    rows: names.map((name) => ({
      key: name,
      label: longNames.get(name) ?? name,
      cells: hop.entries.map((entry) => entry.state.rows[0]?.[name]),
    })),
    extraRows: hop.entries.map((entry) => Math.max(0, entry.state.rows.length - 1)),
  };
};

/**
 * A SPARSE hop as rows: one per position ANY point has an entry at, strongest
 * first (by the largest value across the points), each cell that point's
 * value there. A point's profile is capped, so an empty cell means "not among
 * this point's strongest", not zero.
 */
export const profileComparison = (hop: ComparedHop): ComparedRow[] => {
  const byPosition = new Map<number, { label: string; cells: unknown[]; peak: number }>();
  hop.entries.forEach((entry, column) => {
    for (const row of entry.state.rows) {
      const position = Number(row.position);
      let merged = byPosition.get(position);
      if (!merged) {
        const coords =
          hop.meta.valueAxes.length > 1
            ? hop.meta.valueAxes.map((axis) => String(row[axis])).join(",")
            : null;
        merged = {
          label: coords ?? `#${position}`,
          cells: new Array<unknown>(hop.entries.length).fill(undefined),
          peak: -Infinity,
        };
        byPosition.set(position, merged);
      }
      const name = entry.labels?.get(position);
      if (name) merged.label = name;
      merged.cells[column] = row.value;
      const value = Number(row.value);
      if (Number.isFinite(value) && value > merged.peak) merged.peak = value;
    }
  });
  return [...byPosition.entries()]
    .sort((a, b) => b[1].peak - a[1].peak)
    .map(([position, merged]) => ({
      key: String(position),
      label: merged.label,
      cells: merged.cells,
    }));
};
