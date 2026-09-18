import { describe, expect, it } from "vitest";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import {
  FLOATS_PER_SEGMENT,
  pairBufferLength,
  segmentCountFor,
  writeLineDistances,
  writePolylinePairs,
  writeRunPairs,
  writeRunScalars,
} from "./lineBuffer";

/**
 * The invariant: our in-place writers must produce EXACTLY what three's own
 * `setPositions` / `computeLineDistances` produce. If three ever changes the
 * interleaved pair layout, the fast path in `platform/draw/PreviewLine.tsx`
 * would write garbage into a live buffer — so the first test below compares
 * against a real `LineGeometry` rather than against hand-written expectations.
 *
 * (`LineGeometry` imports only core three, so it loads in the node environment.
 * Its `webgpu/LineSegments2` sibling pulls `three/webgpu` and does not, which is
 * why the distances are checked against hand-computed values instead.)
 */

const flatten = (points: readonly (readonly [number, number, number])[]) =>
  points.flatMap((point) => [point[0], point[1], point[2]]);

describe("segmentCountFor / pairBufferLength", () => {
  it("treats a polyline of N points as N-1 segments", () => {
    expect(segmentCountFor(0)).toBe(0);
    expect(segmentCountFor(1)).toBe(0);
    expect(segmentCountFor(2)).toBe(1);
    expect(segmentCountFor(49)).toBe(48);
  });

  it("sizes the pair buffer at six floats per segment", () => {
    expect(pairBufferLength(5)).toBe(4 * FLOATS_PER_SEGMENT);
  });
});

describe("writePolylinePairs", () => {
  it("reproduces three's interleaved pair layout byte for byte", () => {
    const points: [number, number, number][] = [
      [0, 0, 0],
      [10, 5, 0],
      [10, 25, 0],
      [-3, 25, 0],
    ];

    const geometry = new LineGeometry();
    geometry.setPositions(flatten(points));
    const expected = geometry.attributes.instanceStart.data.array;

    const target = new Float32Array(pairBufferLength(points.length));
    expect(writePolylinePairs(target, points)).toBe(3);
    expect(Array.from(target)).toEqual(Array.from(expected));
  });

  it("writes every interior vertex twice — that duplication is the layout", () => {
    const target = new Float32Array(pairBufferLength(3));
    writePolylinePairs(target, [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);

    // segment 0 = (P0, P1), segment 1 = (P1, P2)
    expect(Array.from(target)).toEqual([1, 2, 3, 4, 5, 6, 4, 5, 6, 7, 8, 9]);
  });

  it("reports -1 when the buffer is too small, so the caller reallocates", () => {
    const target = new Float32Array(FLOATS_PER_SEGMENT); // room for 1 segment
    expect(
      writePolylinePairs(target, [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ]),
    ).toBe(-1);
  });

  it("writes nothing below two points", () => {
    const target = new Float32Array(FLOATS_PER_SEGMENT);
    expect(writePolylinePairs(target, [[1, 1, 1]])).toBe(0);
    expect(Array.from(target)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("has room for an ellipse outline at the default segment count", () => {
    // 49 points (48 segments + the closing repeat) — the count PreviewLine
    // preallocates against.
    const points: [number, number, number][] = Array.from(
      { length: 49 },
      (_, index) => [index, index * 2, 0],
    );
    const target = new Float32Array(pairBufferLength(points.length));
    expect(writePolylinePairs(target, points)).toBe(48);
  });
});

describe("writeLineDistances", () => {
  it("accumulates arc length across segments", () => {
    // 3-4-5 right triangle: (0,0)→(3,0) is 3, (3,0)→(3,4) is 4.
    const points: [number, number, number][] = [
      [0, 0, 0],
      [3, 0, 0],
      [3, 4, 0],
    ];
    const pairs = new Float32Array(pairBufferLength(points.length));
    const segments = writePolylinePairs(pairs, points);

    const distances = new Float32Array(segments * 2);
    writeLineDistances(distances, pairs, segments);

    expect(Array.from(distances)).toEqual([0, 3, 3, 7]);
  });

  it("makes d1 of one segment the d0 of the next, so dashes cross corners cleanly", () => {
    const points: [number, number, number][] = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ];
    const pairs = new Float32Array(pairBufferLength(points.length));
    const segments = writePolylinePairs(pairs, points);
    const distances = new Float32Array(segments * 2);
    writeLineDistances(distances, pairs, segments);

    expect(distances[0]).toBe(0);
    for (let index = 1; index < segments; index += 1) {
      expect(distances[index * 2]).toBeCloseTo(distances[index * 2 - 1]);
    }
  });

  it("counts depth, not just the xy projection", () => {
    const points: [number, number, number][] = [
      [0, 0, 0],
      [0, 0, 5],
    ];
    const pairs = new Float32Array(pairBufferLength(points.length));
    const segments = writePolylinePairs(pairs, points);
    const distances = new Float32Array(segments * 2);
    writeLineDistances(distances, pairs, segments);

    expect(distances[1]).toBeCloseTo(5);
  });
});


describe("writeRunPairs — packing many trajectories into one buffer", () => {
  // Two tracks: (0,0)->(1,0)->(2,0) and (10,10)->(11,10).
  const coords = {
    x: [0, 1, 2, 10, 11],
    y: [0, 0, 0, 10, 10],
    z: null,
  };

  it("never joins the end of one run to the start of the next", () => {
    // THE property. A joining segment leaps across the field between two
    // unrelated tracks and looks enough like data to be believed, so it is
    // checked directly rather than inferred from the segment count.
    const target = new Float32Array(3 * FLOATS_PER_SEGMENT);

    const first = writeRunPairs(target, 0, coords, 0, 3);
    const second = writeRunPairs(target, first, coords, 3, 2);

    expect(first).toBe(2);
    expect(second).toBe(1);
    expect(first + second).toBe(3);

    // Segment 1 ends at (2,0); segment 2 starts at (10,10) — the next TRACK,
    // not a bridge from (2,0) to (10,10).
    expect([...target.slice(FLOATS_PER_SEGMENT, FLOATS_PER_SEGMENT * 2)]).toEqual([
      1, 0, 0, 2, 0, 0,
    ]);
    expect([...target.slice(FLOATS_PER_SEGMENT * 2)]).toEqual([10, 10, 0, 11, 10, 0]);
  });

  it("matches writePolylinePairs for a single run at offset 0", () => {
    // The offset variant must not be a second, subtly different layout.
    const points: [number, number, number][] = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ];
    const viaTuples = new Float32Array(pairBufferLength(3));
    const viaColumns = new Float32Array(pairBufferLength(3));

    writePolylinePairs(viaTuples, points);
    writeRunPairs(viaColumns, 0, coords, 0, 3);

    expect([...viaColumns]).toEqual([...viaTuples]);
  });

  it("writes z as 0 for a 2D table", () => {
    const target = new Float32Array(FLOATS_PER_SEGMENT);
    writeRunPairs(target, 0, coords, 0, 2);
    expect(target[2]).toBe(0);
    expect(target[5]).toBe(0);
  });

  it("carries a real z when the table has one", () => {
    const target = new Float32Array(FLOATS_PER_SEGMENT);
    writeRunPairs(target, 0, { x: [0, 1], y: [0, 0], z: [7, 9] }, 0, 2);
    expect(target[2]).toBe(7);
    expect(target[5]).toBe(9);
  });

  it("writes nothing for a run of one point", () => {
    // A single observation is a track with no segment. It must not borrow its
    // neighbour's row to make one.
    const target = new Float32Array(FLOATS_PER_SEGMENT).fill(-1);
    expect(writeRunPairs(target, 0, coords, 3, 1)).toBe(0);
    expect([...target]).toEqual([-1, -1, -1, -1, -1, -1]);
  });

  it("refuses rather than overrunning when the offset leaves too little room", () => {
    const target = new Float32Array(2 * FLOATS_PER_SEGMENT);
    expect(writeRunPairs(target, 1, coords, 0, 3)).toBe(-1);
  });
});

describe("writeRunScalars", () => {
  it("takes each segment's LATER endpoint", () => {
    // A segment exists once its far end does; taking the near end would draw
    // every segment one timepoint early.
    const target = new Float32Array(2);
    expect(writeRunScalars(target, 0, [10, 20, 30], 0, 3)).toBe(2);
    expect([...target]).toEqual([20, 30]);
  });

  it("packs runs at a segment offset, in segment space not row space", () => {
    const target = new Float32Array(3);
    const times = [0, 1, 2, 100, 101];
    const first = writeRunScalars(target, 0, times, 0, 3);
    writeRunScalars(target, first, times, 3, 2);
    expect([...target]).toEqual([1, 2, 101]);
  });

  it("refuses rather than overrunning", () => {
    expect(writeRunScalars(new Float32Array(1), 1, [0, 1, 2], 0, 3)).toBe(-1);
  });
});
