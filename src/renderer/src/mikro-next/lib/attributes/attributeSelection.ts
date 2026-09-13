import type { AttributeHopLike, AttributePlanLike, TableHopLike } from "./attributeTypes";
import { hopKey, isSparseHop, isTableHop } from "./attributeTypes";
import { DEFAULT_SPARSE_LIMIT, type ExecutePlanOptions } from "./executePlan";
import { projectColumns } from "./planSql";

/**
 * What the user chose to FETCH on hover, and nothing else: which hops of a
 * plan run, which columns a table hop selects, and how much of a sparse
 * profile is kept. Pure and keyed by hop identity (`hopKey`), so a choice
 * made over one scene's data holds in every scene over the same data — and
 * survives the session through `loadSelection`/`saveSelection`.
 *
 * The defaults are the performance contract:
 *  - a landing TABLE runs (what always ran);
 *  - a landing SPARSE — one object's whole profile, thousands of entries plus
 *    the names hop after it — is OFF until switched on per matrix;
 *  - a later hop is OFF, except the names hop under an enabled sparse landing
 *    (bounded by `sparseLimit`, and the profile means nothing without it);
 *  - a hop never runs without its parent: enabling a child does not enable
 *    what it binds from, and disabling a parent silences its chain.
 */

export type HopFetchChoice = {
  enabled?: boolean;
  /** (TABLE) The attribute names to select; null = every declared one. */
  columns?: readonly string[] | null;
};

export type AttributeSelection = {
  hops: Readonly<Record<string, HopFetchChoice>>;
  /** How many entries of a sparse profile to keep, strongest first. */
  sparseLimit: number;
};

export const EMPTY_SELECTION: AttributeSelection = Object.freeze({
  hops: Object.freeze({}),
  sparseLimit: DEFAULT_SPARSE_LIMIT,
});

export const SPARSE_LIMIT_RANGE = { min: 5, max: 200, step: 5 } as const;

const parentOf = (plan: AttributePlanLike, hop: AttributeHopLike): AttributeHopLike | null =>
  hop.parent === null || hop.parent === undefined
    ? null
    : plan.hops.find((candidate) => candidate.index === hop.parent) ?? null;

/** What runs when the user has said nothing about this hop. */
export const defaultEnabled = (plan: AttributePlanLike, hop: AttributeHopLike): boolean => {
  const parent = parentOf(plan, hop);
  if (parent === null) return isTableHop(hop);
  return isSparseHop(parent);
};

/** The user's explicit choice for one hop, or its default. */
const chosen = (selection: AttributeSelection, plan: AttributePlanLike, hop: AttributeHopLike): boolean =>
  selection.hops[hopKey(plan, hop)]?.enabled ?? defaultEnabled(plan, hop);

/** Enabled, and every ancestor enabled. */
export const isHopEnabled = (
  selection: AttributeSelection,
  plan: AttributePlanLike,
  hop: AttributeHopLike,
): boolean => {
  let current: AttributeHopLike | null = hop;
  while (current !== null) {
    if (!chosen(selection, plan, current)) return false;
    current = parentOf(plan, current);
  }
  return true;
};

/** The hops that run, in plan order. */
export const selectHops = (
  selection: AttributeSelection,
  plan: AttributePlanLike,
): readonly AttributeHopLike[] => plan.hops.filter((hop) => isHopEnabled(selection, plan, hop));

/** The projection for a table hop: null when the user keeps every column. */
export const columnsFor = (
  selection: AttributeSelection,
  key: string,
): readonly string[] | null => selection.hops[key]?.columns ?? null;

/** The executor options one plan runs with under this selection. */
export const executeOptionsFor = (
  selection: AttributeSelection,
  plan: AttributePlanLike,
): Pick<ExecutePlanOptions, "hops" | "columnsFor" | "sparseLimit"> => ({
  hops: selectHops(selection, plan),
  columnsFor: (hop: TableHopLike) => columnsFor(selection, hopKey(plan, hop)),
  sparseLimit: selection.sparseLimit,
});

/** A projection with unknown names dropped; null when it keeps everything. */
export const normalizeColumns = (
  hop: TableHopLike,
  columns: readonly string[] | null,
): readonly string[] | null => {
  if (columns === null) return null;
  const kept = projectColumns(hop, columns);
  return kept.length === hop.lookup.attributes.length ? null : kept;
};

const signatures = new WeakMap<AttributeSelection, string>();

/**
 * A stable string for everything the selection changes about a fetch. Folded
 * into fetch keys and result caches, so a changed selection is a miss, never
 * a stale hit. Empty for the defaults.
 */
export const selectionSignature = (selection: AttributeSelection): string => {
  const cached = signatures.get(selection);
  if (cached !== undefined) return cached;
  const parts = Object.keys(selection.hops)
    .sort()
    .map((key) => {
      const choice = selection.hops[key];
      const bits: string[] = [];
      if (choice.enabled !== undefined) bits.push(choice.enabled ? "+" : "-");
      if (choice.columns) bits.push(`[${[...choice.columns].sort().join(",")}]`);
      return bits.length ? `${key}${bits.join("")}` : "";
    })
    .filter(Boolean);
  if (selection.sparseLimit !== DEFAULT_SPARSE_LIMIT) parts.push(`limit=${selection.sparseLimit}`);
  const signature = parts.join(";");
  signatures.set(selection, signature);
  return signature;
};

// ---- updates ----------------------------------------------------------------

export const withHopEnabled = (
  selection: AttributeSelection,
  key: string,
  enabled: boolean,
): AttributeSelection => ({
  ...selection,
  hops: { ...selection.hops, [key]: { ...selection.hops[key], enabled } },
});

export const withHopColumns = (
  selection: AttributeSelection,
  key: string,
  columns: readonly string[] | null,
): AttributeSelection => ({
  ...selection,
  hops: { ...selection.hops, [key]: { ...selection.hops[key], columns } },
});

export const withSparseLimit = (selection: AttributeSelection, limit: number): AttributeSelection => ({
  ...selection,
  sparseLimit: clampLimit(limit),
});

const clampLimit = (limit: number): number =>
  Number.isFinite(limit)
    ? Math.min(SPARSE_LIMIT_RANGE.max, Math.max(SPARSE_LIMIT_RANGE.min, Math.round(limit)))
    : DEFAULT_SPARSE_LIMIT;

// ---- persistence ------------------------------------------------------------

export const SELECTION_STORAGE_KEY = "orkestrator.attributeFetch";

export type SelectionStorage = Pick<Storage, "getItem" | "setItem">;

const defaultStorage = (): SelectionStorage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Some hosts throw on the accessor itself (blocked site data).
    return null;
  }
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

/** Read the persisted selection; the defaults when absent or malformed. */
export const loadSelection = (storage: SelectionStorage | null = defaultStorage()): AttributeSelection => {
  if (!storage) return EMPTY_SELECTION;
  try {
    const raw = storage.getItem(SELECTION_STORAGE_KEY);
    if (!raw) return EMPTY_SELECTION;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_SELECTION;
    const record = parsed as { hops?: unknown; sparseLimit?: unknown };
    const hops: Record<string, HopFetchChoice> = {};
    if (record.hops && typeof record.hops === "object") {
      for (const [key, value] of Object.entries(record.hops as Record<string, unknown>)) {
        if (!value || typeof value !== "object") continue;
        const choice = value as { enabled?: unknown; columns?: unknown };
        const clean: HopFetchChoice = {};
        if (typeof choice.enabled === "boolean") clean.enabled = choice.enabled;
        if (isStringArray(choice.columns)) clean.columns = choice.columns;
        if (clean.enabled !== undefined || clean.columns !== undefined) hops[key] = clean;
      }
    }
    return {
      hops,
      sparseLimit:
        typeof record.sparseLimit === "number" ? clampLimit(record.sparseLimit) : DEFAULT_SPARSE_LIMIT,
    };
  } catch {
    return EMPTY_SELECTION;
  }
};

export const saveSelection = (
  selection: AttributeSelection,
  storage: SelectionStorage | null = defaultStorage(),
): void => {
  if (!storage) return;
  try {
    storage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Quota or a blocked store: the session keeps the choice, the next one starts fresh.
  }
};
