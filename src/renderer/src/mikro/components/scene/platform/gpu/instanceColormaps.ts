/**
 * The categorical INSTANCE colormaps a mesh collection can be colored with —
 * names and parameters only, so the scene store and the layer card can list
 * and persist them without touching three/webgpu (the TSL node builder lives
 * in `fabriksMaterial.ts`).
 *
 * All maps are computed from the per-vertex `objectOrdinal` — golden-ratio
 * hue scatter so consecutive ids land far apart on the hue wheel — and are
 * deterministic: an object keeps its color across cells, LOD levels and
 * sessions. `distinct` additionally cycles saturation/value tiers by ordinal,
 * so neighbors that happen to land on similar hues still separate (the
 * LUT-free take on a glasbey-style palette).
 */

export const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949;

/** CPU twin of the shader's hue scatter — hulls and UI swatches must land on
 * exactly the hue the surface renders with. */
export const instanceHue = (ordinal: number): number =>
  ((ordinal * GOLDEN_RATIO_CONJUGATE) % 1 + 1) % 1;

export const INSTANCE_COLORMAPS = ["hues", "distinct", "pastel", "vivid"] as const;

export type FabriksInstanceColormap = (typeof INSTANCE_COLORMAPS)[number];

export const DEFAULT_INSTANCE_COLORMAP: FabriksInstanceColormap = "hues";

export type InstanceColormapSpec = {
  saturation: number;
  value: number;
  /** Cycle saturation/value tiers by ordinal for extra neighbor separation. */
  tiered?: boolean;
};

export const INSTANCE_COLORMAP_SPECS: Record<FabriksInstanceColormap, InstanceColormapSpec> = {
  hues: { saturation: 0.62, value: 0.95 },
  distinct: { saturation: 0.72, value: 0.95, tiered: true },
  pastel: { saturation: 0.35, value: 1.0 },
  vivid: { saturation: 0.9, value: 1.0 },
};
