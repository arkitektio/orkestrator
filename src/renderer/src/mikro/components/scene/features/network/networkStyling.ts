/**
 * A network layer's active picker entries, resolved to what the packer and the
 * uniforms consume: `konnektionPack`'s `NetworkStyling` (the per-node half)
 * and the manager's `NetworkValueAppearance` (the how-it-looks half).
 *
 * The network picker is the one with three entry kinds, and they resolve from
 * three different places:
 *
 *  - a GRAPH entry names a per-node value the collection itself carries — no
 *    parquet, no DuckDB, no round trip: the values ride the decoded cells and
 *    the packer reads them there. Only the NAME travels through here.
 *  - a COLUMN entry is the mesh path verbatim: `resolveColumnValues` over the
 *    attribute plans, one full-column DuckDB scan per column, keyed by this
 *    collection's OBJECT ids. The per-object values are scattered per ordinal
 *    so the shader keeps exactly one value path.
 *  - a COLUMN entry with a stamped `target` (NODE or EDGE) is over a table
 *    identified by this collection's NODE ids — the post-hoc per-node/per-edge
 *    metadata path. Such tables publish NO attribute plan (an object id alone
 *    cannot address their rows), so the store and the composite key columns
 *    come from the table's own detail (`fetchTable`, one cached query per
 *    table): the key is (object axis, node axis…) with the node axes read off
 *    `Column.nodeReferences` in column order. Values are read by
 *    `readColumnByCompositeKey` and REKEYED objectId → ordinal here — the
 *    packer holds only ordinals and stays pure (S11).
 *  - a SPARSE entry reads one slice of a matrix, exactly as the mesh builder
 *    does.
 *
 * LEVEL HONESTY for the target entries: node ids survive every konnektion
 * level, so a per-NODE entry is exact everywhere. Edge identity survives
 * pruning but NOT simplification — on a Douglas-Peucker'd level the drawn
 * (source, target) pairs are re-linked and mostly absent from an edge table,
 * which renders as "no row": NaN → base colour for a colouring, and a rule
 * keeps what it never saw. Honest, and stated on the card rather than hidden.
 *
 * The semantics restated from `columnLut.ts`, which must not drift per layer
 * kind: rules AND together; `exclude` inverts the TEST; an unreadable entry is
 * SKIPPED and surfaced, never applied; an object with no row keeps its colour
 * and stays visible; a sparse rule reads absence as 0 (a slice is the complete
 * truth for its feature) while a column rule does not test an id it has no row
 * for.
 */

import type { AttributePlanLike, ParquetStoreLike } from "@/mikro/lib/attributes/attributeTypes";
import type { AttributeLookupEngine } from "@/mikro/lib/attributes/lookupEngine";

import {
  resolveColumnValues,
  ruleKeeps,
  looksNumeric,
  type ColumnLutEntryFilterBy,
} from "../../platform/attributes/columnLut";
import { entryAppearanceKeyOf, entryDataKeyOf } from "../../platform/attributes/entryKeys";
import {
  readColumnByCompositeKeyCached,
  readColumnByObjectIdBatchedCached,
} from "../../platform/attributes/columnValueCache";
import { DEFAULT_MEASURE_COLORMAP, paletteRowFor } from "../../platform/attributes/valueLut";
import { qualitativePalette } from "../../platform/layerui/colormap-utils";
import type { KonnektionObjectEntry } from "./konnektion/konnektionCatalogs";
import {
  IDENTITY_STYLING,
  type NetworkNodeRule,
  type NetworkStyling,
} from "./konnektion/konnektionPack";
import type { NetworkValueAppearance } from "./konnektionManager";

/** The layer fragment's entry shape, structurally — no generated-API import,
 *  so this module stays testable the way `konnektionPack` is. */
export type NetworkPickerColorBy = {
  kind?: string | null;
  attribute?: string | null;
  target?: string | null;
  table?: string | null;
  column?: string | null;
  dataset?: string | null;
  at?: readonly { axis: string; value: number }[] | null;
  colormap?: string | null;
  min?: number | null;
  max?: number | null;
  joinPath?: readonly { table: string; column: string }[] | null;
};

export type NetworkPickerFilterBy = NetworkPickerColorBy & {
  values?: readonly string[] | null;
  exclude?: boolean | null;
};

/** A loaded sparse matrix and its reader, exactly the mesh builder's pair. */
export type SparseSliceReader = (
  datasetId: string,
  at: readonly { axis: string; value: number }[],
) => Promise<{ values: Map<number, unknown> }>;

/** What a target entry needs to know about its table — the structural shape of
 *  the `GetTableDataset` detail, mapped by the caller so this module keeps its
 *  no-generated-API rule. */
export type NodeTableColumn = {
  name: string;
  role?: string | null;
  order: number;
  /** The collection whose NODE ids this column's values are, or null. */
  nodeReferences?: { id: string } | null;
};

export type NodeTableDetail = {
  id: string;
  store: ParquetStoreLike;
  columns: readonly NodeTableColumn[];
};

/** One cached table-detail fetch, injected by the layer (Apollo answers it
 *  from the normalized cache after the first round trip per table). */
export type NodeTableFetcher = (tableId: string) => Promise<NodeTableDetail | null>;

/**
 * The composite key columns of a node/edge table, from its column shape.
 *
 * The node axes are the COORDINATE columns whose `nodeReferences` is THIS
 * collection, in column order — for two that order IS (source, target), the
 * declaration-order-as-meaning rule the identification states. The object
 * axis is the remaining coordinate column; the server guarantees exactly one
 * sibling is keyed by the collection's objects, so more than one remainder
 * means the shape predates that guarantee and is refused here with a reason
 * rather than guessed at.
 */
export const nodeTableKeyColumns = (
  detail: NodeTableDetail,
  collectionId: string,
): { keyColumns: string[]; target: "NODE" | "EDGE" } | { reason: string } => {
  const coordinates = detail.columns
    .filter((column) => (column.role ?? "") === "COORDINATE")
    .sort((a, b) => a.order - b.order);
  const nodeColumns = coordinates.filter((column) => column.nodeReferences?.id === collectionId);
  const objectColumns = coordinates.filter((column) => column.nodeReferences == null);
  if (nodeColumns.length === 0) {
    return { reason: "no axis of the table names this collection's nodes" };
  }
  if (nodeColumns.length > 2) {
    // Server-refused at creation ("a hyperedge"); reachable only against data
    // from before that refusal existed.
    return { reason: "more than two node axes — a hyperedge this renderer cannot draw" };
  }
  if (objectColumns.length !== 1) {
    return {
      reason: `expected exactly one object axis beside the node ax${nodeColumns.length === 1 ? "is" : "es"}, found ${objectColumns.length}`,
    };
  }
  return {
    keyColumns: [objectColumns[0].name, ...nodeColumns.map((column) => column.name)],
    target: nodeColumns.length === 2 ? "EDGE" : "NODE",
  };
};

export type NetworkStylingResult = {
  styling: NetworkStyling;
  appearance: NetworkValueAppearance;
  /** True when the colouring resolved through the RANK branch (qualitative
   *  palette, or non-numeric values): the packed values are ranks and the
   *  clims are pinned 0..256, so an appearance recompose must keep that
   *  window rather than the entry's. */
  qualitative: boolean;
  /** Entries that do not render, each with why — badged, never silently applied. */
  skipped: string[];
};

/**
 * The DATA/APPEARANCE key split, shared across layer kinds — see
 * `platform/attributes/entryKeys.ts` for what goes where and why the
 * colormap's qualitative CLASS is data. A change of the data key is a rebuild
 * + re-pack; a change of only the appearance key is two uniform writes and a
 * palette refill (`composeNetworkAppearance`).
 */
export const networkDataKeyOf = (
  colorBy: NetworkPickerColorBy | null,
  rules: readonly NetworkPickerFilterBy[],
): string => entryDataKeyOf(colorBy, rules);

/** The APPEARANCE key: the fields a recompose alone can honour. */
export const networkAppearanceKeyOf = (colorBy: NetworkPickerColorBy | null): string =>
  entryAppearanceKeyOf(colorBy);

/**
 * Re-derive the appearance for an appearance-only edit — the same palette and
 * clim assembly the build's branches make, minus the build. `previous` keeps
 * the data-derived facts (colorize, applyToGlyphs, valueSource); a
 * non-colorizing appearance (identity, or a skipped colouring) has nothing to
 * recompose and comes back unchanged.
 */
export const composeNetworkAppearance = (
  previous: NetworkValueAppearance,
  qualitative: boolean,
  colorBy: NetworkPickerColorBy | null,
): NetworkValueAppearance => {
  if (!previous.colorize || !colorBy) return previous;
  return qualitative
    ? {
        ...previous,
        palette: paletteRowFor((colorBy.colormap ?? "HUES") as never),
        climMin: 0,
        climMax: 256,
      }
    : {
        ...previous,
        palette: paletteRowFor((colorBy.colormap ?? DEFAULT_MEASURE_COLORMAP) as never),
        climMin: colorBy.min ?? null,
        climMax: colorBy.max ?? null,
      };
};

const isGraph = (entry: { kind?: string | null }): boolean => entry.kind === "GRAPH";
const isSparse = (entry: { dataset?: string | null }): boolean => entry.dataset != null;
/** A COLUMN entry the server stamped a target onto — over a per-node or
 *  per-edge table. The stamp is the routing: no second query needed. */
const isNodeTargeted = (entry: {
  kind?: string | null;
  target?: string | null;
  table?: string | null;
}): boolean => !isGraph(entry) && entry.target != null && entry.table != null;

const IDENTITY_RESULT: NetworkStylingResult = {
  styling: IDENTITY_STYLING,
  qualitative: false,
  appearance: {
    palette: null,
    climMin: null,
    climMax: null,
    colorize: false,
    applyToGlyphs: true,
    valueSource: "node",
  },
  skipped: [],
};

/** The identity, for a layer with nothing active. A shared constant so the
 *  wiring effect can cheaply tell "nothing to do" from a resolved styling. */
export const identityNetworkStyling = (): NetworkStylingResult => IDENTITY_RESULT;

export const buildNetworkStyling = async ({
  colorBy,
  rules,
  vocabulary,
  objects,
  plans,
  engine,
  readSparse,
  collectionId = null,
  fetchTable = null,
}: {
  /** The active colouring, or null when `activeColorBy` selects nothing. */
  colorBy: NetworkPickerColorBy | null;
  /** The ACTIVE rules, already indexed out of `filterBys`. */
  rules: readonly NetworkPickerFilterBy[];
  /** The collection's attribute vocabulary (`attributeVocabulary(manifest)`),
   *  what a GRAPH name is resolved against. */
  vocabulary: readonly string[];
  /** The object catalog, for the objectId → ordinal scatter. Needed only when
   *  an object-level entry is active. */
  objects: readonly KonnektionObjectEntry[] | null;
  plans: readonly AttributePlanLike[] | null;
  engine: AttributeLookupEngine | null;
  readSparse: SparseSliceReader | null;
  /** This collection's API id — what a table's `nodeReferences` is matched
   *  against. Only needed when a target entry is active. */
  collectionId?: string | null;
  /** The cached table-detail fetch (see `NodeTableFetcher`). Null renders
   *  target entries as skipped, never wrongly. */
  fetchTable?: NodeTableFetcher | null;
}): Promise<NetworkStylingResult> => {
  const skipped: string[] = [];

  // ---- the GRAPH half: names only, values already ride the cells ----------
  const graphRules: NetworkNodeRule[] = [];
  for (const rule of rules) {
    if (!isGraph(rule)) continue;
    if (!rule.attribute) continue;
    if (!vocabulary.includes(rule.attribute)) {
      skipped.push(
        `rule over graph attribute '${rule.attribute}': the collection's manifest declares no such attribute`,
      );
      continue;
    }
    graphRules.push({
      attribute: rule.attribute,
      min: rule.min ?? null,
      max: rule.max ?? null,
      exclude: rule.exclude === true,
      target: rule.target === "EDGE" ? "EDGE" : "NODE",
    });
  }

  let valueAttribute: string | null = null;
  let appearance: NetworkValueAppearance = { ...IDENTITY_RESULT.appearance };
  let qualitativeResult = false;
  if (colorBy && isGraph(colorBy)) {
    if (colorBy.attribute && vocabulary.includes(colorBy.attribute)) {
      valueAttribute = colorBy.attribute;
      appearance = {
        palette: paletteRowFor((colorBy.colormap ?? DEFAULT_MEASURE_COLORMAP) as never),
        climMin: colorBy.min ?? null,
        climMax: colorBy.max ?? null,
        colorize: true,
        applyToGlyphs: colorBy.target !== "EDGE",
      };
    } else {
      skipped.push(
        `colouring by graph attribute '${colorBy.attribute ?? "?"}': the collection's manifest declares no such attribute`,
      );
    }
  }

  // ---- the object half: DuckDB and sparse reads, scattered per ordinal ----
  // Target entries are NOT object entries: their tables publish no attribute
  // plan (deliberately — an object id alone cannot address their rows), so
  // routing them here would "skip" every one with a misleading reason.
  const objectColorBy = colorBy && !isGraph(colorBy) && !isNodeTargeted(colorBy) ? colorBy : null;
  const objectRules = rules.filter((rule) => !isGraph(rule) && !isNodeTargeted(rule));

  let ordinalValues: Float32Array | null = null;
  let hiddenOrdinals: Set<number> | null = null;

  if (objectColorBy || objectRules.length > 0) {
    if (!objects || !plans || !engine) {
      skipped.push(
        "object-level entries: the attribute service, plans or object catalog are not available yet",
      );
    } else {
      const asRule = (rule: NetworkPickerFilterBy): ColumnLutEntryFilterBy => ({
        table: rule.table,
        column: rule.column,
        dataset: rule.dataset,
        at: rule.at,
        min: rule.min,
        max: rule.max,
        values: rule.values,
        exclude: rule.exclude === true,
        joinPath: rule.joinPath,
      });

      const resolved = await resolveColumnValues({
        colorBy:
          objectColorBy && !isSparse(objectColorBy)
            ? {
                table: objectColorBy.table,
                column: objectColorBy.column,
                min: objectColorBy.min,
                max: objectColorBy.max,
                joinPath: objectColorBy.joinPath,
              }
            : null,
        filterBys: objectRules.map(asRule),
        plans,
        engine,
        want: { kind: "network" },
        // Batched: the colouring and every same-tick rule over one table
        // share ONE multi-column SELECT (`columnReadBatch.ts`).
        readColumn: readColumnByObjectIdBatchedCached,
      });
      skipped.push(...resolved.skipped);

      let colorValues = resolved.colorValues;
      if (objectColorBy && isSparse(objectColorBy)) {
        if (!readSparse) {
          skipped.push(
            `colouring over matrix ${objectColorBy.dataset}: no datalayer connection, so the slice could not be read`,
          );
        } else {
          try {
            colorValues = (await readSparse(objectColorBy.dataset as string, objectColorBy.at ?? []))
              .values;
          } catch (error) {
            skipped.push(
              `colouring over matrix ${objectColorBy.dataset}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      const ruleValues = resolved.ruleValues.slice();
      await Promise.all(
        objectRules.map(async (rule, index) => {
          if (!isSparse(rule)) return;
          if (!readSparse) {
            skipped.push(
              `rule over matrix ${rule.dataset}: no datalayer connection, so the slice could not be read`,
            );
            return;
          }
          try {
            ruleValues[index] = (await readSparse(rule.dataset as string, rule.at ?? [])).values;
          } catch (error) {
            skipped.push(
              `rule over matrix ${rule.dataset}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }),
      );

      const ordinalCeiling = objects.reduce((top, object) => Math.max(top, object.ordinal), -1);

      if (colorValues && objectColorBy) {
        ordinalValues = new Float32Array(ordinalCeiling + 1).fill(Number.NaN);
        // Which branch a colouring takes is the `columnLut` split: a
        // qualitative colormap — or a column whose values are not numbers —
        // colours by the value's SORTED RANK so equal values share a colour;
        // a measure maps the number itself. A sparse slice is always measured
        // and reads absence as 0, the complete-truth rule.
        const qualitative =
          qualitativePalette((objectColorBy.colormap ?? "") as never) !== null ||
          !looksNumeric(colorValues.values());
        qualitativeResult = qualitative;
        if (qualitative) {
          const ranks = new Map(
            [...new Set([...colorValues.values()].map((value) => String(value)))]
              .sort()
              .map((value, rank) => [value, rank] as const),
          );
          for (const object of objects) {
            const raw = colorValues.get(object.objectId);
            if (raw === undefined) continue;
            // rank + 0.5 with a 0..256 window lands exactly on the palette
            // row's texel `rank` — the NEAREST-sampled class colour, with no
            // edge texel rounding the top rank into the wrong class.
            ordinalValues[object.ordinal] = (ranks.get(String(raw)) ?? 0) + 0.5;
          }
          appearance = {
            palette: paletteRowFor((objectColorBy.colormap ?? "HUES") as never),
            climMin: 0,
            climMax: 256,
            colorize: true,
            applyToGlyphs: true,
          };
        } else {
          for (const object of objects) {
            const raw = colorValues.get(object.objectId);
            const value = isSparse(objectColorBy) ? Number(raw ?? 0) : Number(raw);
            if (raw === undefined && !isSparse(objectColorBy)) continue;
            if (Number.isFinite(value)) ordinalValues[object.ordinal] = value;
          }
          appearance = {
            palette: paletteRowFor((objectColorBy.colormap ?? DEFAULT_MEASURE_COLORMAP) as never),
            climMin: objectColorBy.min ?? null,
            climMax: objectColorBy.max ?? null,
            colorize: true,
            applyToGlyphs: true,
          };
        }
      }

      // Rules over object values → hidden ordinals, both visibility bits: a
      // hidden object is the mesh semantics, glyphs and segments alike.
      const hidden = new Set<number>();
      objectRules.forEach((rule, index) => {
        const map = ruleValues[index];
        if (!map) return; // unreadable: skipped above, applied to nothing
        const lutRule = asRule(rule);
        for (const object of objects) {
          const raw = map.get(object.objectId);
          // A column rule does not test an id it has no row for — a filter
          // must never hide something it never saw. A sparse rule reads
          // absence as 0 and tests everything.
          const tested = raw !== undefined ? raw : isSparse(rule) ? 0 : undefined;
          if (tested === undefined) continue;
          if (!ruleKeeps(lutRule, tested)) hidden.add(object.ordinal);
        }
      });
      if (hidden.size > 0) hiddenOrdinals = hidden;
    }
  }

  // ---- the target half: per-node/per-edge tables, composite-keyed ---------
  const targetColorBy = colorBy && isNodeTargeted(colorBy) ? colorBy : null;
  const targetRules = rules.filter(isNodeTargeted);

  let nodeValues: Map<string, number> | null = null;
  let edgeValues: Map<string, number> | null = null;
  let hiddenNodeKeys: Set<string> | null = null;
  let hiddenEdgeKeys: Set<string> | null = null;

  if (targetColorBy || targetRules.length > 0) {
    if (!objects || !engine || !fetchTable || !collectionId) {
      skipped.push(
        "per-node/per-edge entries: the attribute service, table detail or object catalog are not available yet",
      );
    } else {
      const ordinalOf = new Map(objects.map((object) => [object.objectId, object.ordinal]));
      // One detail promise per table within this build; across builds Apollo's
      // cache makes the fetch itself cheap.
      const details = new Map<string, Promise<NodeTableDetail | null>>();
      const detailOf = (tableId: string): Promise<NodeTableDetail | null> => {
        let hit = details.get(tableId);
        if (!hit) {
          hit = fetchTable(tableId).catch(() => null);
          details.set(tableId, hit);
        }
        return hit;
      };

      /** One rekey per (table, column) within a build: the colouring and a
       *  rule naming the same column share the cached READ already, and this
       *  memo makes them share the objectId → ordinal walk too — which at a
       *  million rows is the walk that shows up. */
      const rekeyed = new Map<
        string,
        Promise<{ values: Map<string, unknown>; target: "NODE" | "EDGE" } | null>
      >();

      /** Read one target entry's column, rekeyed objectId → ordinal. */
      const resolveTarget = (
        entry: NetworkPickerColorBy,
        what: string,
      ): Promise<{ values: Map<string, unknown>; target: "NODE" | "EDGE" } | null> => {
        const memoKey = `${entry.table}:${entry.column}`;
        const hit = rekeyed.get(memoKey);
        if (hit) return hit;
        const promise = resolveTargetUncached(entry, what);
        rekeyed.set(memoKey, promise);
        return promise;
      };

      const resolveTargetUncached = async (
        entry: NetworkPickerColorBy,
        what: string,
      ): Promise<{ values: Map<string, unknown>; target: "NODE" | "EDGE" } | null> => {
        if ((entry.joinPath?.length ?? 0) > 0) {
          // The server refuses authoring these; reachable only against a
          // stored dump that predates the refusal.
          skipped.push(`${what} ${entry.column}: a join out of a node table is not rendered`);
          return null;
        }
        const detail = entry.table ? await detailOf(entry.table) : null;
        if (!detail) {
          skipped.push(`${what} ${entry.column}: the table's detail could not be read`);
          return null;
        }
        const shape = nodeTableKeyColumns(detail, collectionId);
        if ("reason" in shape) {
          skipped.push(`${what} ${entry.column}: ${shape.reason}`);
          return null;
        }
        const raw = await readColumnByCompositeKeyCached(
          engine,
          { store: detail.store, keyColumns: shape.keyColumns },
          entry.column as string,
        ).catch((error: unknown) => {
          skipped.push(
            `${what} ${entry.column}: ${error instanceof Error ? error.message : String(error)}`,
          );
          return null;
        });
        if (!raw) return null;
        // objectId → ordinal, so the packer never sees an object id (S11). A
        // row whose object the catalog does not know addresses nothing drawn.
        const rekeyed = new Map<string, unknown>();
        for (const [key, value] of raw) {
          const cut = key.indexOf(":");
          const ordinal = ordinalOf.get(Number(key.slice(0, cut)));
          if (ordinal === undefined) continue;
          rekeyed.set(`${ordinal}${key.slice(cut)}`, value);
        }
        return { values: rekeyed, target: shape.target };
      };

      if (targetColorBy) {
        const resolved = await resolveTarget(targetColorBy, "colouring");
        if (resolved) {
          // The same measure-vs-qualitative split the ordinal branch makes,
          // over composite keys instead of ordinals.
          const qualitative =
            qualitativePalette((targetColorBy.colormap ?? "") as never) !== null ||
            !looksNumeric(resolved.values.values());
          qualitativeResult = qualitative;
          const folded = new Map<string, number>();
          if (qualitative) {
            const ranks = new Map(
              [...new Set([...resolved.values.values()].map((value) => String(value)))]
                .sort()
                .map((value, rank) => [value, rank] as const),
            );
            for (const [key, raw] of resolved.values) {
              if (raw === undefined || raw === null) continue;
              folded.set(key, (ranks.get(String(raw)) ?? 0) + 0.5);
            }
            appearance = {
              palette: paletteRowFor((targetColorBy.colormap ?? "HUES") as never),
              climMin: 0,
              climMax: 256,
              colorize: true,
              applyToGlyphs: resolved.target === "NODE",
              valueSource: resolved.target === "EDGE" ? "edge" : "node",
            };
          } else {
            for (const [key, raw] of resolved.values) {
              const value = Number(raw);
              if (Number.isFinite(value)) folded.set(key, value);
            }
            appearance = {
              palette: paletteRowFor((targetColorBy.colormap ?? DEFAULT_MEASURE_COLORMAP) as never),
              climMin: targetColorBy.min ?? null,
              climMax: targetColorBy.max ?? null,
              colorize: true,
              // An edge colouring cannot paint node glyphs — no node owns an
              // edge row — so the spheres keep the material colour.
              applyToGlyphs: resolved.target === "NODE",
              valueSource: resolved.target === "EDGE" ? "edge" : "node",
            };
          }
          if (resolved.target === "EDGE") edgeValues = folded;
          else nodeValues = folded;
        }
      }

      // Rules: only keys a table MENTIONS can be hidden — a column rule never
      // tests what it has no row for, per node and per edge exactly as per
      // object. Across rules the union of rejections is the AND of keeps.
      // Resolved in PARALLEL: N rules over uncached columns used to be N
      // serialized full-table scans. The engine still serializes SQL on its
      // chain, but the detail fetches and cache lookups overlap, and the
      // fold below stays in rule order.
      const resolvedRules = await Promise.all(
        targetRules.map((rule) => resolveTarget(rule, "rule over")),
      );
      for (let index = 0; index < targetRules.length; index += 1) {
        const rule = targetRules[index];
        const resolved = resolvedRules[index];
        if (!resolved) continue;
        const lutRule: ColumnLutEntryFilterBy = {
          table: rule.table,
          column: rule.column,
          min: rule.min,
          max: rule.max,
          values: rule.values,
          exclude: rule.exclude === true,
        };
        const hidden =
          resolved.target === "EDGE"
            ? (hiddenEdgeKeys ??= new Set<string>())
            : (hiddenNodeKeys ??= new Set<string>());
        for (const [key, raw] of resolved.values) {
          if (!ruleKeeps(lutRule, raw)) hidden.add(key);
        }
      }
    }
  }

  return {
    styling: {
      valueAttribute,
      ordinalValues,
      rules: graphRules,
      hiddenOrdinals,
      nodeValues,
      edgeValues,
      hiddenNodeKeys,
      hiddenEdgeKeys,
    },
    appearance,
    qualitative: qualitativeResult,
    skipped,
  };
};
