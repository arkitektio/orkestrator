import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { projectScreenRect, projectToScreen } from "./projectScreenRect";
import { FLOAT_GAP_PX, FLOAT_MARGIN_PX, floatOriginBeside } from "./sideAnchor";

const viewport = { width: 1000, height: 600 };
const card = { width: 288, height: 200 };

describe("floatOriginBeside", () => {
  it("sits a gap right of the item when there is room", () => {
    const placed = floatOriginBeside({ minX: 100, maxX: 300, minY: 50, maxY: 150 }, card, viewport);
    expect(placed).toEqual({ left: 300 + FLOAT_GAP_PX, top: 50, side: "right" });
  });

  it("flips left of the item near the right border", () => {
    const placed = floatOriginBeside({ minX: 600, maxX: 900, minY: 50, maxY: 150 }, card, viewport);
    expect(placed).toEqual({ left: 600 - FLOAT_GAP_PX - card.width, top: 50, side: "left" });
  });

  it("reads the right edge as clamped to the frame for an item running off-screen", () => {
    // The item runs past the right border and starts far enough right that
    // the left side has room: the float goes left, never off-screen.
    const placed = floatOriginBeside({ minX: 500, maxX: 2400, minY: 50, maxY: 150 }, card, viewport);
    expect(placed.side).toBe("left");
    expect(placed.left).toBe(500 - FLOAT_GAP_PX - card.width);
  });

  it("uses the visible left edge for an item that starts off-screen to the left", () => {
    const placed = floatOriginBeside({ minX: -800, maxX: 200, minY: 50, maxY: 150 }, card, viewport);
    expect(placed).toEqual({ left: 200 + FLOAT_GAP_PX, top: 50, side: "right" });
  });

  it("docks at the right margin when the item fills the view", () => {
    const placed = floatOriginBeside({ minX: -50, maxX: 1200, minY: -20, maxY: 900 }, card, viewport);
    expect(placed).toEqual({
      left: viewport.width - card.width - FLOAT_MARGIN_PX,
      top: FLOAT_MARGIN_PX,
      side: "docked",
    });
  });

  it("slides up only as far as the card needs to stay in the frame", () => {
    const placed = floatOriginBeside({ minX: 100, maxX: 300, minY: 500, maxY: 550 }, card, viewport);
    expect(placed.top).toBe(viewport.height - card.height - FLOAT_MARGIN_PX);
  });
});

describe("projectScreenRect", () => {
  // An orthographic camera looking down -z at the origin, 10 world units wide
  // and 6 high over the 1000×600 viewport: one unit is 100 px.
  const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const viewProjection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

  it("covers every corner of the box", () => {
    const rect = projectScreenRect({ min: { x: -1, y: -1, z: 0 }, max: { x: 2, y: 1, z: 0 } }, viewProjection, viewport);
    expect(rect!.minX).toBeCloseTo(400);
    expect(rect!.maxX).toBeCloseTo(700);
    expect(rect!.minY).toBeCloseTo(200);
    expect(rect!.maxY).toBeCloseTo(400);
  });

  it("does not clamp a box that runs off-screen", () => {
    const rect = projectScreenRect({ min: { x: 0, y: 0, z: 0 }, max: { x: 20, y: 1, z: 0 } }, viewProjection, viewport);
    expect(rect!.maxX).toBeGreaterThan(viewport.width);
  });

  it("skips corners behind the eye, and is null when none is in front", () => {
    const eye = new THREE.PerspectiveCamera(60, viewport.width / viewport.height, 0.1, 100);
    eye.position.set(0, 0, 10);
    eye.lookAt(0, 0, 0);
    eye.updateMatrixWorld();
    const perspective = new THREE.Matrix4().multiplyMatrices(eye.projectionMatrix, eye.matrixWorldInverse);

    expect(projectToScreen(0, 0, 0, perspective, viewport)).not.toBeNull();
    expect(projectToScreen(0, 0, 50, perspective, viewport)).toBeNull();
    // One corner in front, the far one behind: the box is the corners in front.
    const straddling = projectScreenRect({ min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 50 } }, perspective, viewport);
    expect(straddling!.minX).toBeCloseTo(500);
    expect(straddling!.maxX).toBeCloseTo(500);
    expect(projectScreenRect({ min: { x: 0, y: 0, z: 40 }, max: { x: 1, y: 1, z: 50 } }, perspective, viewport)).toBeNull();
  });
});
