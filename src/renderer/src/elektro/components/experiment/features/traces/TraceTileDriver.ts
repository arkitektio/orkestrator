import type { StoreApi } from "zustand/vanilla";
import { createRafCoalescer } from "@/lib/scene/perf/rafCoalesce";
import { INTERACTIVE_FETCH_PRIORITY } from "@/lib/zarr/pool/types";
import type { LayerDriver } from "../../platform/drivers/layerDriver";
import type { LayerState } from "../../platform/model/layerModel";
import {
  DEFAULT_BUDGET_BYTES,
  planTraceTiles,
  type TracePlan,
} from "../../platform/quality/tracePlanning";
import {
  coverageOf,
  createResidency,
  drawableTiles,
  evictToBudget,
  insertTile,
  levelIndexAt,
  missingTiles,
  protectedKeysOf,
  type Residency,
} from "../../platform/quality/traceResidency";
import { tileReadsFor, type TraceSource } from "../../platform/sources/traceSource";
import type { ExperimentStoreState } from "../../platform/stores/experimentStore";
import type { RangeState } from "../../platform/stores/rangeStore";
import type { ViewerState } from "../../platform/stores/viewerStore";
import type { TraceSlice } from "./store/traceSlice";
import { packChannel, splitChannels } from "./tracePacking";

/** A window read: what the elektro zarr store's `readWindow` does, injected. */
export type ReadWindow = (
  store: { id: string },
  ranges: readonly ({ start: number; stop: number; step: number } | null)[],
  opts: { signal?: AbortSignal; priority?: number },
) => Promise<{ shape: number[]; strides: number[]; data: ArrayLike<number> }>;

export type TraceDriverEnv = {
  experimentApi: StoreApi<ExperimentStoreState>;
  rangeApi: StoreApi<RangeState>;
  viewerApi: StoreApi<ViewerState & TraceSlice>;
  readWindow: ReadWindow;
  /** Frame scheduling for the publish coalescer (tests pass a synchronous one). */
  raf?: (cb: () => void) => number;
  caf?: (handle: number) => void;
};

/**
 * One trace layer's tile pipeline: plan → read → residency → pack → publish.
 *
 * The rank-1 counterpart of mikro's brick residency, and the same wiring around
 * the two planes:
 *
 *  - It wakes on the COMMITTED window only (a settled gesture), never the live
 *    one. Panning moves the camera over buffers already on the GPU; only when
 *    the gesture pauses is a new plan made and new tiles read.
 *  - Reads are issued in the plan's fetch order — root backdrop first, then
 *    near-before-far — with descending pool priority, so the trace is drawable
 *    from the first tile that lands and sharpens where the user is looking.
 *  - An in-flight read is aborted only if the NEW plan no longer wants it.
 *  - Landing tiles are repacked at most once per frame, to the pixel grid.
 *
 * Output goes to the store, never to React state: `traceSlice.packed[layerId]`
 * (what `TraceLines` draws), the layer's stats, its probe channels, and — the
 * clim authority — its seeded scale.
 */
export class TraceTileDriver implements LayerDriver {
  private layer: LayerState;
  private source: TraceSource | null = null;
  private residency: Residency = createResidency();
  private readonly inFlight = new Map<string, AbortController>();
  private plan: TracePlan | null = null;
  private lastError: string | null = null;
  private disposed = false;
  private readonly unsubscribes: (() => void)[] = [];
  private readonly publisher: { schedule(args: null): void; cancel(): void };

  constructor(
    layer: LayerState,
    private readonly env: TraceDriverEnv,
  ) {
    this.layer = layer;
    this.publisher = createRafCoalescer<null>(() => this.publish(), env.raf, env.caf);

    this.unsubscribes.push(
      env.rangeApi.subscribe((state, previous) => {
        if (state.committedRange !== previous.committedRange) this.replan();
      }),
      // A different canvas width is a different pixel grid: repack what is resident.
      env.viewerApi.subscribe((state, previous) => {
        if (state.viewportPx.width !== previous.viewportPx.width) this.publisher.schedule(null);
      }),
    );
    this.applyClimSeed(null);
    this.setSource(layer.source);
  }

  update(layer: LayerState): void {
    const previous = this.layer;
    this.layer = layer;
    this.applyClimSeed(previous);
    // Content edits keep the source object (the fold's memo); only a structural
    // change — a re-placement, another lens or channel — brings a new one.
    if (layer.source !== this.source) this.setSource(layer.source);
  }

  dispose(): void {
    this.disposed = true;
    for (const unsubscribe of this.unsubscribes) unsubscribe();
    this.publisher.cancel();
    this.abortAll();
    this.env.viewerApi.getState().setPacked(this.layer.id, null);
  }

  // --- internals ------------------------------------------------------------

  /**
   * The persisted clim, or the anchors' histogram, sets the scale BEFORE any
   * tile lands; a change of it (an autoscale written back, an edit) is applied.
   */
  private applyClimSeed(previous: LayerState | null): void {
    const seed = this.layer.climSeed;
    if (!seed) return;
    if (previous?.climSeed && previous.climSeed.lo === seed.lo && previous.climSeed.hi === seed.hi) return;
    this.env.viewerApi.getState().setClim(this.layer.id, seed);
  }

  /** A new source invalidates everything resident: those samples were placed by the old map. */
  private setSource(source: TraceSource | null): void {
    this.abortAll();
    this.source = source;
    this.residency = createResidency();
    this.plan = null;
    this.lastError = null;
    this.env.viewerApi.getState().setPacked(this.layer.id, null);
    if (source) this.replan();
  }

  private abortAll(): void {
    for (const controller of this.inFlight.values()) controller.abort();
    this.inFlight.clear();
  }

  private replan(): void {
    const source = this.source;
    if (this.disposed || !source) return;
    const window = this.env.rangeApi.getState().committedRange;
    const plan = planTraceTiles({
      levels: source.levels,
      window,
      budgetBytes: DEFAULT_BUDGET_BYTES,
      // Decoded float32 per sample PER CHANNEL read: a 4-channel tile costs 4×.
      bytesPerSample: 4 * Math.max(1, source.channelCount),
    });
    this.plan = plan;
    const wanted = protectedKeysOf(plan);

    // Abort only what the new plan has stopped wanting.
    for (const [key, controller] of this.inFlight) {
      if (!wanted.has(key)) {
        controller.abort();
        this.inFlight.delete(key);
      }
    }

    const residency = this.residency;
    const missing = missingTiles(residency, plan).filter((t) => !this.inFlight.has(t.key));
    tileReadsFor(source, { ...plan, tiles: missing }).forEach((read, order) => {
      const controller = new AbortController();
      this.inFlight.set(read.tile.key, controller);
      this.env
        .readWindow(read.store, read.ranges, {
          signal: controller.signal,
          // Fetch order becomes pool priority: backdrop first, then near-first.
          priority: INTERACTIVE_FETCH_PRIORITY - order - 1,
        })
        .then((window) => {
          if (this.disposed || controller.signal.aborted || residency !== this.residency) return;
          this.inFlight.delete(read.tile.key);
          insertTile(residency, {
            key: read.tile.key,
            level: read.tile.level,
            levelIndex: read.tile.levelIndex,
            index: read.tile.index,
            span: read.tile.span,
            samples: read.tile.samples,
            bytes: read.tile.bytes,
            period: source.levels[read.tile.levelIndex].period,
            t0: source.levels[read.tile.levelIndex].t0,
            channels: splitChannels(window, source.timeAxisIndex, source.channelAxisIndex),
            lastUsed: 0,
          });
          if (this.plan) {
            const committed = this.env.rangeApi.getState().committedRange;
            evictToBudget(
              residency,
              protectedKeysOf(this.plan),
              DEFAULT_BUDGET_BYTES * 2,
              (committed.start + committed.end) / 2,
            );
          }
          this.publisher.schedule(null);
        })
        .catch((error: unknown) => {
          if (this.inFlight.get(read.tile.key) === controller) this.inFlight.delete(read.tile.key);
          if (this.disposed || controller.signal.aborted) return;
          this.lastError = error instanceof Error ? error.message : String(error);
          this.publisher.schedule(null);
        });
    });

    // Something may already be resident for the new window (a pan back, a zoom
    // inside a band): draw it now rather than waiting for a read.
    this.publisher.schedule(null);
  }

  private publish(): void {
    const source = this.source;
    const plan = this.plan;
    if (this.disposed || !source || !plan) return;
    const layerId = this.layer.id;
    const window = this.env.rangeApi.getState().committedRange;
    const timeOrigin = this.env.experimentApi.getState().timeOrigin;
    const viewer = this.env.viewerApi.getState();
    const segments = drawableTiles(this.residency, plan, window);
    const channels = Array.from({ length: source.channelCount }, (_, c) =>
      // Packed to the pixel grid: never more points than the canvas can show.
      packChannel(segments, c, timeOrigin, { window, widthPx: viewer.viewportPx.width }),
    );

    let valueMin = Infinity;
    let valueMax = -Infinity;
    for (const packed of channels) {
      if (packed.valueMin != null && packed.valueMin < valueMin) valueMin = packed.valueMin;
      if (packed.valueMax != null && packed.valueMax > valueMax) valueMax = packed.valueMax;
    }
    const hasRange = valueMin <= valueMax;

    // Fixed gain: the FIRST data a layer shows sets its scale, and it is then held
    // — zooming in time never silently rescales amplitude. Autoscale is explicit.
    if (hasRange) viewer.seedClim(layerId, { lo: valueMin, hi: valueMax });

    const finest = segments.reduce(
      (best, s) => (s.tile.levelIndex < best ? s.tile.levelIndex : best),
      Infinity,
    );
    const finestLevel = Number.isFinite(finest) ? source.levels[finest] : undefined;
    const centerLevelIndex = levelIndexAt(segments, (window.start + window.end) / 2);
    const centerLevel = centerLevelIndex == null ? undefined : source.levels[centerLevelIndex];
    viewer.setStats(layerId, {
      levelIndex: Number.isFinite(finest) ? finest : -1,
      level: finestLevel?.level ?? -1,
      levelCount: source.levels.length,
      centerLevelIndex,
      targetLevelIndex: plan.targetLevelIndex,
      centerFactor: centerLevel ? Math.round(Math.abs(centerLevel.period / source.levels[0].period)) : null,
      tilesPlanned: plan.tiles.length,
      tilesResident: plan.tiles.filter((t) => this.residency.byKey.has(t.key)).length,
      coverage: coverageOf(segments, window),
      residentBytes: this.residency.bytes,
      valueMin: hasRange ? valueMin : null,
      valueMax: hasRange ? valueMax : null,
      loading: this.inFlight.size > 0,
      error: this.lastError,
    });

    // What the probe reads back — the drawn points, not a fresh fetch.
    viewer.publishProbe(layerId, channels);
    viewer.setPacked(layerId, channels);
  }
}
