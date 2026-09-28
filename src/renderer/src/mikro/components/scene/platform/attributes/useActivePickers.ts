import { useMemo } from "react";

import {
  entryAppearanceKeyOf,
  entryDataKeyOf,
  isColumnEntry,
  type PickerEntryLike,
  type PickerRuleLike,
} from "./entryKeys";

/**
 * A layer's stored pickers, narrowed to the active choice and keyed.
 *
 * Every picker-bearing layer — masks, meshes, networks, points — derives the
 * same five things from the same four fields, and each spelled it out: the
 * active colouring off `colorBys[activeColorBy]`, the active rules off
 * `filterBys[activeFilterBys[...]]`, the sparse dataset the colouring names
 * (if it names one rather than a column), and the two keys.
 *
 * Commit 97a684d0 shared the keys themselves (`entryKeys.ts`) but not the
 * derivation, so the CHOICE of key stayed per-layer — which is exactly the half
 * that drifts. Deriving both here makes the data/appearance split uniform by
 * construction rather than by four call sites agreeing.
 *
 * Pure and memo-only: it starts nothing and reads no service. The async half
 * lives in the builders each layer keeps.
 */
export function useActivePickers<C extends PickerEntryLike, R extends PickerRuleLike>(
  source:
    | {
        activeColorBy?: number | null;
        colorBys?: readonly C[] | null;
        activeFilterBys?: readonly number[] | null;
        filterBys?: readonly R[] | null;
      }
    | null
    | undefined,
): {
  colorBy: C | null;
  rules: readonly R[];
  /** The dataset a SPARSE colouring names, or null when it names a column.
   *  Both arms render; a sparse entry is answered from the store directly. */
  sparseDatasetId: string | null;
  /** Changes when what is READ changes: re-read and repaint. */
  dataKey: string;
  /** Changes when only the palette or window moves: two uniform writes. */
  appearanceKey: string;
} {
  const activeColorBy = source?.activeColorBy;
  const colorBys = source?.colorBys;
  const activeFilterBys = source?.activeFilterBys;
  const filterBys = source?.filterBys;

  const colorBy = useMemo(
    () => (activeColorBy == null ? null : (colorBys?.[activeColorBy] ?? null)),
    [activeColorBy, colorBys],
  );

  const rules = useMemo(
    () =>
      (activeFilterBys ?? [])
        .map((index) => filterBys?.[index])
        .filter((rule): rule is R => Boolean(rule)),
    [activeFilterBys, filterBys],
  );

  const sparseDatasetId = useMemo(
    () => (colorBy && !isColumnEntry(colorBy) ? (colorBy.dataset ?? null) : null),
    [colorBy],
  );

  // CONTENT keys, not references: the fold after a picker mutation writes the
  // server's arrays back with `Object.assign` into an immer draft, so whether
  // that yields new array identities is structural sharing's call, not ours.
  const dataKey = useMemo(() => entryDataKeyOf(colorBy, rules), [colorBy, rules]);
  const appearanceKey = useMemo(() => entryAppearanceKeyOf(colorBy), [colorBy]);

  return { colorBy, rules, sparseDatasetId, dataKey, appearanceKey };
}
