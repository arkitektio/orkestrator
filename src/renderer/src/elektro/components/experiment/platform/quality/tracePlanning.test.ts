import { describe, expect, it } from "vitest";
import { buildTraceLevels } from "./levelPlan";
import {
  DEFAULT_TILE_SAMPLES,
  childrenOf,
  spanScore,
  tileWorldSpan,
  tilesOverlapping,
} from "./tileAddress";
import { planSignature, planTraceTiles } from "./tracePlanning";
import {
  coverageOf,
  createResidency,
  drawableTiles,
  evictToBudget,
  insertTile,
  levelIndexAt,
  missingTiles,
  protectedKeysOf,
  type DrawSegment,
  type ResidentTile,
} from "./traceResidency";

/** A 6-level pyramid over 1e6 samples at 0.1 ms — 100 s of 10 kHz recording. */
const levels = buildTraceLevels(
  Array.from({ length: 6 }, (_, level) => ({
    level,
    shape: [Math.ceil(1_000_000 / 2 ** level)],
    toParent: { __typename: "ScaleTransformation", scale: [2 ** level] },
    store: { id: `L${level}` },
  })),
  0,
  { period: 0.1, t0: 0, total: true },
);

const WHOLE = { start: 0, end: 100_000 };

describe("tileAddress", () => {
  it("relates parent and child spans in world time", () => {
    // A coarse tile's span must be covered by its children's spans, or the
    // planner would think part of the window is unreachable at the finer level.
    const parentSpan = tileWorldSpan(levels[2], DEFAULT_TILE_SAMPLES, 3);
    const kids = childrenOf(levels, DEFAULT_TILE_SAMPLES, 2, 3);
    expect(kids.length).toBeGreaterThan(0);
    const childSpans = kids.map((i) =>
      tileWorldSpan(levels[1], DEFAULT_TILE_SAMPLES, i),
    );
    expect(Math.min(...childSpans.map((s) => s.start))).toBeLessThanOrEqual(
      parentSpan.start,
    );
    expect(Math.max(...childSpans.map((s) => s.end))).toBeGreaterThanOrEqual(
      parentSpan.end,
    );
  });

  it("gives the finest level no children", () => {
    expect(childrenOf(levels, DEFAULT_TILE_SAMPLES, 0, 0)).toEqual([]);
  });

  it("scores an ancestor no worse than its descendants", () => {
    // Monotonicity under ancestry — the planner's refinement order relies on it.
    const focus = 12_345;
    const parentScore = spanScore(
      tileWorldSpan(levels[2], DEFAULT_TILE_SAMPLES, 3),
      focus,
    );
    for (const i of childrenOf(levels, DEFAULT_TILE_SAMPLES, 2, 3)) {
      expect(parentScore).toBeLessThanOrEqual(
        spanScore(tileWorldSpan(levels[1], DEFAULT_TILE_SAMPLES, i), focus) + 1e-9,
      );
    }
  });

  it("finds no tiles for a window off the end of the data", () => {
    expect(tilesOverlapping(levels[0], DEFAULT_TILE_SAMPLES, { start: 1e9, end: 2e9 })).toBeNull();
  });
});

describe("planTraceTiles", () => {
  it("always covers the whole fetch region with a root backdrop", () => {
    // The no-gap guarantee: whatever the zoom, SOME level covers every part of
    // the window, so a trace is never simply missing.
    const plan = planTraceTiles({ levels, window: { start: 40_000, end: 40_100 } });
    const backdrop = plan.tiles.filter((t) => t.fetchBand === 0);
    expect(backdrop.length).toBeGreaterThan(0);
    expect(backdrop.every((t) => t.levelIndex === levels.length - 1)).toBe(true);
  });

  it("emits keep tiles for the ancestors of every target", () => {
    // Without the ancestor chain there is nothing to draw while the fine tiles
    // are in flight, and a zoom blinks.
    const plan = planTraceTiles({ levels, window: { start: 0, end: 500 } });
    const targets = plan.tiles.filter((t) => t.role === "target");
    const keeps = plan.tiles.filter((t) => t.role === "keep");
    expect(targets.length).toBeGreaterThan(0);
    expect(keeps.length).toBeGreaterThan(0);
    // Every target's span is covered by some keep at a coarser level.
    for (const target of targets) {
      const hasAncestor = keeps.some(
        (k) =>
          k.levelIndex > target.levelIndex &&
          k.span.start <= target.span.start &&
          k.span.end >= target.span.end,
      );
      expect(hasAncestor).toBe(true);
    }
  });

  it("refines to a finer level as the window narrows", () => {
    const wide = planTraceTiles({ levels, window: WHOLE });
    const narrow = planTraceTiles({ levels, window: { start: 0, end: 100 } });
    expect(narrow.targetLevelIndex).toBeLessThan(wide.targetLevelIndex);
  });

  it("plans a prefetch margin either side of the viewport", () => {
    const plan = planTraceTiles({
      levels,
      window: { start: 40_000, end: 41_000 },
      prefetchMargin: 0.5,
    });
    const prefetch = plan.tiles.filter((t) => t.fetchBand === 2);
    expect(prefetch.length).toBeGreaterThan(0);
    // And prefetch is ordered after everything in view.
    const lastInView = plan.tiles.findLastIndex((t) => t.fetchBand === 1);
    const firstPrefetch = plan.tiles.findIndex((t) => t.fetchBand === 2);
    expect(firstPrefetch).toBeGreaterThan(lastInView);
  });

  it("orders the backdrop first, then near before far", () => {
    const plan = planTraceTiles({
      levels,
      window: { start: 40_000, end: 41_000 },
      focus: 40_500,
    });
    const bands = plan.tiles.map((t) => t.fetchBand);
    expect([...bands].sort((a, b) => a - b)).toEqual(bands);

    const inView = plan.tiles.filter((t) => t.fetchBand === 1);
    const scores = inView.map((t) => t.fetchScore);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
  });

  it("degrades the EDGES, not the focus, when the budget bites", () => {
    // The point of foveated, closest-first refinement.
    const window = { start: 0, end: 20_000 };
    const focus = 10_000;
    const plan = planTraceTiles({
      levels,
      window,
      focus,
      budgetBytes: 512 * 1024,
      targetPoints: 200_000, // ask for far more than the budget allows
    });

    const targets = plan.tiles.filter((t) => t.role === "target");
    const near = targets.filter((t) => spanScore(t.span, focus) === 0);
    const far = targets.filter((t) => spanScore(t.span, focus) > 0);
    expect(near.length).toBeGreaterThan(0);
    expect(far.length).toBeGreaterThan(0);
    // Whatever is drawn at the focus is at least as fine as what is drawn at the
    // edges.
    const finestNear = Math.min(...near.map((t) => t.levelIndex));
    const finestFar = Math.min(...far.map((t) => t.levelIndex));
    expect(finestNear).toBeLessThanOrEqual(finestFar);
  });

  it("never plans more than its budget beyond the mandatory backdrop", () => {
    const plan = planTraceTiles({
      levels,
      window: WHOLE,
      budgetBytes: 1024 * 1024,
      targetPoints: 1_000_000,
    });
    // The backdrop is unconditional; refinement on top of it is what is bounded.
    const refined = plan.tiles.filter((t) => t.fetchBand !== 0 || t.levelIndex !== levels.length - 1);
    const refinedBytes = refined.reduce((acc, t) => acc + t.bytes, 0);
    expect(refinedBytes).toBeLessThanOrEqual(plan.budgetBytes);
  });

  it("is stable: planning the same window twice asks for the same thing", () => {
    const a = planTraceTiles({ levels, window: { start: 0, end: 1000 } });
    const b = planTraceTiles({ levels, window: { start: 0, end: 1000 } });
    expect(planSignature(a)).toBe(planSignature(b));
  });

  it("changes what it asks for when the window moves", () => {
    const a = planTraceTiles({ levels, window: { start: 0, end: 1000 } });
    const b = planTraceTiles({ levels, window: { start: 50_000, end: 51_000 } });
    expect(planSignature(a)).not.toBe(planSignature(b));
  });

  it("honours a forced level for a raw-data control", () => {
    const plan = planTraceTiles({
      levels,
      window: { start: 0, end: 200 },
      forcedLevel: 0,
      budgetBytes: 1024 * 1024 * 1024,
    });
    expect(plan.targetLevelIndex).toBe(0);
    expect(plan.tiles.some((t) => t.level === 0 && t.role === "target")).toBe(true);
  });

  it("is empty for a window that misses the data", () => {
    expect(planTraceTiles({ levels, window: { start: 1e9, end: 2e9 } }).tiles).toEqual([]);
    expect(planTraceTiles({ levels: [], window: WHOLE }).tiles).toEqual([]);
  });

  it("reports per-level byte costs for debugging", () => {
    const plan = planTraceTiles({ levels, window: WHOLE });
    expect(plan.levelBytes).toHaveLength(levels.length);
    // Finest level costs the most.
    expect(plan.levelBytes[0]).toBeGreaterThan(plan.levelBytes[levels.length - 1]);
  });
});

describe("traceResidency", () => {
  const resident = (tile: {
    key: string;
    level: number;
    levelIndex: number;
    index: number;
    span: { start: number; end: number };
    samples: { start: number; stop: number };
    bytes: number;
  }): ResidentTile => ({
    ...tile,
    period: 0.1,
    t0: 0,
    channels: [new Float32Array(1)],
    lastUsed: 0,
  });

  it("reports what a plan still needs", () => {
    const plan = planTraceTiles({ levels, window: { start: 0, end: 1000 } });
    const residency = createResidency();
    expect(missingTiles(residency, plan)).toHaveLength(plan.tiles.length);

    insertTile(residency, resident(plan.tiles[0]));
    expect(missingTiles(residency, plan)).toHaveLength(plan.tiles.length - 1);
  });

  it("draws a coarse ancestor while the fine tile is in flight", () => {
    // Progressive refinement, which is the whole reason `keep` tiles are fetched.
    const window = { start: 0, end: 1000 };
    const plan = planTraceTiles({ levels, window });
    const residency = createResidency();

    // Only the coarse keeps have landed.
    for (const tile of plan.tiles.filter((t) => t.role === "keep")) {
      insertTile(residency, resident(tile));
    }
    const coarse = drawableTiles(residency, plan, window);
    expect(coarse.length).toBeGreaterThan(0);
    expect(coverageOf(coarse, window)).toBeCloseTo(1, 6);
    const finestCoarseLevel = Math.min(...coarse.map((s) => s.tile.levelIndex));

    // Now the fine targets land, and they take over.
    for (const tile of plan.tiles.filter((t) => t.role === "target")) {
      insertTile(residency, resident(tile));
    }
    const fine = drawableTiles(residency, plan, window);
    const finestFine = Math.min(...fine.map((s) => s.tile.levelIndex));
    expect(finestFine).toBeLessThan(finestCoarseLevel);
    expect(coverageOf(fine, window)).toBeCloseTo(1, 6);
  });

  it("never draws a coarse tile underneath the fine tiles that cover it", () => {
    const window = { start: 0, end: 1000 };
    const plan = planTraceTiles({ levels, window });
    const residency = createResidency();
    for (const tile of plan.tiles) insertTile(residency, resident(tile));

    const drawn = drawableTiles(residency, plan, window);
    // No two drawn SEGMENTS may overlap: two resolutions on the same pixels would
    // draw two different polylines on top of each other.
    for (let i = 1; i < drawn.length; i++) {
      expect(drawn[i].start).toBeGreaterThanOrEqual(drawn[i - 1].end - 1e-9);
    }
    // And together they still cover the window.
    expect(coverageOf(drawn, window)).toBeCloseTo(1, 6);
  });

  it("protects everything the plan names from eviction", () => {
    const plan = planTraceTiles({ levels, window: { start: 0, end: 1000 } });
    const residency = createResidency();
    for (const tile of plan.tiles) insertTile(residency, resident(tile));
    // A stale tile from an earlier view, which SHOULD go.
    insertTile(
      residency,
      resident({
        key: "stale",
        level: 0,
        levelIndex: 0,
        index: 9999,
        span: { start: 90_000, end: 91_000 },
        samples: { start: 0, stop: 4096 },
        bytes: 10_000_000,
      }),
    );

    const evicted = evictToBudget(residency, protectedKeysOf(plan), 1000, 500);
    expect(evicted).toContain("stale");
    // Evicting a `keep` would delete the fallback a target is refining over.
    for (const tile of plan.tiles) {
      expect(residency.byKey.has(tile.key)).toBe(true);
    }
  });

  it("evicts the furthest-from-focus unprotected tile first", () => {
    const residency = createResidency();
    const mk = (key: string, start: number) =>
      resident({
        key,
        level: 0,
        levelIndex: 0,
        index: 0,
        span: { start, end: start + 100 },
        samples: { start: 0, stop: 100 },
        bytes: 100,
      });
    insertTile(residency, mk("near", 0));
    insertTile(residency, mk("far", 10_000));

    const evicted = evictToBudget(residency, new Set(), 100, 50);
    expect(evicted).toEqual(["far"]);
    expect(residency.byKey.has("near")).toBe(true);
  });

  it("reports partial coverage honestly while tiles are still loading", () => {
    const window = { start: 0, end: 1000 };
    const plan = planTraceTiles({ levels, window });
    const residency = createResidency();
    expect(coverageOf(drawableTiles(residency, plan, window), window)).toBe(0);
  });
});

describe("levelIndexAt", () => {
  const seg = (start: number, end: number, levelIndex: number): DrawSegment => ({
    start,
    end,
    tile: { levelIndex } as ResidentTile,
  });

  it("reports the level of the segment covering the instant", () => {
    const segments = [seg(0, 10, 3), seg(10, 20, 0)];
    expect(levelIndexAt(segments, 5)).toBe(3);
    expect(levelIndexAt(segments, 15)).toBe(0);
  });

  it("is null where nothing resident covers the instant", () => {
    expect(levelIndexAt([seg(0, 10, 1)], 50)).toBeNull();
    expect(levelIndexAt([], 0)).toBeNull();
  });
});

describe("chunk-aligned tiles", () => {
  it("plans ONE tile for an un-pyramided trace stored as one chunk", () => {
    // The LFP case: 1.25 M samples in a single 1.25 M-sample chunk. With the
    // default 4096-sample tiles this was ~305 reads of the same chunk.
    const single = buildTraceLevels(
      [{ level: 0, shape: [1_250_000], chunkShape: [1_250_000], store: { id: "L0" } }],
      0,
      { period: 0.001, t0: 2, total: true },
      { shapeRatioFallback: true },
    );
    expect(single[0].tileSamples).toBe(1_250_000);
    const plan = planTraceTiles({ levels: single, window: { start: 2, end: 1252 } });
    expect(plan.tiles).toHaveLength(1);
    expect(plan.tiles[0].samples).toEqual({ start: 0, stop: 1_250_000 });
  });

  it("tiles each level by its own chunk, and still refines in world time", () => {
    const pyramid = buildTraceLevels(
      [
        { level: 0, shape: [1_000_000], chunkShape: [100_000], store: { id: "L0" } },
        {
          level: 1,
          shape: [100_000],
          chunkShape: [100_000],
          toParent: { __typename: "ScaleTransformation", scale: [10] },
          store: { id: "L1" },
        },
      ],
      0,
      { period: 0.1, t0: 0, total: true },
      { shapeRatioFallback: true },
    );
    // Zoomed in: the finest level is wanted, read as its 100 k-sample chunks.
    const plan = planTraceTiles({
      levels: pyramid,
      window: { start: 50_000, end: 50_100 },
      budgetBytes: 1e9,
    });
    const fine = plan.tiles.filter((t) => t.levelIndex === 0);
    expect(fine.length).toBeGreaterThan(0);
    expect(fine.every((t) => t.samples.stop - t.samples.start === 100_000)).toBe(true);
  });

  it("never tiles finer than the minimum, whatever the chunking", () => {
    const tiny = buildTraceLevels(
      [{ level: 0, shape: [100_000], chunkShape: [64], store: { id: "L0" } }],
      0,
      { period: 1, t0: 0, total: true },
      { shapeRatioFallback: true },
    );
    expect(tiny[0].tileSamples).toBe(4096);
  });
});
