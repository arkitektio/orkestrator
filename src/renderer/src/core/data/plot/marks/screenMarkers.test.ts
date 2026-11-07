// @vitest-environment jsdom
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { describe, expect, it } from "vitest";
import {
  MARKER_SHAPES,
  createMarkerGeometry,
  createMarkerMaterial,
  insideMarker,
  markerShapeIndex,
  writeMarkers,
} from "./screenMarkers";

/** A device-free WGSL build through the WebGPU backend's own node builder (the scene's harness, inlined: core may not import it). */
const buildWgsl = (object: THREE.Object3D) => {
  const renderer = new WebGPURenderer();
  (renderer as unknown as { hasFeature: (name: string) => boolean }).hasFeature = () => true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder = (renderer.backend as any).createNodeBuilder(object, renderer);
  builder.scene = new THREE.Scene();
  builder.camera = new THREE.OrthographicCamera();
  builder.build();
  return { vertex: builder.vertexShader as string, fragment: builder.fragmentShader as string };
};

describe("marker shapes", () => {
  it("are what their names say, at the centre and out at the corner", () => {
    for (const shape of MARKER_SHAPES) {
      // A plus and a cross are open at the centre of nothing: every shape holds its centre.
      expect(insideMarker(shape, 0, 0)).toBe(true);
      // No shape fills the quad's very corner.
      expect(insideMarker(shape, 0.49, 0.49)).toBe(false);
    }
    expect(insideMarker("SQUARE", 0.37, 0.37)).toBe(true);
    expect(insideMarker("CIRCLE", 0.37, 0.37)).toBe(false);
    expect(insideMarker("DIAMOND", 0.3, 0.3)).toBe(false);
    expect(insideMarker("PLUS", 0.3, 0.3)).toBe(false);
    expect(insideMarker("PLUS", 0.45, 0)).toBe(true);
    expect(insideMarker("CROSS", 0.3, 0.3)).toBe(true);
    // The cross reaches as far out as the plus does.
    expect(insideMarker("CROSS", 0.45, 0.45)).toBe(true);
    expect(insideMarker("CROSS", 0.45, 0)).toBe(false);
    // The triangle points up: wide at the bottom, narrow at the top.
    expect(insideMarker("TRIANGLE", 0.3, -0.3)).toBe(true);
    expect(insideMarker("TRIANGLE", 0.3, 0.3)).toBe(false);
  });

  it("are indexed in one order, an unknown or missing shape drawn as a circle", () => {
    expect(markerShapeIndex("CIRCLE")).toBe(0);
    expect(markerShapeIndex("CROSS")).toBe(5);
    expect(markerShapeIndex(null)).toBe(0);
  });
});

describe("the marker buffers", () => {
  it("take a pair buffer's starts, in place, and draw that many instances", () => {
    const geometry = createMarkerGeometry(256, true);
    const pairs = new Float32Array([1, 2, 0, 1.001, 2, 0, 3, 4, 0, 3.001, 4, 0]);
    const colors = new Float32Array([1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0]);
    const before = (geometry.getAttribute("markerCenter") as THREE.InterleavedBufferAttribute).data;
    writeMarkers(geometry, pairs, 2, colors);
    const centers = geometry.getAttribute("markerCenter") as THREE.InterleavedBufferAttribute;
    expect(centers.data).toBe(before);
    expect(geometry.instanceCount).toBe(2);
    expect([centers.getX(1), centers.getY(1)]).toEqual([3, 4]);
    expect((geometry.getAttribute("markerColor") as THREE.InterleavedBufferAttribute).getY(1)).toBe(1);
  });
});

describe("the marker material", () => {
  it("builds to WGSL: centres per instance, pushed out in screen space, the shape cut out", () => {
    for (const withColors of [false, true]) {
      const { material } = createMarkerMaterial(withColors);
      const mesh = new THREE.Mesh(createMarkerGeometry(256, withColors), material);
      const { vertex, fragment } = buildWgsl(mesh);
      expect(vertex).toMatch(/markerCenter/);
      expect(fragment).toMatch(/discard/);
      if (withColors) expect(vertex + fragment).toMatch(/markerColor/);
    }
  });
});
