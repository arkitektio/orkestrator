/**
 * Opt-in CPU/GPU performance monitor for the scene renderer.
 *
 * This is DISABLED by default and does nothing until the user explicitly starts
 * a recording (the DebugPanel "Start report" button). Every instrumentation hook
 * first-lines `if (!this.recording) return`, so outside a session the cost is one
 * boolean check — the render hot path is untouched.
 *
 * While recording it captures, per frame, the main-thread time, the frame PERIOD,
 * the render-call count and the GPU frame time (all fed in by `PerfFrameProbe`),
 * plus session counters: per-component React render counts, replans, visibility
 * recomputes, and brick uploads. `buildSessionReport()` aggregates the recorded
 * window into a JSON blob that the DebugPanel folds into "Copy debug report" — a
 * targeted bug report for exactly the seconds the user was panning.
 *
 * THREE TIMES, DELIBERATELY DISTINCT — an earlier version reported only the
 * rAF-to-rAF period and called it `frameCpuMs`, which made `cpuMs.avg` exactly
 * `1000/fps` by construction and `jankFrames` a restatement of "slower than
 * 20 fps". Neither said anything about where the time went.
 *  - `framePeriodMs`     rAF-to-rAF wall time. fps derives from THIS and only this.
 *                        On a demand frameloop a long period is often an idle gap.
 *  - `frameMainThreadMs` before-effects → after-effects: the honest main-thread
 *                        cost of the frame (every useFrame subscriber, the render
 *                        call(s), r3f internals). Jank is judged on this.
 *  - `gpuMs`             WebGPU timestamp-query pass time; null on adapters
 *                        without `timestamp-query`.
 * The main-thread/GPU split is the signal: a long `frameMainThreadMs` with a small
 * `gpuMs` is a main-thread stall (e.g. a React re-render storm), not a GPU bound.
 *
 * `renderCalls` is the fourth number and exists to keep the probe honest about
 * ITSELF: it counts `renderer.render()` invocations per frame, so anything that
 * quietly rasterizes the scene an extra time shows up here rather than as a
 * mysterious drop in fps. Note the baseline is 5, not 2 — the renderer's
 * tone-map/colour output pass is itself a counted render and runs after every
 * scene render AND every clear. See PerfFrameProbe for the decomposition.
 *
 * Kept free of the renderer and React so it is unit-testable; the rAF timing
 * loop lives in `PerfFrameProbe`.
 */

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : 0;

/** Frames beyond this auto-stop the session so a forgotten recording can't grow
 * unbounded (~66 s at 60 fps). The captured window is preserved. */
const MAX_FRAMES = 4000;

/** Main-thread frame time (ms) above which a frame is counted as "jank". Judged
 * on `frameMainThreadMs`, NOT the period: a long period on a demand frameloop is
 * an idle gap, and counting those as jank was pure noise. */
const JANK_MS = 50;

export type FrameSample = {
  /** ms since the session started. */
  tMs: number;
  /** rAF-to-rAF wall time. Includes vsync wait and compositing — fps derives
   * from this. NOT a cost measure; see `frameMainThreadMs`. */
  framePeriodMs: number;
  /** Main-thread time spent inside the frame (all useFrame subscribers + the
   * render call(s) + r3f internals), from before-effects to after-effects. */
  frameMainThreadMs: number;
  /** `renderer.render()` invocations this frame. Baseline is 5 — see the module
   * doc; anything above that means something is rasterizing an extra time. */
  renderCalls: number;
  /** GPU time for the frame, or null when timer queries are unavailable. */
  gpuMs: number | null;
  cameraMoving: boolean;
  bricksUploaded: number;
  bytesUploaded: number;
};

export type PerfSessionReport = {
  durationMs: number;
  frameCount: number;
  truncated: boolean;
  fps: number;
  /** Main-thread cost per frame — the number to compare against `gpuMs`. */
  cpuMs: { min: number; avg: number; max: number; p95: number };
  /** rAF-to-rAF period. Kept separate so `cpuMs` can no longer be mistaken for
   * it; `periodMs.avg` ≈ `1000/fps` by definition, `cpuMs.avg` should be lower. */
  periodMs: { min: number; avg: number; max: number; p95: number };
  gpuMs: { min: number; avg: number; max: number; samples: number } | null;
  renderCalls: { min: number; avg: number; max: number };
  jankFrames: number;
  movingFrames: number;
  /** React render counts over the session, per component name, highest first. */
  renderCounts: Record<string, number>;
  replans: number;
  visibilityRecomputes: number;
  /** Probe evaluations (CPU march / plane read / mesh pick) over the session.
   * The gating in `platform/probe/probeGating.ts` is only verifiable against this:
   * it must read zero for a NAVIGATE-mode sweep. */
  probes: number;
  bricksUploaded: number;
  bytesUploaded: number;
};

class PerfMonitor {
  private recording = false;
  private startedAt = 0;
  private truncated = false;
  private frames: FrameSample[] = [];
  private renderCounts = new Map<string, number>();
  private replans = 0;
  private visibilityRecomputes = 0;
  private probes = 0;
  private pendingBricks = 0;
  private pendingBytes = 0;
  private readonly listeners = new Set<() => void>();

  isRecording(): boolean {
    return this.recording;
  }

  /** Notified whenever recording starts or stops (for React `useSyncExternalStore`). */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /** Arm a fresh recording, discarding any previous session's buffers. */
  startRecording(): void {
    this.recording = true;
    this.startedAt = now();
    this.truncated = false;
    this.frames = [];
    this.renderCounts = new Map();
    this.replans = 0;
    this.visibilityRecomputes = 0;
    this.probes = 0;
    this.pendingBricks = 0;
    this.pendingBytes = 0;
    this.emit();
  }

  /** Disarm; the captured buffers are retained for `buildSessionReport()`. */
  stopRecording(): void {
    if (!this.recording) return;
    this.recording = false;
    this.emit();
  }

  countRender(name: string): void {
    if (!this.recording) return;
    this.renderCounts.set(name, (this.renderCounts.get(name) ?? 0) + 1);
  }

  markReplan(): void {
    if (!this.recording) return;
    this.replans += 1;
  }

  markVisibilityRecompute(): void {
    if (!this.recording) return;
    this.visibilityRecomputes += 1;
  }

  /** One probe evaluation — a CPU march, a plane read, or a mesh pick. */
  markProbe(): void {
    if (!this.recording) return;
    this.probes += 1;
  }

  /** Accumulated into the next recorded frame. */
  markUpload(bricks: number, bytes: number): void {
    if (!this.recording) return;
    this.pendingBricks += bricks;
    this.pendingBytes += bytes;
  }

  /** Called once per animation frame by `PerfFrameProbe` while recording. */
  recordFrame(sample: {
    framePeriodMs: number;
    frameMainThreadMs: number;
    renderCalls: number;
    gpuMs: number | null;
    cameraMoving: boolean;
  }): void {
    if (!this.recording) return;
    this.frames.push({
      tMs: now() - this.startedAt,
      framePeriodMs: sample.framePeriodMs,
      frameMainThreadMs: sample.frameMainThreadMs,
      renderCalls: sample.renderCalls,
      gpuMs: sample.gpuMs,
      cameraMoving: sample.cameraMoving,
      bricksUploaded: this.pendingBricks,
      bytesUploaded: this.pendingBytes,
    });
    this.pendingBricks = 0;
    this.pendingBytes = 0;

    if (this.frames.length >= MAX_FRAMES) {
      this.truncated = true;
       
      console.warn(
        `[perfMonitor] recording auto-stopped at ${MAX_FRAMES} frames (cap reached)`,
      );
      this.stopRecording();
    }
  }

  /** Aggregate the recorded window; null when nothing was captured. */
  buildSessionReport(): PerfSessionReport | null {
    const frames = this.frames;
    if (frames.length === 0) return null;

    const durationMs =
      frames[frames.length - 1].tMs - frames[0].tMs || frames[0].framePeriodMs;

    const spread = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        min: sorted[0],
        avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        max: sorted[sorted.length - 1],
        p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
      };
    };

    const cpu = spread(frames.map((f) => f.frameMainThreadMs));
    const period = spread(frames.map((f) => f.framePeriodMs));
    const calls = spread(frames.map((f) => f.renderCalls));

    const gpuVals = frames
      .map((f) => f.gpuMs)
      .filter((v): v is number => v != null);
    const gpu =
      gpuVals.length > 0
        ? {
            min: Math.min(...gpuVals),
            avg: gpuVals.reduce((a, b) => a + b, 0) / gpuVals.length,
            max: Math.max(...gpuVals),
            samples: gpuVals.length,
          }
        : null;

    const renderCounts: Record<string, number> = {};
    for (const [name, count] of [...this.renderCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      renderCounts[name] = count;
    }

    return {
      durationMs,
      frameCount: frames.length,
      truncated: this.truncated,
      fps: durationMs > 0 ? (frames.length / durationMs) * 1000 : 0,
      cpuMs: cpu,
      periodMs: period,
      gpuMs: gpu,
      renderCalls: { min: calls.min, avg: calls.avg, max: calls.max },
      jankFrames: frames.filter((f) => f.frameMainThreadMs > JANK_MS).length,
      movingFrames: frames.filter((f) => f.cameraMoving).length,
      renderCounts,
      replans: this.replans,
      visibilityRecomputes: this.visibilityRecomputes,
      probes: this.probes,
      bricksUploaded: frames.reduce((a, f) => a + f.bricksUploaded, 0),
      bytesUploaded: frames.reduce((a, f) => a + f.bytesUploaded, 0),
    };
  }
}

/** Process-wide singleton — one recording at a time. */
export const perfMonitor = new PerfMonitor();
