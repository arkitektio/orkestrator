/**
 * Cold-open timeline — how long it takes to get the first voxel on screen.
 *
 * `perfMonitor` cannot answer this: it is opt-in and only arms once the scene is
 * already up, so the whole GraphQL → credentials → metadata → device → first
 * brick chain is invisible to it. This module fills exactly that gap and nothing
 * else. It is ALWAYS ON — one `performance.now()` and a `Map.set` per phase,
 * about a dozen times per scene open, which is far below the noise floor of the
 * work it measures.
 *
 * Two properties the call sites depend on:
 *
 *  - **First stamp wins.** Several phases fire more than once per open
 *    (`poolCreated` per pool, `firstBrickRequested` per brick, `firstPaint` per
 *    frame). The question is always "when did this first happen", so a repeat
 *    stamp is dropped rather than overwriting. Call sites therefore need no
 *    once-guards of their own.
 *  - **Stamping before `begin()` is a no-op.** Warmup work (the credential
 *    prefetch, the WebGPU probe) can start before any scene id is known, and a
 *    stamp with no session to attach to is dropped rather than starting a
 *    phantom session with a meaningless origin.
 *
 * Phases are also emitted as `performance.mark`/`measure`, so a Chrome trace
 * shows the same decomposition without going through the DebugPanel.
 */

/** Phases in the order they are expected to occur. The report is ordered by
 * this list, not by arrival, so a missing phase is visible as a gap rather than
 * silently reordering its neighbours. */
export const COLD_OPEN_PHASES = [
  /** `GetScene` resolved — the route gate opens. */
  "sceneQuery",
  /** WebGPU adapter probe resolved (`assertWebGPUSupported`). */
  "webgpuDevice",
  /** The general zarr grant landed. */
  "credentials",
  /** Every level's `/zarr.json` fetched and its store ready. */
  "storeMetadata",
  /** `openSceneArrays` done — the scope build can finish. */
  "arraysOpen",
  /** `<Canvas>`'s `gl` factory resolved: `renderer.init()` is complete. */
  "canvasMount",
  /** The node planner emitted its first plan. */
  "firstPlan",
  /** `ensurePool` allocated the first brick atlas. */
  "poolCreated",
  /** The first raymarch material finished its TSL graph build. */
  "materialBuilt",
  /** The first brick fetch was dispatched. */
  "firstBrickRequested",
  /** The first brick came back decoded and repacked. */
  "firstBrickDecoded",
  /** The first brick was written into the atlas — first voxels are on screen. */
  "firstBrickUploaded",
  /** The first brick with its real 1-voxel border landed (two-phase bricks:
   * the halo refine; legacy single-phase: same instant as firstBrickUploaded). */
  "firstBrickFull",
] as const;

export type ColdOpenPhase = (typeof COLD_OPEN_PHASES)[number];

export type ColdOpenReport = {
  /** Scene this session was opened for, for correlating across opens. */
  sceneId: string | null;
  /** Whether a session is currently open (i.e. `begin` without a later `begin`). */
  active: boolean;
  /** ms from `begin()` to each phase, in `COLD_OPEN_PHASES` order. Phases that
   * never fired are absent. */
  stamps: Partial<Record<ColdOpenPhase, number>>;
  /** ms between each recorded phase and the previous RECORDED one — where the
   * time actually went. Absent phases collapse rather than showing as zero. */
  deltas: Partial<Record<ColdOpenPhase, number>>;
  /** ms from `begin()` to `firstBrickUploaded`, or null if it has not happened.
   * This is the headline number. */
  timeToFirstVoxelMs: number | null;
};

const MARK_PREFIX = "scene-cold-open";

/** `performance.mark`/`measure` are absent in some test environments and are
 * never load-bearing here — the timeline is authoritative, the marks are a
 * convenience for Chrome traces. */
const markSafely = (name: string): void => {
  try {
    performance.mark?.(name);
  } catch {
    /* tracing unavailable: the in-memory timeline is unaffected */
  }
};

const measureSafely = (name: string, start: string, end: string): void => {
  try {
    performance.measure?.(name, start, end);
  } catch {
    /* as above */
  }
};

export class ColdOpenTimeline {
  private startedAt: number | null = null;
  private sceneId: string | null = null;
  private readonly stamps = new Map<ColdOpenPhase, number>();
  /** The most recently recorded phase, for the delta chain. */
  private lastPhase: ColdOpenPhase | null = null;

  constructor(private readonly now: () => number = () => performance.now()) {}

  /**
   * Open a session. Called when the scene route mounts — BEFORE the scene query
   * resolves, so the origin is the user's actual "open this image" moment rather
   * than the first thing that happens to be instrumented.
   *
   * Re-opening (a different scene, or the same one again) discards the previous
   * session: only the newest open is interesting, and keeping a history would
   * make "the report" ambiguous.
   */
  begin(sceneId: string | null = null): void {
    this.startedAt = this.now();
    this.sceneId = sceneId;
    this.stamps.clear();
    this.lastPhase = null;
    markSafely(`${MARK_PREFIX}:begin`);
  }

  /** Record a phase. No-op before `begin()`, and no-op if already recorded. */
  stamp(phase: ColdOpenPhase): void {
    if (this.startedAt === null) return;
    if (this.stamps.has(phase)) return;

    this.stamps.set(phase, this.now() - this.startedAt);

    const mark = `${MARK_PREFIX}:${phase}`;
    markSafely(mark);
    measureSafely(
      `${MARK_PREFIX} ${this.lastPhase ?? "begin"} → ${phase}`,
      this.lastPhase === null ? `${MARK_PREFIX}:begin` : `${MARK_PREFIX}:${this.lastPhase}`,
      mark,
    );
    this.lastPhase = phase;
  }

  /** True once a session is open — lets a hot call site skip building an id. */
  isActive(): boolean {
    return this.startedAt !== null;
  }

  buildReport(): ColdOpenReport {
    const stamps: Partial<Record<ColdOpenPhase, number>> = {};
    const deltas: Partial<Record<ColdOpenPhase, number>> = {};

    // Ordered by the canonical phase list, NOT by arrival: a phase that fires
    // out of order is a finding, and reordering the report would hide it.
    let previous = 0;
    for (const phase of COLD_OPEN_PHASES) {
      const at = this.stamps.get(phase);
      if (at === undefined) continue;
      stamps[phase] = Math.round(at);
      deltas[phase] = Math.round(at - previous);
      previous = at;
    }

    const firstVoxel = this.stamps.get("firstBrickUploaded");
    return {
      sceneId: this.sceneId,
      active: this.startedAt !== null,
      stamps,
      deltas,
      timeToFirstVoxelMs: firstVoxel === undefined ? null : Math.round(firstVoxel),
    };
  }
}

/** App-lifetime singleton — the cold open spans provider, canvas and manager
 * boundaries, so there is no narrower scope that could own it. */
export const coldOpenTimeline = new ColdOpenTimeline();
