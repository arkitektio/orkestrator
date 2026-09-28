import { describe, expect, it } from "vitest";
import {
  gpuFlushUploadBytes,
  partitionUploadQueue,
  resolveDrainPolicy,
  shouldContinueDrain,
  shouldContinueStaleDrain,
  shouldDispatchFetch,
  type DrainBudget,
} from "./uploadBudget";

const BUDGET: DrainBudget = { maxBytes: 1000, maxBricks: 4, maxMs: 4 };

describe("shouldContinueDrain", () => {
  it("always allows the first brick, even past every cap", () => {
    // A single slow upload (or a slow prior frame) must not stall streaming.
    expect(
      shouldContinueDrain({ bytes: 0, bricks: 0, elapsedMs: 999 }, BUDGET),
    ).toBe(true);
  });

  it("each cap binds independently once progress was made", () => {
    const ok = { bytes: 500, bricks: 2, elapsedMs: 2 };
    expect(shouldContinueDrain(ok, BUDGET)).toBe(true);
    expect(shouldContinueDrain({ ...ok, bytes: 1000 }, BUDGET)).toBe(false);
    expect(shouldContinueDrain({ ...ok, bricks: 4 }, BUDGET)).toBe(false);
    expect(shouldContinueDrain({ ...ok, elapsedMs: 4 }, BUDGET)).toBe(false);
  });

  it("the time cap binds when bytes/bricks would still allow more (the P19 case)", () => {
    // Integrated GPU: one brick took 17 ms — stop after it despite tiny bytes.
    expect(
      shouldContinueDrain({ bytes: 100, bricks: 1, elapsedMs: 17 }, BUDGET),
    ).toBe(false);
  });
});

describe("shouldContinueStaleDrain", () => {
  it("gives stale bricks NO first-brick free pass", () => {
    // A planned drain would allow this; a stale brick must never cause the
    // over-budget hitch the free pass permits.
    expect(
      shouldContinueStaleDrain({ bytes: 0, bricks: 0, elapsedMs: 999 }, BUDGET),
    ).toBe(false);
  });

  it("each cap binds independently", () => {
    const ok = { bytes: 500, bricks: 2, elapsedMs: 2 };
    expect(shouldContinueStaleDrain(ok, BUDGET)).toBe(true);
    expect(shouldContinueStaleDrain({ ...ok, bytes: 1000 }, BUDGET)).toBe(false);
    expect(shouldContinueStaleDrain({ ...ok, bricks: 4 }, BUDGET)).toBe(false);
    expect(shouldContinueStaleDrain({ ...ok, elapsedMs: 4 }, BUDGET)).toBe(false);
  });

  it("allows stale uploads on genuinely leftover budget", () => {
    expect(
      shouldContinueStaleDrain({ bytes: 100, bricks: 1, elapsedMs: 1 }, BUDGET),
    ).toBe(true);
  });
});

describe("partitionUploadQueue", () => {
  const entry = (key: string, uniformValue: number | null = null, level = 0) => ({
    key,
    uniformValue,
    level,
  });
  const protecting = (...keys: string[]) => new Set(keys);

  it("splits planned-first by protectedKeys, preserving FIFO order per partition", () => {
    const queue = [entry("a"), entry("b"), entry("c"), entry("d")];
    const { planned, stale, dropped } = partitionUploadQueue(queue, protecting("b", "d"), 10);
    expect(planned.map((e) => e.key)).toEqual(["b", "d"]);
    expect(stale.map((e) => e.key)).toEqual(["a", "c"]);
    expect(dropped).toEqual([]);
  });

  it("uniform (EMPTY) entries always count as planned, even unprotected", () => {
    const queue = [entry("a", 7), entry("b")];
    const { planned, stale } = partitionUploadQueue(queue, protecting(), 10);
    expect(planned.map((e) => e.key)).toEqual(["a"]);
    expect(stale.map((e) => e.key)).toEqual(["b"]);
  });

  it("caps the stale partition, dropping the OLDEST entries first", () => {
    const queue = [entry("s1"), entry("p"), entry("s2"), entry("s3")];
    const { planned, stale, dropped } = partitionUploadQueue(queue, protecting("p"), 2);
    expect(planned.map((e) => e.key)).toEqual(["p"]);
    expect(stale.map((e) => e.key)).toEqual(["s2", "s3"]);
    expect(dropped.map((e) => e.key)).toEqual(["s1"]);
  });

  it("maxStale of 0 drops every stale entry", () => {
    const queue = [entry("s1"), entry("s2")];
    const { planned, stale, dropped } = partitionUploadQueue(queue, protecting(), 0);
    expect(planned).toEqual([]);
    expect(stale).toEqual([]);
    expect(dropped.map((e) => e.key)).toEqual(["s1", "s2"]);
  });
});

describe("partitionUploadQueue — minUsefulLevel", () => {
  const entry = (key: string, level: number, uniformValue: number | null = null) => ({
    key,
    uniformValue,
    level,
  });
  const protecting = (...keys: string[]) => new Set(keys);

  it("drops out-of-plan entries FINER than the plan's target level", () => {
    // The shader's residency walk starts at the desired level and moves
    // coarser, so a level-0 brick under a target-level-1 plan can never be
    // sampled. Without this, the pool trim that frees those slots is undone on
    // the next drain: the headroom refills with the same unreachable bricks.
    const queue = [entry("fine", 0), entry("target", 1), entry("coarse", 2)];
    const { planned, stale, dropped } = partitionUploadQueue(queue, protecting(), 10, 1);
    expect(planned).toEqual([]);
    expect(stale.map((e) => e.key)).toEqual(["target", "coarse"]);
    expect(dropped.map((e) => e.key)).toEqual(["fine"]);
  });

  it("never drops a PROTECTED entry, however fine", () => {
    const queue = [entry("fine", 0)];
    const { planned, dropped } = partitionUploadQueue(queue, protecting("fine"), 10, 3);
    expect(planned.map((e) => e.key)).toEqual(["fine"]);
    expect(dropped).toEqual([]);
  });

  it("never drops a UNIFORM entry — it costs no slot to compete for", () => {
    const queue = [entry("empty", 0, 42)];
    const { planned, dropped } = partitionUploadQueue(queue, protecting(), 10, 3);
    expect(planned.map((e) => e.key)).toEqual(["empty"]);
    expect(dropped).toEqual([]);
  });

  it("defaults to dropping nothing, so the level gate is opt-in", () => {
    const queue = [entry("fine", 0), entry("coarse", 2)];
    const { stale, dropped } = partitionUploadQueue(queue, protecting(), 10);
    expect(stale.map((e) => e.key)).toEqual(["fine", "coarse"]);
    expect(dropped).toEqual([]);
  });

  it("reports both unreachable and stale-overflow drops together", () => {
    const queue = [entry("fine", 0), entry("s1", 2), entry("s2", 2), entry("s3", 2)];
    const { stale, dropped } = partitionUploadQueue(queue, protecting(), 2, 1);
    expect(dropped.map((e) => e.key)).toEqual(["fine", "s1"]);
    expect(stale.map((e) => e.key)).toEqual(["s2", "s3"]);
  });
});

describe("resolveDrainPolicy", () => {
  const tierBudget: DrainBudget = { maxBytes: 6 * 1024 * 1024, maxBricks: 12, maxMs: 4 };

  it("idle: today's budget with every allowance on", () => {
    const policy = resolveDrainPolicy(tierBudget, false);
    expect(policy.budget).toEqual(tierBudget);
    expect(policy.allowFreePass).toBe(true);
    expect(policy.allowStale).toBe(true);
    expect(policy.allowGpuDispatch).toBe(true);
  });

  it("interacting: trickle budget, no free pass, no stale — but GPU dispatch STAYS on", () => {
    const policy = resolveDrainPolicy(tierBudget, true);
    expect(policy.budget.maxBytes).toBe(2 * 1024 * 1024);
    expect(policy.budget.maxBricks).toBe(4);
    expect(policy.budget.maxMs).toBe(1.5);
    expect(policy.allowFreePass).toBe(false);
    expect(policy.allowStale).toBe(false);
    // Blocking GPU dispatch starved gpu-path pools for entire gestures
    // (110-brick queue backlogs, 565 planDrops); the byte budget bounds the
    // flush cost instead.
    expect(policy.allowGpuDispatch).toBe(true);
  });

  it("interacting caps never RAISE a lower tier budget", () => {
    const low: DrainBudget = { maxBytes: 1024, maxBricks: 2, maxMs: 1 };
    const policy = resolveDrainPolicy(low, true);
    expect(policy.budget).toEqual(low);
  });
});

describe("gpuFlushUploadBytes", () => {
  const chunk = (cacheKey: string, byteLength: number) => ({ cacheKey, byteLength });

  it("charges only cache MISSES — a fully-cached brick costs the frame nothing", () => {
    const chunks = [chunk("a", 14_000_000), chunk("b", 14_000_000)];
    expect(gpuFlushUploadBytes(chunks, () => true)).toBe(0);
  });

  it("charges the full source-chunk bytes for misses (not the atlas slot size)", () => {
    const chunks = [chunk("a", 14_000_000), chunk("b", 2_000_000)];
    expect(gpuFlushUploadBytes(chunks, (key) => key === "b")).toBe(14_000_000);
    expect(gpuFlushUploadBytes(chunks, () => false)).toBe(16_000_000);
  });

  it("charges a chunk referenced twice within one brick only once", () => {
    const chunks = [chunk("a", 5), chunk("a", 5), chunk("b", 3)];
    expect(gpuFlushUploadBytes(chunks, () => false)).toBe(8);
  });

  it("no chunks → zero", () => {
    expect(gpuFlushUploadBytes([], () => false)).toBe(0);
  });
});

describe("resolveStreamFrameAction (streaming render-cadence gate)", () => {
  const base = {
    streaming: true,
    interacting: false,
    nowMs: 1000,
    lastInvalidateAtMs: 900,
    cadenceMs: 150,
  };

  it("coalesces within the cadence window while streaming and quiet", async () => {
    const { resolveStreamFrameAction } = await import("./uploadBudget");
    expect(resolveStreamFrameAction(base)).toBe("pump"); // 100ms < 150ms
  });

  it("invalidates once the cadence window closes", async () => {
    const { resolveStreamFrameAction } = await import("./uploadBudget");
    expect(resolveStreamFrameAction({ ...base, nowMs: 1050 })).toBe("invalidate");
    expect(resolveStreamFrameAction({ ...base, nowMs: 1051 })).toBe("invalidate");
  });

  it("the drained edge always invalidates — the settled frame must land", async () => {
    const { resolveStreamFrameAction } = await import("./uploadBudget");
    expect(resolveStreamFrameAction({ ...base, streaming: false })).toBe("invalidate");
  });

  it("interacting frames bypass the gate (camera drives frames anyway)", async () => {
    const { resolveStreamFrameAction } = await import("./uploadBudget");
    expect(resolveStreamFrameAction({ ...base, interacting: true })).toBe("invalidate");
  });

  it("at most one rendered frame per window over a simulated burst", async () => {
    const { resolveStreamFrameAction } = await import("./uploadBudget");
    // Batches land every 10ms for 600ms; cadence 150ms → ≤ ceil(600/150)+1 frames.
    let lastInvalidateAtMs = -Infinity;
    let frames = 0;
    for (let now = 0; now <= 600; now += 10) {
      const action = resolveStreamFrameAction({
        streaming: true,
        interacting: false,
        nowMs: now,
        lastInvalidateAtMs,
        cadenceMs: 150,
      });
      if (action === "invalidate") {
        frames += 1;
        lastInvalidateAtMs = now;
      }
    }
    expect(frames).toBeLessThanOrEqual(5); // 61 wakeups → ≤5 rendered frames
    expect(frames).toBeGreaterThanOrEqual(4); // still shows regular progress
  });
});

/**
 * The brick system now starts OUTSIDE the canvas, so between `manager.start()`
 * and `attachRenderer` there is a window with no drain: fetches complete and
 * pile up in `pool.queue` with nothing consuming them. This is the explicit
 * bound on that window.
 */
describe("shouldDispatchFetch", () => {
  it("never restricts dispatch once a renderer is attached", () => {
    // Attached, the drain runs every frame — the in-flight caps are the only
    // relevant limit and this predicate must stay out of the way entirely.
    expect(
      shouldDispatchFetch({ detached: false, queuedBricks: 9999, cap: 4 }),
    ).toBe(true);
  });

  it("holds the pre-attach queue at the cap", () => {
    expect(shouldDispatchFetch({ detached: true, queuedBricks: 0, cap: 4 })).toBe(true);
    expect(shouldDispatchFetch({ detached: true, queuedBricks: 3, cap: 4 })).toBe(true);
    expect(shouldDispatchFetch({ detached: true, queuedBricks: 4, cap: 4 })).toBe(false);
    expect(shouldDispatchFetch({ detached: true, queuedBricks: 5, cap: 4 })).toBe(false);
  });

  it("a zero cap stops pre-attach dispatch entirely without affecting attached pools", () => {
    expect(shouldDispatchFetch({ detached: true, queuedBricks: 0, cap: 0 })).toBe(false);
    expect(shouldDispatchFetch({ detached: false, queuedBricks: 0, cap: 0 })).toBe(true);
  });
});
