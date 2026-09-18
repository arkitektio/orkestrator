import { timeAxis, type CoordinateSystemLike } from "../coords/timeAxis";
import { timeUnitToMs } from "../coords/timeUnits";
import type { TraceSource } from "../sources/traceSource";
import { layerStructureKey, orderedLayers, type LayerStructureLike } from "./experimentStructure";
import {
  kindOfTypename,
  normalizeAnnotationLayer,
  normalizeEventsLayer,
  normalizeSpikesLayer,
  normalizeTraceLayer,
  worldExtentOf,
  type AnnotationLayerLike,
  type EventsLayerLike,
  type LayerState,
  type SpikesLayerLike,
  type TraceLayerLike,
} from "./layerModel";

/**
 * Folding an experiment fragment into the state the stores hold.
 *
 * Runs on EVERY fragment change — a new annotation drawn into an existing
 * collection, a colour written back — so it has to be cheap to run and, above
 * all, cheap in what it causes downstream.
 *
 * The expensive thing downstream is a trace's residency: its tiles are packed
 * against a specific `TraceSource`, and a trace layer resets (and refetches) when
 * its source object changes. So a layer whose structural key did NOT move keeps
 * its previous `TraceSource` object by identity. Renaming a layer, toggling it,
 * recolouring it or drawing an annotation beside it therefore costs no reads at
 * all; only re-placing it or re-pointing it — which moves its key — rebuilds its
 * pyramid.
 *
 * Pure — runs in node.
 */

export type SourceMemo = Map<string, { key: string; source: TraceSource | null }>;

type AnyLayerLike = LayerStructureLike &
  (TraceLayerLike | SpikesLayerLike | EventsLayerLike | AnnotationLayerLike);

export type ExperimentLike = {
  world?: (CoordinateSystemLike & { id: string }) | null;
  layers?: readonly AnyLayerLike[] | null;
};

export type FoldedExperiment = {
  /** Normalized, in display order. Unknown kinds are dropped (and said so). */
  layers: LayerState[];
  /** Every layer's raw fragment, by id — for the `source: "fragment"` cards. */
  rawLayers: Record<string, unknown>;
  worldSpan: { start: number; end: number } | null;
  timeOrigin: number;
  /** The memo to pass to the next fold. */
  memo: SourceMemo;
};

export const foldExperiment = (
  experiment: ExperimentLike,
  placementErrors: ReadonlyMap<string, string>,
  previous: SourceMemo | null,
): FoldedExperiment => {
  const world = experiment.world ?? null;
  const worldUnitMs = timeUnitToMs(timeAxis(world)?.unit ?? null);
  const memo: SourceMemo = new Map();
  const rawLayers: Record<string, unknown> = {};
  const layers: LayerState[] = [];

  for (const raw of orderedLayers(experiment.layers)) {
    const key = layerStructureKey(raw);
    const error = placementErrors.get(raw.id) ?? null;
    rawLayers[raw.id] = raw;

    switch (kindOfTypename(raw.__typename)) {
      case "trace": {
        const kept = previous?.get(raw.id);
        if (kept && kept.key === key && kept.source) {
          // Same structure: keep the pyramid object, so the layer keeps its tiles.
          // Normalizing again is still right — content (clim, colour, anchors)
          // may have moved — but the kept source is passed in, so it is NOT
          // rebuilt (and the layer's span, channels and seed derive from it).
          const normalized = normalizeTraceLayer(raw as TraceLayerLike, world, error, kept.source);
          memo.set(raw.id, kept);
          layers.push(normalized);
          break;
        }
        const normalized = normalizeTraceLayer(raw as TraceLayerLike, world, error);
        memo.set(raw.id, { key, source: normalized.source });
        layers.push(normalized);
        break;
      }
      case "spikes":
        memo.set(raw.id, { key, source: null });
        layers.push(normalizeSpikesLayer(raw as SpikesLayerLike, world, error, worldUnitMs));
        break;
      case "events":
        memo.set(raw.id, { key, source: null });
        layers.push(normalizeEventsLayer(raw as EventsLayerLike, world, error));
        break;
      case "annotation":
        memo.set(raw.id, { key, source: null });
        layers.push(normalizeAnnotationLayer(raw as AnnotationLayerLike, error));
        break;
      default:
        // A kind this client does not know. The registries are exhaustive over the
        // kinds it does, so this is a newer server — skip it rather than guess.
        break;
    }
  }

  const extent = worldExtentOf(layers);
  return {
    layers,
    rawLayers,
    worldSpan: extent.span,
    timeOrigin: extent.timeOrigin,
    memo,
  };
};
