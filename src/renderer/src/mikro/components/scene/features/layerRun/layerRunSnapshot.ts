import type { AxisInstants } from "@/core/data/scene/coords/axisTime";

import type { CropBox } from "../../platform/coords/cropBox";
import { selectionsFor } from "../../platform/model/worldSelections";
import type { DisplayMode } from "../../platform/stores/modeStore";
import {
  channelSelection,
  everythingSelection,
  layerRunSelection,
  type LayerRunSelection,
  type RunLayer,
  type RunScope,
} from "./layerRunTarget";

/**
 * What was on screen at a right-click: enough to cut ANY layer at that place
 * and frame, so the float's "Run on" picker can switch layers without reading
 * the live (scrubbed-since) view. References, not copies: the store replaces
 * these records on write, never mutates them.
 */
export type LayerRunSnapshot = {
  displayMode: DisplayMode;
  currentZ: number;
  cropBox: CropBox | null;
  dimSelections: Record<string, number>;
  worldSelections: Record<string, number>;
  layerAxisInstants: Record<string, readonly AxisInstants[]>;
};

/** One layer's cut at the snapshot; null when it shows nothing there. */
export const selectionAt = (
  layer: RunLayer & { id: string },
  snapshot: LayerRunSnapshot,
): LayerRunSelection | null =>
  layerRunSelection({
    layer,
    displayMode: snapshot.displayMode,
    currentZ: snapshot.currentZ,
    selections: selectionsFor(snapshot, layer.id),
    cropBox: snapshot.cropBox,
  });

/**
 * The layers a right-click can run on, in the order the float offers them:
 * the data layer first while it is SHOWN — a hidden pinned layer is what tasks
 * read, not what was clicked — then every other shown layer with a cut here.
 */
export const runnableLayers = <L extends RunLayer & { id: string; visible?: boolean }>(
  layers: readonly L[],
  dataLayerId: string | null,
  snapshot: LayerRunSnapshot,
): L[] => {
  const shown = layers.filter((layer) => layer.visible !== false && selectionAt(layer, snapshot) !== null);
  return [
    ...shown.filter((layer) => layer.id === dataLayerId),
    ...shown.filter((layer) => layer.id !== dataLayerId),
  ];
};

/**
 * One layer's cut for a scope: the view's (at the snapshot), its channel, or
 * everything on screen (every channel of the view's cut). Null where that
 * scope does not apply to this layer.
 */
export const scopedSelectionAt = (
  layer: RunLayer & { id: string },
  snapshot: LayerRunSnapshot,
  scope: RunScope,
): LayerRunSelection | null => {
  if (scope === "channel") return channelSelection(layer);
  const view = selectionAt(layer, snapshot);
  if (scope === "view" || !view) return view;
  return everythingSelection(view, layer.intensityAxis);
};
