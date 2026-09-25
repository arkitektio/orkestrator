import type { LayerState } from "../model/layerModel";

/**
 * What kind of data an image layer paints — the layer list's color code.
 * Derived from the render graph, never stored: a phasor node makes it FLIM,
 * several channel sources make it multichannel, anything else is a plain image.
 *
 * Two of the FIXED-SHAPE kinds still need no arm of their own: an rgb layer has
 * three channels ("Multichannel") and a phasor layer has a phasor source
 * ("FLIM"). The tests below the derived facts are what a flavor MEANS, so a new
 * typename that forms the same shape gets the same badge without an edit here —
 * which is the point of deriving it.
 *
 * "Labels" and "Intensity" are the two exceptions, and for the same reason: both
 * come from the layer's `__typename` rather than from its render graph, so both
 * are checked FIRST, before any graph-derived test can claim them.
 *  - A label has no channels and no phasors, so every test below would fall
 *    through to "Image" and mislabel it. (This used to be derived from a
 *    `transfer.categorical` flag, which no longer exists.)
 *  - An `IntensityLayer` is shaped exactly like a one-channel `ImageLayer` — one
 *    channel, no phasor — so shape ALONE cannot tell them apart, and deriving it
 *    badged every intensity layer "Image". They are different layer kinds with
 *    different cards, so the badge names the kind.
 */
export type LayerFlavor =
  | "FLIM"
  | "Labels"
  | "Multichannel"
  | "Intensity"
  | "Image";

export const layerFlavor = (layer: LayerState): LayerFlavor => {
  if (layer.__typename === "LabelLayer") return "Labels";
  if (layer.__typename === "IntensityLayer") return "Intensity";
  if (layer.phasors.length > 0) return "FLIM";
  if (layer.channels.length > 1) return "Multichannel";
  return "Image";
};

/** Badge classes per flavor, on the panel's dark card surface. */
export const FLAVOR_BADGE_CLASSES: Record<LayerFlavor, string> = {
  FLIM: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  Labels: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  Multichannel: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  // Its own hue rather than sharing "Image"'s: a scene of per-channel intensity
  // layers reads as one group, distinct from a render-graph image layer.
  Intensity: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  Image: "border-sky-400/40 bg-sky-400/10 text-sky-300",
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
