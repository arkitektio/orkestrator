/* eslint-disable react-hooks/immutability --
 * Driving TSL UNIFORM NODES is this module's whole job, and a uniform node is a
 * deliberately mutable handle into an already-compiled shader graph — writing
 * `.value` is how a frame's data reaches the GPU without rebuilding the
 * material. The rule reads that as mutating a hook argument; treating these as
 * React state instead would mean recompiling the shader on every camera move,
 * which is exactly what the uniform-push contract exists to avoid. */
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  qualityGovernor,
  resolveMaxRaySteps,
  resolveStepScale,
  resolveCinematic,
  resolveSmoothThreshold,
} from "../../../platform/quality/qualityGovernor";
import { voxelWorldSizeOf } from "../../../platform/coords/worldTransform";
import type * as THREE from "three";
import type { LayerBrickPool } from "../residency/brickResidency";
import { useViewStore, useViewStoreApi } from "../../../platform/stores/viewStore";
import { useViewerStoreApi } from "../../../platform/stores/viewerStore";
import { useModeStore } from "../../../platform/stores/modeStore";
import { useAnimationStore } from "../../../platform/stores/animationStore";
import { useBrickStore } from "../store/brickSlice";

/**
 * The CPU side of `volumeRayNodes`' uniforms — what actually drives the ray
 * scaffolding every frame.
 *
 * The SHADER half of these was extracted into `features/bricks/gpu/volumeRayNodes.ts`
 * because `desiredLevelAt` must stay in lockstep with the planner's `wantFiner`.
 * The driver half belongs with it for exactly the same reason:
 * `pxPerVoxelAtUnitDistance` is the other half of that footprint calculation, and
 * a second hand-written copy of the projection formula is the same rot in the
 * other direction. Both raymarchers — intensity and label — feed these uniforms
 * identically, so they feed them from here.
 *
 * `desiredLevel` is a PARAMETER rather than derived, because the two callers
 * legitimately disagree: a merged image pass uses its group's finest planned
 * level (residency is shared across members), a lone layer uses its own.
 */

/** The uniform handles this drives — the subset both volume materials expose. */
export type VolumeRayUniformHandles = {
  uDesiredLevel: { value: number };
  uLodBias: { value: number };
  uPxPerVoxelAtUnitDist: { value: number };
  uVoxelWorldSize: { value: THREE.Vector3 };
  uMinDelta: { value: number };
};

/** The handles `useStepScaleUniform` drives. Separate: it is imperative.
 * `uMaxSteps` lives HERE, not with the React-effect uniforms above: adaptive
 * depth flips it on every activity edge (camera moving / streaming), which is
 * exactly the cadence this vanilla subscription exists for.
 * `uSmoothThreshold` is optional — the label raymarcher has no smoothing. */
export type StepScaleUniformHandle = {
  uStepScale: { value: number };
  uMaxSteps: { value: number };
  uSmoothThreshold?: { value: number };
  /** Volume material only — the label raymarcher has no shading path. */
  uCinematic?: { value: number };
};

/**
 * Screen px per base voxel at unit distance — the CPU twin of the footprint term
 * in `volumeRayNodes.desiredLevelAt`.
 *
 * A SCALAR selector on purpose: `cameraPose` and `viewportSize` are new objects
 * on every camera write (~16/s while orbiting) and subscribing to them would
 * re-render every volume layer continuously. The value depends on fov and
 * viewport height alone, both constant during an orbit; the camera POSITION
 * reaches the shader through `vOrigin`, not through React.
 */
export const usePxPerVoxelAtUnitDistance = (): number =>
  useViewStore((s) =>
    s.cameraPose?.isPerspective && s.cameraPose.fovY > 0
      ? s.viewportSize.height / (2 * Math.tan(s.cameraPose.fovY / 2))
      : 0,
  );

/**
 * Push the five ray uniforms. Returns nothing; it is a driver.
 *
 * `minDelta` is half a voxel of the plan's finest requested level. The actual
 * per-sample step adapts to the LOD sampled at that point (`stepLen` in the
 * shader), and the in-shader `floorDelta` guarantees every ray reaches its exit
 * within the loop bound whatever this says.
 */
export const useVolumeRayUniforms = (
  nodes: VolumeRayUniformHandles | undefined,
  {
    pool,
    desiredLevel,
    planTargetLevel,
    worldMatrix,
  }: {
    pool: LayerBrickPool | null;
    /** Usually `planTargetLevel`; a merged pass passes its group's level. */
    desiredLevel: number | undefined;
    planTargetLevel: number | undefined;
    /** The layer's voxel→world affine, for `uVoxelWorldSize` (world-metric
     * LOD in `desiredLevelAt` / the tricubic gate). Omitted ⇒ identity ⇒
     * legacy voxel metric — also what `orkestrator.worldLod` OFF pushes.
     * The flag is read here at push time, so it is live per effect run
     * (planner lockstep: nodePlanTracker reads it per replan). */
    worldMatrix?: THREE.Matrix4 | null;
  },
): void => {
  const lodBias = useBrickStore((s) => s.lodBias);
  const pxPerVoxelAtUnitDistance = usePxPerVoxelAtUnitDistance();
  const invalidate = useThree((state) => state.invalidate);
  const viewerStoreApi = useViewerStoreApi();
  // Quality tier / streaming flips are rare (P17-clean); re-runs the push so
  // `uMaxSteps` tracks the governor's profile.
  const qualityVersion = useSyncExternalStore(
    qualityGovernor.subscribe,
    () => qualityGovernor.getVersion(),
  );

  const minDelta = useMemo(() => {
    // Derived from `desiredLevel` — the level the SHADER actually marches
    // (a merged pass uses its group's finest planned level) — NOT the
    // member's own planTargetLevel: a merged primary can plan coarser than
    // another member, and a coarser-level uMinDelta floored the legacy
    // stride/refStep/jitter ~1.33× too long at the group's finest level.
    const levelIndex = desiredLevel ?? planTargetLevel;
    if (!pool || levelIndex === undefined) return 1;
    const level = pool.geometry.levels[Math.min(levelIndex, pool.geometry.levels.length - 1)];
    // MAX spatial component — the axis rule of the planner/shader lockstep
    // (`wantFiner` / `desiredLevelAt`); identical on pyramids where x is the
    // max factor.
    // Under orkestrator.anisoStride this uniform is INERT: the shader's
    // stride floor and jitter amplitude both moved to the in-shader
    // direction-projected pitch (a max-axis floor would pin the projection
    // back to the legacy rule exactly on face-on thin slabs). It keeps being
    // pushed for the legacy (flag-off) emission.
    return 0.5 * Math.max(level.scale[0], level.scale[1], level.scale[2]);
  }, [pool, desiredLevel, planTargetLevel]);

  useEffect(() => {
    if (!nodes || desiredLevel === undefined) return;
    nodes.uDesiredLevel.value = desiredLevel;
    nodes.uLodBias.value = lodBias;
    nodes.uPxPerVoxelAtUnitDist.value = pxPerVoxelAtUnitDistance;
    const worldSize =
      worldMatrix ? voxelWorldSizeOf(worldMatrix) : null;
    if (worldSize) nodes.uVoxelWorldSize.value.set(worldSize[0], worldSize[1], worldSize[2]);
    else nodes.uVoxelWorldSize.value.set(1, 1, 1);
    nodes.uMinDelta.value = minDelta;
    // uMaxSteps is driven by `useStepScaleUniform` (adaptive depth flips it
    // per activity edge — a vanilla-subscription cadence, not an effect one).
    viewerStoreApi.getState().volumeInputs.bump("ray-uniforms");
    invalidate();
  }, [
    nodes,
    desiredLevel,
    lodBias,
    pxPerVoxelAtUnitDistance,
    minDelta,
    worldMatrix,
    qualityVersion,
    invalidate,
    viewerStoreApi,
  ]);
};

/**
 * Count this component as one mounted full-screen volume raymarch pass while
 * `activePass` holds (a live raymarch material bundle — merge-group primaries
 * and label volume layers; non-primaries and 2D planes never pass true).
 * Feeds the governor's scene-load factor: total frame cost is linear in the
 * number of concurrent raymarch passes, and this is the feedforward signal
 * that lets the step budget and the DPR burst prediction scale with it.
 */
export const useVolumePassRegistration = (activePass: boolean): void => {
  useEffect(() => {
    if (!activePass) return;
    return qualityGovernor.registerVolumePass();
  }, [activePass]);
};

/**
 * `uStepScale` (and the tricubic gate `uSmoothThreshold`), driven IMPERATIVELY
 * off the camera-motion flag.
 *
 * `cameraMoving` is deliberately NOT a React subscription: it flips true on every
 * leading camera emission and false on every settle (~23 flips over a 10 s
 * orbit), and it feeds exactly ONE float. Subscribing re-rendered every volume
 * layer on each flip and re-ran the whole uniform effect, rebuilding pointer
 * handlers and re-diffing the group tree. This writes the uniforms directly and
 * requests a frame.
 *
 * Three governor inputs fold in here:
 *  - the SCENE-LOAD factor (`getLoadFactor`): step scales stretch by √(pass
 *    count) so total sample cost across N concurrent raymarch passes grows
 *    ~√N instead of N — the feedforward half of the many-layers fix;
 *  - ADAPTIVE DEPTH (`resolveMaxRaySteps`): the ray-step ceiling halves while
 *    the camera angle is changing (or bricks stream) — in the zoom+tilt worst
 *    case the ray always runs to the ceiling (the stride floor guarantees
 *    full-ray coverage), so the CEILING, not the step scale, is what bounds
 *    that cost; strides lengthen, nothing truncates, settle restores;
 *  - the tricubic gate (`resolveSmoothThreshold`): smoothing off while active
 *    and on TIER_LOW — zoom+tilt otherwise flips ~the whole step budget to
 *    8× taps exactly when the frame is already fragment-bound.
 */
export const useStepScaleUniform = (
  nodes: StepScaleUniformHandle | undefined,
  /** IMAGE material only: apply the governor's settle-refinement stage to
   * uMaxSteps (its compile loop bound is MAX_RAY_STEPS_CEILING). Label
   * volumes must stay false — they render live in the canvas pass every
   * frame, outside the compositor's cache, so a boosted label budget would
   * tax every overlay frame with nothing amortizing it. A primitive param
   * on purpose: the effect dep list must not churn on object identity. */
  settleRefine = false,
  /** True for materials that render in the CANVAS pass (labels), which never
   * get the compositor's motion-time resolution cut — see
   * `CANVAS_PASS_ACTIVE_STEP_SCALE`. Primitive, like `settleRefine`, so the
   * effect dep list cannot churn. */
  canvasPass = false,
): void => {
  const viewStoreApi = useViewStoreApi();
  const viewerStoreApi = useViewerStoreApi();
  const invalidate = useThree((state) => state.invalidate);
  // A rare-cadence scalar (a deliberate user toggle), so a reactive
  // subscription here is P17-clean — unlike anything that varies per frame.
  const cinematic = useModeStore((s) => s.cinematic);
  // Rare-cadence scalar (a tour starts or stops), so this is P17-clean.
  const animationPlaying = useAnimationStore((s) => s.playingId !== null);

  useEffect(() => {
    if (!nodes) return;
    // Read once per effect, not per camera tick (localStorage): flipping the
    // flag rebuilds the material, which remounts this effect anyway.
    const smoothZoom = true;
    return stepScaleDriverFor(viewStoreApi).register(
      nodes,
      { settleRefine, canvasPass, smoothZoom, cinematic, animationPlaying },
      { viewerStoreApi, invalidate },
    );
  }, [
    nodes,
    settleRefine,
    canvasPass,
    cinematic,
    animationPlaying,
    viewStoreApi,
    viewerStoreApi,
    invalidate,
  ]);
};

// ---------------------------------------------------------------------------
// The shared step-scale driver
// ---------------------------------------------------------------------------

/** What distinguishes the values one material needs from another's. */
export type StepScaleVariant = {
  settleRefine: boolean;
  canvasPass: boolean;
  smoothZoom: boolean;
  /** `modeStore.cinematic`. Scientific mode disables tricubic reconstruction —
   * see `resolveSmoothThreshold`. A deliberate, rare toggle, so it re-registers
   * the variant rather than joining the per-emission snapshot. */
  cinematic: boolean;
  /** A camera TOUR is playing. Flips only at a tour's start/stop, so like
   * `cinematic` it rides the variant rather than the per-emission snapshot.
   * Consumed by `resolveCinematic` ONLY — see R2 there. */
  animationPlaying: boolean;
};

export type StepScaleValues = {
  step: number;
  maxSteps: number;
  smooth: number;
  /** `uCinematic`: 1 = shade the volume this frame, 0 = flat. */
  lit: number;
};

/** The governor + motion inputs `resolveStepValues` reads — a snapshot, so
 * the resolution itself is pure and testable. */
export type StepScaleInputs = {
  profile: Parameters<typeof resolveMaxRaySteps>[0];
  tier: Parameters<typeof resolveSmoothThreshold>[0];
  /** `cameraMoving || streaming`. */
  active: boolean;
  loadFactor: number;
  volumePassCount: number;
  settleRefineStage: number;
};

/** The three values one variant's materials write, from one snapshot. Pure:
 * exactly the arithmetic the per-material effect used to inline. */
export const resolveStepValues = (
  inputs: StepScaleInputs,
  variant: StepScaleVariant,
): StepScaleValues => {
  const { profile, active } = inputs;
  return {
    step: resolveStepScale({
      base: (active ? profile.activeStepScale : profile.settledStepScale) * inputs.loadFactor,
      active,
      canvasPass: variant.canvasPass,
    }),
    maxSteps: resolveMaxRaySteps(
      profile,
      active,
      inputs.volumePassCount,
      variant.settleRefine ? inputs.settleRefineStage : 0,
    ),
    smooth: variant.smoothZoom
      ? resolveSmoothThreshold(inputs.tier, active, variant.cinematic)
      : 0,
    // Lit VOLUME is a settled-image luxury on slow tiers, exactly like the
    // tricubic above — but a playing tour overrides the activity gate (R2).
    lit: resolveCinematic(inputs.profile, variant.cinematic, active, variant.animationPlaying)
      ? 1
      : 0,
  };
};

const sameStepValues = (a: StepScaleValues | null, b: StepScaleValues): boolean =>
  a !== null &&
  a.step === b.step &&
  a.maxSteps === b.maxSteps &&
  a.smooth === b.smooth &&
  a.lit === b.lit;

const writeStepValues = (handle: StepScaleUniformHandle, values: StepScaleValues): void => {
  handle.uStepScale.value = values.step;
  handle.uMaxSteps.value = values.maxSteps;
  if (handle.uSmoothThreshold) handle.uSmoothThreshold.value = values.smooth;
  // Absent on the LABEL material, which has no shading path.
  if (handle.uCinematic) handle.uCinematic.value = values.lit;
};

const variantKeyOf = (v: StepScaleVariant): string =>
  `${v.settleRefine ? 1 : 0}${v.canvasPass ? 1 : 0}${v.smoothZoom ? 1 : 0}${v.cinematic ? 1 : 0}${v.animationPlaying ? 1 : 0}`;

type StepScaleSinks = {
  viewerStoreApi: { getState(): { volumeInputs: { bump(reason: string): void } } };
  invalidate: () => void;
};

type VariantState = {
  variant: StepScaleVariant;
  handles: Set<StepScaleUniformHandle>;
  last: StepScaleValues | null;
};

/**
 * ONE subscription to the view store + governor per scene, fanned out to every
 * volume material's step uniforms.
 *
 * Before, each material registered its own pair of subscribers, so every
 * camera emission (~16/s while orbiting) ran N copies of the same
 * `resolveStepValues` and, on a change, N `volumeInputs.bump()` +
 * `invalidate()` calls — for values that depend only on the governor, the
 * motion flag and a two-bit variant. The driver computes each VARIANT once
 * per emission, writes only the handles whose values changed, and bumps +
 * invalidates ONCE per emission that changed anything. The dedupe edge is
 * the same one as before (per variant, value-compared), so the compositor
 * cache re-renders on exactly the same frames.
 */
export class StepScaleDriver {
  private readonly variants = new Map<string, VariantState>();
  private unsubscribe: (() => void) | null = null;
  private sinks: StepScaleSinks | null = null;

  constructor(
    private readonly viewStoreApi: {
      // `interacting` optional so pre-existing test fixtures stay valid.
      getState(): { cameraMoving: boolean; interacting?: boolean };
      subscribe(listener: () => void): () => void;
    },
    /** Injectable for tests; the module singleton in production. */
    private readonly governor: typeof qualityGovernor = qualityGovernor,
  ) {}

  private snapshot(): StepScaleInputs {
    const g = this.governor;
    const view = this.viewStoreApi.getState();
    return {
      profile: g.getProfile(),
      tier: g.getTier(),
      // A live window drag (`interacting`) degrades exactly as camera motion
      // does — the settle-refine ladder restores quality on its falling edge.
      active: view.cameraMoving || !!view.interacting || g.isStreaming(),
      loadFactor: g.getLoadFactor(),
      volumePassCount: g.getVolumePassCount(),
      settleRefineStage: g.getSettleRefineStage(),
    };
  }

  private bump(): void {
    // Value-deduped edge — exactly the cadence the volume compositor's cache
    // must re-render on (adaptive depth / tricubic / step changes).
    this.sinks?.viewerStoreApi.getState().volumeInputs.bump("step-uniforms");
    this.sinks?.invalidate();
  }

  private readonly apply = (): void => {
    const inputs = this.snapshot();
    let changed = false;
    for (const state of this.variants.values()) {
      const values = resolveStepValues(inputs, state.variant);
      if (sameStepValues(state.last, values)) continue; // flags flip far more often than values
      state.last = values;
      for (const handle of state.handles) writeStepValues(handle, values);
      changed = true;
    }
    if (changed) this.bump();
  };

  /** Seed `handle` with the current values (and request a frame, as the
   * per-material effect's first apply did), then keep it updated until the
   * returned function is called. */
  register(handle: StepScaleUniformHandle, variant: StepScaleVariant, sinks: StepScaleSinks): () => void {
    this.sinks = sinks;
    const key = variantKeyOf(variant);
    let state = this.variants.get(key);
    if (!state) {
      state = { variant, handles: new Set(), last: null };
      this.variants.set(key, state);
    }
    state.handles.add(handle);
    const values = resolveStepValues(this.snapshot(), variant);
    state.last = values;
    writeStepValues(handle, values);
    this.bump();
    if (!this.unsubscribe) {
      const unsubscribeView = this.viewStoreApi.subscribe(this.apply);
      const unsubscribeQuality = this.governor.subscribe(this.apply);
      this.unsubscribe = () => {
        unsubscribeView();
        unsubscribeQuality();
      };
    }
    return () => {
      state.handles.delete(handle);
      if (state.handles.size === 0) this.variants.delete(key);
      if (this.variants.size === 0 && this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
        this.sinks = null;
      }
    };
  }

  /** Test/diagnostic surface. */
  get subscribed(): boolean {
    return this.unsubscribe !== null;
  }
  get handleCount(): number {
    let n = 0;
    for (const state of this.variants.values()) n += state.handles.size;
    return n;
  }
}

/** One driver per scene — keyed on the scene's view store, which is what
 * makes the driver's motion flag the right scene's. */
const drivers = new WeakMap<object, StepScaleDriver>();
const stepScaleDriverFor = (viewStoreApi: ConstructorParameters<typeof StepScaleDriver>[0]): StepScaleDriver => {
  let driver = drivers.get(viewStoreApi);
  if (!driver) {
    driver = new StepScaleDriver(viewStoreApi);
    drivers.set(viewStoreApi, driver);
  }
  return driver;
};
