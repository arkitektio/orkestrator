import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { TIER_HIGH, TIER_LOW, TIER_MEDIUM } from "../quality/qualityGovernor";
import { VOLUME_PASS_OBJECT, collectPassSets } from "../visibility/passVisibility";
import {
  buildVolumeStructureKey,
  createCompositorStats,
  createVolumeInputsTracker,
  decideSettleRefine,
  decideVolumeFrame,
  ladderFeedforwardPassCount,
  needsTargetResize,
  resolveVolumeScale,
  resolveVolumeTargetSize,
  type SettleRefineAction,
  type VolumeFrameKey,
} from "./volumeCompositor";

const IDENTITY = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

const baseKey = (overrides: Partial<VolumeFrameKey> = {}): VolumeFrameKey => ({
  cameraElements: [...IDENTITY],
  structureKey: "1|42:m",
  residencyVersion: 3,
  poolsVersion: 1,
  qualityVersion: 7,
  trackerVersion: 5,
  targetWidth: 800,
  targetHeight: 600,
  ...overrides,
});

/**
 * `structureKey` is a thunk in the input (see `decideVolumeFrame`), so the
 * helper wraps the fixture's string and reports whether it was ever called —
 * that is the laziness the gesture path depends on.
 *
 * Returns just `{render, reason}` so the existing assertions keep reading as
 * they did; `decideResolved` below is for the cases that care about the
 * resolved key.
 */
const decideFull = (
  key: VolumeFrameKey,
  previous: VolumeFrameKey | null,
  overrides: Partial<{
    cacheEnabled: boolean;
    hasTargetContent: boolean;
    streaming: boolean;
    trackerReason: string;
  }> = {},
) => {
  let structureCalls = 0;
  const result = decideVolumeFrame({
    cacheEnabled: overrides.cacheEnabled ?? true,
    hasTargetContent: overrides.hasTargetContent ?? true,
    streaming: overrides.streaming ?? false,
    key: {
      ...key,
      structureKey: () => {
        structureCalls += 1;
        if (key.structureKey === null) throw new Error("fixture has no structure key");
        return key.structureKey;
      },
    },
    trackerReason: overrides.trackerReason ?? "test",
    previous,
  });
  return { ...result, structureCalls };
};

const decide = (
  key: VolumeFrameKey,
  previous: VolumeFrameKey | null,
  overrides: Parameters<typeof decideFull>[2] = {},
) => {
  const { render, reason } = decideFull(key, previous, overrides);
  return { render, reason };
};

describe("resolveVolumeScale", () => {
  it("is full resolution settled (the cache makes settled frames free) and half-res active", () => {
    expect(resolveVolumeScale(TIER_HIGH, false)).toBe(1);
    expect(resolveVolumeScale(TIER_MEDIUM, false)).toBe(1);
    expect(resolveVolumeScale(TIER_LOW, false)).toBe(1);
    expect(resolveVolumeScale(TIER_HIGH, true)).toBe(0.5);
    expect(resolveVolumeScale(TIER_MEDIUM, true)).toBe(0.5);
    expect(resolveVolumeScale(TIER_LOW, true)).toBe(0.5);
  });
});

describe("resolveVolumeTargetSize", () => {
  it("anchors to the settled dpr, not the live buffer", () => {
    const size = resolveVolumeTargetSize({
      cssWidth: 1000,
      cssHeight: 800,
      settledDpr: 1.5,
      bufferWidth: 1500,
      bufferHeight: 1200,
      scale: 0.5,
    });
    expect(size).toEqual({ width: 750, height: 600 });
  });

  it("clamps to the live buffer so ladder drops never double-downscale", () => {
    // Canvas mid-gesture at ladder 0.5 (dpr 0.75 of settled 1.5): the volume
    // target must not exceed the canvas' own pixels.
    const size = resolveVolumeTargetSize({
      cssWidth: 1000,
      cssHeight: 800,
      settledDpr: 1.5,
      bufferWidth: 700, // smaller than 0.75 × settled
      bufferHeight: 560,
      scale: 0.75,
    });
    expect(size).toEqual({ width: 700, height: 560 });
  });

  it("rounds and never returns less than one pixel", () => {
    const size = resolveVolumeTargetSize({
      cssWidth: 1,
      cssHeight: 1,
      settledDpr: 0.4,
      bufferWidth: 1,
      bufferHeight: 1,
      scale: 0.5,
    });
    expect(size).toEqual({ width: 1, height: 1 });
  });

  it("degrades NaN/zero inputs to a 1px-safe size instead of poisoning the target", () => {
    const size = resolveVolumeTargetSize({
      cssWidth: 1000,
      cssHeight: 800,
      settledDpr: Number.NaN,
      bufferWidth: 0,
      bufferHeight: Number.NaN,
      scale: 0.5,
    });
    expect(Number.isFinite(size.width) && size.width >= 1).toBe(true);
    expect(Number.isFinite(size.height) && size.height >= 1).toBe(true);
  });
});

describe("needsTargetResize", () => {
  it("resizes from null and on any dimension change, not on equality", () => {
    expect(needsTargetResize(null, { width: 10, height: 10 })).toBe(true);
    expect(needsTargetResize({ width: 10, height: 10 }, { width: 10, height: 10 })).toBe(false);
    expect(needsTargetResize({ width: 10, height: 10 }, { width: 11, height: 10 })).toBe(true);
    expect(needsTargetResize({ width: 10, height: 10 }, { width: 10, height: 11 })).toBe(true);
  });
});

describe("buildVolumeStructureKey", () => {
  const scene = () => {
    const root = new THREE.Scene();
    const volume = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    volume.userData[VOLUME_PASS_OBJECT] = true;
    const group = new THREE.Group();
    const occluder = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    group.add(occluder);
    root.add(volume, group);
    return { root, volume, group, occluder };
  };

  it("changes when an OCCLUDER is hidden by its group", () => {
    // The bug this closes: a mesh layer hides by flipping its group, the
    // depth prepass stops writing its depth, but the key never moved — so
    // decideVolumeFrame stayed on "cached" and the composited volume kept the
    // stale occlusion hole until the camera moved.
    const { root, group } = scene();
    const before = buildVolumeStructureKey(collectPassSets(root));
    group.visible = false;
    const after = buildVolumeStructureKey(collectPassSets(root));
    expect(after).not.toBe(before);
    group.visible = true;
    expect(buildVolumeStructureKey(collectPassSets(root))).toBe(before);
  });

  it("changes on a volume material rebuild and on a placement edit", () => {
    const { root, volume } = scene();
    const before = buildVolumeStructureKey(collectPassSets(root));
    volume.material = new THREE.MeshBasicMaterial();
    expect(buildVolumeStructureKey(collectPassSets(root))).not.toBe(before);

    const placed = buildVolumeStructureKey(collectPassSets(root));
    volume.position.set(1, 0, 0);
    volume.updateMatrixWorld(true);
    expect(buildVolumeStructureKey(collectPassSets(root))).not.toBe(placed);
  });

  it("is stable when nothing structural moved", () => {
    const { root } = scene();
    expect(buildVolumeStructureKey(collectPassSets(root))).toBe(
      buildVolumeStructureKey(collectPassSets(root)),
    );
  });
});

describe("decideVolumeFrame", () => {
  it("renders when the cache is disabled", () => {
    const key = baseKey();
    expect(decide(key, key, { cacheEnabled: false })).toEqual({
      render: true,
      reason: "cache-off",
    });
  });

  it("renders on first frame / after target loss", () => {
    const key = baseKey();
    expect(decide(key, key, { hasTargetContent: false }).reason).toBe("no-content");
    expect(decide(key, null).reason).toBe("no-previous");
  });

  it("skips when nothing changed", () => {
    expect(decide(baseKey(), baseKey())).toEqual({ render: false, reason: "cached" });
  });

  it("always renders while bricks stream, even with an unchanged key", () => {
    // residencyVersion is throttled on a separate timer from the streaming
    // invalidates — an unchanged key must not hide freshly landed bricks.
    expect(decide(baseKey(), baseKey(), { streaming: true })).toEqual({
      render: true,
      reason: "streaming",
    });
  });

  it("renders with the right reason for each changed input", () => {
    const previous = baseKey();
    const nudged = [...IDENTITY];
    nudged[12] = 0.0001; // any element, any magnitude — exact compare
    expect(decide(baseKey({ cameraElements: nudged }), previous).reason).toBe("camera");
    expect(decide(baseKey({ structureKey: "2|42:m|43:n" }), previous).reason).toBe("structure");
    expect(decide(baseKey({ residencyVersion: 4 }), previous).reason).toBe("residency");
    expect(decide(baseKey({ poolsVersion: 2 }), previous).reason).toBe("pools");
    expect(decide(baseKey({ qualityVersion: 8 }), previous).reason).toBe("quality");
    expect(
      decide(baseKey({ trackerVersion: 6 }), previous, { trackerReason: "step-uniforms" }).reason,
    ).toBe("uniforms:step-uniforms");
    expect(decide(baseKey({ targetWidth: 801 }), previous).reason).toBe("resize");
  });

  it("renders when the camera matrix is not finite", () => {
    const broken = [...IDENTITY];
    broken[0] = Number.NaN;
    expect(decide(baseKey({ cameraElements: broken }), baseKey()).reason).toBe(
      "camera-invalid",
    );
  });
});

describe("createVolumeInputsTracker", () => {
  it("bumps the version and records the reason", () => {
    const tracker = createVolumeInputsTracker();
    expect(tracker.version).toBe(0);
    expect(tracker.lastReason).toBe("init");
    tracker.bump("channel-uniforms");
    tracker.bump("step-uniforms");
    expect(tracker.version).toBe(2);
    expect(tracker.lastReason).toBe("step-uniforms");
  });
});

describe("createCompositorStats", () => {
  it("counts renders and cached composites, remembers the last render reason", () => {
    const stats = createCompositorStats();
    stats.onFrame({ render: true, reason: "camera" });
    stats.onFrame({ render: false, reason: "cached" });
    stats.onFrame({ render: false, reason: "cached" });
    stats.onFrame({ render: true, reason: "residency" });
    expect(stats.volumeRenders()).toBe(2);
    expect(stats.cachedComposites()).toBe(2);
    expect(stats.lastRenderReason()).toBe("residency");
  });
});

describe("ladderFeedforwardPassCount", () => {
  it("reports one pass to the DPR ladder while the volume target owns raymarch cost", () => {
    expect(ladderFeedforwardPassCount(true, 6)).toBe(1);
    expect(ladderFeedforwardPassCount(false, 6)).toBe(6);
  });
});

describe("decideSettleRefine (settle refinement ladder)", () => {
  const base = {
    cameraMoving: false,
    streaming: false,
    enabled: true,
    cacheEnabled: true,
    renderedThisFrame: true,
    scale: 1,
    atSettledDpr: true,
    stage: 0,
    maxStages: 2,
  };
  const decide = (overrides: Partial<typeof base> = {}): SettleRefineAction =>
    decideSettleRefine({ ...base, ...overrides });

  it("advances after a settled full-res render below the max stage", () => {
    expect(decide()).toBe("advance");
    expect(decide({ stage: 1 })).toBe("advance");
    expect(decide({ stage: 2 })).toBe("hold"); // parked at max
  });

  it("motion or streaming resets a held stage, holds at stage 0", () => {
    expect(decide({ cameraMoving: true, stage: 1 })).toBe("reset");
    expect(decide({ streaming: true, stage: 2 })).toBe("reset");
    expect(decide({ cameraMoving: true, stage: 0 })).toBe("hold");
    expect(decide({ streaming: true, stage: 0 })).toBe("hold");
  });

  it("flag-off RESETS a held stage (never freezes a boosted budget)", () => {
    expect(decide({ enabled: false, stage: 2 })).toBe("reset");
    expect(decide({ enabled: false, stage: 0 })).toBe("hold");
  });

  it("cache-off keeps the ladder dormant (every frame would re-render at 4×)", () => {
    expect(decide({ cacheEnabled: false, stage: 0 })).toBe("hold");
    expect(decide({ cacheEnabled: false, stage: 1 })).toBe("reset");
  });

  it("only a completed FULL-RES render arms an advance", () => {
    expect(decide({ renderedThisFrame: false })).toBe("hold");
    expect(decide({ scale: 0.5 })).toBe("hold");
  });

  it("waits (holds, not resets) for the DPR restore before spending boosted renders", () => {
    // Before QualityAdapter's 500 ms restore the target is clamped to the
    // reduced buffer — boosted renders there would be thrown away by the
    // restore's resize re-render.
    expect(decide({ atSettledDpr: false })).toBe("hold");
    expect(decide({ atSettledDpr: false, stage: 1 })).toBe("hold");
    // The restore's own resize render then arms the ladder.
    expect(decide({ atSettledDpr: true, stage: 1 })).toBe("advance");
  });

  it("terminates structurally: folding over frames reaches max and holds", () => {
    let stage = 0;
    const frames = [
      { cameraMoving: false }, // settle frame → advance to 1
      { cameraMoving: false }, // stage-1 render → advance to 2
      { cameraMoving: false }, // stage-2 render → hold
      { cameraMoving: false }, // stays held
    ];
    const trace: SettleRefineAction[] = [];
    for (const frame of frames) {
      const action = decide({ ...frame, stage });
      trace.push(action);
      if (action === "advance") stage = Math.min(stage + 1, base.maxStages);
      if (action === "reset") stage = 0;
    }
    expect(trace).toEqual(["advance", "advance", "hold", "hold"]);
    expect(stage).toBe(2);
    // A mid-ladder motion frame resets to 0 and the ladder restarts.
    expect(decide({ cameraMoving: true, stage })).toBe("reset");
    stage = 0;
    expect(decide({ stage })).toBe("advance");
  });
});

/**
 * The structure key walks every volume mesh and stringifies its world matrix.
 * During a gesture the camera compare above it fails on essentially every
 * frame, so building it eagerly was ~60 wasted string builds per second.
 * `decideVolumeFrame` resolves it lazily; these pin that the shortcut can only
 * ever cost an extra render, never a missed one.
 */
describe("decideVolumeFrame — lazy structure key", () => {
  it("does NOT build the structure key when the camera moved", () => {
    const moved = baseKey({ cameraElements: [...IDENTITY.slice(0, 12), 9, 9, 9, 1] });
    const result = decideFull(moved, baseKey());

    expect(result.reason).toBe("camera");
    expect(result.structureCalls).toBe(0);
    // Not computed ⇒ not remembered.
    expect(result.resolved.structureKey).toBeNull();
  });

  it("skips it for every check that short-circuits earlier", () => {
    expect(decideFull(baseKey(), null).structureCalls).toBe(0);
    expect(decideFull(baseKey(), baseKey(), { streaming: true }).structureCalls).toBe(0);
    expect(decideFull(baseKey(), baseKey(), { cacheEnabled: false }).structureCalls).toBe(0);
    expect(decideFull(baseKey(), baseKey(), { hasTargetContent: false }).structureCalls).toBe(0);
    expect(decideFull(baseKey({ targetWidth: 801 }), baseKey()).structureCalls).toBe(0);
  });

  it("builds it exactly once when the cheap checks all pass", () => {
    const result = decideFull(baseKey(), baseKey());
    expect(result.reason).toBe("cached");
    expect(result.structureCalls).toBe(1);
    expect(result.resolved.structureKey).toBe("1|42:m");
  });

  it("treats an UNRESOLVED previous key as changed — the safe direction", () => {
    // The frame before was a gesture frame that skipped the computation. We
    // cannot know whether the structure moved, so we must render.
    const result = decideFull(baseKey(), baseKey({ structureKey: null }));
    expect(result).toMatchObject({ render: true, reason: "structure" });
    // ...and it resolves the key this time, so the NEXT frame can cache again.
    expect(result.resolved.structureKey).toBe("1|42:m");
  });

  it("a settled frame after a gesture re-establishes the cache in two frames", () => {
    // Frame 1: mid-gesture — the camera differs from the frame before it, so
    // the decision short-circuits at "camera" and never builds a structure key.
    const moved = baseKey({ cameraElements: [...IDENTITY.slice(0, 12), 9, 9, 9, 1] });
    const gesture = decideFull(moved, baseKey());
    expect(gesture.reason).toBe("camera");
    expect(gesture.resolved.structureKey).toBeNull();

    // Frame 2: the gesture ended, so the camera now matches frame 1 — but
    // frame 1 left structureKey null, so this frame must render, not cache.
    const settling = decideFull(moved, gesture.resolved);
    expect(settling).toMatchObject({ render: true, reason: "structure" });
    // Frame 3: both sides now carry a resolved key, so the cache is back —
    // one extra render is the entire cost of the shortcut.
    expect(decideFull(moved, settling.resolved)).toMatchObject({
      render: false,
      reason: "cached",
    });
  });
});
