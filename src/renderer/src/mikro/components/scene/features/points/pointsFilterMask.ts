/**
 * The point layer's visibility mask — `filterBys`, finally applied.
 *
 * One `uint` per point, 1 = visible: the cull pass ANDs it into its
 * predicate (`pointsCompute.ts`), so a filtered point costs nothing past the
 * compute stage, and the material's fragment fallback reads the same buffer
 * when no cull pass runs. A rule change is one O(N) refill of this buffer, a
 * `needsUpdate`, and one cull dispatch — no geometry rebuild, no re-scatter,
 * no re-read (the rule columns ride the same batched column cache the
 * colouring uses).
 *
 * The semantics are `columnLut.ts`'s, restated over slots exactly as the mesh
 * and label painters restate them: rules AND together; a rule whose column
 * could not be read applies to NOTHING (a filter quietly hiding everything
 * because a read failed is the worst possible reading of "filter"); the
 * answer for an id no rule mentions is the derived constant
 * `ruleKeeps(rule, absentValueOf(rule))` — nothing for a table column, zero
 * for a slice of a sparse matrix.
 */
import {
  absentValueOf,
  ruleKeeps,
  type ColumnLutEntryFilterBy,
} from "../../platform/attributes/columnLut";

/**
 * Fill `mask` from the resolved rules. Pure and synchronous — the caller does
 * the reads (and its own cancellation) first.
 */
export const fillPointFilterMask = (
  mask: Uint32Array,
  count: number,
  filterBys: readonly ColumnLutEntryFilterBy[],
  /** Per rule, in order; a null entry could not be read and applies to nothing. */
  ruleValues: readonly (Map<number, unknown> | null)[],
  /** An object id's point slot, or -1 for an id the table does not draw. */
  slotOf: (objectId: number) => number,
): void => {
  const active = filterBys
    .map((rule, index) => ({ rule, values: ruleValues[index] }))
    .filter((entry): entry is { rule: ColumnLutEntryFilterBy; values: Map<number, unknown> } =>
      Boolean(entry.values),
    );

  if (active.length === 0) {
    mask.fill(1, 0, count);
    return;
  }

  // The baseline is what an unmentioned id gets; the loop below corrects only
  // the slots some rule actually mentions — bounded by the rows read, never by
  // the point count.
  const baseline = active.every(({ rule }) => ruleKeeps(rule, absentValueOf(rule)));
  mask.fill(baseline ? 1 : 0, 0, count);

  const mentioned = new Set<number>();
  for (const { values } of active) for (const objectId of values.keys()) mentioned.add(objectId);

  for (const objectId of mentioned) {
    const slot = slotOf(objectId);
    if (slot < 0 || slot >= count) continue;
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
    mask[slot] = keeps ? 1 : 0;
  }
};
