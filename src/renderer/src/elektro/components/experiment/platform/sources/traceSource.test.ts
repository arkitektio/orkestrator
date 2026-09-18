import { describe, expect, it } from "vitest";
import { buildTraceSource, planTraceRead, tileReadsFor, type LensLike } from "./traceSource";
import { planTraceTiles } from "../quality/tracePlanning";

const TIME = { name: "t", type: "TIME", order: 0 };
const CHANNEL = { name: "c", type: "CHANNEL", order: 0 };

/** `t_world = sample * 0.1 + 0` — a 10 kHz recording on a world clock in ms. */
const asAffine = {
  matrix: [[0.1, 0]],
  inputAxes: ["t"],
  outputAxes: ["t"],
  total: true,
};

const world = { axes: [{ name: "t", type: "TIME", order: 0 }] };

/** A 1-D pyramid, `levels` deep, level L downsampled by 2^L. */
const dataArrays = (levels: number, base: number) =>
  Array.from({ length: levels }, (_, level) => ({
    level,
    shape: [Math.ceil(base / 2 ** level)],
    toParent: { __typename: "ScaleTransformation", scale: [2 ** level] },
    store: { id: `L${level}` },
  }));

const lens = (overrides: Partial<LensLike> = {}): LensLike => ({
  axisNames: ["t"],
  shape: [1_000_000],
  slices: [],
  coordinateSystem: { axes: [TIME] },
  dataset: {
    axisNames: ["t"],
    shape: [1_000_000],
    intrinsicSystem: { axes: [TIME] },
    dataArrays: dataArrays(6, 1_000_000),
  },
  ...overrides,
});

describe("buildTraceSource", () => {
  it("builds the pyramid placed on the world clock", () => {
    const result = buildTraceSource({ lens: lens(), asAffine, world });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source.levels).toHaveLength(6);
    expect(result.source.levels.map((l) => l.period)).toEqual([
      0.1, 0.2, 0.4, 0.8, 1.6, 3.2,
    ]);
    expect(result.source.timeAxisIndex).toBe(0);
    expect(result.source.channelCount).toBe(1);
  });

  it("reports no-placement when asAffine is absent", () => {
    // The LOOKUP case (a FIELD step) and the UNREGISTERED case both land here, and
    // the caller distinguishes them from `placement` — not from this.
    const result = buildTraceSource({ lens: lens(), asAffine: null, world });
    expect(result).toEqual({ ok: false, reason: "no-placement" });
  });

  it("reports no-time-axis when the world has none", () => {
    const result = buildTraceSource({
      lens: lens(),
      asAffine,
      world: { axes: [{ name: "x", type: "SPACE" }] },
    });
    expect(result).toEqual({ ok: false, reason: "no-time-axis" });
  });

  it("reports no-arrays for a dataset with no levels at all", () => {
    const result = buildTraceSource({
      lens: lens({
        dataset: {
          axisNames: ["t"],
          shape: [10],
          intrinsicSystem: { axes: [TIME] },
          dataArrays: [],
        },
      }),
      asAffine,
      world,
    });
    expect(result).toEqual({ ok: false, reason: "no-arrays" });
  });

  it("finds the time axis of a (channel, time) dataset and counts its channels", () => {
    const result = buildTraceSource({
      lens: lens({
        axisNames: ["c", "t"],
        coordinateSystem: { axes: [CHANNEL, { ...TIME, order: 1 }] },
        dataset: {
          axisNames: ["c", "t"],
          shape: [8, 1_000_000],
          intrinsicSystem: { axes: [CHANNEL, { ...TIME, order: 1 }] },
          dataArrays: Array.from({ length: 3 }, (_, level) => ({
            level,
            shape: [8, Math.ceil(1_000_000 / 2 ** level)],
            toParent: {
              __typename: "ScaleTransformation",
              scale: [1, 2 ** level],
            },
            store: { id: `L${level}` },
          })),
        },
      }),
      asAffine,
      world,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source.timeAxisIndex).toBe(1);
    expect(result.source.channelAxisIndex).toBe(0);
    expect(result.source.channelCount).toBe(8);
    expect(result.source.levels.map((l) => l.period)).toEqual([0.1, 0.2, 0.4]);
  });

  it("accounts for a cropped lens when placing the levels", () => {
    const result = buildTraceSource({
      lens: lens({ slices: [{ axis: "t", start: 1000, stop: 2000, step: null }] }),
      asAffine,
      world,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Dataset sample 0 is 1000 samples (100 ms) before the lens' own origin.
    expect(result.source.levels[0].t0).toBeCloseTo(-100, 9);
  });
});

describe("planTraceRead", () => {
  const source = (() => {
    const result = buildTraceSource({ lens: lens(), asAffine, world });
    if (!result.ok) throw new Error("fixture");
    return result.source;
  })();

  it("reads level 0 at full rate for a small window", () => {
    const read = planTraceRead(source, { start: 0, end: 100 })!;
    expect(read.choice.level.level).toBe(0);
    expect(read.store.id).toBe("L0");
    expect(read.ranges).toHaveLength(1);
    expect(read.ranges[0]).toMatchObject({ step: 1 });
  });

  it("switches to a coarser level's STORE as the window widens", () => {
    // The user-visible behaviour: zooming out reads a different object, not more
    // of the same one.
    const near = planTraceRead(source, { start: 0, end: 100 })!;
    const far = planTraceRead(source, { start: 0, end: 100_000 })!;
    expect(far.store.id).not.toBe(near.store.id);
    expect(far.choice.level.level).toBeGreaterThan(near.choice.level.level);
  });

  it("puts the time range at the time axis' own position", () => {
    const twoD = (() => {
      const result = buildTraceSource({
        lens: lens({
          axisNames: ["c", "t"],
          coordinateSystem: { axes: [CHANNEL, { ...TIME, order: 1 }] },
          dataset: {
            axisNames: ["c", "t"],
            shape: [8, 1000],
            intrinsicSystem: { axes: [CHANNEL, { ...TIME, order: 1 }] },
            dataArrays: [
              {
                level: 0,
                shape: [8, 1000],
                toParent: { __typename: "ScaleTransformation", scale: [1, 1] },
                store: { id: "L0" },
              },
            ],
          },
        }),
        asAffine,
        world,
      });
      if (!result.ok) throw new Error("fixture");
      return result.source;
    })();

    const read = planTraceRead(twoD, { start: 0, end: 50 })!;
    // Channel axis unrestricted, time axis carrying the window.
    expect(read.ranges[0]).toBeNull();
    expect(read.ranges[1]).not.toBeNull();

    const restricted = planTraceRead(twoD, { start: 0, end: 50 }, {
      channelRange: { start: 2, stop: 6 },
    })!;
    expect(restricted.ranges[0]).toEqual({ start: 2, stop: 6, step: 1 });
  });

  it("is null when the window misses the data", () => {
    expect(planTraceRead(source, { start: 1e9, end: 2e9 })).toBeNull();
  });
});

describe("tileReadsFor", () => {
  const source = (() => {
    const result = buildTraceSource({ lens: lens(), asAffine, world });
    if (!result.ok) throw new Error("fixture");
    return result.source;
  })();

  it("issues one read per planned tile, in the plan's fetch order", () => {
    const plan = planTraceTiles({ levels: source.levels, window: { start: 0, end: 1000 } });
    const reads = tileReadsFor(source, plan);
    expect(reads).toHaveLength(plan.tiles.length);
    expect(reads.map((r) => r.tile.key)).toEqual(plan.tiles.map((t) => t.key));
    // The backdrop is read first.
    expect(reads[0].tile.fetchBand).toBe(0);
  });

  it("reads each tile whole at stride 1 — the level already did the decimation", () => {
    const plan = planTraceTiles({ levels: source.levels, window: { start: 0, end: 1000 } });
    for (const read of tileReadsFor(source, plan)) {
      expect(read.ranges[source.timeAxisIndex]).toEqual({
        start: read.tile.samples.start,
        stop: read.tile.samples.stop,
        step: 1,
      });
    }
  });

  it("reads coarse tiles from a different store than fine ones", () => {
    // The multiscale property, seen from the read side.
    const plan = planTraceTiles({ levels: source.levels, window: { start: 0, end: 1000 } });
    const stores = new Set(tileReadsFor(source, plan).map((r) => r.store.id));
    expect(stores.size).toBeGreaterThan(1);
  });
});

describe("buildTraceSource channel selection", () => {
  const twoDLens = (slices: { axis: string; start?: number; stop?: number; step?: number }[] = []) =>
    lens({
      axisNames: ["c", "t"],
      slices,
      coordinateSystem: { axes: [CHANNEL, { ...TIME, order: 1 }] },
      dataset: {
        axisNames: ["c", "t"],
        shape: [8, 1000],
        intrinsicSystem: { axes: [CHANNEL, { ...TIME, order: 1 }] },
        dataArrays: [
          {
            level: 0,
            shape: [8, 1000],
            toParent: { __typename: "ScaleTransformation", scale: [1, 1] },
            store: { id: "L0" },
          },
        ],
      },
    });

  const build = (l: ReturnType<typeof twoDLens>, channelIndex?: number | null) => {
    const result = buildTraceSource({ lens: l, asAffine, world, channelIndex });
    if (!result.ok) throw new Error(result.reason);
    return result.source;
  };

  it("draws only the channels the lens covers", () => {
    // A lens over channels 2..5 is four lines, read as one channel run — not all eight.
    const source = build(twoDLens([{ axis: "c", start: 2, stop: 6 }]));
    expect(source.channelCount).toBe(4);
    expect(source.channelIndices).toEqual([2, 3, 4, 5]);
    expect(planTraceRead(source, { start: 0, end: 50 })!.ranges[0]).toEqual({ start: 2, stop: 6, step: 1 });
  });

  it("narrows to one channel, counting within the lens' run", () => {
    const source = build(twoDLens([{ axis: "c", start: 2, stop: 6 }]), 1);
    expect(source.channelIndices).toEqual([3]);
    expect(source.channelRange).toEqual({ start: 3, stop: 4, step: 1 });
  });

  it("keeps a strided lens' step", () => {
    const source = build(twoDLens([{ axis: "c", start: 0, stop: 8, step: 2 }]));
    expect(source.channelIndices).toEqual([0, 2, 4, 6]);
    expect(source.channelRange).toEqual({ start: 0, stop: 7, step: 2 });
  });

  it("fails rather than drawing a guess when channelIndex is past the run", () => {
    const result = buildTraceSource({ lens: twoDLens(), asAffine, world, channelIndex: 8 });
    expect(result).toEqual({ ok: false, reason: "no-channel" });
  });

  it("reads every channel as the axis in full", () => {
    expect(build(twoDLens()).channelRange).toBeNull();
  });
});
