import type { LensRegistry } from "@/mikro/lib/lenses/lensRegistry";
import { sparseSelectionKey } from "@/mikro/lib/lenses/lensSelection";
import type { SparsePosition } from "../attributes/sparseEntry";
import {
  toWireColorBy,
  toWireFilterBy,
  type ColorByInputLike,
  type ColorByWireInput,
  type FilterByInputLike,
  type FilterByWireInput,
} from "./columnOptions";

/**
 * Picker DRAFTS as a mutation takes them: the one place a sparse entry's
 * position becomes the lens id the server wants.
 *
 * A card holds drafts (`columnOptions.ColorByInputLike`): the position someone
 * picked, never the lens that names it, so the preview is drawn the moment they
 * pick. This runs at the WRITE instead. Every positioned sparse draft asks the
 * session registry for its lens — cache-first, so a save that moved no position
 * sends nothing extra, and two drafts over one position share one request —
 * and then the whole picker is mapped synchronously, field by field, so the
 * client-only `dataset` / `at` never reach the wire.
 *
 * Only the pickers that were passed come back: `colorBys` and `filterBys` are
 * each a whole-array replace, and one that is absent must stay absent.
 */
export async function resolveEntryInputs(
  registry: LensRegistry,
  drafts: {
    colorBys?: readonly ColorByInputLike[] | null;
    filterBys?: readonly FilterByInputLike[] | null;
  },
): Promise<{ colorBys?: ColorByWireInput[]; filterBys?: FilterByWireInput[] }> {
  const positioned = new Map<string, SparsePosition & { dataset: string }>();
  for (const draft of [...(drafts.colorBys ?? []), ...(drafts.filterBys ?? [])]) {
    if (draft.dataset == null) continue;
    positioned.set(sparseSelectionKey(draft.dataset, draft.at ?? []), {
      dataset: draft.dataset,
      at: draft.at ?? [],
    });
  }

  const lensByKey = new Map<string, string>();
  await Promise.all(
    [...positioned].map(async ([key, position]) => {
      lensByKey.set(key, await registry.ensureSparseLens(position.dataset, position.at ?? []));
    }),
  );

  const sparseLensOf = (draft: SparsePosition): string | null =>
    draft.dataset == null
      ? null
      : (lensByKey.get(sparseSelectionKey(draft.dataset, draft.at ?? [])) ?? null);

  return {
    ...(drafts.colorBys
      ? { colorBys: drafts.colorBys.map((draft) => toWireColorBy(draft, sparseLensOf)) }
      : {}),
    ...(drafts.filterBys
      ? { filterBys: drafts.filterBys.map((draft) => toWireFilterBy(draft, sparseLensOf)) }
      : {}),
  };
}
