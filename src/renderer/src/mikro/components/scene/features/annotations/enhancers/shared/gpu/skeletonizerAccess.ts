import type { BrickResidencyManager } from "../../../../bricks/residency/brickResidency";
import { createGpuSkeletonizer, type GpuSkeletonizer } from "./computeSkeleton";

/**
 * The brush skeletonizer, built on the brick manager's renderer.
 *
 * The manager used to construct this itself, which made the brick engine
 * import an annotations module that in turn reads the brick atlas — a cycle
 * across the feature boundary. Now the manager only offers
 * `registerRendererResource`, and the annotations side supplies the factory.
 *
 * The registration is memoised per manager so the pipeline is still built at
 * most once per renderer, exactly as before: the accessor the manager returns
 * handles the lazy-create and is invalidated on detach. Never hold the
 * `GpuSkeletonizer` this returns across a frame — ask again, because a canvas
 * remount disposes it.
 */
const accessors = new WeakMap<
  BrickResidencyManager,
  () => GpuSkeletonizer | null
>();

export const gpuSkeletonizerFor = (
  manager: BrickResidencyManager,
): GpuSkeletonizer | null => {
  let get = accessors.get(manager);
  if (!get) {
    get = manager.registerRendererResource(createGpuSkeletonizer);
    accessors.set(manager, get);
  }
  return get();
};
