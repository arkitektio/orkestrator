/**
 * GPU-adaptive quality governor (P19).
 *
 * Most render-quality settings were dGPU-calibrated constants; integrated GPUs
 * (Apple M2 et al.) need lower tiers, and the jank window is not just camera
 * motion — post-gesture STREAMING frames (each residency bump renders a
 * full-quality frame) recur for seconds. The governor learns the machine's
 * tier from sustained frame times and drives every quality knob from one
 * profile table; "active" (camera moving OR bricks streaming) frames use the
 * cheaper column, settled frames the crisper one.
 *
 * Pure logic + injected persistence (localStorage keyed per GPU renderer
 * string), so a machine starts at its learned tier on the next session.
 * Hysteresis: demote fast (sustained slow EMA), promote slowly (sustained
 * fast EMA + cooldown since the last demote) — no oscillation.
 *
 * Module singleton like `perfMonitor`; consumers subscribe via
 * `useSyncExternalStore(governor.subscribe, () => governor.getVersion())`
 * (tier/streaming flips are rare — P17-clean) or read imperatively
 * (`getProfile()` in `drainUploads`).
 */

export type QualityTier = 0 | 1 | 2;
export const TIER_HIGH: QualityTier = 0;
export const TIER_MEDIUM: QualityTier = 1;
export const TIER_LOW: QualityTier = 2;
export const TIER_LABELS: Record<QualityTier, string> = {
  0: "High",
  1: "Medium",
  2: "Low",
};

export type QualityProfile = {
  /** Settled frames render at min(initialDpr, settledDprCap). */
  settledDprCap: number;
  /** Active frames render at clamp(initialDpr · activeDprScale, 1, activeDprCap). */
  activeDprScale: number;
  activeDprCap: number;
  /** 3D raymarch step multipliers (shader `uStepScale`). */
  settledStepScale: number;
  activeStepScale: number;
  /** Hard per-fragment iteration ceiling (shader `uMaxSteps`); the stride
   * floor scales so the ray still covers the whole volume. */
  maxRaySteps: number;
  /** drainUploads wall-clock budget per frame. */
  uploadBudgetMs: number;
  /** Concurrent brick fetches per layer. */
  maxInflightBricks: number;
  /** residencyVersion bump throttle while streaming. */
  residencyBumpMs: number;
  /**
   * Whether the CINEMATIC volume stays LIT while the frame is active.
   *
   * Lit VOLUME costs a six-tap gradient per contributing sample (~1.5-2×), so
   * slow GPUs go flat while you drag and snap back to lit when you settle —
   * the same active/settled contract the scene already applies to DPR, step
   * scale and the tricubic. The ISOSURFACE path is ~2-5% (one gradient per
   * ray, at the hit) and is never gated.
   */
  litVolumeWhileActive: boolean;
};

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  [TIER_HIGH]: {
    settledDprCap: Number.POSITIVE_INFINITY,
    activeDprScale: 1,
    activeDprCap: Number.POSITIVE_INFINITY,
    settledStepScale: 1,
    activeStepScale: 2,
    maxRaySteps: 512,
    uploadBudgetMs: 4,
    // 16 (was 12): the decode pool scales to hardwareConcurrency (4–24) and
    // each brick fans out to ≥1 chunk task — 12 under-subscribed it on fast
    // machines/networks. Judge against timeToSharpMs; GPU-side cost stays
    // capped by the drain budget regardless of arrival rate.
    maxInflightBricks: 16,
    residencyBumpMs: 150,
    litVolumeWhileActive: true,
  },
  [TIER_MEDIUM]: {
    settledDprCap: Number.POSITIVE_INFINITY,
    activeDprScale: 0.5,
    activeDprCap: Number.POSITIVE_INFINITY,
    settledStepScale: 1,
    activeStepScale: 2.5,
    maxRaySteps: 384,
    uploadBudgetMs: 3,
    maxInflightBricks: 12,
    residencyBumpMs: 150,
    litVolumeWhileActive: false,
  },
  [TIER_LOW]: {
    settledDprCap: 1.5,
    activeDprScale: 0.5,
    activeDprCap: 1,
    settledStepScale: 1.5,
    activeStepScale: 3,
    maxRaySteps: 256,
    uploadBudgetMs: 2,
    maxInflightBricks: 6,
    residencyBumpMs: 300,
    litVolumeWhileActive: false,
  },
};

/**
 * Fidelity mode: how much settled-image quality the DEFAULT experience trades
 * for performance. `"standard"` (the default) moderately caps the SETTLED
 * profile — DPR ≤ 1.5 (~44 % fewer pixels on a retina display), settled step
 * scale ≥ 1.25, ray steps ≤ 384 — while `"high"` restores today's exact
 * full-quality table. Active-path knobs (active DPR/step scale, the
 * interaction DPR ladder, upload budgets, in-flight counts) are deliberately
 * untouched: fidelity shapes only the image you look at once the camera
 * settles. Persisted in localStorage (`orkestrator.fidelity`), toggled in the
 * DebugPanel next to the tier override; the governor `emit()`s on change so
 * every profile consumer re-applies.
 */
export type FidelityMode = "standard" | "high";

const FIDELITY_STORAGE_KEY = "orkestrator.fidelity";

const readStoredFidelity = (): FidelityMode => {
  try {
    return window.localStorage.getItem(FIDELITY_STORAGE_KEY) === "high"
      ? "high"
      : "standard";
  } catch {
    return "standard";
  }
};

/** The Moderate standard-fidelity reduction, applied per tier. TIER_LOW is
 * already at or below every cap (1.5 / 1.5 / 256) and comes back effectively
 * unchanged. Pure and exported for tests. */
export function standardizeProfile(profile: QualityProfile): QualityProfile {
  return {
    ...profile,
    settledDprCap: Math.min(profile.settledDprCap, 1.5),
    settledStepScale: Math.max(profile.settledStepScale, 1.25),
    maxRaySteps: Math.min(profile.maxRaySteps, 384),
  };
}

/** Built once so `getProfile()` returns stable object identities per tier. */
export const STANDARD_QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  [TIER_HIGH]: standardizeProfile(QUALITY_PROFILES[TIER_HIGH]),
  [TIER_MEDIUM]: standardizeProfile(QUALITY_PROFILES[TIER_MEDIUM]),
  [TIER_LOW]: standardizeProfile(QUALITY_PROFILES[TIER_LOW]),
};

/**
 * Interaction DPR ladder: while the camera moves (or bricks stream), the
 * frame-time EMA picks a quantized resolution multiplier applied ON TOP of
 * the tier's `activeDprScale`. This is the "motion-time reduced-resolution
 * rendering" the design doc deferred until `uStepScale` alone proved
 * insufficient — it is the only lever that touches the raymarch's dominant
 * cost (fragment count) when zoomed into a volume, and it applies on EVERY
 * tier (HIGH's activeDprScale is 1, so strong machines previously got zero
 * fill-rate relief exactly where fill-rate binds).
 *
 * Quantized rungs — not a continuous scale — so a drifting EMA cannot retarget
 * the drawing buffer every frame (each `setDpr` reallocates render targets).
 * The CALLER keeps the rung monotone within one activity burst (step down
 * fast, recover only via the settled restore), so a mid-gesture EMA dip never
 * bounces the resolution back up; this function stays pure.
 */
export const ACTIVE_DPR_LADDER: readonly number[] = [1, 0.75, 0.5];

/** EMA at or below rung i's threshold selects rung i; above the last → 0.5.
 * 12 is `PROMOTE_FRAME_MS` (an EMA the governor would promote on needs no
 * resolution help); 20 sits just under `DEMOTE_FRAME_MS` so the ladder reacts
 * a beat before the tier would demote. */
const LADDER_EMA_THRESHOLDS_MS: readonly number[] = [12, 20];

/** The ladder rung for a frame-time EMA (pure; thresholds ≤12 → 1, ≤20 → 0.75,
 * else 0.5 — anchored on the governor's promote bound: an EMA it would promote
 * on needs no resolution help). */
export function resolveActiveLadderScale(emaMs: number): number {
  for (let i = 0; i < LADDER_EMA_THRESHOLDS_MS.length; i++) {
    if (emaMs <= LADDER_EMA_THRESHOLDS_MS[i]) return ACTIVE_DPR_LADDER[i];
  }
  return ACTIVE_DPR_LADDER[ACTIVE_DPR_LADDER.length - 1];
}

/**
 * The rung for the NEXT activity burst, decided ONCE at burst entry and held
 * for the whole burst (one allowed exception: `shouldStepBurstRungDown`).
 * Mid-burst stepping was self-amplifying: every `setDpr` reallocates the
 * render targets (a multi-hundred-ms frame), that spike frame inflated the
 * EMA, the ladder dropped another rung, which reallocated again — the
 * mitigation caused the very hitches it was meant to remove. One decision
 * per burst caps the cost at exactly one realloc per gesture.
 *
 * The EMA is NORMALIZED by the rung the previous burst rendered at
 * (`emaMs / rung²` — the raymarch is fragment-bound, and fragment count
 * scales with rung²): an 8 ms EMA measured at rung 0.5 means ~32 ms at full
 * resolution, so the prediction stays at 0.5 instead of oscillating back to 1
 * — while a machine that is genuinely fast even normalized climbs back up on
 * the next burst.
 *
 * `volumePasses` is the scene-load FEEDFORWARD: the EMA after idle is stale
 * (demand frameloop — no frames flowed), so the first heavy gesture used to
 * enter at rung 1 and stay janky for its whole duration. Frame cost is
 * linear in the number of full-screen raymarch passes, which is known BEFORE
 * any frame renders — ≥3 passes floor the entry rung at 0.75.
 */
export function predictBurstLadderScale(
  emaMs: number,
  previousRung: number,
  volumePasses = 1,
): number {
  const rung =
    previousRung > 0 && Number.isFinite(previousRung) ? Math.min(previousRung, 1) : 1;
  const normalizedEma = emaMs / (rung * rung);
  const loadCap = volumePasses >= 3 ? ACTIVE_DPR_LADDER[1] : 1;
  return Math.min(resolveActiveLadderScale(normalizedEma), loadCap);
}

/**
 * The ONE allowed mid-burst downward correction. The monotone-within-burst
 * rule exists to prevent the realloc cascade (see above) — but a burst that
 * ENTERED at too high a rung from a stale post-idle EMA used to stay janky
 * for its entire duration, with relief only on the NEXT gesture. A single
 * drop is one extra realloc, not a cascade: allowed once per burst, only
 * after the burst has rendered long enough for the EMA to reflect its own
 * frames (the caller gates on burst age), and only while a lower rung exists.
 * Compares the RAW ema (measured at the current rung) against the ladder's
 * worst threshold — if frames are still slow at this rung, drop.
 */
export function shouldStepBurstRungDown(emaMs: number, currentRung: number): boolean {
  if (currentRung <= ACTIVE_DPR_LADDER[ACTIVE_DPR_LADDER.length - 1]) return false;
  return emaMs > LADDER_EMA_THRESHOLDS_MS[LADDER_EMA_THRESHOLDS_MS.length - 1];
}

/** The next rung below `rung` (the ladder's floor when already at/below it). */
export function nextLadderRungDown(rung: number): number {
  for (const candidate of ACTIVE_DPR_LADDER) {
    if (candidate < rung) return candidate;
  }
  return ACTIVE_DPR_LADDER[ACTIVE_DPR_LADDER.length - 1];
}

/**
 * Scene-load factor (the many-layers fix): total frame cost is LINEAR in the
 * number of concurrently marched full-screen volume passes (one per merge
 * group + one per label volume layer), but no quality knob saw that — the
 * tier reacts only to sustained slow-frame streaks, and demoting it punishes
 * the MACHINE's persisted label for what is a property of the SCENE. This
 * factor scales the per-pass step budget so total sample cost grows ~√N
 * instead of N (each pass marches at √N× the pitch); capped at 2× so a
 * many-layer scene never falls below half its tier's step density. Fed by
 * `registerVolumePass` at material mount — feedforward, known before the
 * first heavy frame renders, and it costs nothing when a single pass is open.
 */
export function volumeLoadFactor(volumePasses: number): number {
  return Math.min(2, Math.sqrt(Math.max(1, volumePasses)));
}

/** Floor for the adaptive active-time ray-step ceiling — below this the
 * coarse image visibly falls apart even mid-gesture. */
export const MIN_ACTIVE_RAY_STEPS = 96;

/**
 * Compile-time ceiling of the IMAGE raymarcher's step loop — the settle
 * refinement ladder may raise `uMaxSteps` up to here. Exactly
 * max(profile.maxRaySteps) << MAX_SETTLE_REFINE_STAGES = 512·4. Exported
 * from core (not volumeRayNodes) because the resolve function below needs it
 * and render→core is the established import direction; the label
 * raymarcher's loop keeps the plain MAX_RAY_STEPS bound (labels render live
 * in the canvas pass, outside the compositor cache — never boosted).
 */
export const MAX_RAY_STEPS_CEILING = 2048;

/** Settle refinement ladder depth: two doublings = 4× stride-floor density,
 * bounding the worst single refinement frame at ~4× a settled frame. */
export const MAX_SETTLE_REFINE_STAGES = 2;

/**
 * Extra stride multiplier for CANVAS-PASS volumes (labels/masks) while the
 * camera moves.
 *
 * Image volumes raymarch into the compositor's render target, which drops to
 * `resolveVolumeScale` = 0.5 linear — a QUARTER of the fragments — for the
 * duration of a gesture. Label volumes cannot share that target (their
 * NormalBlending cannot ride an additive-delta buffer), so they raymarch live
 * in the canvas pass at full buffer resolution on every rendered frame. They
 * get the active step scale and adaptive depth like everything else, but not
 * the resolution cut, so during a gesture a mask layer costs ~4× the fragments
 * of the image underneath it.
 *
 * This recovers part of that asymmetry the only way a canvas-pass material can:
 * longer strides. Deliberately modest — masks are nearest-sampled, so an
 * aggressive stride starts stepping over thin structures, and unlike a
 * resolution cut that is a CORRECTNESS artifact (a label that vanishes), not
 * just a softer image. Settled frames are untouched.
 *
 * Applied to LABEL materials only, which is narrower than the name suggests:
 * with `orkestrator.volumeTarget` off, image volumes also render in the canvas
 * pass and also miss the resolution cut — but that flag exists to reproduce
 * pre-compositor behaviour exactly, so it deliberately gets no compensation.
 */
export const CANVAS_PASS_ACTIVE_STEP_SCALE = 1.5;

/**
 * The step scale a material should actually use.
 *
 * Pure so the asymmetry above is stated once and testable, rather than being an
 * inline `* 1.5` at a uniform-write site.
 */
export function resolveStepScale(input: {
  /** `activeStepScale` or `settledStepScale`, already load-factored. */
  base: number;
  /** cameraMoving || streaming. */
  active: boolean;
  /** True for materials that render in the canvas pass (labels), false for
   * those that render into the compositor's reduced-resolution target. */
  canvasPass: boolean;
}): number {
  if (!input.active || !input.canvasPass) return input.base;
  return input.base * CANVAS_PASS_ACTIVE_STEP_SCALE;
}

/**
 * ADAPTIVE DEPTH: the per-fragment ray-step ceiling for the current activity
 * state. In the zoom+tilt worst case the diagonal ray always runs to the
 * `uMaxSteps` ceiling — the stride floor (`floorDelta = rayLen / uMaxSteps`)
 * guarantees full-ray coverage whatever the per-sample LOD picks — so the
 * step-SCALE knob does not bound that cost: the CEILING does. While the
 * camera angle is changing (or bricks stream), the ceiling halves and divides
 * by the scene-load factor; strides lengthen to keep covering the whole ray,
 * so nothing truncates — the moving image just samples coarser, and the
 * settle emission restores full depth. Settled frames keep the tier's full
 * ceiling (the load factor already stretches their PITCH via uStepScale).
 */
export function resolveMaxRaySteps(
  profile: QualityProfile,
  active: boolean,
  volumePasses = 1,
  /** Settle refinement ladder stage (governor `getSettleRefineStage`) —
   * doubles the SETTLED ceiling per stage up to MAX_RAY_STEPS_CEILING.
   * IGNORED while active: a resumed gesture instantly pays the normal
   * budget, whatever stage the ladder had reached. */
  refineStage = 0,
): number {
  if (!active) {
    return Math.min(
      profile.maxRaySteps << Math.max(0, refineStage),
      MAX_RAY_STEPS_CEILING,
    );
  }
  return Math.max(
    MIN_ACTIVE_RAY_STEPS,
    Math.round(profile.maxRaySteps / (2 * volumeLoadFactor(volumePasses))),
  );
}

/** Default px-per-voxel threshold past which tricubic zoom smoothing engages. */
export const SMOOTH_ZOOM_THRESHOLD_PX = 3;

/**
 * Tricubic zoom smoothing is a settled-image luxury: it multiplies the
 * intensity tap 8× and — contrary to the "only engages where rays are short"
 * design assumption — zoom+tilt engages it over essentially the entire step
 * budget exactly when the frame is already fragment-bound (long diagonal
 * rays at fine pitch). Disabled while ACTIVE (camera moving or streaming)
 * on every tier, and entirely on TIER_LOW. Returning 0 disables the filter
 * at runtime with no material rebuild (the shader gates on `> 0`).
 */
export function resolveSmoothThreshold(
  tier: QualityTier,
  active: boolean,
  /**
   * SCIENTIFIC mode (`modeStore.cinematic === false`) turns the reconstruction
   * filter off outright: a tricubic B-spline is a display-space smoothing
   * kernel, so magnified voxels read as blobs rather than as the samples they
   * are. Measurements are unaffected either way — CPU probes read RAW voxel
   * values (`OCTREE_RENDERER.md` §2.10) — which is exactly why this is a
   * legitimate preset knob and clim/gamma are not.
   */
  cinematic = true,
): number {
  if (!cinematic || active || tier === TIER_LOW) return 0;
  return SMOOTH_ZOOM_THRESHOLD_PX;
}

/**
 * Whether the volume should be LIT this frame.
 *
 * R2 — a camera TOUR must not render unlit, which is exactly where cinematic
 * matters most. `AnimationPlayer` drives the camera continuously, so a playing
 * tour sets `cameraMoving` every frame and would read as permanently "active":
 * on MEDIUM/LOW the whole tour would render flat. A tour is a deliberate
 * artifact, not an interaction, so quality wins over framerate there.
 *
 * The caller must apply `animationPlaying` to THIS decision only — DPR and
 * step scale keep treating a tour as active, because those govern whether the
 * tour plays back smoothly at all.
 */
export function resolveCinematic(
  profile: QualityProfile,
  cinematic: boolean,
  active: boolean,
  animationPlaying = false,
): boolean {
  if (!cinematic) return false;
  if (!active || animationPlaying) return true;
  return profile.litVolumeWhileActive;
}

/**
 * DPR for the current activity state, derived from a profile.
 * `activeLadderScale` (from `resolveActiveLadderScale`, burst-monotone in the
 * caller) multiplies the active DPR; 1 reproduces the pre-ladder behavior
 * exactly. The result never drops below 1 device pixel.
 */
export function resolveDpr(
  profile: QualityProfile,
  initialDpr: number,
  active: boolean,
  activeLadderScale = 1,
): number {
  if (!active) return Math.min(initialDpr, profile.settledDprCap);
  const base = Math.min(
    profile.activeDprCap,
    Math.max(1, initialDpr * profile.activeDprScale),
  );
  return Math.max(1, base * activeLadderScale);
}

/**
 * Was a kill switch; settled ON (OCTREE_RENDERER.md §6.9) for the interaction DPR ladder,
 * mirroring `orkestrator.gpuRepack`. Read per frame by `QualityAdapter`, so
 * toggling in the DebugPanel takes effect on the next gesture — no remount
 * needed for an A/B.
 */



/**
 * Was a kill switch; settled ON (OCTREE_RENDERER.md §6.9) for the SETTLE REFINEMENT LADDER: after the camera settles
 * and streaming drains, the volume compositor drives the governor's
 * `settleRefineStage` 0 → 1 → 2, each stage doubling the settled `uMaxSteps`
 * budget of the image raymarcher and re-rendering the cached target once —
 * progressive de-graining of floorDelta-bound rays while the scene is idle.
 * Read per advance by the compositor, so toggling takes effect at the next
 * settle with no remount.
 */



/** Frame delta above this counts toward demotion (≈ can't hold ~40 fps). */
const DEMOTE_FRAME_MS = 24;
/** Frame delta below this counts toward promotion (≈ comfortably >80 fps). */
const PROMOTE_FRAME_MS = 12;
const EMA_WINDOW = 20;
/** Deltas above this are demand-frameloop idle gaps when the scene is idle —
 * but during camera motion or streaming they are REAL long frames (the exact
 * ones users report as jank), counted below with weighted votes. */
const MAX_CONTINUOUS_DELTA_MS = 250;
const DEMOTE_AFTER_SLOW_FRAMES = 15;
/** Max demotion votes a single long active frame contributes: a demote needs
 * ≥3 consecutive ≥250 ms frames, preserving single-spike immunity. */
const SLOW_VOTE_CAP = 5;
const PROMOTE_AFTER_FAST_FRAMES = 120;
const PROMOTE_COOLDOWN_MS = 30_000;

export type QualityStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const clampTier = (value: number): QualityTier =>
  Math.min(2, Math.max(0, Math.round(value))) as QualityTier;

export class QualityGovernor {
  private autoTier: QualityTier = TIER_HIGH;
  private override: QualityTier | null = null;
  private fidelity: FidelityMode = readStoredFidelity();
  private emaMs = 0;
  private slowFrames = 0;
  private fastFrames = 0;
  private lastDemoteAt = Number.NEGATIVE_INFINITY;
  private streaming = false;
  private volumePasses = 0;
  private version = 0;
  /** Settle refinement ladder stage — see setSettleRefineStage. */
  private settleRefineStage = 0;
  private readonly listeners = new Set<() => void>();
  private storage: QualityStorage | null = null;
  private storageKey: string | null = null;

  // --- subscription (rare notifications: tier/override/streaming flips) ----
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion(): number {
    return this.version;
  }

  private emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  // --- persistence ----------------------------------------------------------
  /** Wire persistence and load the learned tier/override for this GPU. */
  configurePersistence(storage: QualityStorage, gpuKey: string): void {
    this.storage = storage;
    this.storageKey = `scene-quality-tier:${gpuKey}`;
    try {
      const raw = storage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { tier?: number; override?: number | null };
        if (typeof parsed.tier === "number") this.autoTier = clampTier(parsed.tier);
        this.override =
          typeof parsed.override === "number" ? clampTier(parsed.override) : null;
        this.emit();
      }
    } catch {
      /* corrupted entry — start fresh */
    }
  }

  private persist(): void {
    if (!this.storage || !this.storageKey) return;
    try {
      this.storage.setItem(
        this.storageKey,
        JSON.stringify({ tier: this.autoTier, override: this.override }),
      );
    } catch {
      /* storage full/unavailable — non-fatal */
    }
  }

  // --- state ----------------------------------------------------------------
  getTier(): QualityTier {
    return this.override ?? this.autoTier;
  }

  getAutoTier(): QualityTier {
    return this.autoTier;
  }

  getOverride(): QualityTier | null {
    return this.override;
  }

  getProfile(): QualityProfile {
    const table =
      this.fidelity === "high" ? QUALITY_PROFILES : STANDARD_QUALITY_PROFILES;
    return table[this.getTier()];
  }

  getFidelity(): FidelityMode {
    return this.fidelity;
  }

  setFidelity(mode: FidelityMode): void {
    if (mode === this.fidelity) return;
    this.fidelity = mode;
    try {
      window.localStorage.setItem(FIDELITY_STORAGE_KEY, mode);
    } catch {
      /* storage unavailable: session keeps its current state */
    }
    this.emit();
  }

  getEmaMs(): number {
    return this.emaMs;
  }

  setOverride(tier: QualityTier | null): void {
    if (tier === this.override) return;
    this.override = tier;
    this.persist();
    this.emit();
  }

  isStreaming(): boolean {
    return this.streaming;
  }

  // --- scene load (feedforward, see volumeLoadFactor) -----------------------
  /** Register one mounted full-screen volume raymarch pass; call the returned
   * disposer on unmount. Pass-count changes are rare (layer add/remove/
   * visibility, merge-group membership) — safe to `emit()`. */
  registerVolumePass(): () => void {
    this.setVolumePassCount(this.volumePasses + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.setVolumePassCount(Math.max(0, this.volumePasses - 1));
    };
  }

  setVolumePassCount(count: number): void {
    if (count === this.volumePasses) return;
    this.volumePasses = count;
    this.emit();
  }

  getVolumePassCount(): number {
    return this.volumePasses;
  }

  /** `volumeLoadFactor` of the current pass count. */
  getLoadFactor(): number {
    return volumeLoadFactor(this.volumePasses);
  }

  /** Edge events from the residency manager's drain loop. */
  setStreaming(streaming: boolean): void {
    if (streaming === this.streaming) return;
    this.streaming = streaming;
    this.emit();
  }

  getSettleRefineStage(): number {
    return this.settleRefineStage;
  }

  /**
   * Settle refinement ladder stage — TRANSIENT, never persisted, driven only
   * by the VolumeCompositor (advance after a settled full-res render, reset
   * on motion/streaming/flag-off/unmount). The emit reaches
   * `useStepScaleUniform` which recomputes `uMaxSteps` (image material only)
   * and requests one frame; the compositor's `qualityVersion` cache key
   * makes that exactly one volume re-render per stage. A tier/fidelity emit
   * while a stage is held simply re-renders once at the new profile's
   * boosted-but-ceiling-clamped budget — a correct settled image.
   */
  setSettleRefineStage(stage: number): void {
    const next = Math.min(MAX_SETTLE_REFINE_STAGES, Math.max(0, Math.round(stage)));
    if (next === this.settleRefineStage) return;
    this.settleRefineStage = next;
    this.emit();
  }

  // --- learning -------------------------------------------------------------
  /**
   * Feed one frame delta (ms). `nowMs` is injectable for tests; `active`
   * (camera moving or streaming) disambiguates deltas ≥ 250 ms — while idle
   * they are demand-frameloop gaps and are discarded, but during real work
   * they are the worst frames the user sees and count as WEIGHTED slow votes
   * (capped at `SLOW_VOTE_CAP`, so a single spike still can't demote).
   *
   * Streaks are counted on the DELTAS themselves (consecutive slow / fast
   * frames), not on the EMA: after a demote the EMA still reflects the OLD
   * tier's cost and would cascade further demotes before the cheaper tier had
   * a chance to prove itself. One in-band or opposite frame resets a streak —
   * demotion needs 15 genuinely consecutive slow-frame votes, promotion 120
   * consecutive fast frames plus the post-demote cooldown. The EMA remains
   * for display/telemetry (fed with the clamped delta for long frames).
   */
  recordFrame(deltaMs: number, nowMs: number = performance.now(), active = false): void {
    if (deltaMs <= 0) return;
    if (deltaMs >= MAX_CONTINUOUS_DELTA_MS) {
      if (!active) return; // idle demand-frameloop gap, not frame cost
      this.emaMs =
        this.emaMs === 0
          ? MAX_CONTINUOUS_DELTA_MS
          : this.emaMs + (MAX_CONTINUOUS_DELTA_MS - this.emaMs) / EMA_WINDOW;
      this.slowFrames += Math.min(SLOW_VOTE_CAP, Math.ceil(deltaMs / DEMOTE_FRAME_MS));
      this.fastFrames = 0;
      this.maybeDemote(nowMs);
      return;
    }
    this.emaMs =
      this.emaMs === 0 ? deltaMs : this.emaMs + (deltaMs - this.emaMs) / EMA_WINDOW;

    if (deltaMs > DEMOTE_FRAME_MS) {
      this.slowFrames += 1;
      this.fastFrames = 0;
      this.maybeDemote(nowMs);
    } else if (deltaMs < PROMOTE_FRAME_MS) {
      this.fastFrames += 1;
      this.slowFrames = 0;
      if (
        this.fastFrames >= PROMOTE_AFTER_FAST_FRAMES &&
        this.autoTier > TIER_HIGH &&
        nowMs - this.lastDemoteAt > PROMOTE_COOLDOWN_MS
      ) {
        this.autoTier = clampTier(this.autoTier - 1);
        this.fastFrames = 0;
        this.persist();
        if (this.override === null) this.emit();
      }
    } else {
      this.slowFrames = 0;
      this.fastFrames = 0;
    }
  }

  private maybeDemote(nowMs: number): void {
    if (this.slowFrames >= DEMOTE_AFTER_SLOW_FRAMES && this.autoTier < TIER_LOW) {
      this.autoTier = clampTier(this.autoTier + 1);
      this.slowFrames = 0;
      this.lastDemoteAt = nowMs;
      this.persist();
      if (this.override === null) this.emit();
    }
  }
}

/** Process-wide singleton — machine performance is global, not per-scene. */
export const qualityGovernor = new QualityGovernor();
