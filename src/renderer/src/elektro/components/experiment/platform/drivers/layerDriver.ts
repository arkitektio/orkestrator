import type { StoreApi } from "zustand/vanilla";
import type { LayerState } from "../model/layerModel";
import { isLayerHidden, type ExperimentStoreState } from "../stores/experimentStore";
import type { ViewerState } from "../stores/viewerStore";

/**
 * The render-plane lifecycle of a layer's data, as an object rather than a pile
 * of effects — the experiment's counterpart of mikro's `CollectionDriver` and
 * `BrickResidencyManager`.
 *
 * A driver owns everything a layer READS and PREPARES: its fetches, its caches,
 * its reaction to the committed window, and the draw-ready output it publishes
 * into a viewer-store slice. The layer COMPONENT only draws that output. Drivers
 * take vanilla stores, so they are driven from tests with `createStore` fakes —
 * which is where the pipelines' ordering rules finally get asserted.
 */
export interface LayerDriver {
  /**
   * A new fold (or an optimistic edit) produced a new `LayerState` for this layer.
   * Content edits arrive here; a driver decides for itself what they invalidate.
   */
  update(layer: LayerState): void;
  /** Abort, unsubscribe, and withdraw what it published into its feature slice. */
  dispose(): void;
}

/** Builds a layer's driver, or null when the layer kind needs none. */
export type LayerDriverFactory = (layer: LayerState) => LayerDriver | null;

/** Should a layer have a driver right now? Drawable and shown. */
export const wantsDriver = (layer: LayerState): boolean =>
  layer.placeability.drawable && !isLayerHidden(layer);

/**
 * Keeps exactly one driver per drawable, visible layer.
 *
 * Reconciles on every experiment-store change (a vanilla subscription — P17):
 * a layer appearing (or being shown) gets a driver from the factory for its
 * typename; a changed `LayerState` is passed to `update`; a layer leaving (or
 * being hidden) has its driver disposed AND its core viewer state cleared with
 * `clearLayer` — the ONE cleanup site, so no layer kind can leave a stale
 * readout, label or probe behind.
 *
 * The factory table is keyed by typename and built by the shell (which knows the
 * features); `platform/` knows only the protocol.
 */
export class LayerDriverRegistry {
  private readonly drivers = new Map<string, { driver: LayerDriver; layer: LayerState }>();
  private unsubscribe: (() => void) | null = null;
  private disposed = false;

  constructor(
    private readonly experimentApi: StoreApi<ExperimentStoreState>,
    private readonly viewerApi: StoreApi<ViewerState>,
    private readonly factories: Readonly<Record<string, LayerDriverFactory>>,
  ) {}

  start(): this {
    this.reconcile();
    this.unsubscribe = this.experimentApi.subscribe((state, previous) => {
      if (state.layers !== previous.layers) this.reconcile();
    });
    return this;
  }

  /** How many drivers are live — for tests and the debug readout. */
  get size(): number {
    return this.drivers.size;
  }

  has(layerId: string): boolean {
    return this.drivers.has(layerId);
  }

  reconcile(): void {
    if (this.disposed) return;
    const wanted = new Map<string, LayerState>();
    for (const layer of this.experimentApi.getState().layers) {
      if (wantsDriver(layer) && this.factories[layer.typename]) wanted.set(layer.id, layer);
    }

    for (const [id, entry] of this.drivers) {
      if (!wanted.has(id)) this.remove(id, entry.driver);
    }

    for (const [id, layer] of wanted) {
      const entry = this.drivers.get(id);
      if (entry) {
        if (entry.layer !== layer) {
          entry.layer = layer;
          entry.driver.update(layer);
        }
        continue;
      }
      const driver = this.factories[layer.typename](layer);
      if (driver) this.drivers.set(id, { driver, layer });
    }
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe?.();
    for (const [id, entry] of this.drivers) this.remove(id, entry.driver);
  }

  private remove(id: string, driver: LayerDriver): void {
    this.drivers.delete(id);
    driver.dispose();
    // A layer that still exists is only hidden (or undrawable for now): its
    // fixed-gain scale survives, so showing it again does not re-seed it.
    const stillThere = this.experimentApi.getState().layerIndex.has(id);
    this.viewerApi.getState().clearLayer(id, { keepClim: stillThere && !this.disposed });
  }
}
