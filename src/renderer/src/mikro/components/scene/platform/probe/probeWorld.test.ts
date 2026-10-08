import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  computeWorldUnitsPerPixel,
  readControlsTarget,
  resolveProbeMarkerGeometry,
} from "./probeWorld";
import type { LayerState } from "../stores/sceneStore";
import type { ProbedCoordinate } from "../stores/viewerStore";

/**
 * The volume marker must live in the SAME frame the volume mesh renders:
 * the full base-level extent, centered on the affine origin, slice-agnostic
 * (BrickVolumeLayer: `volumeSize = base.spatialShape`, mesh at local origin).
 * The plane marker keeps the slice-aware box, because the 2D probe's localPos
 * is stated in the sliced plane's own box.
 */

const identityAffine = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const makeLayer = (
  slices: { axis: string; start: number; stop: number; step: number | null }[],
  dataArrays: { level: number; store: { id: string } }[] = [
    { level: 0, store: { id: "store-0" } },
    { level: 1, store: { id: "store-1" } },
  ],
) =>
  ({
    id: "layer-1",
    xAxis: "x",
    yAxis: "y",
    zAxis: "z",
    affineMatrix: identityAffine,
    fixedLOD: null,
    defaultVolumeLOD: null,
    lens: {
      axisNames: ["z", "y", "x"],
      slices,
      dataset: {
        axisNames: ["z", "y", "x"],
        dataArrays,
      },
    },
  }) as unknown as LayerState;

const arrays: Record<string, { shape: number[] }> = {
  "store-0": { shape: [100, 200, 400] }, // z, y, x
  "store-1": { shape: [50, 100, 200] },
};
const getArrayForStoreId = (storeId: string) => arrays[storeId];

const probe = (strategy: ProbedCoordinate["strategy"]): ProbedCoordinate => ({
  layerId: "layer-1",
  localPos: [0.25, -0.1, 0.5],
  voxelIndex: [300, 120, 99],
  worldPos: null,
  strategy,
  values: [],
  provenance: { source: "resident", level: 0 },
  dtype: "uint16",
  sliceSignature: "sig",
});

describe("resolveProbeMarkerGeometry", () => {
  it("trusts the caster's worldPos verbatim when present (any strategy)", () => {
    // With an identity affine, the marker must land exactly on the world hit
    // the caster computed on the event ray — no re-derivation.
    const withWorld = { ...probe("first-hit"), worldPos: [12, -3, 7] as [number, number, number] };
    const geometry = resolveProbeMarkerGeometry(makeLayer([]), withWorld, getArrayForStoreId);
    expect(geometry).not.toBeNull();
    expect(geometry!.markerPosition[0]).toBeCloseTo(12, 6);
    expect(geometry!.markerPosition[1]).toBeCloseTo(-3, 6);
    expect(geometry!.markerPosition[2]).toBeCloseTo(7, 6);
  });

  it("volume probes map localPos through the FULL corner-anchored base box", () => {
    const geometry = resolveProbeMarkerGeometry(
      makeLayer([]),
      probe("first-hit"),
      getArrayForStoreId,
    );
    expect(geometry).not.toBeNull();
    // Unit-box localPos + 0.5, × base [x=400, y=200, z=100] extents — the
    // corner-anchored layer-local position, no slice offset, no flip.
    expect(geometry!.markerPosition).toEqual([0.75 * 400, 0.4 * 200, 1.0 * 100]);
  });

  it("volume probes IGNORE lens slices — the volume mesh renders the full box", () => {
    const sliced = makeLayer([
      { axis: "x", start: 100, stop: 300, step: 1 },
      { axis: "y", start: 50, stop: 150, step: 1 },
    ]);
    const geometry = resolveProbeMarkerGeometry(sliced, probe("max"), getArrayForStoreId);
    expect(geometry!.markerPosition).toEqual([0.75 * 400, 0.4 * 200, 1.0 * 100]);
  });

  it("plane probes keep the slice-aware box (2D localPos is slice-relative)", () => {
    const sliced = makeLayer(
      [{ axis: "x", start: 100, stop: 300, step: 1 }],
      [{ level: 0, store: { id: "store-0" } }],
    );
    const geometry = resolveProbeMarkerGeometry(sliced, probe("plane"), getArrayForStoreId);
    expect(geometry).not.toBeNull();
    // Sliced x box: width 200 at start 100 → corner-anchored volumePosition x
    // = 100 + 100 = 200; marker x = 200 + 0.25 × 200 = 250 (NOT 0.75 × 400).
    expect(geometry!.markerPosition[0]).toBe(250);
  });
});

describe("computeWorldUnitsPerPixel", () => {
  // fov 90° → 2·tan(45°) = 2, so world-per-pixel = 2·distance / height.
  const makeCamera = (x: number, y: number, z: number) => {
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 10_000);
    camera.position.set(x, y, z);
    return camera;
  };

  it("measures a perspective camera at the pivot, not at the world origin", () => {
    // Corner-anchored data: the camera orbits a target far from the origin.
    const camera = makeCamera(1000, 1000, 100);
    const pivot = new THREE.Vector3(1000, 1000, 0);

    expect(computeWorldUnitsPerPixel(camera, 100, pivot)).toBeCloseTo(2, 6);
    // The origin distance (~1418) would have drawn the bar ~14× too long.
    expect(computeWorldUnitsPerPixel(camera, 100)).toBeGreaterThan(28);
  });

  it("is pure zoom for an orthographic camera, whatever the pivot", () => {
    const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 1000);
    camera.zoom = 4;
    camera.position.set(1000, 1000, 100);

    expect(computeWorldUnitsPerPixel(camera, 100, new THREE.Vector3())).toBe(0.25);
  });

  it("reads the orbit target off controls that have one", () => {
    const target = new THREE.Vector3(1, 2, 3);
    expect(readControlsTarget({ target })).toBe(target);
    expect(readControlsTarget(null)).toBeNull();
    expect(readControlsTarget({})).toBeNull();
  });
});
