import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { Line2NodeMaterial } from "three/webgpu";
import {
  applyLinePickThreshold,
  linePickThreshold,
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
    // At 2x, 8 CSS px is 16 device px — and this viewport measures in device px.
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
