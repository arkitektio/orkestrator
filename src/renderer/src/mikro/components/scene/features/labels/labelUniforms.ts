import type { LayerState } from "../../platform/model/layerModel";
import { DEFAULT_INSTANCE_COLORMAP, INSTANCE_COLORMAP_SPECS } from "../../platform/gpu/instanceColormaps";

/**
 * `LabelRender` → the flat uniform record the label material consumes. Pure and
 * CPU-only, mirroring what `channelUniforms.ts` is for the image compositor, so
 * the defaults for a layer with no `labelRender` are decided in ONE place and
 * are assertable without a GPU.
 *
 * `labelRender` is nullable and a never-tuned label layer has none, so every
 * field here has a default that draws something sensible: hashed hues, id 0
 * transparent, fully opaque, no contour, nothing selected.
 */

/** Defaults matching the server's own, so an untuned layer draws the same. */
const DEFAULT_SEED = 0;
const DEFAULT_BACKGROUND = 0;

/**
 * The saturation/value the id hash paints at. Taken from the fabriks instance
 * palette so a mask and a mesh over the same objects read as the same family of
 * colours — NOT so they agree per object: fabriks hashes a dense ordinal and a
 * mask carries the sparse raw id, so the same object generally lands on a
 * different hue in each. Matching per object would need an id↔ordinal map that
 * nothing publishes.
 */
const HUE_SPEC = INSTANCE_COLORMAP_SPECS[DEFAULT_INSTANCE_COLORMAP];

export type LabelUniformData = {
  /** Seeds the id→hue hash; changing it reshuffles every colour. */
  seed: number;
  /** The id painted fully transparent — the mask's background. */
  background: number;
  /** Layer opacity folded with `labelRender.opacity`. */
  opacity: number;
  saturation: number;
  value: number;
  /** Boundary-only drawing, and how wide in base voxels. 2D only. */
  contour: boolean;
  contourWidth: number;
  /** Tint applied to a selected object, 0..1 RGB. */
  selectionColor: [number, number, number];
  /** Whether unselected objects draw at all (`selected` non-empty and off). */
  showUnselected: boolean;
};

/** 0..255 server triple → 0..1, with a white fallback. */
const toUnitRgb = (
  raw: readonly number[] | null | undefined,
): [number, number, number] =>
  raw && raw.length >= 3
    ? [(raw[0] ?? 0) / 255, (raw[1] ?? 0) / 255, (raw[2] ?? 0) / 255]
    : [1, 1, 1];

export const buildLabelUniformData = (layer: LayerState | undefined): LabelUniformData => {
  const render = layer?.labelRender ?? null;
  // Two opacities multiply: the layer's (what the panel's slider writes) and the
  // render's (what the mask itself asks for). Either alone at 0.5 halves it;
  // both do so twice, which is what "two independent dimmers" means.
  const layerOpacity = layer?.opacity ?? 1;
  const renderOpacity = render?.opacity ?? 1;
  return {
    seed: render?.seed ?? DEFAULT_SEED,
    background: render?.background ?? DEFAULT_BACKGROUND,
    opacity: layerOpacity * renderOpacity,
    saturation: HUE_SPEC.saturation,
    value: HUE_SPEC.value,
    contour: render?.contour ?? false,
    // A contour with no width is a contour one voxel wide, not an absent one.
    contourWidth: render?.contourWidth ?? 1,
    selectionColor: toUnitRgb(render?.selectionColor),
    showUnselected: render?.showUnselected ?? true,
  };
};

/**
 * What must change for the label material to need a re-upload. Mirrors
 * `channelDataSignature.ts`: a string, so an effect can depend on it without the
 * record's identity churning every render.
 *
 * `selected` is deliberately NOT in here — the selection rides the colour LUT's
 * alpha channel, not a uniform, so it moves through a different upload.
 */
export const labelDataSignature = (data: LabelUniformData): string =>
  [
    data.seed,
    data.background,
    data.opacity.toFixed(4),
    data.saturation,
    data.value,
    data.contour ? 1 : 0,
    data.contourWidth,
    data.selectionColor.map((c) => c.toFixed(3)).join(":"),
    data.showUnselected ? 1 : 0,
  ].join("|");
