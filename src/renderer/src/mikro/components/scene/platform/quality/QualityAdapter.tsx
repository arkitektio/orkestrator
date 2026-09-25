import { useEffect, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  nextLadderRungDown,
  predictBurstLadderScale,
  qualityGovernor,
  resolveDpr,
  shouldStepBurstRungDown,
} from "./qualityGovernor";
import { getGpuKey, type SceneRenderer } from "../gpu/sceneRenderer";
import { ladderFeedforwardPassCount } from "../gpu/volumeCompositor";
import { useViewStoreApi } from "../stores/viewStore";

/**
 * React binding for the quality governor (P19): feeds frame times in, applies
 * the tier's DPR out.
 *
 * - `useFrame` records rAF deltas into the governor (refs only — no store
 *   writes, P17). The governor demotes/promotes the machine's tier from
 *   sustained streaks with hysteresis; the learned tier persists per GPU.
 * - "Active" = camera moving OR bricks streaming — the streaming half is what
 *   the old motion-only regress missed: after a gesture, every residency bump
 *   rendered a full-quality frame for seconds. Active frames render at the
 *   tier's cheaper DPR, settle restores the crisp one.
 * - The interaction DPR ladder (`predictBurstLadderScale`) further scales the
 *   active DPR by the frame-time EMA — one quantized rung decided at BURST
 *   ENTRY and held for the whole burst, so a gesture pays at most ONE
 *   render-target realloc. Frames rendered right after a `setDpr` are never
 *   fed to the governor (they measure the realloc, not the tier). Kill
 *   switch: `orkestrator.adaptiveDpr` (read per frame; DebugPanel toggle).
 * - The active→settled DPR restore is HYSTERETIC (`SETTLE_RESTORE_MS`): every
 *   `setDpr` change reallocates the render targets, and `cameraMoving`'s
 *   trailing debounce plus streaming on/off chatter used to bounce the DPR
 *   1.0↔1.5 several times per gesture — each bounce a multi-hundred-ms
 *   realloc spike. Dropping to the active DPR stays immediate (demotes must
 *   land mid-gesture); only the restore waits for sustained quiet.
 *
 * Must be inside the Canvas. The 3D step-scale half of the profile is applied
 * by `BrickVolumeLayer` (same governor subscription).
 */

/** How long activity must stay quiet before the crisp settled DPR returns. */
const SETTLE_RESTORE_MS = 500;

/**
 * How long activity must be SUSTAINED before the cheaper active DPR applies.
 * Every DPR change reallocates the render targets (a multi-hundred-ms spike
 * on its own), so a lone wheel notch — whose activity window is just the
 * motion frames plus the 150 ms camera settle — must never pay the
 * drop+restore realloc pair. Real gestures and streaming bursts run well past
 * this and still get the cheap DPR for their duration. With the interaction
 * DPR ladder every tier can drop while active (HIGH included — its EMA has to
 * earn it), but a burst shorter than this delay still never reallocates.
 */
const ACTIVE_DPR_DELAY_MS = 250;

/** How long a burst must have rendered before the ONE allowed mid-burst rung
 * correction may fire — the EMA (window 20) must reflect the burst's own
 * frames, not pre-burst history, before it can justify the extra realloc. */
const MID_BURST_CORRECT_AFTER_MS = 450;

export const QualityAdapter = () => {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const initialDpr = useThree((s) => s.viewport.initialDpr);
  const invalidate = useThree((s) => s.invalidate);
  // `cameraMoving` is read imperatively, never subscribed: it flips on every
  // leading camera emission and every settle, and both consumers below already
  // run outside React (a useFrame and a store subscription). Subscribing only
  // bought a re-render per flip.
  const viewApi = useViewStoreApi();
  // Rare notifications: tier / override / streaming flips.
  useSyncExternalStore(qualityGovernor.subscribe, () => qualityGovernor.getVersion());

  const lastFrameAtRef = useRef<number | null>(null);
  const appliedDprRef = useRef<number | null>(null);
  /** Wall-clock stamp of when activity last went quiet (null while active). */
  const settledAtRef = useRef<number | null>(null);
  /** Wall-clock stamp of when the current activity burst began (null while quiet). */
  const activeSinceRef = useRef<number | null>(null);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The ladder rung for the CURRENT burst — decided ONCE at burst entry
   * (`predictBurstLadderScale`) and held: mid-burst stepping caused a realloc
   * cascade (each setDpr spike inflated the EMA, dropping another rung). */
  const burstLadderScaleRef = useRef(1);
  /** The rung the PREVIOUS burst rendered at — normalizes its EMA when
   * predicting the next burst's rung, so a cheap-because-low-res burst does
   * not oscillate the prediction back up. */
  const lastBurstRungRef = useRef(1);
  /** Whether this burst already used its one mid-burst downward correction. */
  const burstCorrectedRef = useRef(false);
  /** setDpr wrapper that also drops the NEXT frame delta from the governor's
   * learning: that frame measures the render-target realloc, not the tier —
   * and feeding it back is what made the ladder self-amplify. */
  const applyDpr = (dpr: number) => {
    appliedDprRef.current = dpr;
    setDpr(dpr);
    lastFrameAtRef.current = null;
  };

  // Persistence: the learned tier is a property of the GPU, keyed so a
  // driver/GPU change re-learns.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    qualityGovernor.configurePersistence(
      localStorage,
      getGpuKey(gl as unknown as SceneRenderer),
    );
  }, [gl]);

  useFrame(() => {
    const now = performance.now();
    const last = lastFrameAtRef.current;
    lastFrameAtRef.current = now;
    // `active` lets the governor tell a ≥250ms frame during a gesture (real
    // jank, counted with weighted votes) from an idle demand-frameloop gap
    // (discarded). cameraMoving's trailing debounce means a long frame ending
    // just after a gesture still reads as active.
    const active = viewApi.getState().cameraMoving || qualityGovernor.isStreaming();
    if (last !== null) qualityGovernor.recordFrame(now - last, now, active);

    // Apply the profile DPR every frame (cheap compare; setDpr only on change).
    // Doing it here rather than only in an effect catches mid-gesture demotes.
    if (active) {
      settledAtRef.current = null;
      if (activeSinceRef.current === null) {
        activeSinceRef.current = now;
        burstCorrectedRef.current = false;
        // Rung decided ONCE per burst, from the previous burst's
        // rung-normalized EMA — held for the whole gesture so it pays at
        // most one realloc (plus the single correction below). The volume
        // pass count is the scene-load feedforward: a stale post-idle EMA
        // cannot see that six raymarch passes are open, but the mount
        // registry can. Disabled → rung 1 → pre-ladder behavior.
        burstLadderScaleRef.current = true
          ? predictBurstLadderScale(
              qualityGovernor.getEmaMs(),
              lastBurstRungRef.current,
              // With the volume compositor on, raymarch fill lives in the
              // low-res target — the canvas ladder must not also drop for it.
              ladderFeedforwardPassCount(
                true,
                qualityGovernor.getVolumePassCount(),
              ),
            )
          : 1;
      } else if (
        // leading operand it was read on EVERY frame of a gesture (forever, if
        // the correction never fires). The two are order-independent.
        !burstCorrectedRef.current &&
        now - activeSinceRef.current >= MID_BURST_CORRECT_AFTER_MS &&
        shouldStepBurstRungDown(qualityGovernor.getEmaMs(), burstLadderScaleRef.current)
      ) {
        // The ONE allowed mid-burst correction: a burst that entered at too
        // high a rung (stale EMA after idle) used to stay janky for its whole
        // duration — relief only arrived with the NEXT gesture. A single drop
        // is one extra realloc, not the old self-amplifying cascade.
        burstCorrectedRef.current = true;
        burstLadderScaleRef.current = nextLadderRungDown(burstLadderScaleRef.current);
      }
      const dpr = resolveDpr(
        qualityGovernor.getProfile(),
        initialDpr,
        true,
        burstLadderScaleRef.current,
      );
      // Entry hysteresis (ACTIVE_DPR_DELAY_MS): only sustained activity pays
      // the drop realloc — a lone wheel notch stays at the crisp DPR. When
      // the burst PREDICTION already says this scene is heavy (rung < 1),
      // the first quarter-second is exactly the jank being mitigated, so the
      // cheap DPR applies immediately instead.
      const dprDelay = burstLadderScaleRef.current < 1 ? 0 : ACTIVE_DPR_DELAY_MS;
      if (dpr !== appliedDprRef.current && now - activeSinceRef.current >= dprDelay) {
        applyDpr(dpr);
      }
      return;
    }
    if (activeSinceRef.current !== null) {
      // Burst just ended: remember the rung it rendered at for the next
      // burst's normalized prediction.
      lastBurstRungRef.current = burstLadderScaleRef.current;
    }
    activeSinceRef.current = null;
    burstLadderScaleRef.current = 1;
    // Quiet: restore the settled DPR only after SETTLE_RESTORE_MS of
    // continuous quiet (covers the continuous-rendering case; the effect's
    // timer covers the demand-idle case where no frames flow).
    if (settledAtRef.current === null) settledAtRef.current = now;
    if (now - settledAtRef.current >= SETTLE_RESTORE_MS) {
      const dpr = resolveDpr(qualityGovernor.getProfile(), initialDpr, false);
      if (dpr !== appliedDprRef.current) {
        applyDpr(dpr);
      }
    }
  });

  // Settle / streaming-end: the demand frameloop may produce no further frame
  // on its own, so the restore needs a timer — scheduled on every quiet edge,
  // re-checking freshly when it fires so a resumed gesture cancels it.
  useEffect(() => {
    const clearTimer = () => {
      if (restoreTimerRef.current !== null) {
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
    };
    const scheduleRestore = () => {
      clearTimer();
      if (viewApi.getState().cameraMoving || qualityGovernor.isStreaming()) return;
      restoreTimerRef.current = setTimeout(() => {
        restoreTimerRef.current = null;
        if (viewApi.getState().cameraMoving || qualityGovernor.isStreaming()) return;
        const dpr = resolveDpr(qualityGovernor.getProfile(), initialDpr, false);
        if (dpr !== appliedDprRef.current) {
          appliedDprRef.current = dpr;
          setDpr(dpr);
          // Never learn from the realloc frame this setDpr causes.
          lastFrameAtRef.current = null;
          invalidate();
        }
      }, SETTLE_RESTORE_MS);
    };
    scheduleRestore();
    // Both edges that can end a burst: the governor's streaming flag and the
    // camera's motion flag. scheduleRestore re-reads both when it fires, so a
    // resumed gesture cancels the pending restore.
    const unsubscribeQuality = qualityGovernor.subscribe(scheduleRestore);
    const unsubscribeView = viewApi.subscribe(scheduleRestore);
    return () => {
      unsubscribeQuality();
      unsubscribeView();
      clearTimer();
    };
  }, [initialDpr, setDpr, invalidate, viewApi]);

  return null;
};
