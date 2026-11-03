import type { LayerState } from "../model/layerModel";

/**
 * What kind of data an image layer paints — what the layer list's leading mark
 * draws (`LayerGlyph`).
 * Derived from the render graph, never stored: a phasor node makes it FLIM,
 * several channel sources make it multichannel, anything else is a plain image.
 *
 * A phasor layer needs no arm of its own: it has a phasor source ("FLIM"). The tests below the derived facts are what a flavor MEANS, so a new
 * typename that forms the same shape gets the same badge without an edit here —
 * which is the point of deriving it.
 *
 * "Labels", "Intensity" and "RGB" are the exceptions, and for the same reason:
 * they come from the layer's `__typename` rather than from its render graph, so
 * they are checked FIRST, before any graph-derived test can claim them.
 *  - A label has no channels and no phasors, so every test below would fall
 *    through to "Image" and mislabel it. (This used to be derived from a
 *    `transfer.categorical` flag, which no longer exists.)
 *  - An `IntensityLayer` is shaped exactly like a one-channel `ImageLayer` — one
 *    channel, no phasor — so shape ALONE cannot tell them apart, and deriving it
 *    badged every intensity layer "Image". They are different layer kinds with
 *    different cards, so the mark names the kind (`LayerGlyph`).
 *  - An `RgbLayer` has three channels, which would read as "Multichannel"; its
 *    channels are fixed to red, green and blue, which is worth its own mark.
 */
export type LayerFlavor =
  | "FLIM"
  | "Labels"
  | "Multichannel"
  | "RGB"
  | "Intensity"
  | "Image";

export const layerFlavor = (layer: LayerState): LayerFlavor => {
  if (layer.__typename === "LabelLayer") return "Labels";
  if (layer.__typename === "IntensityLayer") return "Intensity";
  if (layer.__typename === "RgbLayer") return "RGB";
  if (layer.phasors.length > 0) return "FLIM";
  if (layer.channels.length > 1) return "Multichannel";
  return "Image";
};

/**
 * The name a layer row shows. A layer has no name of its own: it is called by
 * the metadata beneath it. First its LENS's name — the labels on the
 * coordinate anchors at the positions it pins, a person's `PositionLabel` over
 * the channel label ingest recorded (composed by the server), so setting the
 * anchor at channel 1 renames every layer drawing it — then a recorded channel
 * label among its anchors, then the DATASET the lens looks at, and only then a
 * flavor-based fallback. Never the old constant "Untitled Layer", which made
 * every row read identically.
 *
 * `layer.name` is deliberately NOT read: renaming a layer is setting its anchor
 * (`LayerNamePopover`), never a label stored on the layer row.
 */
export const layerDisplayLabel = (layer: LayerState): string => {
  const lensName = layer.lens.name?.trim();
  if (lensName) return lensName;

  const anchorLabel = layer.lens.activeAnchors
    .find((anchor) => anchor.channelLabel)
    ?.channelLabel?.label?.trim();
  if (anchorLabel) return anchorLabel;

  const datasetName = layer.lens.dataset.name?.trim();
  if (datasetName) return datasetName;

  return `${layerFlavor(layer)} layer`;
};

/**
 * The same rule for a POLYMORPHIC scene layer (any kind, normalized or not):
 * its lens' name, else its dataset's, else its id. For the lists that walk
 * `sceneLayers` rather than the image layers.
 */
export const sceneLayerLabel = (layer: {
  id: string;
  lens?: { name?: string | null; dataset?: { name?: string | null } | null } | null;
}): string => layer.lens?.name?.trim() || layer.lens?.dataset?.name?.trim() || layer.id;
