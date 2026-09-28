import { BrickLabelPlaneLayer } from "./BrickLabelPlaneLayer";
import { BrickLabelVolumeLayer } from "./BrickLabelVolumeLayer";

/**
 * Registry entry for rendering a LabelLayer in 2D: the brick-pool label plane.
 * Mirrors `features/volume/ImagePlaneLayer.tsx` — the registry entry stays a one-liner and
 * the work lives next to the brick machinery it uses.
 */
export const LabelPlaneLayer = ({ layerId }: { layerId: string }) => (
  <BrickLabelPlaneLayer layerId={layerId} />
);

/**
 * Registry entry for rendering a LabelLayer in 3D: the FIRST-HIT raymarcher.
 *
 * Not MIP, and not any of the image path's other projections — every one of them
 * reduces the values along a ray, and object ids do not reduce (MIP would keep
 * the largest id, which is an arbitrary object). The full reasoning is on
 * `createLabelVolumeNodeMaterial`.
 */
export const LabelVolumeLayer = ({ layerId }: { layerId: string }) => (
  <BrickLabelVolumeLayer layerId={layerId} />
);
