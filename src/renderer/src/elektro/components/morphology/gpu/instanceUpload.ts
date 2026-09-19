/**
 * Frames to draw after writing an InstancedMesh's `instanceMatrix` /
 * `instanceColor` in place.
 *
 * three's WebGPU renderer uploads a render object's attributes
 * (`_geometries.updateForRender`) BEFORE it runs its node updates
 * (`_nodes.updateForRender`) — and it is `InstanceNode.update()`, a node
 * update, that copies the instance buffer's bumped `version` onto the
 * attribute the GPU actually reads. So a write is uploaded on the SECOND frame
 * after it, not the first. Under `frameloop="demand"` there is no second frame
 * until something else asks for one: the change showed only once the camera
 * moved. Two frames closes that gap.
 */
export const INSTANCE_UPLOAD_FRAMES = 2;
