import {
  overlay as overlayWith,
  type LayerPatches as CoreLayerPatches,
} from "@/core/data/plot/stores/layerPatch";
import { withPersisted, type LayerState, type PersistedLayer } from "../model/layerModel";

/**
 * The optimistic overlay for layer edits, bound to elektro's layer model. The
 * functions themselves are the plot engine's (`@/core/data/plot/stores/layerPatch`);
 * what is elektro's is `withPersisted` — how a `LayerState`'s derived fields
 * follow an edit.
 */
export type LayerPatches = CoreLayerPatches<PersistedLayer>;

/** The layers as drawn: the server's, with every pending edit laid over. */
export const overlay = (server: readonly LayerState[], patches: LayerPatches): LayerState[] =>
  overlayWith(server, patches, withPersisted);

export {
  NOT_PATCHED,
  addPatch,
  foldPatches,
  rollbackPatch,
} from "@/core/data/plot/stores/layerPatch";
