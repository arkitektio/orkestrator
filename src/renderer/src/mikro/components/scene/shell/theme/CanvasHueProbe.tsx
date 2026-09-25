import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useSettings } from "@/providers/settings/SettingsContext";
import type { BrandTarget } from "@/providers/settings/brandTheme";
import { qualityGovernor } from "../../platform/quality/qualityGovernor";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { useViewStoreApi } from "../../platform/stores/viewStore";
import { majorityHueFromPixels, sameBrandTarget } from "./majorityHue";

/** Edge of the square the frame is downscaled to before reading. 1024 pixels
 * is plenty to find a majority and keeps the readback at 4 KB. */
const SAMPLE_SIZE = 32;

/** How long the canvas must sit still before a sample is analysed. Generous
 * on purpose: the tint is a secondary effect, so it should settle in after
 * the view does, not chase it. */
const QUIET_MS = 750;

/** During CONTINUOUS rendering (orbit, animation playback) the quiet period
 * never arrives — sample at least this often so the tint still follows,
 * unhurried. */
const MAX_WAIT_MS = 4000;

/**
 * Minimum gap between CAPTURES while the camera is moving.
 *
 * The capture is a GPU blit and cheap in isolation, but it runs in an
 * after-effect on every rendered frame — i.e. ~60×/s during exactly the
 * gesture the user is complaining feels heavy, to feed a tint that by its own
 * design updates at most every `MAX_WAIT_MS`. Throttling to ~4 Hz while moving
 * keeps the tint following a long orbit while dropping ~93% of the blits.
 * Settled frames are NOT throttled: the first frame after a gesture should tint
 * exactly, immediately.
 */
const MOVING_CAPTURE_INTERVAL_MS = 250;

type Scratch = {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
};

const makeScratch = (options?: CanvasRenderingContext2DSettings): Scratch | null => {
  const canvas = new OffscreenCanvas(SAMPLE_SIZE, SAMPLE_SIZE);
  const ctx = canvas.getContext("2d", options);
  if (!ctx) return null;
  // "copy" replaces every pixel including alpha — no clear pass, and no
  // blending against the previous snapshot.
  ctx.globalCompositeOperation = "copy";
  return { canvas, ctx };
};

/**
 * Samples the RENDERED canvas and publishes its majority hue as the scene's
 * sampled brand target (`viewerStore.sampledBrandTarget`), which
 * `SceneBrandTheme` prefers over the colormap-derived estimate — so the app
 * tint follows what is actually on screen, not what the render graph predicts.
 *
 * Capture and analysis are two stages, and the split is load-bearing:
 *
 *   1. CAPTURE — a `drawImage` downscale of the frame into a persistent
 *      32×32 canvas, in `addAfterEffect`, i.e. the same task that rendered.
 *      It cannot happen any later: the scene renders on demand with no
 *      preserveDrawingBuffer, so once the task yields and the frame is
 *      presented, reading the canvas yields transparent black (the same fact
 *      that forces `SceneScreenshot` to re-render offscreen). The blit is a
 *      GPU-side scale to 1024 texels — negligible next to the frame that
 *      just rendered, which is why paying it per frame is fine.
 *
 *   2. ANALYSIS — debounced off the frame loop (`QUIET_MS` of stillness,
 *      capped by `MAX_WAIT_MS` so sustained motion still updates). The 32×32
 *      snapshot canvas is a plain 2D canvas whose contents persist, so the
 *      late read is safe. It is bounced through `createImageBitmap` into a
 *      second, CPU-side scratch before `getImageData`: reading the GPU-backed
 *      snapshot directly would both sync-flush the GPU and, worse, invite
 *      Chromium's readback heuristic to quietly demote it to software —
 *      turning the per-frame blit of stage 1 into a full-resolution CPU
 *      readback. The bitmap hop keeps the hot canvas write-only.
 *
 * Renders null; mount inside `<Canvas>`.
 */
export const CanvasHueProbe = () => {
  const gl = useThree((state) => state.gl);
  const viewerApi = useViewerStoreApi();
  const viewApi = useViewStoreApi();
  const { settings } = useSettings();
  const enabled = settings.sceneThemeSync !== false;

  // Frame-loop closures are long-lived; refs keep them reading current values
  // without resubscribing.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const clockRef = useRef({
    /** Set by useFrame, consumed by the after-effect: THIS canvas rendered in
     * the current loop tick (the after-effect hook is global to all roots). */
    framePending: false,
    /** The snapshot canvas holds a real frame (not its initial blank). */
    snapshotValid: false,
    lastFrameAt: 0,
    /** When the last CAPTURE ran — the throttle clock while moving. */
    lastCaptureAt: 0,
    /** When the first unanalysed frame landed; null = nothing pending. */
    dirtySince: null as number | null,
    timer: null as ReturnType<typeof setTimeout> | null,
    sampling: false,
    disposed: false,
    /** Starts null to match the store default, so a blank first sample
     * publishes nothing. */
    lastPublished: null as BrandTarget | null,
  });
  /** GPU-backed snapshot target — written every frame, never read directly. */
  const snapshotRef = useRef<Scratch | null>(null);
  /** CPU-side readback canvas — only ever sees 32×32 bitmaps. */
  const readbackRef = useRef<Scratch | null>(null);

  const sample = async (): Promise<void> => {
    const clock = clockRef.current;
    if (clock.sampling) return;
    clock.sampling = true;
    try {
      const snapshot = snapshotRef.current;
      if (!snapshot || !clock.snapshotValid) return;
      if (readbackRef.current === null) {
        readbackRef.current = makeScratch({ willReadFrequently: true });
        if (readbackRef.current === null) return;
      }
      const { ctx } = readbackRef.current;

      const bitmap = await createImageBitmap(snapshot.canvas);
      try {
        ctx.drawImage(bitmap, 0, 0);
      } finally {
        bitmap.close();
      }
      const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

      const target = majorityHueFromPixels(data);
      if (clock.disposed) return;
      if (sameBrandTarget(clock.lastPublished, target)) return;
      clock.lastPublished = target;
      viewerApi.getState().setSampledBrandTarget(target);
    } catch {
      // A failed capture keeps the last published target; the next frame
      // re-arms the debounce anyway.
    } finally {
      clock.sampling = false;
    }
  };

  const check = () => {
    const clock = clockRef.current;
    clock.timer = null;
    if (clock.disposed || clock.dirtySince === null) return;
    const now = performance.now();
    const quietFor = now - clock.lastFrameAt;
    if (quietFor >= QUIET_MS || now - clock.dirtySince >= MAX_WAIT_MS) {
      clock.dirtySince = null;
      void sample();
    } else {
      clock.timer = setTimeout(check, Math.max(QUIET_MS - quietFor, 16));
    }
  };

  // Flag-only: runs before this canvas renders; the capture itself must wait
  // for the rendered frame (the after-effect below).
  useFrame(() => {
    clockRef.current.framePending = true;
  });

  useEffect(() => {
    const clock = clockRef.current;
    const capture = () => {
      if (!clock.framePending) return;
      clock.framePending = false;
      if (!enabledRef.current) return;

      // Throttle while the scene is ACTIVE — camera motion or brick streaming
      // (the same definition QualityAdapter uses): a streaming burst drives
      // frames continuously with the camera at rest, and every one of them
      // paid a full drawImage for a tint that updates at most every QUIET_MS.
      // Read imperatively: this is an after-effect, never a React subscription.
      const captureAt = performance.now();
      if (
        (viewApi.getState().cameraMoving || qualityGovernor.isStreaming()) &&
        captureAt - clock.lastCaptureAt < MOVING_CAPTURE_INTERVAL_MS
      ) {
        return;
      }
      clock.lastCaptureAt = captureAt;

      const source = gl.domElement;
      if (!source || source.width === 0 || source.height === 0) return;
      if (snapshotRef.current === null) {
        snapshotRef.current = makeScratch();
        if (snapshotRef.current === null) return;
      }

      // Same-task with the render — the ONLY moment the frame is readable.
      snapshotRef.current.ctx.drawImage(source, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      clock.snapshotValid = true;

      const now = performance.now();
      clock.lastFrameAt = now;
      if (clock.dirtySince === null) clock.dirtySince = now;
      if (clock.timer === null) clock.timer = setTimeout(check, QUIET_MS);
    };
    return addAfterEffect(capture);
    // check/sample are stable in behaviour (all state lives in refs); gl is
    // the one real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, viewApi]);

  // Turning the setting off mid-scene hands the tint back to the colormap
  // estimate immediately rather than freezing the last sample.
  useEffect(() => {
    if (enabled) return;
    const clock = clockRef.current;
    clock.dirtySince = null;
    clock.snapshotValid = false;
    clock.lastPublished = null;
    viewerApi.getState().setSampledBrandTarget(null);
  }, [enabled, viewerApi]);

  useEffect(() => {
    const clock = clockRef.current;
    clock.disposed = false;
    return () => {
      clock.disposed = true;
      if (clock.timer !== null) {
        clearTimeout(clock.timer);
        clock.timer = null;
      }
      // The store can outlive this canvas (viewport unmount without a scope
      // teardown) — don't leave it pinned to a frame nobody renders anymore.
      viewerApi.getState().setSampledBrandTarget(null);
    };
  }, [viewerApi]);

  return null;
};
