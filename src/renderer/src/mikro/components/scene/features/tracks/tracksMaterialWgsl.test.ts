// @vitest-environment jsdom
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { describe, expect, it } from "vitest";
import { createTrackMaterial } from "./tracksMaterial";

/** Device-free WGSL build — see `vectorsMaterialWgsl.test.ts`. */
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

describe("track line WGSL", () => {
  it("builds, carrying the per-segment crop test to the fragment stage", () => {
    const bundle = createTrackMaterial({ lineWidth: 2, colorize: false });
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions([0, 0, 0, 1, 1, 1]);
    geometry.setAttribute(
      "instanceT",
      new THREE.InstancedBufferAttribute(new Float32Array([0]), 1),
    );
    geometry.setAttribute(
      "instanceValue",
      new THREE.InstancedBufferAttribute(new Float32Array([0]), 1),
    );
    const line = new Line2(geometry as never, bundle.material as never);
    const { vertex, fragment } = buildWgsl(line);
    expect(vertex).toContain("vSegmentInCrop");
    expect(fragment).toContain("vSegmentInCrop");
    bundle.dispose();
  });
});
