import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";

/**
 * Test-only: a device-free WGSL build of any node material on any object,
 * through the WebGPU backend's own node builder — the platform-level twin of
 * `features/bricks/gpu/__testing__/wgslHarness.ts`, which features other than
 * bricks may not import. The object matters: a BatchedMesh builds the batch
 * node, an instanced geometry builds `instanceIndex`.
 *
 * A render target, when given, is what `NodeMaterial.setup` sees as the
 * current target (the pick pass renders into one).
 */
export const buildWgsl = (
  object: THREE.Object3D,
  options: { renderTarget?: THREE.RenderTarget } = {},
): { vertex: string; fragment: string } => {
  // A real renderer object for its node library, output transform and
  // context — never init()'d, so no adapter or device is requested.
  const renderer = new WebGPURenderer();
  (renderer as unknown as { hasFeature: (name: string) => boolean }).hasFeature = () => true;
  if (options.renderTarget) {
    (renderer as unknown as { getRenderTarget: () => THREE.RenderTarget }).getRenderTarget = () =>
      options.renderTarget!;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder = (renderer.backend as any).createNodeBuilder(object, renderer);
  builder.scene = new THREE.Scene();
  builder.camera = new THREE.PerspectiveCamera();
  builder.build();
  return { vertex: builder.vertexShader as string, fragment: builder.fragmentShader as string };
};

/** A mesh around a material, for materials that pull no geometry. */
export const meshWgsl = (material: THREE.Material) =>
  buildWgsl(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
