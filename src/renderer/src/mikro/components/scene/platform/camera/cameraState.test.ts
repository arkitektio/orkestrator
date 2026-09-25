// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { describe, expect, it } from "vitest";
import * as THREE from "three";

import { AxisType, Easing } from "@/mikro/api/graphql";
import type { AnimationWaypointFragment } from "@/mikro/api/graphql";
import { sampleTour, serializeWaypoint } from "./animation";
import {
  applyCameraState,
  buildSceneToWorldMatrix,
  captureCameraState,
  perspectiveDistanceToScale,
  perspectiveScaleToDistance,
  pickReferenceLayer,
  readDimSelections,
  readSceneZ,
  resolveSceneCameraFrame,
  resolveTargetForState,
  resolveWorldSpatialAxes,
  type CameraFrame,
} from "./cameraState";
import type { LayerState } from "../model/layerModel";

/** Minimal layer for the frame math (same casting style as sceneFit.test.ts). */
const makeLayer = (opts: {
  shape?: number[]; // under axisNames ["z", "y", "x"]
  affineMatrix?: number[][] | null;
  xAxis?: string | null;
  yAxis?: string | null;
  zAxis?: string | null;
}): LayerState =>
  ({
    id: "layer",
    affineMatrix: opts.affineMatrix ?? null,
    xAxis: opts.xAxis === undefined ? "x" : opts.xAxis,
    yAxis: opts.yAxis === undefined ? "y" : opts.yAxis,
    zAxis: opts.zAxis === undefined ? "z" : opts.zAxis,
    intensityAxis: null,
    lens: { axisNames: ["z", "y", "x"], shape: opts.shape ?? [10, 20, 30] },
  }) as unknown as LayerState;

const spaceAxes = (...names: string[]) => ({
  axes: names.map((name) => ({ name, type: AxisType.Space })),
});

const makeFrame = (camera: THREE.Camera, target = new THREE.Vector3()): CameraFrame => ({
  camera,
  controls: { target, update: () => {} },
  size: { width: 800, height: 600 },
});

describe("buildSceneToWorldMatrix", () => {
  // Corner-anchored frames (COORDINATE_SYSTEMS.md "Coordinate conventions"):
  // layers render at their plain affine, so three-space IS world µm and the
  // frame map is identity — whatever the layer's shape or affine.
  it("is the identity — three-space is world space", () => {
    for (const layer of [
      makeLayer({}),
      makeLayer({ shape: [0, 0, 0] }),
      makeLayer({
        affineMatrix: [
          [2, 0, 0, 0],
          [0, 2, 0, 0],
          [0, 0, 2, 0],
          [0, 0, 0, 1],
        ],
      }),
    ]) {
      const world = new THREE.Vector3(1, 4, 2).applyMatrix4(buildSceneToWorldMatrix(layer));
      expect(world.toArray()).toEqual([1, 4, 2]);
    }
  });
});

describe("pickReferenceLayer", () => {
  it("takes the first layer that names both spatial axes", () => {
    const unnamed = makeLayer({ xAxis: null });
    const named = makeLayer({});
    expect(pickReferenceLayer([unnamed, named])).toBe(named);
  });

  it("is null when no layer names its axes", () => {
    expect(pickReferenceLayer([makeLayer({ xAxis: null, yAxis: null })])).toBeNull();
  });
});

describe("resolveWorldSpatialAxes", () => {
  it("maps three's x/y/z to the reference layer's render axes", () => {
    expect(resolveWorldSpatialAxes(spaceAxes("x", "y", "z"), makeLayer({}))).toEqual({
      x: "x",
      y: "y",
      z: "z",
    });
  });

  it("drops z when the world system has no such spatial axis (2D scene)", () => {
    expect(resolveWorldSpatialAxes(spaceAxes("x", "y"), makeLayer({}))).toEqual({
      x: "x",
      y: "y",
      z: null,
    });
  });

  // The assumption evalTransform makes — a spatial axis keeps its name from the
  // lens through to the world — is checked here, not trusted.
  it("is null when the world system does not name the layer's axes", () => {
    expect(resolveWorldSpatialAxes(spaceAxes("row", "col"), makeLayer({}))).toBeNull();
  });

  it("ignores non-spatial axes of the same name", () => {
    const world = { axes: [{ name: "x", type: AxisType.Time }] };
    expect(resolveWorldSpatialAxes(world, makeLayer({}))).toBeNull();
  });
});

describe("perspective scale ⇄ distance", () => {
  it("round-trips", () => {
    const distance = perspectiveScaleToDistance(0.25, 45, 600);
    expect(perspectiveDistanceToScale(distance, 45, 600)).toBeCloseTo(0.25);
  });

  it("reports a further camera as more world per pixel", () => {
    expect(perspectiveDistanceToScale(200, 45, 600)).toBeGreaterThan(
      perspectiveDistanceToScale(100, 45, 600),
    );
  });
});

describe("captureCameraState", () => {
  const scene = resolveSceneCameraFrame(spaceAxes("x", "y", "z"), [makeLayer({})]);

  it("writes the target in world µm under the world's axis names", () => {
    const camera = new THREE.OrthographicCamera();
    // Identity frame map: the three-space target IS the world position.
    const state = captureCameraState(makeFrame(camera, new THREE.Vector3(4, -7, 2)), "2D", scene);
    expect(state.position).toMatchObject({ x: 4, y: -7 });
  });

  it("carries the collapsed dim selections in the same map", () => {
    const camera = new THREE.OrthographicCamera();
    const state = captureCameraState(makeFrame(camera, new THREE.Vector3(4, 0, 0)), "2D", scene, {
      dimSelections: { t: 7 },
    });
    expect(state.position).toMatchObject({ x: 4, t: 7 });
  });

  // In the flat view z is the SLICE, not the camera target: an ortho camera
  // looking down z shows the same thing wherever its target's z sits.
  it("takes z from the slice in 2D", () => {
    const camera = new THREE.OrthographicCamera();
    const state = captureCameraState(makeFrame(camera), "2D", scene, { currentZ: 42 });
    expect(state.position).toMatchObject({ z: 42 });
  });

  it("takes z from the camera target in 3D, ignoring the slice", () => {
    const camera = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 1000);
    const state = captureCameraState(makeFrame(camera, new THREE.Vector3(0, 0, 9)), "3D", scene, {
      currentZ: 42,
    });
    expect(state.position).toMatchObject({ z: 9 });
  });

  // A 2D-authored stop must not claim a volumetric orientation it never had.
  it("fills only the flat pair in 2D", () => {
    const camera = new THREE.OrthographicCamera();
    camera.zoom = 4;
    const state = captureCameraState(makeFrame(camera), "2D", scene);
    expect(state.crossSectionScale).toBeCloseTo(0.25);
    expect(state.crossSectionOrientation).toHaveLength(4);
    expect(state.projectionOrientation).toBeNull();
    expect(state.projectionScale).toBeNull();
  });

  it("fills only the volumetric pair in 3D", () => {
    const camera = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 1000);
    camera.position.set(0, 0, 100);
    const state = captureCameraState(makeFrame(camera), "3D", scene);
    expect(state.projectionOrientation).toHaveLength(4);
    expect(state.projectionScale).toBeCloseTo(perspectiveDistanceToScale(100, 45, 600));
    expect(state.crossSectionOrientation).toBeNull();
    expect(state.crossSectionScale).toBeNull();
  });

  it("still records the dim selections when no frame resolves", () => {
    const bare = resolveSceneCameraFrame(spaceAxes("x", "y"), []);
    const state = captureCameraState(makeFrame(new THREE.OrthographicCamera()), "2D", bare, {
      dimSelections: { t: 3 },
    });
    expect(state.position).toEqual({ t: 3 });
  });
});

describe("readSceneZ", () => {
  it("reads the world z the pose names", () => {
    expect(readSceneZ({ position: { x: 1, z: 42 } }, { x: "x", y: "y", z: "z" })).toBe(42);
  });

  it("is null when the pose does not name z", () => {
    expect(readSceneZ({ position: { x: 1 } }, { x: "x", y: "y", z: "z" })).toBeNull();
  });

  it("is null for a scene with no z axis", () => {
    expect(readSceneZ({ position: { z: 42 } }, { x: "x", y: "y", z: null })).toBeNull();
  });

  // The round-trip the ZSlider depends on: currentZ is already world µm.
  it("round-trips the slice captured in 2D", () => {
    const scene = resolveSceneCameraFrame(spaceAxes("x", "y", "z"), [makeLayer({})]);
    const state = captureCameraState(
      makeFrame(new THREE.OrthographicCamera()),
      "2D",
      scene,
      { currentZ: 12.5 },
    );
    expect(readSceneZ(state, scene.axes)).toBeCloseTo(12.5);
  });
});

describe("readDimSelections", () => {
  const axes = { x: "x", y: "y", z: "z" };

  it("returns the non-spatial axes only, as indices", () => {
    const state = { position: { x: 1.5, y: 2, z: 3, t: 4.6, tau: 2 } };
    expect(readDimSelections(state, axes)).toEqual({ t: 5, tau: 2 });
  });

  it("treats every axis as non-spatial when nothing is named", () => {
    expect(readDimSelections({ position: { x: 1, t: 2 } }, null)).toEqual({ x: 1, t: 2 });
  });
});

describe("resolveTargetForState", () => {
  const scene = resolveSceneCameraFrame(spaceAxes("x", "y", "z"), [makeLayer({})]);

  it("round-trips a captured pose back to the same three-space target", () => {
    const camera = new THREE.OrthographicCamera();
    const target = new THREE.Vector3(4, -7, 2);
    const state = captureCameraState(makeFrame(camera, target), "2D", scene);

    const resolved = resolveTargetForState(state, makeFrame(camera, new THREE.Vector3()), scene);
    expect(resolved.x).toBeCloseTo(4);
    expect(resolved.y).toBeCloseTo(-7);
    expect(resolved.z).toBeCloseTo(2);
  });

  // "Axes the pose does not name are left wherever the viewer already had them."
  it("keeps the current value for an axis the pose does not name", () => {
    const camera = new THREE.OrthographicCamera();
    const current = new THREE.Vector3(1, 2, 3);
    const state = { position: { x: 15 } }; // world x 15 → three x 15 (identity)

    const resolved = resolveTargetForState(state, makeFrame(camera, current), scene);
    expect(resolved.x).toBeCloseTo(15);
    expect(resolved.y).toBeCloseTo(2);
    expect(resolved.z).toBeCloseTo(3);
  });

  it("leaves the target alone when no frame resolves", () => {
    const bare = resolveSceneCameraFrame(spaceAxes("x", "y"), []);
    const current = new THREE.Vector3(1, 2, 3);
    const resolved = resolveTargetForState(
      { position: { x: 99 } },
      makeFrame(new THREE.OrthographicCamera(), current),
      bare,
    );
    expect(resolved.toArray()).toEqual([1, 2, 3]);
  });
});

describe("applyCameraState", () => {
  const scene = resolveSceneCameraFrame(spaceAxes("x", "y", "z"), [makeLayer({})]);

  it("round-trips an orthographic pose through capture", () => {
    const source = new THREE.OrthographicCamera();
    source.zoom = 3;
    source.position.set(0, 0, 50);
    source.quaternion.identity();
    const state = captureCameraState(makeFrame(source, new THREE.Vector3(4, -7, 0)), "2D", scene);

    const camera = new THREE.OrthographicCamera();
    camera.position.set(0, 0, 50);
    const target = new THREE.Vector3();
    applyCameraState(state, makeFrame(camera, target), "2D", scene);

    expect(camera.zoom).toBeCloseTo(3);
    expect(target.x).toBeCloseTo(4);
    expect(target.y).toBeCloseTo(-7);
  });

  it("places a perspective camera at the distance its scale asks for", () => {
    const state = {
      position: { x: 0, y: 0, z: 0 }, // → three (0, 0, 0) — identity frame
      crossSectionOrientation: null,
      crossSectionScale: null,
      projectionOrientation: [0, 0, 0, 1],
      projectionScale: perspectiveDistanceToScale(120, 45, 600),
    };
    const camera = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 1000);
    const target = new THREE.Vector3();
    applyCameraState(state, makeFrame(camera, target), "3D", scene);

    expect(target.length()).toBeCloseTo(0);
    expect(camera.position.distanceTo(target)).toBeCloseTo(120);
  });

  // Playing a 2D-authored tour in the volumetric view: the target still moves,
  // but nothing wrenches the orientation to a pose that was never authored.
  it("leaves orientation and zoom untouched when the view's pair is null", () => {
    const camera = new THREE.OrthographicCamera();
    camera.zoom = 5;
    camera.quaternion.set(0, 0, 0, 1);
    const target = new THREE.Vector3();
    applyCameraState(
      {
        position: { x: 15, y: 10, z: 5 },
        crossSectionOrientation: null,
        crossSectionScale: null,
        projectionOrientation: null,
        projectionScale: null,
      },
      makeFrame(camera, target),
      "2D",
      scene,
    );
    expect(camera.zoom).toBe(5);
    expect(camera.quaternion.w).toBeCloseTo(1);
    expect(target.y).toBeCloseTo(10);
  });
});

/**
 * The path that actually ships: fly the camera → capture a stop → serialize it
 * the way the mutation does → play the tour back → the camera lands where it
 * was captured. Catches anything that agrees with itself in one direction only.
 */
describe("tour round-trip (capture → serialize → sample → apply)", () => {
  const scene = resolveSceneCameraFrame(spaceAxes("x", "y", "z"), [makeLayer({})]);

  /** Serialize through the mutation's input shape, then read it back as the
   *  server would hand it to us — `order` written by enumeration. */
  const authorTour = (
    stops: { camera: ReturnType<typeof captureCameraState>; durationMs: number }[],
  ): AnimationWaypointFragment[] =>
    stops
      .map((stop) =>
        serializeWaypoint({
          name: "stop",
          durationMs: stop.durationMs,
          easing: Easing.Linear,
          camera: stop.camera,
        }),
      )
      .map((input, order) => ({ ...input, id: `wp-${order}`, order }) as AnimationWaypointFragment);

  it("flies a 3D tour back to the poses it was authored from", () => {
    const author = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 1000);

    // Stop A: orbiting (10, 20, 0) from 80 away.
    const targetA = new THREE.Vector3(10, 20, 0);
    author.position.set(targetA.x, targetA.y, targetA.z + 80);
    author.lookAt(targetA);
    const a = captureCameraState(makeFrame(author, targetA), "3D", scene);

    // Stop B: somewhere else entirely.
    const targetB = new THREE.Vector3(-30, 5, 12);
    author.position.set(targetB.x, targetB.y, targetB.z + 150);
    author.lookAt(targetB);
    const b = captureCameraState(makeFrame(author, targetB), "3D", scene);

    const tour = authorTour([
      { camera: a, durationMs: 0 },
      { camera: b, durationMs: 1000 },
    ]);

    const player = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 1000);
    const target = new THREE.Vector3();
    const frame = makeFrame(player, target);

    applyCameraState(sampleTour(tour, 0)!, frame, "3D", scene);
    expect(target.x).toBeCloseTo(10);
    expect(target.y).toBeCloseTo(20);
    expect(player.position.distanceTo(target)).toBeCloseTo(80);

    applyCameraState(sampleTour(tour, 1000)!, frame, "3D", scene);
    expect(target.x).toBeCloseTo(-30);
    expect(target.y).toBeCloseTo(5);
    expect(target.z).toBeCloseTo(12);
    expect(player.position.distanceTo(target)).toBeCloseTo(150);
  });

  it("holds the camera between two identical stops instead of drifting", () => {
    const author = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 1000);
    const at = new THREE.Vector3(3, 4, 5);
    author.position.set(at.x, at.y, at.z + 60);
    author.lookAt(at);
    const pose = captureCameraState(makeFrame(author, at), "3D", scene);
    const tour = authorTour([
      { camera: pose, durationMs: 0 },
      { camera: pose, durationMs: 1000 },
    ]);

    const player = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 1000);
    const target = new THREE.Vector3();
    applyCameraState(sampleTour(tour, 500)!, makeFrame(player, target), "3D", scene);
    expect(target.x).toBeCloseTo(3);
    expect(target.y).toBeCloseTo(4);
    expect(target.z).toBeCloseTo(5);
    expect(player.position.distanceTo(target)).toBeCloseTo(60);
  });

  // A flat tour through a stack is a tour through SLICES: z rides in the pose
  // and comes back out for the ZSlider, not for the camera target.
  it("round-trips a 2D tour's slice and zoom", () => {
    const author = new THREE.OrthographicCamera();
    author.zoom = 2;
    const a = captureCameraState(makeFrame(author, new THREE.Vector3(0, 0, 0)), "2D", scene, {
      currentZ: 0,
    });
    author.zoom = 8;
    const b = captureCameraState(makeFrame(author, new THREE.Vector3(0, 0, 0)), "2D", scene, {
      currentZ: 40,
    });

    const tour = authorTour([
      { camera: a, durationMs: 0 },
      { camera: b, durationMs: 1000 },
    ]);

    expect(readSceneZ(sampleTour(tour, 0)!, scene.axes)).toBeCloseTo(0);
    expect(readSceneZ(sampleTour(tour, 1000)!, scene.axes)).toBeCloseTo(40);
    expect(readSceneZ(sampleTour(tour, 500)!, scene.axes)).toBeCloseTo(20);

    // Zoom interpolates geometrically: √(0.5 · 0.125) → zoom 4, not 5.
    const player = new THREE.OrthographicCamera();
    applyCameraState(sampleTour(tour, 500)!, makeFrame(player), "2D", scene);
    expect(player.zoom).toBeCloseTo(4);
  });

  it("carries a timelapse's dim selection along the tour", () => {
    const author = new THREE.OrthographicCamera();
    const a = captureCameraState(makeFrame(author), "2D", scene, { dimSelections: { t: 0 } });
    const b = captureCameraState(makeFrame(author), "2D", scene, { dimSelections: { t: 10 } });
    const tour = authorTour([
      { camera: a, durationMs: 0 },
      { camera: b, durationMs: 1000 },
    ]);

    expect(readDimSelections(sampleTour(tour, 500)!, scene.axes)).toEqual({ t: 5 });
    expect(readDimSelections(sampleTour(tour, 1000)!, scene.axes)).toEqual({ t: 10 });
  });
});
