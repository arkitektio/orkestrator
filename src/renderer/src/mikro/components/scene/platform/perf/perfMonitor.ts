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
 * MISSED FRAMES. A low `cpuMs` does not mean smooth: a report with cpuMs max
 * 3.7 ms still had a 182 ms period at every drag start/release. The work was
 * either between frames or in the GPU process, where the frame bracket cannot
 * see it. So the recording also keeps a TIMELINE (`markEvent` / `markSpan`:
 * gesture edges, camera settle, replan, visibility, plan writes, volume target
 * resizes, material compiles, repack flushes, DPR, React commits) and the
 * browser's `long-animation-frame` entries. `longFrames` pairs each missed
 * frame with both. An entry inside a missed frame means the main thread was
 * busy and names the script; none means the GPU process held the frame up.
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

/** A frame PERIOD above this is a long frame: its window gets reported with
 * every timeline event and long-animation-frame entry that fell inside it. On a
 * recording the frameloop is "always", so a long period is a missed frame,
 * never an idle gap. */
const LONG_FRAME_MS = 50;

/** Bounded buffers, so a forgotten recording cannot grow without limit. */
const MAX_EVENTS = 8000;
const MAX_LOAF_ENTRIES = 500;
/** The worst long frames kept in the report (by period). */
const MAX_LONG_FRAMES = 40;

/** One point on the recording's timeline: something that happened at `tMs`
 * (ms since the session started), optionally with its own main-thread `ms`. */
export type PerfEvent = {
  tMs: number;
  name: string;
  ms?: number;
  info?: string;
};

/** One script inside a long animation frame (`PerformanceScriptTiming`). */
export type PerfLoafScript = {
  invoker: string;
  sourceFunctionName: string;
  sourceURL: string;
  durationMs: number;
};

/** A `long-animation-frame` entry, rebased onto the session clock. */
export type PerfLoafEntry = {
  tMs: number;
  durationMs: number;
  blockingMs: number;
  scripts: PerfLoafScript[];
};

/**
 * A missed frame and what was going on during it: the timeline events and the
 * main-thread long animation frames inside its window (from the previous
 * frame's start to this frame's end).
 *
 * `loaf` is the deciding signal. A long period WITH an overlapping long
 * animation frame means the main thread was busy; one WITHOUT means it was
 * free, so the frame was held up in the GPU process (a pipeline compile, a
 * reallocation, a queue full of GPU work) and no JS profile will show it.
 */
export type PerfLongFrame = {
  tMs: number;
  periodMs: number;
  mainThreadMs: number;
  gpuMs: number | null;
  cameraMoving: boolean;
  events: PerfEvent[];
  loaf: PerfLoafEntry[];
};

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
  /** Main-thread ms spent in `drainUploads` since the previous frame: the
   * in-frame drain plus every off-frame pump slice (which the frame bracket
   * `frameMainThreadMs` cannot see). */
  drainMs: number;
  offFrameDrainMs: number;
  offFrameDrains: number;
  /** Page-table bytes written (`flushPageTable`) since the previous frame. */
  pageFlushBytes: number;
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
  /** Main-thread time inside those probe evaluations (the CPU march + the
   * store write and everything it synchronously triggers). */
  probeMs: { avg: number; max: number; total: number } | null;
  /** Time inside the canvas `pointermove` handler: R3F's raycast over every
   * object carrying a move handler, plus the handlers themselves (which now
   * include the leading probe). `total / durationMs` is the share of the main
   * thread a sweep spends on input alone. */
  pointerMoveMs: { count: number; avg: number; max: number; total: number } | null;
  /** Volume compositor decisions per frame, by reason. `cached` frames reuse
   * the raymarched target; every other key is a full re-raymarch and names
   * why. A hover sweep with a still camera should be almost all `cached`. */
  volumeFrames: Record<string, number>;
  bricksUploaded: number;
  bytesUploaded: number;
  /** Upload-drain main-thread time over the session: all of it, the part that
   * ran between frames (the pump), how many pump slices there were and the
   * longest one — the stutter the frame numbers alone miss. */
  drainMs: { total: number; offFrame: number; offFrameSlices: number; offFrameMaxMs: number };
  pageFlushBytes: number;
  /** Timeline totals by event name: how often, and the main-thread ms of the
   * timed ones (replan, visibility, React commits, …). */
  events: Record<string, { count: number; totalMs: number; maxMs: number }>;
  /** React commits per `<Profiler>` id (dev builds report durations). */
  reactCommits: Record<string, { count: number; totalMs: number; maxMs: number }>;
  /** Main-thread long animation frames over the session; null when the
   * browser does not support the `long-animation-frame` entry type. */
  longAnimationFrames: { count: number; totalMs: number; maxMs: number } | null;
  /** The worst missed frames, in time order, each with what happened inside it. */
  longFrames: PerfLongFrame[];
  /** How the GPU timing was set up for this session — why `gpuMs` is or is
   * not filled. Written by `PerfFrameProbe`. */
  gpuTiming: Record<string, unknown> | null;
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
  private probeMsTotal = 0;
  private probeMsMax = 0;
  private pointerMoves = 0;
  private pointerMoveMsTotal = 0;
  private pointerMoveMsMax = 0;
  private volumeFrames = new Map<string, number>();
  private pendingBricks = 0;
  private pendingBytes = 0;
  private pendingDrainMs = 0;
  private pendingOffFrameDrainMs = 0;
  private pendingOffFrameDrains = 0;
  private pendingPageFlushBytes = 0;
  private offFrameDrainMaxMs = 0;
  private events: PerfEvent[] = [];
  private loafEntries: PerfLoafEntry[] = [];
  private loafSupported = false;
  private reactCommits = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  private gpuTiming: Record<string, unknown> | null = null;
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
    this.probeMsTotal = 0;
    this.probeMsMax = 0;
    this.pointerMoves = 0;
    this.pointerMoveMsTotal = 0;
    this.pointerMoveMsMax = 0;
    this.volumeFrames = new Map();
    this.events = [];
    this.loafEntries = [];
    this.loafSupported = false;
    this.reactCommits = new Map();
    this.gpuTiming = null;
    this.pendingBricks = 0;
    this.pendingBytes = 0;
    this.pendingDrainMs = 0;
    this.pendingOffFrameDrainMs = 0;
    this.pendingOffFrameDrains = 0;
    this.pendingPageFlushBytes = 0;
    this.offFrameDrainMaxMs = 0;
    this.emit();
  }

  /** Disarm; the captured buffers are retained for `buildSessionReport()`. */
  stopRecording(): void {
    if (!this.recording) return;
    this.recording = false;
    this.emit();
  }

  /** A timeline event (see `PerfEvent`). Pass `ms` when the event is a
   * measured span of main-thread work. */
  markEvent(name: string, detail?: { ms?: number; info?: string }): void {
    if (!this.recording) return;
    if (this.events.length >= MAX_EVENTS) return;
    this.events.push({ tMs: now() - this.startedAt, name, ...detail });
  }

  /** Start of a timed span: `performance.now()` while recording, NaN otherwise
   * (so an idle call site pays one boolean check and no clock read). */
  spanStart(): number {
    return this.recording ? now() : Number.NaN;
  }

  /** Close a span opened with `spanStart` as a timed timeline event. */
  markSpan(name: string, startedAt: number, info?: string): void {
    if (!this.recording || Number.isNaN(startedAt)) return;
    this.markEvent(name, { ms: now() - startedAt, info });
  }

  /**
   * A React commit of a `<Profiler id>` subtree (`onRender`). Totals per id;
   * commits of 1 ms or more also go on the timeline, so a long frame shows
   * which subtree committed inside it without flooding the buffer.
   */
  markCommit(id: string, phase: string, actualMs: number): void {
    if (!this.recording) return;
    const entry = this.reactCommits.get(id) ?? { count: 0, totalMs: 0, maxMs: 0 };
    entry.count += 1;
    entry.totalMs += actualMs;
    if (actualMs > entry.maxMs) entry.maxMs = actualMs;
    this.reactCommits.set(id, entry);
    if (actualMs >= 1) this.markEvent(`react:${id}`, { ms: actualMs, info: phase });
  }

  /** The probe arms a `long-animation-frame` observer; report LoAF stats. */
  setLongAnimationFrameSupported(supported: boolean): void {
    if (!this.recording) return;
    this.loafSupported = supported;
  }

  /** One long animation frame, `startTime` on the `performance.now()` clock. */
  addLongAnimationFrame(entry: {
    startTime: number;
    durationMs: number;
    blockingMs: number;
    scripts: PerfLoafScript[];
  }): void {
    if (!this.recording || this.loafEntries.length >= MAX_LOAF_ENTRIES) return;
    this.loafEntries.push({
      tMs: entry.startTime - this.startedAt,
      durationMs: entry.durationMs,
      blockingMs: entry.blockingMs,
      scripts: entry.scripts,
    });
  }

  /** How GPU timing was configured for this session (see the report field). */
  setGpuTiming(info: Record<string, unknown>): void {
    if (!this.recording) return;
    this.gpuTiming = info;
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

  /** Main-thread ms one probe evaluation took (pairs with `markProbe`). */
  addProbeMs(ms: number): void {
    if (!this.recording) return;
    this.probeMsTotal += ms;
    if (ms > this.probeMsMax) this.probeMsMax = ms;
  }

  /** Main-thread ms one canvas pointermove took, raycast included. */
  addPointerMoveMs(ms: number): void {
    if (!this.recording) return;
    this.pointerMoves += 1;
    this.pointerMoveMsTotal += ms;
    if (ms > this.pointerMoveMsMax) this.pointerMoveMsMax = ms;
  }

  /** One volume compositor frame decision (`decideVolumeFrame`'s reason). */
  markVolumeFrame(reason: string): void {
    if (!this.recording) return;
    this.volumeFrames.set(reason, (this.volumeFrames.get(reason) ?? 0) + 1);
  }

  /** Accumulated into the next recorded frame. */
  markUpload(bricks: number, bytes: number): void {
    if (!this.recording) return;
    this.pendingBricks += bricks;
    this.pendingBytes += bytes;
  }

  /** One `drainUploads` pass (or page-table catch-up): its main-thread ms,
   * whether it ran between frames (the pump), and the page-table bytes it
   * wrote. Accumulated into the next recorded frame. */
  markDrain(ms: number, detail: { offFrame: boolean; pageFlushBytes: number }): void {
    if (!this.recording) return;
    this.pendingDrainMs += ms;
    this.pendingPageFlushBytes += detail.pageFlushBytes;
    if (ms >= 1) this.markEvent(detail.offFrame ? "drain:offFrame" : "drain", { ms });
    if (detail.offFrame) {
      this.pendingOffFrameDrainMs += ms;
      this.pendingOffFrameDrains += 1;
      if (ms > this.offFrameDrainMaxMs) this.offFrameDrainMaxMs = ms;
    }
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
      drainMs: this.pendingDrainMs,
      offFrameDrainMs: this.pendingOffFrameDrainMs,
      offFrameDrains: this.pendingOffFrameDrains,
      pageFlushBytes: this.pendingPageFlushBytes,
    });
    this.pendingBricks = 0;
    this.pendingBytes = 0;
    this.pendingDrainMs = 0;
    this.pendingOffFrameDrainMs = 0;
    this.pendingOffFrameDrains = 0;
    this.pendingPageFlushBytes = 0;

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
      probeMs:
        this.probes > 0
          ? { avg: this.probeMsTotal / this.probes, max: this.probeMsMax, total: this.probeMsTotal }
          : null,
      pointerMoveMs:
        this.pointerMoves > 0
          ? {
              count: this.pointerMoves,
              avg: this.pointerMoveMsTotal / this.pointerMoves,
              max: this.pointerMoveMsMax,
              total: this.pointerMoveMsTotal,
            }
          : null,
      volumeFrames: Object.fromEntries(
        [...this.volumeFrames.entries()].sort((a, b) => b[1] - a[1]),
      ),
      bricksUploaded: frames.reduce((a, f) => a + f.bricksUploaded, 0),
      bytesUploaded: frames.reduce((a, f) => a + f.bytesUploaded, 0),
      drainMs: {
        total: frames.reduce((a, f) => a + f.drainMs, 0),
        offFrame: frames.reduce((a, f) => a + f.offFrameDrainMs, 0),
        offFrameSlices: frames.reduce((a, f) => a + f.offFrameDrains, 0),
        offFrameMaxMs: this.offFrameDrainMaxMs,
      },
      pageFlushBytes: frames.reduce((a, f) => a + f.pageFlushBytes, 0),
      events: totalsByName(this.events),
      reactCommits: Object.fromEntries(
        [...this.reactCommits.entries()].sort((a, b) => b[1].totalMs - a[1].totalMs),
      ),
      longAnimationFrames: this.loafSupported
        ? {
            count: this.loafEntries.length,
            totalMs: this.loafEntries.reduce((a, e) => a + e.durationMs, 0),
            maxMs: this.loafEntries.reduce((a, e) => Math.max(a, e.durationMs), 0),
          }
        : null,
      longFrames: collectLongFrames(frames, this.events, this.loafEntries),
      gpuTiming: this.gpuTiming,
    };
  }
}

function totalsByName(
  events: readonly PerfEvent[],
): Record<string, { count: number; totalMs: number; maxMs: number }> {
  const totals = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  for (const event of events) {
    const entry = totals.get(event.name) ?? { count: 0, totalMs: 0, maxMs: 0 };
    entry.count += 1;
    if (event.ms !== undefined) {
      entry.totalMs += event.ms;
      if (event.ms > entry.maxMs) entry.maxMs = event.ms;
    }
    totals.set(event.name, entry);
  }
  return Object.fromEntries([...totals.entries()].sort((a, b) => b[1].count - a[1].count));
}

/**
 * The worst `MAX_LONG_FRAMES` frames whose period exceeded `LONG_FRAME_MS`,
 * back in time order, each with the events and long animation frames inside
 * its window. A sample's `tMs` is stamped at the frame's END (the after-effect),
 * so its window runs from the previous frame's start
 * (`tMs - mainThreadMs - periodMs`) to `tMs`.
 */
export function collectLongFrames(
  frames: readonly FrameSample[],
  events: readonly PerfEvent[],
  loaf: readonly PerfLoafEntry[],
): PerfLongFrame[] {
  const long = frames
    .filter((f) => f.framePeriodMs > LONG_FRAME_MS)
    .sort((a, b) => b.framePeriodMs - a.framePeriodMs)
    .slice(0, MAX_LONG_FRAMES)
    .sort((a, b) => a.tMs - b.tMs);
  return long.map((f) => {
    const end = f.tMs;
    const start = end - f.frameMainThreadMs - f.framePeriodMs;
    return {
      tMs: f.tMs,
      periodMs: f.framePeriodMs,
      mainThreadMs: f.frameMainThreadMs,
      gpuMs: f.gpuMs,
      cameraMoving: f.cameraMoving,
      events: events.filter((e) => e.tMs >= start && e.tMs <= end),
      // Overlap, not containment: a long animation frame can start before
      // the window and run into it.
      loaf: loaf.filter((e) => e.tMs <= end && e.tMs + e.durationMs >= start),
    };
  });
}

/** Process-wide singleton — one recording at a time. */
export const perfMonitor = new PerfMonitor();
