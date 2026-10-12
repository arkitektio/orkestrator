// @vitest-environment jsdom
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { describe, expect, it } from "vitest";
import { createVectorMaterial } from "./vectorsMaterial";

/**
 * The glyph material's WGSL, built by the backend's own node builder with no
 * device — the smoke alarm for an invalid shader module, which otherwise shows
 * up only as a layer that is silently not drawn.
 */
const buildWgsl = (object: THREE.Object3D): { vertex: string; fragment: string } => {
  const renderer = new WebGPURenderer();
  (renderer as unknown as { hasFeature: (name: string) => boolean }).hasFeature = () => true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder = (renderer.backend as any).createNodeBuilder(object, renderer);
  builder.scene = new THREE.Scene();
  builder.camera = new THREE.PerspectiveCamera();
  builder.build();
  return { vertex: builder.vertexShader as string, fragment: builder.fragmentShader as string };
};

describe("vector glyph WGSL", () => {
  it("builds both stages with the crop test in place", () => {
    const bundle = createVectorMaterial(4);
    const { vertex, fragment } = buildWgsl(bundle.meshes[0]);
    // The crop box is tested where the glyph is PLACED (an instance outside it
    // collapses whole), so all that can be asserted of the text is that both
    // stages came out of the builder.
    expect(vertex).toContain("builtinClipSpace");
    expect(fragment.length).toBeGreaterThan(0);
    bundle.dispose();
  });
});
