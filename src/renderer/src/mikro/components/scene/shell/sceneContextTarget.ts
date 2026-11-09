import type { Structure } from "@/core/types";
import type { SelectedRoi } from "../features/annotations/roiSelectionStore";

/**
 * What a right-click in the viewport is ABOUT. Pure, so the precedence is
 * testable without a canvas: the hovered annotation wins (it is drawn over
 * everything and is what the pointer is visibly on), else the mesh collection
 * of the layer the id-buffer pick hit — both a `Structure` the app's smart
 * context menu opens for — else the image layer the scene runs on (the data
 * layer), whose menu runs on the slice or selection on screen
 * (`features/layerRun`), else nothing.
 */

/** The slice of a scene layer the resolution reads. */
export type ContextLayer = {
  id: string;
  __typename?: string;
  collection?: { id: string } | null;
};

/**
 * The annotation as the menu's object: identity only, exactly what the hover
 * button and the sidebar row hand over (`renderObjectButton`), so the three
 * ways in open the same menu. The name rides along as the display hint.
 */
export const annotationStructure = (roi: Pick<SelectedRoi, "id" | "name">): Structure => ({
  identifier: "@mikro/annotation",
  id: roi.id,
  ...(roi.name ? { label: roi.name } : {}),
});

/** The mesh collection a picked layer shows; null for any other layer. */
export const meshCollectionStructure = (
  layerId: string,
  layers: readonly ContextLayer[],
): Structure | null => {
  const layer = layers.find((candidate) => candidate.id === layerId);
  if (!layer || layer.__typename !== "MeshLayer" || !layer.collection) return null;
  return { identifier: "@mikro/meshcollection", id: String(layer.collection.id) };
};

export type SceneContextHit =
  | { kind: "structure"; structure: Structure }
  | { kind: "layer"; layerId: string };

export const sceneContextTarget = (input: {
  hoveredRoi: Pick<SelectedRoi, "id" | "name"> | null;
  /** The pick hit's key (a layer id), when a pick ran and hit something. */
  pickedLayerId: string | null;
  layers: readonly ContextLayer[];
  /** The image layer the scene runs on (`effectiveDataLayerId`), if any. */
  dataLayerId?: string | null;
}): SceneContextHit | null => {
  if (input.hoveredRoi) return { kind: "structure", structure: annotationStructure(input.hoveredRoi) };
  const mesh = input.pickedLayerId ? meshCollectionStructure(input.pickedLayerId, input.layers) : null;
  if (mesh) return { kind: "structure", structure: mesh };
  return input.dataLayerId ? { kind: "layer", layerId: input.dataLayerId } : null;
};
