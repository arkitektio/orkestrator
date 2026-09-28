import { BrickVolumeLayer } from "../bricks/layers/BrickVolumeLayer";

/**
 * Registry entry for rendering an ImageLayer in 3D: the brick-pool
 * (pyramidal octree) raymarcher. Non-image layer types have their own
 * registry entries.
 */
export const ImageVolumeLayer = ({ layerId }: { layerId: string }) => (
  <BrickVolumeLayer layerId={layerId} />
);
