import { useEffect, useRef, useSyncExternalStore } from "react";
import { addAfterEffect, addEffect, useThree } from "@react-three/fiber";
import { TimestampQuery, type WebGPURenderer } from "three/webgpu";
import { perfMonitor } from "./perfMonitor";
import { useViewStoreApi } from "../stores/viewStore";

/**
 * React binding for the opt-in perf monitor. `PerfFrameProbe` is always mounted
 * but does nothing until a recording is armed (DebugPanel "Start report"). Only
 * then does it mount `RecordingProbe`, which forces continuous rendering and
 * measures each frame's main-thread and GPU time. When recording stops it
 * unmounts and the scene returns to its demand frameloop — zero overhead outside
 * a session.
 *
 * THE PROBE MUST NOT RENDER. It used to measure from a `useFrame(cb, 1)` that
 * called `gl.render(scene, camera)` itself. r3f suppresses its own render as
 * soon as ANY subscriber has priority > 0, so that was correct in isolation —
 * but `GizmoHelper` (then in SceneViewport) wraps drei's `Hud`, whose
 * `RenderHud` also subscribes at priority 1 and, in that branch, renders the
 * full main scene before its own overlay. Both subscribers ran, so arming a
 * recording rasterized the whole scene TWICE per frame and the report blamed
 * the resulting ~half
 * framerate on the scene. Measuring from `addEffect`/`addAfterEffect` brackets
 * the frame without participating in it: the Hud stays the sole renderer, and
 * the recording measures the same pipeline the user experiences when idle.
 *
 * `renderCalls` is reported per frame so this can never regress silently again.
 * The decomposition is worth knowing: `needsFrameBufferTarget` is true (R3F
 * applies ACES tone mapping + sRGB output), so three renders into an
 * offscreen target and then runs a full-screen output pass — and that pass is
 * itself a counted `render()`. With no drei Hud mounted (the historical
 * baseline of 5 included one) the plain frame is 2: main(1) + output(2).
 * Under the volume compositor (`orkestrator.volumeTarget`) a frame that
 * re-renders the volume target counts 3 (volume RT + main + output), or 4
 * with the occluder depth prepass; a cached-composite frame stays at 2.
 * NOTE: a SECOND priority>0 useFrame subscriber (e.g. drei Hud) would
 * double-render alongside the compositor's takeover — keep it the only one.
 * As of 2026-08-28 no `GizmoHelper` is mounted, so the compositor's is the
 * ONLY priority>0 subscriber in the scene. Cinematic post-processing
 * (`platform/gpu/volumePost.ts`) deliberately relies on that: it lives in the
 * composite quad's node graph rather than in a pipeline of its own, precisely
 * so it adds no subscriber.
 *
 * CINEMATIC BLOOM ADDS RENDER CALLS. `BloomNode.updateBefore` runs a high-pass
 * plus a horizontal and a vertical blur per mip level and a composite — each a
 * counted `render()` — so a bloomed frame's `renderCalls` is far above the
 * counts quoted here. Those baselines describe SCIENTIFIC mode (and cinematic
 * with glow off, which emits no bloom nodes at all).
 */

/** React subscription to the monitor's recording flag. */
export function usePerfRecording(): boolean {
  return useSyncExternalStore(
    (cb) => perfMonitor.subscribe(cb),
    () => perfMonitor.isRecording(),
  );
}

const RecordingProbe = () => {
  const gl = useThree((s) => s.gl);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const viewApi = useViewStoreApi();
  /** Start of the previous frame's before-effect — the period baseline. */
  const lastRef = useRef<number | null>(null);
  /** Start of THIS frame's before-effect, read back in the after-effect. */
  const frameStartRef = useRef<number>(0);
  /** `gl.info.render.calls` at this frame's start; the delta is the count. */
  const callsAtStartRef = useRef<number>(0);
  const gpuMsRef = useRef<number | null>(null);

  useEffect(() => {
    // A recording needs a frame every tick to sample; take over the render loop.
    setFrameloop("always");
    // GPU timing is scoped to the recording: timestamp writes flood the query
    // pool unless someone resolves them every frame (which only this probe
    // does), so Scene.tsx parks trackTimestamp off and we flip it here.
    const backend = (
      gl as unknown as {
        backend?: {
          trackTimestamp?: boolean;
          __timestampQuerySupported?: boolean;
          device?: { features?: { has: (name: string) => boolean } };
        };
      }
    ).backend;
    // The flag the renderer factory parked is the first answer; the DEVICE's
    // own feature set is the authoritative one. A report from an RTX 4070
    // whose adapter offers `timestamp-query` still came back `gpuMs: null`, so
    // trust the device when the two disagree — and say which it was.
    const deviceHasTimestamps = backend?.device?.features?.has("timestamp-query") === true;
    const timestamps = backend?.__timestampQuerySupported === true || deviceHasTimestamps;
    if (backend && timestamps) backend.trackTimestamp = true;
    perfMonitor.setGpuTiming({
      factoryFlag: backend?.__timestampQuerySupported ?? null,
      deviceHasTimestampQuery: deviceHasTimestamps,
      tracking: backend?.trackTimestamp === true,
    });
    return () => {
      setFrameloop("demand");
      if (backend && timestamps) {
        // Drain the queries this session wrote, THEN stop tracking (the
        // resolve itself is gated on the flag).
        void (gl as unknown as WebGPURenderer)
          .resolveTimestampsAsync(TimestampQuery.RENDER)
          .catch(() => undefined)
          .finally(() => {
            backend.trackTimestamp = false;
          });
      }
      lastRef.current = null;
      gpuMsRef.current = null;
    };
  }, [setFrameloop, gl]);

  // Main-thread attribution for the frames the bracket below cannot see:
  // a long animation frame names the scripts (invoker + function + source)
  // that held the main thread, INCLUDING work between frames — timers, store
  // subscriptions, React commits. A missed frame with no overlapping entry
  // means the main thread was free: the GPU process held it up.
  useEffect(() => {
    const supported =
      typeof PerformanceObserver !== "undefined" &&
      (PerformanceObserver.supportedEntryTypes ?? []).includes("long-animation-frame");
    perfMonitor.setLongAnimationFrameSupported(supported);
    if (!supported) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LongAnimationFrameEntry[]) {
        perfMonitor.addLongAnimationFrame({
          startTime: entry.startTime,
          durationMs: entry.duration,
          blockingMs: entry.blockingDuration ?? 0,
          scripts: (entry.scripts ?? [])
            .slice()
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5)
            .map((script) => ({
              invoker: script.invoker ?? "",
              sourceFunctionName: script.sourceFunctionName ?? "",
              sourceURL: shortSource(script.sourceURL ?? "", script.sourceCharPosition),
              durationMs: script.duration,
            })),
        });
      }
    });
    observer.observe({ type: "long-animation-frame", buffered: false });
    return () => observer.disconnect();
  }, []);

  // Bracket the frame from OUTSIDE the render loop. r3f runs global effects
  // 'before' → every root's update() (all useFrame subscribers + the render) →
  // 'after', so this pair spans the whole main-thread frame without adding a
  // subscriber that would suppress or duplicate the render.
  useEffect(() => {
    const info = (gl as unknown as { info?: { render?: { calls?: number } } }).info;
    // `render.calls` is monotonic in three — Info.reset() zeroes drawCalls and
    // frameCalls each frame but deliberately not this one, so the delta across
    // the bracket is exactly the number of renderer.render() invocations.
    const readCalls = () => info?.render?.calls ?? 0;

    const unBefore = addEffect(() => {
      frameStartRef.current = performance.now();
      callsAtStartRef.current = readCalls();
    });

    const unAfter = addAfterEffect(() => {
      const end = performance.now();
      const start = frameStartRef.current;
      const periodMs = lastRef.current == null ? 0 : start - lastRef.current;
      lastRef.current = start;

      // Skip the first frame (no previous frame to diff the period against).
      if (periodMs > 0) {
        perfMonitor.recordFrame({
          framePeriodMs: periodMs,
          frameMainThreadMs: end - start,
          renderCalls: readCalls() - callsAtStartRef.current,
          // WebGPU timestamp-query pass time (Scene.tsx parks trackTimestamp
          // off; the effect above flips it on for the recording). The resolve
          // below is async, so this is the PREVIOUS frame's GPU time — a
          // one-frame skew that doesn't matter for session aggregates. Stays
          // null on adapters without timestamp-query.
          gpuMs: gpuMsRef.current,
          cameraMoving: viewApi.getState().cameraMoving,
        });
      }

      // Kick this frame's readback. The backend self-clears trackTimestamp when
      // the adapter lacks the feature — guard so we never trip three's warnOnce.
      const backend = (gl as unknown as { backend?: { trackTimestamp?: boolean } })
        .backend;
      if (backend?.trackTimestamp === true) {
        void (gl as unknown as WebGPURenderer)
          .resolveTimestampsAsync(TimestampQuery.RENDER)
          .then((ms) => {
            gpuMsRef.current = typeof ms === "number" ? ms : null;
          })
          .catch(() => {
            gpuMsRef.current = null;
          });
      }
    });

    return () => {
      unBefore();
      unAfter();
    };
  }, [gl, viewApi]);

  return null;
};

/** The structural slice of the `long-animation-frame` entry this reads
 * (not in this project's DOM lib yet). */
type LongAnimationFrameEntry = PerformanceEntry & {
  blockingDuration?: number;
  scripts?: Array<{
    duration: number;
    invoker?: string;
    sourceFunctionName?: string;
    sourceURL?: string;
    sourceCharPosition?: number;
  }>;
};

/** A dev-server URL down to its module path, plus the char offset. */
const shortSource = (url: string, charPosition?: number): string => {
  const path = url.replace(/^[a-z]+:\/\/[^/]+/i, "").replace(/\?.*$/, "");
  return charPosition !== undefined && charPosition >= 0 ? `${path}:${charPosition}` : path;
};

export const PerfFrameProbe = () => {
  const recording = usePerfRecording();
  return recording ? <RecordingProbe /> : null;
};
