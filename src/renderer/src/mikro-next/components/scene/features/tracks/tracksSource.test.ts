import { describe, expect, it } from "vitest";

import { FLOATS_PER_SEGMENT } from "@/lib/scene/gpu/lineBuffer";
import { isTrackLoadError, loadTrackGeometry, valueSpanOf } from "./tracksSource";
import type { AttributeLookupEngine } from "@/mikro-next/lib/attributes/lookupEngine";

const store = { id: "parquet-tracks", bucket: "b", key: "k" } as never;

/** An engine whose columnar read answers from typed arrays, as Arrow does. */
const engineWith = (
  columns: Record<string, ArrayLike<number> | ArrayLike<string>> | null,
): AttributeLookupEngine =>
  ({
    readColumnsTyped: () => Promise.resolve(columns),
  }) as never;

const columns = { trackId: "track", x: "x", y: "y", t: "frame" };

describe("loadTrackGeometry", () => {
  it("packs two trajectories without a bridging segment between them", () => {
    // The characteristic failure of this shape: a segment leaping across the
    // field from the end of one cell's track to the start of another's. It
    // looks enough like data to be believed, so it is asserted directly.
    const engine = engineWith({
      track_id: new Float64Array([1, 1, 1, 2, 2]),
      px: new Float64Array([0, 1, 2, 50, 51]),
      py: new Float64Array([0, 0, 0, 50, 50]),
      pt: new Float64Array([0, 1, 2, 0, 1]),
    });

    return loadTrackGeometry(engine, store, columns).then((result) => {
      expect(isTrackLoadError(result)).toBe(false);
      if (!result || isTrackLoadError(result)) throw new Error("expected geometry");

      expect(result.trackCount).toBe(2);
      // 3 points + 2 points = 2 + 1 segments. Four would mean a bridge.
      expect(result.segmentCount).toBe(3);
      // The third segment is track 2's own, starting at ITS first point.
      const third = [...result.pairs.slice(FLOATS_PER_SEGMENT * 2)];
      expect(third).toEqual([50, 50, 0, 51, 50, 0]);
    });
  });

  it("resolves times to TIMELINE INDICES, so uneven sampling still scrubs evenly", () => {
    // A movie that jumps 0, 1, 2, 90 has four timepoints, not ninety-one. A
    // tail measured in raw t would vanish across the gap; in index space "three
    // timepoints of tail" means three OBSERVATIONS wherever they fall.
    const engine = engineWith({
      track_id: new Float64Array([1, 1, 1, 1]),
      px: new Float64Array([0, 1, 2, 3]),
      py: new Float64Array([0, 0, 0, 0]),
      pt: new Float64Array([0, 1, 2, 90]),
    });

    return loadTrackGeometry(engine, store, columns).then((result) => {
      if (!result || isTrackLoadError(result)) throw new Error("expected geometry");
      expect([...(result.timeline ?? [])]).toEqual([0, 1, 2, 90]);
      // Per-segment time is the LATER endpoint's index: 1, 2, 3 — not 1, 2, 90.
      expect([...(result.times ?? [])]).toEqual([1, 2, 3]);
    });
  });

  it("merges the tracks' times into ONE timeline, sorted numerically", () => {
    // Rows arrive ordered by (track, t) — so ASCENDING WITHIN a track, but not
    // across them. Track 1 lives at t=0,10 and track 2 at t=2,5, so the values
    // are first seen in the order 0, 10, 2, 5 and the sort is what makes the
    // merged timeline a timeline at all.
    //
    // This also pins the sort as NUMERIC. `Float64Array.prototype.sort` is,
    // unlike `Array.prototype.sort` — which would compare these as strings and
    // give [0, 10, 2, 5], quietly putting frame 10 before frame 2.
    const engine = engineWith({
      track_id: new Float64Array([1, 1, 2, 2]),
      px: new Float64Array([0, 1, 9, 8]),
      py: new Float64Array([0, 0, 9, 9]),
      pt: new Float64Array([0, 10, 2, 5]),
    });

    return loadTrackGeometry(engine, store, columns).then((result) => {
      if (!result || isTrackLoadError(result)) throw new Error("expected geometry");
      expect([...(result.timeline ?? [])]).toEqual([0, 2, 5, 10]);
      // One segment each, taking its LATER endpoint: track 1 ends at t=10
      // (index 3), track 2 at t=5 (index 2). A lexicographic timeline would
      // have made these 1 and 3.
      expect([...(result.times ?? [])]).toEqual([3, 2]);
    });
  });

  it("has no timeline at all without a t column — the material's no-tail case", () => {
    const engine = engineWith({
      track_id: new Float64Array([1, 1]),
      px: new Float64Array([0, 1]),
      py: new Float64Array([0, 1]),
    });

    return loadTrackGeometry(engine, store, { trackId: "track", x: "x", y: "y" }).then(
      (result) => {
        if (!result || isTrackLoadError(result)) throw new Error("expected geometry");
        expect(result.timeline).toBeNull();
        expect(result.times).toBeNull();
        expect(result.segmentCount).toBe(1);
      },
    );
  });

  it("refuses, with a sentence, when every track is a single observation", () => {
    // Not an empty draw: there is data, it just cannot be joined into paths,
    // and saying so beats a silently blank layer.
    const engine = engineWith({
      track_id: new Float64Array([1, 2, 3]),
      px: new Float64Array([0, 1, 2]),
      py: new Float64Array([0, 1, 2]),
      pt: new Float64Array([0, 0, 0]),
    });

    return loadTrackGeometry(engine, store, columns).then((result) => {
      expect(isTrackLoadError(result)).toBe(true);
      if (!isTrackLoadError(result)) throw new Error("expected a refusal");
      expect(result.error).toContain("single observation");
    });
  });

  it("returns null when the read cannot answer columnwise", () => {
    return loadTrackGeometry(engineWith(null), store, columns).then((result) => {
      expect(result).toBeNull();
    });
  });
});

describe("valueSpanOf", () => {
  it("widens a constant column instead of yielding a zero-width ramp", () => {
    // A zero span divides to NaN in the shader, and `clamp(NaN)` is undefined
    // behaviour in WGSL — the live defect in the point material's ±Inf clims.
    expect(valueSpanOf(new Float32Array([4, 4, 4]))).toEqual({ min: 4, max: 5 });
  });

  it("falls back to a unit range rather than to infinities", () => {
    expect(valueSpanOf(null)).toEqual({ min: 0, max: 1 });
    expect(valueSpanOf(new Float32Array(0))).toEqual({ min: 0, max: 1 });
  });

  it("spans the real values when there are some", () => {
    expect(valueSpanOf(new Float32Array([2, 9, 5]))).toEqual({ min: 2, max: 9 });
  });
});
