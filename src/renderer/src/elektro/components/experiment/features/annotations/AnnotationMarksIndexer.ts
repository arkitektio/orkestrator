import type { StoreApi } from "zustand/vanilla";
import type { ExperimentStoreState } from "../../platform/stores/experimentStore";
import type { ExperimentLayerFragment } from "../../platform/stores/layerFragments";
import { annotationMarks, type AnnotationMarks } from "./annotationGeometry";
import type { AnnotationSlice } from "./store/annotationSlice";
import { rowTargetsFor } from "./valueCollections";

/**
 * Keeps `annotationSlice.annotationMarks` in step with the experiment: every
 * annotation layer's events and epochs, placed on the world clock, and the value
 * shapes of a collection drawn over a trace, per row of that trace.
 *
 * For EVERY annotation layer, hidden or not — the card counts and the panel
 * lists marks of hidden layers too — which is why this is a scope-level service
 * rather than a per-drawn-layer driver. Recomputes only the layers whose raw
 * fragment object changed (a new annotation drawn), keeping the rest by
 * identity, so an unrelated fold re-renders nothing.
 */
export class AnnotationMarksIndexer {
  private readonly cache = new Map<
    string,
    { raw: ExperimentLayerFragment; targetsKey: string; marks: AnnotationMarks }
  >();
  private world: unknown = null;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly experimentApi: StoreApi<ExperimentStoreState>,
    private readonly viewerApi: StoreApi<AnnotationSlice>,
  ) {
    this.index();
    this.unsubscribe = experimentApi.subscribe((state, previous) => {
      if (state.rawLayers !== previous.rawLayers || state.world !== previous.world) this.index();
    });
  }

  dispose(): void {
    this.unsubscribe();
    this.cache.clear();
    this.viewerApi.getState().setAnnotationMarks({});
  }

  private index(): void {
    const { rawLayers, world } = this.experimentApi.getState();
    if (world !== this.world) {
      this.cache.clear();
      this.world = world;
    }
    const next: Record<string, AnnotationMarks> = {};
    let changed = false;
    for (const [id, raw] of Object.entries(rawLayers)) {
      if (raw.__typename !== "AnnotationLayer") continue;
      // A trace arriving or leaving moves a value collection's rows without
      // touching its own fragment, so the targets are part of the cache key.
      const rowTargets = rowTargetsFor(raw.annotationCollection, rawLayers);
      const targetsKey = rowTargets.map((t) => `${t.traceLayerId}/${t.channelIndex}`).join(",");
      const cached = this.cache.get(id);
      if (cached && cached.raw === raw && cached.targetsKey === targetsKey) {
        next[id] = cached.marks;
        continue;
      }
      const marks = annotationMarks({
        annotations: raw.annotationCollection.annotations,
        system: raw.annotationCollection.coordinateSystem,
        asAffine: raw.asAffine,
        world,
        rowTargets,
      });
      this.cache.set(id, { raw, targetsKey, marks });
      next[id] = marks;
      changed = true;
    }
    for (const id of [...this.cache.keys()]) {
      if (!(id in next)) {
        this.cache.delete(id);
        changed = true;
      }
    }
    if (changed || Object.keys(next).length !== Object.keys(this.viewerApi.getState().annotationMarks).length) {
      this.viewerApi.getState().setAnnotationMarks(next);
    }
  }
}
