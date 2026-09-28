import { describe, expect, it } from "vitest";

import { createBrushSkeletonStore } from "./brushSkeletonStore";
import type { BrushSample } from "./shared/strokeModel";

const sample = (x: number): BrushSample => ({
  world: [x, 0, 0],
  voxel: [Math.round(x), 0, 0],
});

describe("brushSkeletonStore", () => {
  it("clamps the surface-quality knobs to their ranges", () => {
    const store = createBrushSkeletonStore();
    expect(store.getState().marcher).toBe("cubes");
    store.getState().setMarcher("tets");
    expect(store.getState().marcher).toBe("tets");
    store.getState().setDetailVoxels(9);
    expect(store.getState().detailVoxels).toBe(2);
    store.getState().setDetailVoxels(0.01);
    expect(store.getState().detailVoxels).toBe(0.1);
    store.getState().setPolishIterations(99);
    expect(store.getState().polishIterations).toBe(20);
    store.getState().setPolishIterations(-3);
    expect(store.getState().polishIterations).toBe(0);
  });

  it("initRadius only fills the blank, never overrides a chosen radius", () => {
    const store = createBrushSkeletonStore();
    store.getState().initRadius(4, [1, 40]);
    expect(store.getState().radiusWorld).toBe(4);

    store.getState().setRadiusWorld(9);
    store.getState().initRadius(2, [0.5, 20]);
    expect(store.getState().radiusWorld).toBe(9);
  });

  it("paints with a stable stroke identity, signalled by strokeVersion", () => {
    const store = createBrushSkeletonStore();
    store.getState().initRadius(4, [1, 40]);
    store.getState().beginStroke("layer:1");
    const stroke = store.getState().stroke;

    expect(store.getState().addSample(sample(0))).toBe(true);
    expect(store.getState().addSample(sample(10))).toBe(true);
    // Same voxel, under the distance floor (radius/4 = 1): dropped, no signal.
    expect(store.getState().addSample(sample(10.1))).toBe(false);

    expect(store.getState().stroke).toBe(stroke);
    expect(store.getState().strokeVersion).toBe(2);
    expect(store.getState().status).toBe("painting");
  });

  it("ignores samples outside a painting session", () => {
    const store = createBrushSkeletonStore();
    expect(store.getState().addSample(sample(0))).toBe(false);
    expect(store.getState().strokeVersion).toBe(0);
  });

  it("rejects a brush click — a stroke needs at least two samples", () => {
    const store = createBrushSkeletonStore();
    store.getState().beginStroke("layer:1");
    store.getState().addSample(sample(0));
    store.getState().endStroke();
    expect(store.getState().status).toBe("error");
    expect(store.getState().message).toMatch(/stroke/i);
  });

  it("a blob-mode click is the grow gesture — one probed point extracts", () => {
    const store = createBrushSkeletonStore();
    store.getState().beginStroke("layer:1", "blob");
    expect(store.getState().strokeMode).toBe("blob");
    store.getState().addSample(sample(0));
    store.getState().endStroke();
    expect(store.getState().status).toBe("extracting");
  });

  it("an empty stroke never extracts, in either mode", () => {
    const store = createBrushSkeletonStore();
    store.getState().beginStroke("layer:1", "blob");
    store.getState().endStroke();
    expect(store.getState().status).toBe("error");
  });

  it("beginStroke defaults back to stroke mode after a blob session", () => {
    const store = createBrushSkeletonStore();
    store.getState().beginStroke("layer:1", "blob");
    store.getState().clear();
    store.getState().beginStroke("layer:2");
    expect(store.getState().strokeMode).toBe("stroke");
  });

  it("hands a real stroke over to extraction, then preview, then idle", () => {
    const store = createBrushSkeletonStore();
    store.getState().beginStroke("layer:1");
    store.getState().addSample(sample(0));
    store.getState().addSample(sample(10));
    store.getState().endStroke();
    expect(store.getState().status).toBe("extracting");

    store.getState().setCandidate(
      { points: [[0, 0, 0]], layerId: "layer:1", level: 1, holes: 0 },
      null,
    );
    expect(store.getState().status).toBe("preview");

    store.getState().clear();
    expect(store.getState().status).toBe("idle");
    expect(store.getState().candidate).toBeNull();
    expect(store.getState().stroke).toHaveLength(0);
  });

  it("a failed save keeps the candidate; a failed extraction does not", () => {
    const store = createBrushSkeletonStore();
    store.getState().fail("no labeled data under the stroke");
    expect(store.getState().status).toBe("error");

    store.getState().setCandidate(
      { points: [[0, 0, 0]], layerId: "layer:1", level: 0, holes: 0 },
      null,
    );
    store.getState().setSaving();
    store.getState().fail("server rejected");
    expect(store.getState().status).toBe("preview");
    expect(store.getState().candidate).not.toBeNull();
  });

  it("accepts a live tube only while painting, and hands over to the candidate", () => {
    const store = createBrushSkeletonStore();
    const tube = { positions: new Float32Array(9), triangles: 1, truncated: false };

    // Not painting: a stale preview result must be dropped.
    store.getState().setLiveTube(tube);
    expect(store.getState().liveTube).toBeNull();

    store.getState().beginStroke("layer:1");
    store.getState().setLiveTube(tube);
    expect(store.getState().liveTube).toBe(tube);

    // Survives the release (no blink during extraction)...
    store.getState().addSample(sample(0));
    store.getState().addSample(sample(10));
    store.getState().endStroke();
    expect(store.getState().liveTube).toBe(tube);

    // ...and keeps updating while EXTRACTING — the grow loop animates its
    // expansion through this slot.
    const growing = { positions: new Float32Array(18), triangles: 2, truncated: false };
    store.getState().setLiveTube(growing);
    expect(store.getState().liveTube).toBe(growing);

    // ...and yields to the final candidate.
    store.getState().setCandidate(
      { points: [[0, 0, 0]], layerId: "layer:1", level: 0, holes: 0, tube },
      null,
    );
    expect(store.getState().liveTube).toBeNull();
  });

  it("clears the live tube on failure and on a fresh stroke", () => {
    const store = createBrushSkeletonStore();
    const tube = { positions: new Float32Array(9), triangles: 1, truncated: false };
    store.getState().beginStroke("layer:1");
    store.getState().setLiveTube(tube);

    store.getState().fail("no data");
    expect(store.getState().liveTube).toBeNull();

    store.getState().beginStroke("layer:2");
    store.getState().setLiveTube(tube);
    store.getState().beginStroke("layer:3");
    expect(store.getState().liveTube).toBeNull();
  });

  it("beginStroke discards a lingering candidate and message", () => {
    const store = createBrushSkeletonStore();
    store.getState().setCandidate(
      { points: [[0, 0, 0]], layerId: "layer:1", level: 0, holes: 2 },
      "may detour",
    );
    store.getState().beginStroke("layer:2");
    expect(store.getState().candidate).toBeNull();
    expect(store.getState().message).toBeNull();
    expect(store.getState().strokeLayerId).toBe("layer:2");
  });
});
