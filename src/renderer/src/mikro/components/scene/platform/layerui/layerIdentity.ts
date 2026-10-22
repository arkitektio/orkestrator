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
 * The name a layer row shows: the layer's own `name` when someone gave it one,
 * then the channel-label anchor when the acquisition recorded one, else the
 * DATASET the lens looks at — the name the user gave
 * their data, which is almost always the answer to "which layer is this?" —
 * and only then a flavor-based fallback. Never the old constant
 * "Untitled Layer", which made every row read identically.
 */
export const layerDisplayLabel = (layer: LayerState): string => {
  // The name someone gave THIS layer wins over anything derived: it is the only
  // one of these that was chosen rather than inferred. (`name` is on the `Layer`
  // interface, so every kind can carry one; most do not.)
  const givenName = layer.name?.trim();
  if (givenName) return givenName;

  const anchorLabel = layer.lens.activeAnchors
    .find((anchor) => anchor.channelLabel)
    ?.channelLabel?.label?.trim();
  if (anchorLabel) return anchorLabel;

  const datasetName = layer.lens.dataset.name?.trim();
  if (datasetName) return datasetName;

  return `${layerFlavor(layer)} layer`;
};
