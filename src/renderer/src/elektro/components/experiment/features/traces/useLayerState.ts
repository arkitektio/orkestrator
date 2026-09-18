/**
 * One layer's normalized state, by id — re-exported from the store, where the
 * O(1) index lives. Kept at this path for the features that import it.
 */
export { useLayerState } from "../../platform/stores/experimentStore";
