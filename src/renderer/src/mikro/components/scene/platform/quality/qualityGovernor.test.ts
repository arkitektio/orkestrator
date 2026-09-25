import { describe, expect, it } from "vitest";
import {
  ACTIVE_DPR_LADDER,
  predictBurstLadderScale,
  QualityGovernor,
  QUALITY_PROFILES,
  resolveActiveLadderScale,
  resolveDpr,
  STANDARD_QUALITY_PROFILES,
  standardizeProfile,
  TIER_HIGH,
  TIER_LOW,
  TIER_MEDIUM,
  type QualityStorage,
  CANVAS_PASS_ACTIVE_STEP_SCALE,
  resolveStepScale,
} from "./qualityGovernor";

const fakeStorage = (): QualityStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

/** Feed `count` frames of `deltaMs`, advancing a fake clock. */
const feed = (
  governor: QualityGovernor,
  deltaMs: number,
  count: number,
  startMs: number,
): number => {
  let now = startMs;
  for (let i = 0; i < count; i++) {
    now += deltaMs;
    governor.recordFrame(deltaMs, now);
  }
  return now;
};

describe("QualityGovernor tier learning", () => {
  it("demotes after sustained slow frames, not from a single spike", () => {
    const g = new QualityGovernor();
    g.recordFrame(200, 0); // one spike (still < idle-gap cutoff)
    expect(g.getTier()).toBe(TIER_HIGH);

    // 18 sustained 40 ms frames: crosses the 15-slow-frame demote threshold
    // exactly once (continued slowness would keep demoting — see next test).
    feed(g, 40, 18, 1000);
    expect(g.getTier()).toBe(TIER_MEDIUM);
  });

  it("keeps demoting to LOW under continued slowness", () => {
    const g = new QualityGovernor();
    feed(g, 40, 200, 0);
    expect(g.getTier()).toBe(TIER_LOW);
  });

  it("ignores idle gaps (demand frameloop) entirely", () => {
    const g = new QualityGovernor();
    feed(g, 1000, 100, 0); // 1 s gaps between demand frames
    expect(g.getTier()).toBe(TIER_HIGH);
    expect(g.getEmaMs()).toBe(0);
  });

  it("counts long ACTIVE frames as weighted slow votes", () => {
    const g = new QualityGovernor();
    // A single 443 ms spike mid-gesture must not demote on its own.
    g.recordFrame(443, 0, true);
    expect(g.getTier()).toBe(TIER_HIGH);

    // But a run of ≥250 ms active frames demotes without needing 15 distinct
    // frames (5 votes each → 3 frames cross the threshold).
    g.recordFrame(400, 500, true);
    g.recordFrame(400, 1000, true);
    expect(g.getTier()).toBe(TIER_MEDIUM);
    expect(g.getEmaMs()).toBeGreaterThan(0);
  });

  it("still ignores long frames while INACTIVE", () => {
    const g = new QualityGovernor();
    for (let i = 0; i < 100; i++) g.recordFrame(400, i * 400, false);
    expect(g.getTier()).toBe(TIER_HIGH);
    expect(g.getEmaMs()).toBe(0);
  });

  it("promotes only after sustained fast frames AND the post-demote cooldown", () => {
    const g = new QualityGovernor();
    const afterDemote = feed(g, 40, 18, 0);
    expect(g.getTier()).toBe(TIER_MEDIUM);

    // Fast frames immediately after the demote: cooldown blocks promotion.
    const afterFast = feed(g, 8, 200, afterDemote);
    expect(g.getTier()).toBe(TIER_MEDIUM);

    // Past the cooldown, sustained fast frames promote.
    feed(g, 8, 200, afterFast + 31_000);
    expect(g.getTier()).toBe(TIER_HIGH);
  });

  it("manual override wins over the learned tier and persists", () => {
    const storage = fakeStorage();
    const g = new QualityGovernor();
    g.configurePersistence(storage, "gpu-x");
    g.setOverride(TIER_LOW);
    feed(g, 8, 500, 40_000); // fast frames must not change the effective tier
    expect(g.getTier()).toBe(TIER_LOW);

    const g2 = new QualityGovernor();
    g2.configurePersistence(storage, "gpu-x");
    expect(g2.getOverride()).toBe(TIER_LOW);
  });

  it("persists the learned tier per GPU key and reloads it", () => {
    const storage = fakeStorage();
    const g = new QualityGovernor();
    g.configurePersistence(storage, "apple-m2");
    feed(g, 40, 18, 0);
    expect(g.getAutoTier()).toBe(TIER_MEDIUM);

    const next = new QualityGovernor();
    next.configurePersistence(storage, "apple-m2");
    expect(next.getAutoTier()).toBe(TIER_MEDIUM);

    const other = new QualityGovernor();
    other.configurePersistence(storage, "some-dgpu");
    expect(other.getAutoTier()).toBe(TIER_HIGH);
  });

  it("notifies subscribers on tier and streaming flips only", () => {
    const g = new QualityGovernor();
    let notifications = 0;
    g.subscribe(() => notifications++);

    g.setStreaming(true);
    g.setStreaming(true); // no-op
    expect(notifications).toBe(1);

    feed(g, 40, 18, 0); // one demote
    expect(notifications).toBe(2);

    feed(g, 16, 50, 10_000); // mid-band frames: no notifications
    expect(notifications).toBe(2);
  });
});

describe("resolveDpr", () => {
  it("HIGH never regresses", () => {
    expect(resolveDpr(QUALITY_PROFILES[TIER_HIGH], 2, true)).toBe(2);
    expect(resolveDpr(QUALITY_PROFILES[TIER_HIGH], 2, false)).toBe(2);
  });

  it("MEDIUM halves active frames, keeps settled crisp", () => {
    expect(resolveDpr(QUALITY_PROFILES[TIER_MEDIUM], 2, true)).toBe(1);
    expect(resolveDpr(QUALITY_PROFILES[TIER_MEDIUM], 2, false)).toBe(2);
  });

  it("LOW caps active at 1 and settled at 1.5, never below 1", () => {
    expect(resolveDpr(QUALITY_PROFILES[TIER_LOW], 2, true)).toBe(1);
    expect(resolveDpr(QUALITY_PROFILES[TIER_LOW], 2, false)).toBe(1.5);
    expect(resolveDpr(QUALITY_PROFILES[TIER_LOW], 1, false)).toBe(1);
    expect(resolveDpr(QUALITY_PROFILES[TIER_LOW], 1, true)).toBe(1);
  });
});

describe("fidelity mode", () => {
  it("standardizeProfile applies the Moderate settled caps only", () => {
    const standard = standardizeProfile(QUALITY_PROFILES[TIER_HIGH]);
    expect(standard.settledDprCap).toBe(1.5);
    expect(standard.settledStepScale).toBe(1.25);
    expect(standard.maxRaySteps).toBe(384);
    // Active-path knobs are untouched — fidelity shapes only the settled image.
    expect(standard.activeDprScale).toBe(QUALITY_PROFILES[TIER_HIGH].activeDprScale);
    expect(standard.activeStepScale).toBe(QUALITY_PROFILES[TIER_HIGH].activeStepScale);
    expect(standard.uploadBudgetMs).toBe(QUALITY_PROFILES[TIER_HIGH].uploadBudgetMs);
    expect(standard.maxInflightBricks).toBe(QUALITY_PROFILES[TIER_HIGH].maxInflightBricks);
  });

  it("TIER_LOW is already at or below every cap and comes back unchanged", () => {
    const low = QUALITY_PROFILES[TIER_LOW];
    const standard = standardizeProfile(low);
    expect(standard.settledDprCap).toBe(low.settledDprCap);
    expect(standard.settledStepScale).toBe(low.settledStepScale);
    expect(standard.maxRaySteps).toBe(low.maxRaySteps);
  });

  it("defaults to standard fidelity (no storage) and serves the standardized table", () => {
    const g = new QualityGovernor();
    expect(g.getFidelity()).toBe("standard");
    expect(g.getProfile()).toBe(STANDARD_QUALITY_PROFILES[TIER_HIGH]);
  });

  it("high fidelity restores the exact full-quality table", () => {
    const g = new QualityGovernor();
    g.setFidelity("high");
    expect(g.getProfile()).toBe(QUALITY_PROFILES[TIER_HIGH]);
  });

  it("notifies subscribers on change, not on a same-value set", () => {
    const g = new QualityGovernor();
    let notifications = 0;
    g.subscribe(() => notifications++);
    g.setFidelity("standard"); // already standard
    expect(notifications).toBe(0);
    g.setFidelity("high");
    expect(notifications).toBe(1);
  });

  it("the settled DPR cap flows through resolveDpr", () => {
    expect(resolveDpr(STANDARD_QUALITY_PROFILES[TIER_HIGH], 2, false)).toBe(1.5);
    // Active frames are governed by the ladder, not by fidelity.
    expect(resolveDpr(STANDARD_QUALITY_PROFILES[TIER_HIGH], 2, true)).toBe(2);
  });
});

describe("interaction DPR ladder", () => {
  it("selects quantized rungs from the frame-time EMA", () => {
    expect(resolveActiveLadderScale(0)).toBe(1);
    expect(resolveActiveLadderScale(12)).toBe(1);
    expect(resolveActiveLadderScale(12.1)).toBe(0.75);
    expect(resolveActiveLadderScale(20)).toBe(0.75);
    expect(resolveActiveLadderScale(20.1)).toBe(0.5);
    expect(resolveActiveLadderScale(1000)).toBe(0.5);
  });

  it("only ever returns a ladder rung (quantized, no continuous drift)", () => {
    for (let ema = 0; ema <= 60; ema += 0.7) {
      expect(ACTIVE_DPR_LADDER).toContain(resolveActiveLadderScale(ema));
    }
  });

  it("HIGH now participates while active: a slow EMA drops the resolution", () => {
    const high = QUALITY_PROFILES[TIER_HIGH];
    expect(resolveDpr(high, 2, true, resolveActiveLadderScale(25))).toBe(1);
    expect(resolveDpr(high, 2, true, resolveActiveLadderScale(15))).toBe(1.5);
    // Settled frames are untouched by the ladder.
    expect(resolveDpr(high, 2, false, resolveActiveLadderScale(25))).toBe(2);
  });

  it("rung 1 reproduces the pre-ladder behavior exactly", () => {
    for (const tier of [TIER_HIGH, TIER_MEDIUM, TIER_LOW] as const) {
      for (const initialDpr of [1, 1.5, 2]) {
        for (const active of [true, false]) {
          expect(resolveDpr(QUALITY_PROFILES[tier], initialDpr, active, 1)).toBe(
            resolveDpr(QUALITY_PROFILES[tier], initialDpr, active),
          );
        }
      }
    }
  });

  it("never drops below 1 device pixel whatever the rung", () => {
    for (const tier of [TIER_HIGH, TIER_MEDIUM, TIER_LOW] as const) {
      expect(
        resolveDpr(QUALITY_PROFILES[tier], 1, true, 0.5),
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("predictBurstLadderScale normalizes the EMA by the previous burst's rung²", () => {
    // 8 ms measured at rung 0.5 ≈ 32 ms at full resolution → stay at 0.5, no
    // cross-burst oscillation back to 1.
    expect(predictBurstLadderScale(8, 0.5)).toBe(0.5);
    // 8 ms at rung 0.75 ≈ 14.2 ms full-res → one rung of recovery.
    expect(predictBurstLadderScale(8, 0.75)).toBe(0.75);
    // Genuinely fast even normalized → climbs back to full resolution.
    expect(predictBurstLadderScale(2, 0.5)).toBe(1);
    expect(predictBurstLadderScale(6, 0.75)).toBe(1);
  });

  it("predictBurstLadderScale at rung 1 is the plain ladder", () => {
    for (const ema of [0, 10, 15, 25, 60]) {
      expect(predictBurstLadderScale(ema, 1)).toBe(resolveActiveLadderScale(ema));
    }
  });

  it("predictBurstLadderScale tolerates degenerate previous rungs", () => {
    expect(predictBurstLadderScale(10, 0)).toBe(resolveActiveLadderScale(10));
    expect(predictBurstLadderScale(10, Number.NaN)).toBe(resolveActiveLadderScale(10));
    // A rung above 1 never existed; clamp rather than divide the EMA up.
    expect(predictBurstLadderScale(10, 2)).toBe(resolveActiveLadderScale(10));
  });

  it("predictBurstLadderScale only ever returns a ladder rung", () => {
    for (const ema of [0, 7, 13, 21, 55]) {
      for (const prev of [1, 0.75, 0.5]) {
        expect(ACTIVE_DPR_LADDER).toContain(predictBurstLadderScale(ema, prev));
      }
    }
  });
});

describe("scene-load feedforward", () => {
  it("volumeLoadFactor grows ~√N and caps at 2", async () => {
    const { volumeLoadFactor } = await import("./qualityGovernor");
    expect(volumeLoadFactor(0)).toBe(1);
    expect(volumeLoadFactor(1)).toBe(1);
    expect(volumeLoadFactor(2)).toBeCloseTo(Math.SQRT2, 6);
    expect(volumeLoadFactor(4)).toBe(2);
    expect(volumeLoadFactor(16)).toBe(2); // capped
  });

  it("registerVolumePass counts mounts and disposers are idempotent", async () => {
    const { QualityGovernor } = await import("./qualityGovernor");
    const governor = new QualityGovernor();
    const a = governor.registerVolumePass();
    const b = governor.registerVolumePass();
    expect(governor.getVolumePassCount()).toBe(2);
    a();
    a(); // double-dispose must not double-decrement
    expect(governor.getVolumePassCount()).toBe(1);
    b();
    expect(governor.getVolumePassCount()).toBe(0);
  });

  it("≥3 volume passes floor the burst-entry rung at 0.75", async () => {
    const { predictBurstLadderScale } = await import("./qualityGovernor");
    // A fast (stale) EMA alone predicts full resolution…
    expect(predictBurstLadderScale(8, 1, 1)).toBe(1);
    expect(predictBurstLadderScale(8, 1, 2)).toBe(1);
    // …but the pass-count feedforward caps the entry rung on heavy scenes.
    expect(predictBurstLadderScale(8, 1, 3)).toBe(0.75);
    // A slow EMA can still predict lower than the cap.
    expect(predictBurstLadderScale(40, 1, 3)).toBe(0.5);
  });
});

describe("mid-burst rung correction", () => {
  it("steps down only above the floor and only when frames are still slow", async () => {
    const { shouldStepBurstRungDown } = await import("./qualityGovernor");
    expect(shouldStepBurstRungDown(30, 1)).toBe(true);
    expect(shouldStepBurstRungDown(30, 0.75)).toBe(true);
    expect(shouldStepBurstRungDown(30, 0.5)).toBe(false); // already at the floor
    expect(shouldStepBurstRungDown(15, 1)).toBe(false); // holding rate
  });

  it("nextLadderRungDown walks the ladder and clamps at the floor", async () => {
    const { nextLadderRungDown } = await import("./qualityGovernor");
    expect(nextLadderRungDown(1)).toBe(0.75);
    expect(nextLadderRungDown(0.75)).toBe(0.5);
    expect(nextLadderRungDown(0.5)).toBe(0.5);
  });
});

describe("resolveSmoothThreshold", () => {
  it("disables tricubic while active and on TIER_LOW, restores settled", async () => {
    const { resolveSmoothThreshold, SMOOTH_ZOOM_THRESHOLD_PX, TIER_HIGH, TIER_MEDIUM, TIER_LOW } =
      await import("./qualityGovernor");
    expect(resolveSmoothThreshold(TIER_HIGH, false)).toBe(SMOOTH_ZOOM_THRESHOLD_PX);
    expect(resolveSmoothThreshold(TIER_MEDIUM, false)).toBe(SMOOTH_ZOOM_THRESHOLD_PX);
    expect(resolveSmoothThreshold(TIER_HIGH, true)).toBe(0);
    expect(resolveSmoothThreshold(TIER_LOW, false)).toBe(0);
    expect(resolveSmoothThreshold(TIER_LOW, true)).toBe(0);
  });

  it("is off in SCIENTIFIC mode on every tier", async () => {
    const { resolveSmoothThreshold, SMOOTH_ZOOM_THRESHOLD_PX, TIER_HIGH, TIER_MEDIUM } =
      await import("./qualityGovernor");
    // The tricubic is a display-space reconstruction filter, so it is the
    // preset's to own — unlike clim or gamma. Measurements are unaffected
    // either way (CPU probes read RAW voxel values).
    expect(resolveSmoothThreshold(TIER_HIGH, false, false)).toBe(0);
    expect(resolveSmoothThreshold(TIER_MEDIUM, false, false)).toBe(0);
    expect(resolveSmoothThreshold(TIER_HIGH, true, false)).toBe(0);
    // CINEMATIC restores the tier/activity gate unchanged.
    expect(resolveSmoothThreshold(TIER_HIGH, false, true)).toBe(SMOOTH_ZOOM_THRESHOLD_PX);
    // Omitting the argument must keep the pre-preset behaviour.
    expect(resolveSmoothThreshold(TIER_HIGH, false)).toBe(SMOOTH_ZOOM_THRESHOLD_PX);
  });
});

describe("resolveMaxRaySteps (adaptive depth)", () => {
  it("keeps the tier's full ceiling while settled", async () => {
    const { resolveMaxRaySteps, QUALITY_PROFILES, TIER_HIGH } = await import("./qualityGovernor");
    expect(resolveMaxRaySteps(QUALITY_PROFILES[TIER_HIGH], false, 6)).toBe(512);
  });

  it("halves the ceiling while active and divides by the load factor", async () => {
    const { resolveMaxRaySteps, QUALITY_PROFILES, TIER_HIGH } = await import("./qualityGovernor");
    const profile = QUALITY_PROFILES[TIER_HIGH]; // 512 steps
    expect(resolveMaxRaySteps(profile, true, 1)).toBe(256);
    expect(resolveMaxRaySteps(profile, true, 4)).toBe(128); // load factor 2
  });

  it("never falls below the active floor", async () => {
    const { resolveMaxRaySteps, MIN_ACTIVE_RAY_STEPS, QUALITY_PROFILES, TIER_LOW } =
      await import("./qualityGovernor");
    // LOW: 256 steps; halved + load 2 → 64 < floor 96.
    expect(resolveMaxRaySteps(QUALITY_PROFILES[TIER_LOW], true, 16)).toBe(MIN_ACTIVE_RAY_STEPS);
  });
});

describe("resolveMaxRaySteps (settle refinement ladder)", () => {
  it("doubles the SETTLED ceiling per stage, clamped at the compile ceiling", async () => {
    const {
      resolveMaxRaySteps,
      MAX_RAY_STEPS_CEILING,
      QUALITY_PROFILES,
      STANDARD_QUALITY_PROFILES,
      TIER_HIGH,
      TIER_LOW,
    } = await import("./qualityGovernor");
    const high = QUALITY_PROFILES[TIER_HIGH]; // 512
    expect(resolveMaxRaySteps(high, false, 1, 1)).toBe(1024);
    expect(resolveMaxRaySteps(high, false, 1, 2)).toBe(2048);
    expect(resolveMaxRaySteps(high, false, 1, 3)).toBe(MAX_RAY_STEPS_CEILING); // clamp
    const standardHigh = STANDARD_QUALITY_PROFILES[TIER_HIGH]; // capped 384
    expect(resolveMaxRaySteps(standardHigh, false, 1, 1)).toBe(768);
    expect(resolveMaxRaySteps(standardHigh, false, 1, 2)).toBe(1536);
    const low = QUALITY_PROFILES[TIER_LOW]; // 256
    expect(resolveMaxRaySteps(low, false, 1, 2)).toBe(1024);
  });

  it("stage 0 / omitted argument reproduces today's values exactly", async () => {
    const { resolveMaxRaySteps, QUALITY_PROFILES, TIER_HIGH } = await import("./qualityGovernor");
    const profile = QUALITY_PROFILES[TIER_HIGH];
    expect(resolveMaxRaySteps(profile, false, 6)).toBe(512);
    expect(resolveMaxRaySteps(profile, false, 6, 0)).toBe(512);
    expect(resolveMaxRaySteps(profile, false, 1, -1)).toBe(512); // negative clamps
  });

  it("the ACTIVE branch ignores the stage — a resumed gesture pays the normal budget", async () => {
    const { resolveMaxRaySteps, QUALITY_PROFILES, TIER_HIGH, MIN_ACTIVE_RAY_STEPS, TIER_LOW } =
      await import("./qualityGovernor");
    const profile = QUALITY_PROFILES[TIER_HIGH];
    expect(resolveMaxRaySteps(profile, true, 1, 2)).toBe(resolveMaxRaySteps(profile, true, 1));
    expect(resolveMaxRaySteps(QUALITY_PROFILES[TIER_LOW], true, 16, 2)).toBe(
      MIN_ACTIVE_RAY_STEPS,
    );
  });

  it("the governor stage knob clamps, dedupes and emits once per change", async () => {
    const { QualityGovernor, MAX_SETTLE_REFINE_STAGES } = await import("./qualityGovernor");
    const governor = new QualityGovernor();
    let emits = 0;
    governor.subscribe(() => {
      emits += 1;
    });
    expect(governor.getSettleRefineStage()).toBe(0);
    governor.setSettleRefineStage(1);
    expect(governor.getSettleRefineStage()).toBe(1);
    expect(emits).toBe(1);
    governor.setSettleRefineStage(1); // idempotent: no emit
    expect(emits).toBe(1);
    governor.setSettleRefineStage(99);
    expect(governor.getSettleRefineStage()).toBe(MAX_SETTLE_REFINE_STAGES);
    governor.setSettleRefineStage(-5);
    expect(governor.getSettleRefineStage()).toBe(0);
    expect(emits).toBe(3);
  });
});

describe("resolveStepScale (canvas-pass compensation)", () => {
  it("is the identity for target-rendered materials in every state", () => {
    // Image volumes ride the compositor's 0.5× target during motion; touching
    // their stride as well would double-charge them for the same gesture.
    expect(resolveStepScale({ base: 2, active: true, canvasPass: false })).toBe(2);
    expect(resolveStepScale({ base: 1, active: false, canvasPass: false })).toBe(1);
  });

  it("is the identity for canvas-pass materials once settled", () => {
    // The asymmetry it compensates for only exists while the target is reduced.
    expect(resolveStepScale({ base: 1, active: false, canvasPass: true })).toBe(1);
  });

  it("lengthens the stride only for canvas-pass materials in motion", () => {
    expect(resolveStepScale({ base: 2, active: true, canvasPass: true })).toBe(
      2 * CANVAS_PASS_ACTIVE_STEP_SCALE,
    );
  });

  it("stays well below the resolution cut it compensates for", () => {
    // The target drops to a QUARTER of the fragments; matching that with stride
    // would step over thin masks, which is a correctness artifact, not blur.
    expect(CANVAS_PASS_ACTIVE_STEP_SCALE).toBeGreaterThan(1);
    expect(CANVAS_PASS_ACTIVE_STEP_SCALE).toBeLessThan(4);
  });
});
