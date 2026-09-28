import { BrickPlaneLayer } from "../bricks/layers/BrickPlaneLayer";

/**
 * Registry entry for rendering an ImageLayer in 2D: the brick-pool
 * (pyramidal octree) plane compositor.
 */
export const ImagePlaneLayer = ({ layerId }: { layerId: string }) => (
  <BrickPlaneLayer layerId={layerId} />
);
