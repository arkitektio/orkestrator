import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { Line2NodeMaterial } from "three/webgpu";
import { LineSegments2 } from "three/examples/jsm/lines/webgpu/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {
  applyLinePickThreshold,
  buildPickIndex,
  createPickMeshRaycast,
  lazyPickIndex,
  linePickThreshold,
  nearestLineHit,
  raycastNearestOnly,
  ROI_PICK_RADIUS_PX,
} from "./linePicking";

/**
 * What an annotation outline's pick band actually is, exercised against the
 * real `LineSegments2.raycast` — no renderer, so it runs like anything in core/.
 *
 * The viewport here is 800×600 with an orthographic camera spanning the same
 * extent, so ONE WORLD UNIT IS ONE PIXEL and a ray's world offset from the line
 * doubles as its pixel distance.
 */

const VIEWPORT = { width: 800, height: 600 };

/** A horizontal segment through the origin, 10 world units long. */
const makeLine = (lineWidth = 2) => {
  const geometry = new LineGeometry();
  geometry.setPositions([-5, 0, 0, 5, 0, 0]);
  const material = new Line2NodeMaterial();
  material.linewidth = lineWidth;
  const line = new Line2(geometry, material);
  line.updateMatrixWorld(true);
  return line;
};

/**
 * Stand in for the `onBeforeRender` the renderer would do: the line reads its
 * pick resolution off the viewport, and it is (0, 0) until something draws.
 */
const asRendered = (line: Line2, size = VIEWPORT) => {
  (line as unknown as { _resolution: THREE.Vector2 })._resolution.set(
    size.width,
    size.height,
  );
  return line;
};

const makeCamera = () => {
  const camera = new THREE.OrthographicCamera(
    -VIEWPORT.width / 2,
    VIEWPORT.width / 2,
    VIEWPORT.height / 2,
    -VIEWPORT.height / 2,
    0.1,
    1000,
  );
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
};

/** Raycast straight down -z, `offsetY` world units from the line. */
const raycastAt = (
  line: Line2,
  camera: THREE.OrthographicCamera,
  offsetY: number,
  { padded = false, dpr = 1 }: { padded?: boolean; dpr?: number } = {},
) => {
  const raycaster = new THREE.Raycaster();
  if (padded) applyLinePickThreshold(raycaster, dpr);
  raycaster.camera = camera;
  raycaster.set(new THREE.Vector3(0, offsetY, 10), new THREE.Vector3(0, 0, -1));

  const hits: THREE.Intersection[] = [];
  line.raycast(raycaster, hits);
  return hits;
};

describe("linePickThreshold", () => {
  it("doubles the radius — three halves `linewidth + threshold`", () => {
    expect(linePickThreshold(1)).toBe(2 * ROI_PICK_RADIUS_PX);
  });

  it("states it in the DEVICE pixels three measures in", () => {
    expect(linePickThreshold(2)).toBe(2 * ROI_PICK_RADIUS_PX * 2);
  });

  it("falls back to 1x rather than collapsing the band", () => {
    for (const dpr of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(linePickThreshold(dpr)).toBe(2 * ROI_PICK_RADIUS_PX);
    }
  });

  it("keeps three's own params object rather than replacing it", () => {
    const raycaster = new THREE.Raycaster();
    applyLinePickThreshold(raycaster, 1);
    const params = raycaster.params as { Line2?: { threshold: number } };
    const line2 = params.Line2;
    applyLinePickThreshold(raycaster, 2);
    expect(params.Line2).toBe(line2);
    expect(params.Line2?.threshold).toBe(linePickThreshold(2));
  });
});

describe("Line2 picking", () => {
  it("hits a segment directly under the ray", () => {
    const line = asRendered(makeLine());
    expect(raycastAt(line, makeCamera(), 0).length).toBeGreaterThan(0);
  });

  it("unpadded, the pick radius is only HALF the drawn stroke", () => {
    // The reported symptom: 2 px away from a 2 px line already misses, and
    // those are device pixels — half a CSS pixel of tolerance on a retina
    // display, so you must land on the hairline itself.
    const line = asRendered(makeLine(2));
    expect(raycastAt(line, makeCamera(), 2)).toHaveLength(0);
  });

  it("pads the band out to the pick radius", () => {
    const line = asRendered(makeLine(2));
    const camera = makeCamera();
    // Stroke half-width (1) + 8 px of padding: 8 px off still selects.
    expect(raycastAt(line, camera, 8, { padded: true }).length).toBeGreaterThan(0);
    // Still bounded — a click in open space is not a hit on everything.
    expect(raycastAt(line, camera, 40, { padded: true })).toHaveLength(0);
  });

  it("scales the band with DPR, so it is the same size on screen", () => {
    const line = asRendered(makeLine(2));
    const camera = makeCamera();
    // 16 device px is inside the band at 2x (14 CSS px = 28 device px) and
    // outside it at 1x (14 device px) — this viewport measures in device px.
    expect(raycastAt(line, camera, 16, { padded: true, dpr: 2 }).length).toBeGreaterThan(0);
    expect(raycastAt(line, camera, 16, { padded: true, dpr: 1 })).toHaveLength(0);
  });

  it("keeps the band in SCREEN pixels as the camera zooms", () => {
    const line = asRendered(makeLine(2));
    const camera = makeCamera();
    camera.zoom = 4; // one world unit now covers 4 px
    camera.updateProjectionMatrix();

    // 2 world units = 8 px: inside the band, where a world-space tolerance
    // would have shrunk away with the zoom.
    expect(raycastAt(line, camera, 2, { padded: true }).length).toBeGreaterThan(0);
    // 6 world units = 24 px: outside it.
    expect(raycastAt(line, camera, 6, { padded: true })).toHaveLength(0);
  });

  it("cannot be picked before it has ever rendered", () => {
    // `_resolution` is (0, 0) until `onBeforeRender` runs — worth knowing when
    // a click seems to miss a line that only just appeared.
    const line = makeLine();
    expect(raycastAt(line, makeCamera(), 0, { padded: true })).toHaveLength(0);
  });
});

describe("nearest stroke in a merged batch", () => {
  /** Two parallel segments in ONE object, the way an outline batch holds
   * many shapes: segment 0 at y = 0, segment 1 at y = 10. */
  const makeBatch = () => {
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions([-5, 0, 0, 5, 0, 0, -5, 10, 0, 5, 10, 0]);
    const material = new Line2NodeMaterial();
    material.linewidth = 2;
    const batch = new LineSegments2(geometry, material);
    batch.updateMatrixWorld(true);
    (batch as unknown as { _resolution: THREE.Vector2 })._resolution.set(VIEWPORT.width, VIEWPORT.height);
    return batch;
  };
  const raycastBatch = (batch: LineSegments2, y: number) => {
    const raycaster = new THREE.Raycaster();
    applyLinePickThreshold(raycaster, 1);
    raycaster.camera = makeCamera();
    raycaster.set(new THREE.Vector3(0, y, 10), new THREE.Vector3(0, 0, -1));
    const hits: THREE.Intersection[] = [];
    batch.raycast(raycaster, hits);
    return hits;
  };

  it("unwrapped, a ray between two strokes hits BOTH — and they tie on depth", () => {
    // 7 px from the first stroke, 3 px from the second: both inside the band.
    const hits = raycastBatch(makeBatch(), 7);
    expect(hits.map((hit) => hit.faceIndex).sort()).toEqual([0, 1]);
    expect(hits[0].distance).toBeCloseTo(hits[1].distance);
  });

  it("picks the hit whose stroke passes closest to the ray", () => {
    const hits = raycastBatch(makeBatch(), 7);
    expect(nearestLineHit(hits as never)).toBe(hits.find((hit) => hit.faceIndex === 1));
    expect(nearestLineHit([])).toBeNull();
  });

  it("wrapped, the batch reports only the nearer stroke, whichever side the ray is on", () => {
    const batch = makeBatch();
    raycastNearestOnly(batch);
    expect(raycastBatch(batch, 7).map((hit) => hit.faceIndex)).toEqual([1]);
    expect(raycastBatch(batch, 3).map((hit) => hit.faceIndex)).toEqual([0]);
    // Nothing in the band is still nothing.
    expect(raycastBatch(batch, 60)).toHaveLength(0);
  });
});

/**
 * The indexed picks must answer exactly what three answers: same stroke, same
 * point, over batches, cameras and placements a real scene has. Three's own
 * raycast is the oracle, run on the same object, so a drift in either shows up.
 */
describe("the pick index", () => {
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /** Rectangles and long meandering paths, as an annotation batch holds them. */
  const makeShapes = (random: () => number, flat: boolean) => {
    const positions: number[] = [];
    const ranges: { start: number; end: number }[] = [];
    let segments = 0;
    for (let shape = 0; shape < 60; shape++) {
      const start = segments;
      const length = shape % 5 === 0 ? 200 : 4;
      let x = random() * 400 - 200;
      let y = random() * 300 - 150;
      let z = flat ? 0 : random() * 80 - 40;
      for (let i = 0; i < length; i++) {
        const nx = x + (random() - 0.5) * 30;
        const ny = y + (random() - 0.5) * 30;
        const nz = flat ? 0 : z + (random() - 0.5) * 10;
        positions.push(x, y, z, nx, ny, nz);
        x = nx;
        y = ny;
        z = nz;
        segments += 1;
      }
      ranges.push({ start, end: segments });
    }
    return { positions: new Float32Array(positions), ranges };
  };

  const CAMERAS: Record<string, () => THREE.Camera> = {
    "orthographic, straight down": () => {
      const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 2000);
      camera.position.set(0, 0, 500);
      camera.lookAt(0, 0, 0);
      return camera;
    },
    "perspective, tilted": () => {
      const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 5000);
      camera.position.set(180, -260, 420);
      camera.lookAt(0, 0, 0);
      return camera;
    },
    "perspective, inside the shapes": () => {
      const camera = new THREE.PerspectiveCamera(70, 800 / 600, 0.1, 5000);
      camera.position.set(10, 10, 5);
      camera.lookAt(100, 40, 0);
      return camera;
    },
  };

  const PLACEMENTS: Record<string, THREE.Matrix4> = {
    identity: new THREE.Matrix4(),
    "calibrated and rotated": new THREE.Matrix4()
      .makeRotationZ(0.6)
      .multiply(new THREE.Matrix4().makeScale(0.5, 0.5, 5))
      .setPosition(20, -30, 10),
  };

  const raysThrough = (camera: THREE.Camera, positions: Float32Array, matrix: THREE.Matrix4, random: () => number) => {
    const rays: THREE.Vector2[] = [];
    const point = new THREE.Vector3();
    for (let i = 0; i < 300; i++) {
      if (i % 3 === 0) {
        rays.push(new THREE.Vector2(random() * 2 - 1, random() * 2 - 1));
        continue;
      }
      // Beside a real vertex, at or past the band's edge: where a cull would err.
      const at = Math.floor(random() * (positions.length / 3)) * 3;
      point.set(positions[at], positions[at + 1], positions[at + 2]).applyMatrix4(matrix).project(camera);
      rays.push(new THREE.Vector2(point.x + (random() - 0.5) * 0.15, point.y + (random() - 0.5) * 0.15));
    }
    return rays;
  };

  for (const [cameraName, makeCamera] of Object.entries(CAMERAS)) {
    for (const [placementName, matrix] of Object.entries(PLACEMENTS)) {
      for (const flat of [true, false]) {
        const name = `${cameraName}, ${placementName}, ${flat ? "flat" : "3D"}`;

        it(`answers three's fat-line pick: ${name}`, () => {
          const random = seeded(11);
          const { positions, ranges } = makeShapes(random, flat);
          const geometry = new LineSegmentsGeometry();
          geometry.setPositions(positions);
          // The oracle is three's SEGMENT test. Its whole-batch early-out grows
          // the box by the band's width at the box's NEAREST depth, which under
          // perspective rejects a stroke at the far side that the segment test
          // would accept; opened up here, because the index does not repeat that.
          geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
          geometry.boundingBox = new THREE.Box3(
            new THREE.Vector3(-1e9, -1e9, -1e9),
            new THREE.Vector3(1e9, 1e9, 1e9),
          );
          const material = new Line2NodeMaterial();
          material.linewidth = 2;
          const line = new LineSegments2(geometry, material);
          (line as unknown as { _resolution: THREE.Vector2 })._resolution.set(800, 600);
          matrix.decompose(line.position, line.quaternion, line.scale);
          line.matrixAutoUpdate = false;
          line.matrix.copy(matrix);
          line.matrixWorld.copy(matrix);

          const camera = makeCamera();
          camera.updateMatrixWorld(true);
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

          const raycaster = new THREE.Raycaster();
          applyLinePickThreshold(raycaster, 2);

          const indexed = new LineSegments2(geometry, material);
          (indexed as unknown as { _resolution: THREE.Vector2 })._resolution.set(800, 600);
          indexed.matrixAutoUpdate = false;
          indexed.matrixWorld.copy(matrix);
          raycastNearestOnly(indexed, lazyPickIndex(positions, ranges, 6));

          let hits = 0;
          for (const ndc of raysThrough(camera, positions, matrix, random)) {
            raycaster.setFromCamera(ndc, camera);
            const oracle: THREE.Intersection[] = [];
            line.raycast(raycaster, oracle);
            const expected = nearestLineHit(oracle as never) as THREE.Intersection | null;
            const actual: THREE.Intersection[] = [];
            indexed.raycast(raycaster, actual);
            expect(actual[0]?.faceIndex ?? null).toBe(expected?.faceIndex ?? null);
            if (expected) {
              hits += 1;
              expect(actual[0].point.distanceTo(expected.point)).toBeLessThan(1e-6);
              expect(actual[0].distance).toBeCloseTo(expected.distance, 6);
            }
          }
          // The fixture has to exercise both answers, or this proves nothing.
          expect(hits).toBeGreaterThan(20);
          expect(hits).toBeLessThan(300);
        });

        it(`answers three's mesh pick: ${name}`, () => {
          const random = seeded(23);
          const triangles: number[] = [];
          const ranges: { start: number; end: number }[] = [];
          let count = 0;
          for (let shape = 0; shape < 80; shape++) {
            const start = count;
            const length = shape % 7 === 0 ? 150 : 2;
            const cx = random() * 400 - 200;
            const cy = random() * 300 - 150;
            const cz = flat ? 0 : random() * 80 - 40;
            for (let i = 0; i < length; i++) {
              const p = () => [
                cx + (random() - 0.5) * 40,
                cy + (random() - 0.5) * 40,
                flat ? 0 : cz + (random() - 0.5) * 10,
              ];
              triangles.push(...p(), ...p(), ...p());
              count += 1;
            }
            ranges.push({ start, end: count });
          }
          const positions = new Float32Array(triangles);
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.matrixAutoUpdate = false;
          mesh.matrixWorld.copy(matrix);
          const raycast = createPickMeshRaycast(lazyPickIndex(positions, ranges, 9));

          const camera = makeCamera();
          camera.updateMatrixWorld(true);
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
          const raycaster = new THREE.Raycaster();

          let hits = 0;
          for (const ndc of raysThrough(camera, positions, matrix, random)) {
            raycaster.setFromCamera(ndc, camera);
            const oracle: THREE.Intersection[] = [];
            mesh.raycast(raycaster, oracle);
            oracle.sort((a, b) => a.distance - b.distance);
            const actual: THREE.Intersection[] = [];
            raycast.call(mesh, raycaster, actual);
            expect(actual[0]?.faceIndex ?? null).toBe(oracle[0]?.faceIndex ?? null);
            if (oracle[0]) {
              hits += 1;
              expect(actual[0].point.distanceTo(oracle[0].point)).toBeLessThan(1e-6);
            }
          }
          expect(hits).toBeGreaterThan(20);
        });
      }
    }
  }

  it("cuts a long shape into runs and keeps a small one whole", () => {
    const positions = new Float32Array(6 * 200);
    const index = buildPickIndex(
      positions,
      [
        { start: 0, end: 4 },
        { start: 4, end: 200 },
      ],
      6,
    );
    expect(Array.from(index.starts)).toEqual([0, 4, 68, 132, 196]);
    expect(Array.from(index.ends)).toEqual([4, 68, 132, 196, 200]);
  });

  it("builds nothing until the first pick", () => {
    const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
    const index = lazyPickIndex(positions, [{ start: 0, end: 1 }], 6);
    expect(index()).toBe(index());
    expect(Array.from(index().bounds)).toEqual([0, 0, 0, 1, 1, 1]);
  });
});
