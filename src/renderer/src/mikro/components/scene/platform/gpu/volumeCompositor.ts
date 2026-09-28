import type * as THREE from "three";

import type { QualityTier } from "../quality/qualityGovernor";
import type { PassSets } from "../visibility/passVisibility";

/**
 * Pure core of the volume compositor (R2 reduced-resolution volume target +
 * R1 cached volume compositing) — every decision the impure shell
 * (`features/volume/VolumeCompositor.tsx`) makes per frame lives here so it can be
 * vitest-covered; the shell only executes renders. See OCTREE_RENDERER.md §7.
 */

// ---------------------------------------------------------------------------
// Volume-inputs tracker (registered in viewerStore, NON-reactive)
// ---------------------------------------------------------------------------

/** Mutable bump counter for volume-image-changing edges that no store
 * counter covers (uniform writes). Components bump it alongside their
 * existing `invalidate()`; the compositor reads it imperatively per frame. */
export type VolumeInputsTracker = {
  version: number;
  lastReason: string;
  bump: (reason: string) => void;
};

export const createVolumeInputsTracker = (): VolumeInputsTracker => {
  const tracker: VolumeInputsTracker = {
    version: 0,
    lastReason: "init",
    bump: (reason: string) => {
      tracker.version += 1;
      tracker.lastReason = reason;
    },
  };
  return tracker;
};

// ---------------------------------------------------------------------------
// Structure key
// ---------------------------------------------------------------------------

/**
 * Count + material ids + world matrices, over BOTH pass sets that reach the
 * offscreen target: the tagged volume meshes AND the OCCLUDERS whose depth the
 * prepass writes into it. Catches structural changes (mount/unmount, material
 * rebuild, affine edit) that no version counter covers.
 *
 * Occluders are in the key because they are in the render. Keying only the
 * volume meshes meant hiding or showing a mesh layer left `decideVolumeFrame`
 * on "cached", so the old occlusion hole survived in the composited volume
 * until the camera moved — the "I have to pan for it to update" bug.
 * `collectPassSets` prunes invisible subtrees, so a hidden layer genuinely
 * leaves this set.
 */
export function buildVolumeStructureKey(sets: PassSets): string {
  let key = `${sets.volumeMeshes.length}/${sets.occluders.length}`;
  for (let i = 0; i < sets.volumeMeshes.length; i++) key += objectKey(sets.volumeMeshes[i]);
  for (let i = 0; i < sets.occluders.length; i++) key += objectKey(sets.occluders[i]);
  return key;
}

const objectKey = (object: THREE.Object3D): string => {
  const material = (object as THREE.Mesh).material as
    | THREE.Material
    | THREE.Material[]
    | undefined;
  const id = Array.isArray(material) ? material.map((m) => m.id).join("+") : material?.id;
  return `|${id}:${object.matrixWorld.elements.join(",")}`;
};

// ---------------------------------------------------------------------------
// Target sizing
// ---------------------------------------------------------------------------

/**
 * Resolution scale of the volume target relative to the SETTLED drawing
 * buffer.
 *
 * SETTLED IS FULL RESOLUTION on every tier: under the demand frame loop plus
 * the R1 cache, a settled frame raymarches ONCE and is then composited from
 * cache for free — a permanently reduced settled resolution would trade away
 * fidelity for savings that the cache already provides. The reduction
 * applies only during CAMERA MOTION, where half-res raymarch (quarter the
 * fragments) is the win and softness is masked by the motion itself; the
 * settle edge flips back and renders one crisp frame (the QualityAdapter
 * restore philosophy).
 *
 * `active` here means camera motion ONLY — deliberately NOT
 * `qualityGovernor.isStreaming()`: slow-network sessions stream for many
 * seconds after a gesture, and pinning the target at half-res for that whole
 * window hides exactly the progressive LOD sharpening streaming exists to
 * show. Streaming frames arrive at the residency cadence (~300 ms), so
 * full-res raymarch there costs what the pre-compositor renderer always
 * paid.
 */
export function resolveVolumeScale(_tier: QualityTier, cameraMoving: boolean): number {
  return cameraMoving ? 0.5 : 1;
}

export type VolumeTargetSize = { width: number; height: number };

/**
 * Target size = scale × css size × SETTLED dpr, clamped component-wise to
 * the live drawing buffer. Anchoring to the settled DPR keeps the target
 * stable across the active-DPR ladder's canvas reallocations; the clamp
 * makes double-downscaling structurally impossible (when the canvas itself
 * drops to ladder 0.5 the volume target never exceeds it).
 */
export function resolveVolumeTargetSize(input: {
  cssWidth: number;
  cssHeight: number;
  settledDpr: number;
  bufferWidth: number;
  bufferHeight: number;
  scale: number;
}): VolumeTargetSize {
  // A NaN/zero input (a store not yet populated on the first frame) must
  // never poison the render target's allocation — degrade to 1px and let the
  // next frame resize.
  const finite = (value: number): number =>
    Number.isFinite(value) && value > 0 ? value : 1;
  const dpr = finite(input.settledDpr);
  const scale = finite(input.scale);
  const width = Math.round(finite(input.cssWidth) * dpr * scale);
  const height = Math.round(finite(input.cssHeight) * dpr * scale);
  return {
    width: Math.max(1, Math.min(width, Math.max(1, Math.floor(finite(input.bufferWidth))))),
    height: Math.max(1, Math.min(height, Math.max(1, Math.floor(finite(input.bufferHeight))))),
  };
}

export function needsTargetResize(
  current: VolumeTargetSize | null,
  next: VolumeTargetSize,
): boolean {
  return current === null || current.width !== next.width || current.height !== next.height;
}

/**
 * The DPR burst ladder's volume-pass feedforward (`predictBurstLadderScale`'s
 * ≥3-pass floor) exists purely for canvas-resolution raymarch fill cost. With
 * the volume target on, that cost lives in the low-res target instead — the
 * canvas ladder must not ALSO drop for it, so the feedforward sees one pass.
 */
export function ladderFeedforwardPassCount(
  volumeTargetEnabled: boolean,
  volumePassCount: number,
): number {
  return volumeTargetEnabled ? 1 : volumePassCount;
}

// ---------------------------------------------------------------------------
// Frame decision (R1)
// ---------------------------------------------------------------------------

/** Snapshot of every volume-image input the compositor can compare cheaply.
 * `cameraElements` are the 16 elements of projection × matrixWorldInverse
 * computed by the compositor itself (frame-accurate — viewStore's camera is
 * throttled and MUST NOT be used here); `structureKey` is
 * `buildVolumeStructureKey` over the pass sets collected during the visibility
 * traversal — tagged volume meshes AND depth-prepass occluders. */
export type VolumeFrameKey = {
  cameraElements: readonly number[];
  /**
   * Null = "not computed this frame".
   *
   * Building it walks every volume mesh and stringifies its world matrix, and
   * during a gesture the camera compare above it fails on essentially every
   * frame — so the string was built and thrown away ~60×/s. `decideVolumeFrame`
   * now resolves it lazily, leaving this null when it never got that far.
   *
   * Null is treated as CHANGED on both sides of the compare, so a skipped
   * computation can only ever cause an extra render, never a missed one —
   * the "any doubt → render" rule the whole cache is built on.
   */
  structureKey: string | null;
  residencyVersion: number;
  poolsVersion: number;
  qualityVersion: number;
  trackerVersion: number;
  targetWidth: number;
  targetHeight: number;
};

export type VolumeFrameDecision = { render: boolean; reason: string };

const sameElements = (a: readonly number[], b: readonly number[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/**
 * Decide whether this frame re-renders the volume target. Exact compares,
 * threshold zero: a rare false-positive re-render costs one volume pass,
 * a false negative shows a stale image — correctness over savings, so every
 * doubtful input (cache off, no content yet, resize) forces a render.
 */
export function decideVolumeFrame(input: {
  cacheEnabled: boolean;
  hasTargetContent: boolean;
  /** `qualityGovernor.isStreaming()` — while bricks stream, EVERY invalidated
   * frame re-renders the volume. The streaming invalidates are already
   * coalesced upstream (`resolveStreamFrameAction`), and `residencyVersion`
   * is throttled on a SEPARATE timer, so keying on the version alone lets a
   * streamed frame arrive with an unchanged version and show stale bricks. */
  streaming: boolean;
  /** `structureKey` is a THUNK: only called if the cheaper checks all pass. */
  key: Omit<VolumeFrameKey, "structureKey"> & { structureKey: () => string };
  trackerReason: string;
  previous: VolumeFrameKey | null;
}): VolumeFrameDecision & {
  /** The key to remember for the next frame, with `structureKey` resolved iff
   * the decision actually needed it. */
  resolved: VolumeFrameKey;
} {
  const { cacheEnabled, hasTargetContent, streaming, key, trackerReason, previous } = input;
  // ONE object per frame (it becomes next frame's `previous`); the thunk
  // result lands in it lazily. `cameraElements` is kept by reference — the
  // caller owns that buffer and must not overwrite it while it is `previous`.
  const resolved: VolumeFrameKey = {
    cameraElements: key.cameraElements,
    structureKey: null,
    residencyVersion: key.residencyVersion,
    poolsVersion: key.poolsVersion,
    qualityVersion: key.qualityVersion,
    trackerVersion: key.trackerVersion,
    targetWidth: key.targetWidth,
    targetHeight: key.targetHeight,
  };
  const resolve = (): string => (resolved.structureKey ??= key.structureKey());
  const out = (decision: VolumeFrameDecision) => ({
    render: decision.render,
    reason: decision.reason,
    resolved,
  });
  if (!cacheEnabled) return out({ render: true, reason: "cache-off" });
  if (!hasTargetContent) return out({ render: true, reason: "no-content" });
  if (previous === null) return out({ render: true, reason: "no-previous" });
  if (streaming) return out({ render: true, reason: "streaming" });
  if (key.targetWidth !== previous.targetWidth || key.targetHeight !== previous.targetHeight)
    return out({ render: true, reason: "resize" });
  if (!key.cameraElements.every(Number.isFinite))
    return out({ render: true, reason: "camera-invalid" });
  if (!sameElements(key.cameraElements, previous.cameraElements))
    return out({ render: true, reason: "camera" });
  // Everything below here needs the structure key. Resolve BEFORE comparing:
  // `||` short-circuits, so testing `previous.structureKey === null` first left
  // this frame's key unresolved too — and the next frame would then see null
  // again and re-render, forever. The cache would never re-establish after a
  // single gesture frame.
  const currentStructure = resolve();
  // A previous frame that skipped the computation counts as changed.
  if (previous.structureKey === null || currentStructure !== previous.structureKey)
    return out({ render: true, reason: "structure" });
  if (key.residencyVersion !== previous.residencyVersion)
    return out({ render: true, reason: "residency" });
  if (key.poolsVersion !== previous.poolsVersion) return out({ render: true, reason: "pools" });
  if (key.qualityVersion !== previous.qualityVersion)
    return out({ render: true, reason: "quality" });
  if (key.trackerVersion !== previous.trackerVersion)
    return out({ render: true, reason: `uniforms:${trackerReason}` });
  return out({ render: false, reason: "cached" });
}

// ---------------------------------------------------------------------------
// Settle refinement ladder (progressive settled quality)
// ---------------------------------------------------------------------------

/** Quiet time between ladder stages: longer than a frame and the 150 ms
 * cameraMoving trailing debounce (a resumed gesture never queues behind a
 * 4× frame), shorter than QualityAdapter's 500 ms DPR restore so the ladder
 * interleaves with the restore's resize render — each qualifying render
 * clears and re-arms the timer, so a stage fires only after 200 ms of true
 * quiet following the LAST settled render. */
export const SETTLE_REFINE_DELAY_MS = 200;

export type SettleRefineAction = "reset" | "advance" | "hold";

/**
 * Per-frame ladder decision, evaluated by the compositor AFTER the render
 * block. "advance": schedule stage+1 after SETTLE_REFINE_DELAY_MS (the shell
 * re-checks motion/streaming when the timer fires). "reset": drop to stage 0
 * immediately. Gates:
 *  - `!enabled` must RESET a held stage, not hold it — otherwise toggling
 *    the flag off freezes the boosted budget;
 *  - `!cacheEnabled` likewise: with the R1 cache off every invalidated frame
 *    re-renders, and a boosted budget would tax all of them with nothing
 *    amortizing it;
 *  - motion/streaming reset (the resumed gesture pays the normal active
 *    budget — resolveMaxRaySteps ignores the stage while active — but the
 *    NEXT settle must restart the ladder from 0, not jump to 4×);
 *  - only a completed FULL-RES render (scale 1) arms an advance.
 */
export function decideSettleRefine(input: {
  cameraMoving: boolean;
  streaming: boolean;
  enabled: boolean;
  cacheEnabled: boolean;
  renderedThisFrame: boolean;
  scale: number;
  /** Live drawing-buffer DPR has reached the settled DPR. Until
   * QualityAdapter's 500 ms restore lands, the target is clamped to the
   * reduced buffer — boosted ladder renders spent there would be thrown
   * away by the restore's resize re-render, degenerating the progressive
   * de-graining into one un-amortized heavy frame. HOLD (don't reset):
   * the restore's own invalidate produces the full-res render that then
   * arms the ladder. */
  atSettledDpr: boolean;
  stage: number;
  maxStages: number;
}): SettleRefineAction {
  const { cameraMoving, streaming, enabled, cacheEnabled } = input;
  if (!enabled || !cacheEnabled) return input.stage > 0 ? "reset" : "hold";
  if (cameraMoving || streaming) return input.stage > 0 ? "reset" : "hold";
  if (!input.renderedThisFrame || input.scale !== 1 || !input.atSettledDpr) return "hold";
  if (input.stage >= input.maxStages) return "hold";
  return "advance";
}

// ---------------------------------------------------------------------------
// Stats (DebugPanel report)
// ---------------------------------------------------------------------------

export type VolumeCompositorReport = {
  enabled: boolean;
  cacheEnabled: boolean;
  depthPrepass: boolean;
  /** True after the shell hit an error and fell back to plain rendering. */
  broken: boolean;
  lastError: string | null;
  targetWidth: number;
  targetHeight: number;
  scale: number;
  volumeRenders: number;
  cachedComposites: number;
  lastRenderReason: string;
  /** Settle refinement ladder stage the governor currently holds. */
  settleRefineStage: number;
};

export type VolumeCompositorStats = {
  onFrame: (decision: VolumeFrameDecision) => void;
  volumeRenders: () => number;
  cachedComposites: () => number;
  lastRenderReason: () => string;
};

export const createCompositorStats = (): VolumeCompositorStats => {
  let volumeRenders = 0;
  let cachedComposites = 0;
  let lastRenderReason = "none";
  return {
    onFrame: (decision) => {
      if (decision.render) {
        volumeRenders += 1;
        lastRenderReason = decision.reason;
      } else {
        cachedComposites += 1;
      }
    },
    volumeRenders: () => volumeRenders,
    cachedComposites: () => cachedComposites,
    lastRenderReason: () => lastRenderReason,
  };
};
