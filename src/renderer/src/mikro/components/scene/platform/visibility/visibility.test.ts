import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { computeSceneVisibility, sameViewRanges, sameVisibleIds } from "./visibility";
import type { LayerState } from "../model/layerModel";

/**
 * Scene under test: a 100x50 voxel 2D image layer with identity affine.
 * Corner-anchored (COORDINATE_SYSTEMS.md "Coordinate conventions"): the layer
 * occupies world x ∈ [0, 100], y ∈ [0, 50], and voxel indices ARE the local
 * coordinates — no centering, no flip.
 */
const LAYER_ID = "layer-1";

const makeLayer = (): LayerState =>
  ({
    id: LAYER_ID,
    affineMatrix: null,
    xAxis: "x",
    yAxis: "y",
    zAxis: null,
    intensityAxis: null,
    lens: { axisNames: ["y", "x"], shape: [50, 100] },
  }) as unknown as LayerState;

const makeTrackable = () => {
  // A unit-centered box offset by half its size — the brick layers' mesh
  // arrangement — so its world box spans [0,100]×[0,50].
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(100, 50, 1));
  mesh.position.set(50, 25, 0);
  mesh.updateMatrixWorld(true);
  return { kind: "layer", id: LAYER_ID, ref: { current: mesh } };
};

/** Orthographic camera showing world x ∈ cx±halfW, y ∈ cy±halfH. */
const makeProjScreenMatrix = (cx: number, cy: number, halfW: number, halfH: number) => {
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 1000);
  camera.position.set(cx, cy, 10);
  camera.lookAt(cx, cy, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
};

describe("computeSceneVisibility", () => {
  it("reports the full voxel extent when the whole layer is in view", () => {
    const { visibleIds, ranges } = computeSceneVisibility({
      projScreenMatrix: makeProjScreenMatrix(50, 25, 100, 50),
      viewportSize: { width: 200, height: 100 }, // 1 px per world unit
      trackables: [makeTrackable()],
      layers: [makeLayer()],
    });

    expect(visibleIds.has(LAYER_ID)).toBe(true);
    const range = ranges[LAYER_ID];
    expect(range.xRange).toEqual([0, 100]);
    expect(range.yRange).toEqual([0, 50]);
    expect(range.zRange).toBeNull();
    expect(range.scale).toBeCloseTo(1, 5);
  });

  it("maps a right-half view to the upper voxel x range", () => {
    // Camera over world x ∈ [50, 150]; layer ends at world x = 100.
    const { ranges } = computeSceneVisibility({
      projScreenMatrix: makeProjScreenMatrix(100, 25, 50, 50),
      viewportSize: { width: 100, height: 100 },
      trackables: [makeTrackable()],
      layers: [makeLayer()],
    });

    expect(ranges[LAYER_ID].xRange).toEqual([50, 100]);
  });

  it("maps world y directly to voxel y — corner-anchored, no flip", () => {
    // Camera over world y ∈ [25, 75]; layer's top edge is world y = 50.
    const { ranges } = computeSceneVisibility({
      projScreenMatrix: makeProjScreenMatrix(50, 50, 100, 25),
      viewportSize: { width: 200, height: 50 },
      trackables: [makeTrackable()],
      layers: [makeLayer()],
    });

    expect(ranges[LAYER_ID].yRange).toEqual([25, 50]);
  });

  it("reports screen pixels per voxel via the viewport size", () => {
    // Same world window rendered into a double-size viewport -> 2 px/voxel.
    const { ranges } = computeSceneVisibility({
      projScreenMatrix: makeProjScreenMatrix(50, 25, 100, 50),
      viewportSize: { width: 400, height: 200 },
      trackables: [makeTrackable()],
      layers: [makeLayer()],
    });

    expect(ranges[LAYER_ID].scale).toBeCloseTo(2, 5);
  });

  it("perspective zoom-in reports a sub-volume range, not the whole dataset", () => {
    // 1000³ 3D layer; camera hovering 30 units above the center of the top
    // face, looking straight down. The legacy double-AABB visible box (world
    // AABB of frustum corners ∩ layer box) contained essentially the whole
    // volume here; the exact frustum∩box clip must stay local so the
    // planner's budget floor tracks what is actually on screen.
    const layer = {
      id: LAYER_ID,
      affineMatrix: null,
      xAxis: "x",
      yAxis: "y",
      zAxis: "z",
      intensityAxis: null,
      lens: { axisNames: ["z", "y", "x"], shape: [1000, 1000, 1000] },
    } as unknown as LayerState;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1000, 1000, 1000));
    mesh.position.set(500, 500, 500);
    mesh.updateMatrixWorld(true);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10000);
    camera.position.set(500, 500, 1030);
    camera.lookAt(500, 500, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const projScreenMatrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );

    const { ranges } = computeSceneVisibility({
      projScreenMatrix,
      viewportSize: { width: 1000, height: 1000 },
      trackables: [{ kind: "layer", id: LAYER_ID, ref: { current: mesh } }],
      layers: [layer],
    });

    const range = ranges[LAYER_ID];
    expect(range).toBeDefined();
    // Frustum half-width at the far face is ~480 → strictly inside [0,1000],
    // and far smaller near the camera.
    expect(range.xRange[0]).toBeGreaterThan(0);
    expect(range.xRange[1]).toBeLessThan(1000);
    expect(range.yRange[0]).toBeGreaterThan(0);
    expect(range.yRange[1]).toBeLessThan(1000);
  });

  it("excludes off-screen trackables entirely", () => {
    const { visibleIds, ranges } = computeSceneVisibility({
      projScreenMatrix: makeProjScreenMatrix(1000, 0, 50, 50),
      viewportSize: { width: 100, height: 100 },
      trackables: [makeTrackable()],
      layers: [makeLayer()],
    });

    expect(visibleIds.size).toBe(0);
    expect(ranges).toEqual({});
  });
});

describe("equality helpers", () => {
  it("sameVisibleIds compares by value", () => {
    expect(sameVisibleIds(["a", "b"], new Set(["b", "a"]))).toBe(true);
    expect(sameVisibleIds(["a"], new Set(["a", "b"]))).toBe(false);
  });

  it("sameViewRanges compares ranges by value", () => {
    const range = {
      xRange: [0, 10] as [number, number],
      yRange: [0, 5] as [number, number],
      zRange: null,
      scale: 1,
    };
    expect(sameViewRanges({ a: range }, { a: { ...range, xRange: [0, 10] } })).toBe(true);
    expect(sameViewRanges({ a: range }, { a: { ...range, scale: 2 } })).toBe(false);
    expect(sameViewRanges({ a: range }, {})).toBe(false);
  });

  it("sameViewRanges treats sub-1% scale jitter as equal (orbit foreshortening)", () => {
    const range = {
      xRange: [0, 10] as [number, number],
      yRange: [0, 5] as [number, number],
      zRange: null,
      scale: 2,
    };
    // 0.5% change -> ignored; 2% change -> a real LOD-relevant change.
    expect(sameViewRanges({ a: range }, { a: { ...range, scale: 2.01 } })).toBe(true);
    expect(sameViewRanges({ a: range }, { a: { ...range, scale: 2.04 } })).toBe(false);
  });
});
