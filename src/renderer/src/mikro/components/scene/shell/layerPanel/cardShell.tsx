import type { LayerState } from "../../platform/stores/sceneStore";
import type { UnplannableLayerInfo } from "../../features/bricks/store/brickSlice";

/**
 * The props EVERY layer card is handed.
 *
 * One shape for all nine kinds, deliberately: a card that does not need
 * `onFocus` or `expanded` simply does not destructure it, and a function
 * component that accepts fewer props is assignable to one that accepts more.
 * The alternative — per-kind prop shapes — is what forced the panel to spell a
 * separate `.map()` per kind, which is exactly the seam `cardRegistry.tsx`
 * closes.
 *
 * `L` is the layer type the card reads. It is NOT free: the registry entry's
 * `source` says which of the store's two lists the layer comes from, and the
 * two are not interchangeable — see `cardRegistry.tsx`.
 */
export type LayerCardProps<L> = {
  layer: L;
  /** Whether this card's editor is unfolded. */
  expanded: boolean;
  /** Set when the pool-viability guard refused this layer (P18). */
  unplannable?: UnplannableLayerInfo;
  /**
   * Toggle this card. Takes the CURRENT expanded state so the panel's handler
   * can stay stable — the card already knows whether it is open, so the panel
   * never has to read that back out of a ref during render.
   */
  onSelect: (id: string, currentlyExpanded: boolean) => void;
  onUpdate: (updated: LayerState) => void;
  onFocus: (layerId: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

// The card's surface lives in `platform/layerui/cardControls.tsx`
// (`layerCardShellClasses` / `LayerCardShell`) — one dialect for every layer
// kind, brick-backed and collection-backed alike.
