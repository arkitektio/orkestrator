import { useEffect, useRef, useState } from "react";
import { createRafCoalescer } from "@/lib/scene/perf/rafCoalesce";
import { INTERACTIVE_FETCH_PRIORITY } from "@/lib/zarr/pool/types";
import type { ZarrStoreFragment } from "@/elektro/api/graphql";
import { useElektroZarrStoreApi } from "@/elektro/components/store/zarrStore";
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
import { tileReadsFor } from "../../platform/sources/traceSource";
import { useExperimentStoreApi } from "../../platform/stores/experimentStore";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { packChannel, splitChannels, type PackedChannel } from "./tracePacking";

/**
 * The tile pipeline for one trace layer: plan → read → residency → pack.
 *
 * This is the rank-1 counterpart of mikro's `brickResidency` driver, wired the same
 * way around the two planes:
 *
 *  - It wakes on the COMMITTED window only (a settled gesture), never the live one.
 *    Panning moves the camera over buffers that are already on the GPU; only when
 *    the gesture pauses does a new plan get made and new tiles get read.
 *  - Reads are issued in the plan's fetch order — root backdrop first, then
 *    near-before-far — with descending pool priority, so the trace is drawable from
 *    the first tile that lands and sharpens where the user is looking.
 *  - An in-flight read is aborted only if the NEW plan no longer wants it. Aborting
 *    everything on every replan would throw away the backdrop mid-flight on each
 *    small pan and the view would never finish loading.
 *  - Landing tiles are repacked at most once per animation frame: a burst of tiles
 *    arriving together is one upload, not one each.
 *
 * Output is one packed polyline per channel, in world time relative to the scope's
 * `timeOrigin`; `TraceLines` hands them to the GPU.
 */

export type TraceTilesResult = {
  channels: PackedChannel[];
  /** Bumps whenever `channels` changes, for cheap dependency tracking. */
  version: number;
};

const EMPTY_RESULT: TraceTilesResult = { channels: [], version: 0 };

export const useTraceTiles = (layer: LayerState): TraceTilesResult => {
  const zarrApi = useElektroZarrStoreApi();
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();
  const experimentApi = useExperimentStoreApi();

  const [result, setResult] = useState<TraceTilesResult>(EMPTY_RESULT);
  const residencyRef = useRef<Residency>(createResidency());
  const source = layer.source;

  // A new source (a re-placed layer, a different pyramid) invalidates everything
  // resident: those samples were placed by the old map.
  useEffect(() => {
    residencyRef.current = createResidency();
    setResult(EMPTY_RESULT);
  }, [source]);

  useEffect(() => {
    if (!source) return;
    const layerId = layer.id;
    const residency = residencyRef.current;
    const timeOrigin = experimentApi.getState().timeOrigin;
    const inFlight = new Map<string, AbortController>();
    let plan: TracePlan | null = null;
    let disposed = false;
    let lastError: string | null = null;
    let version = 0;

    const publish = createRafCoalescer<null>(() => {
      if (disposed || !plan) return;
      const window = rangeApi.getState().committedRange;
      const segments = drawableTiles(residency, plan, window);
      const channels = Array.from({ length: source.channelCount }, (_, c) =>
        packChannel(segments, c, timeOrigin),
      );

      let valueMin = Infinity;
      let valueMax = -Infinity;
      for (const packed of channels) {
        if (packed.valueMin != null && packed.valueMin < valueMin) valueMin = packed.valueMin;
        if (packed.valueMax != null && packed.valueMax > valueMax) valueMax = packed.valueMax;
      }
      const hasRange = valueMin <= valueMax;

      const viewer = viewerApi.getState();
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
        centerFactor: centerLevel
          ? Math.round(Math.abs(centerLevel.period / source.levels[0].period))
          : null,
        tilesPlanned: plan.tiles.length,
        tilesResident: plan.tiles.filter((t) => residency.byKey.has(t.key)).length,
        coverage: coverageOf(segments, window),
        residentBytes: residency.bytes,
        valueMin: hasRange ? valueMin : null,
        valueMax: hasRange ? valueMax : null,
        loading: inFlight.size > 0,
        error: lastError,
      });

      // What the probe reads back — the drawn points, not a fresh fetch.
      viewer.probeSources.set(layerId, channels);

      version += 1;
      setResult({ channels, version });
    });

    const replan = () => {
      const window = rangeApi.getState().committedRange;
      plan = planTraceTiles({
        levels: source.levels,
        window,
        budgetBytes: DEFAULT_BUDGET_BYTES,
      });
      const wanted = protectedKeysOf(plan);

      // Abort only what the new plan has stopped wanting.
      for (const [key, controller] of inFlight) {
        if (!wanted.has(key)) {
          controller.abort();
          inFlight.delete(key);
        }
      }

      const missing = missingTiles(residency, plan).filter((t) => !inFlight.has(t.key));
      const reads = tileReadsFor(source, { ...plan, tiles: missing });

      reads.forEach((read, order) => {
        const controller = new AbortController();
        inFlight.set(read.tile.key, controller);
        // The runner's store type; `storeByLevelId` holds the fragment objects the
        // layer was built from, so this is the real store, only typed structurally.
        const store = read.store as unknown as ZarrStoreFragment;

        zarrApi
          .getState()
          .readWindow(store, read.ranges, {
            signal: controller.signal,
            // Fetch order becomes pool priority: backdrop first, then near-first.
            priority: INTERACTIVE_FETCH_PRIORITY - order - 1,
          })
          .then((window) => {
            if (disposed || controller.signal.aborted) return;
            inFlight.delete(read.tile.key);
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
            if (plan) {
              evictToBudget(
                residency,
                protectedKeysOf(plan),
                DEFAULT_BUDGET_BYTES * 2,
                (rangeApi.getState().committedRange.start +
                  rangeApi.getState().committedRange.end) /
                  2,
              );
            }
            publish.schedule(null);
          })
          .catch((error: unknown) => {
            inFlight.delete(read.tile.key);
            if (disposed || controller.signal.aborted) return;
            lastError = error instanceof Error ? error.message : String(error);
            publish.schedule(null);
          });
      });

      // Something may already be resident for the new window (a pan back, a zoom
      // inside a band): draw it now rather than waiting for a read.
      publish.schedule(null);
    };

    replan();
    const unsubscribe = rangeApi.subscribe((state, previous) => {
      if (state.committedRange !== previous.committedRange) replan();
    });

    return () => {
      disposed = true;
      unsubscribe();
      publish.cancel();
      for (const controller of inFlight.values()) controller.abort();
      inFlight.clear();
      viewerApi.getState().clearStats(layerId);
      viewerApi.getState().probeSources.delete(layerId);
    };
  }, [source, layer.id, zarrApi, rangeApi, viewerApi, experimentApi]);

  return result;
};
