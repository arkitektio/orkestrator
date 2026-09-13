import type * as THREE from "three";
import type { StoreApi } from "zustand";

import { bindField } from "../stores/bindStore";
import {
  deriveCollectionPlanView,
  type CollectionPlanView,
  type PlanViewState,
} from "./collectionPlanView";

/**
 * The render-plane lifecycle of a LOD-Parquet collection layer, as an object
 * rather than a pile of effects.
 *
 * ## What it owns
 *
 * Placement, visibility, the plan-on-camera-settle cadence, and the 2D slab
 * clip. All four are RENDER-plane work (P17): two vanilla store
 * subscriptions, a promise chain, and imperative mutation ending in
 * `invalidate()`. None of it is React state, and none of it should re-render
 * anything.
 *
 * The mesh and network layers each spelled all four out, near-identically —
 * 217 shared lines between two files. As effects they were untestable without
 * a renderer; as a class taking vanilla stores they can be driven from a test
 * with `createStore` and a fake target, which is where the settle edge, the
 * "never plan before `ensureIndex` resolves" ordering, and unsubscribe-on-
 * dispose finally get asserted.
 *
 * ## What it deliberately does NOT own
 *
 * Material config, plan config, debug registration, picking, and the colour
 * LUT all stay in the feature. They are not shared: the two material configs
 * agree on `color` and `opacity` and nothing else, the two `DETAIL_BUDGETS`
 * tables differ with docblocks arguing their numbers from each format's LOD
 * semantics, and only meshes have picking at all. Pulling them in would need
 * a union type or a flag per difference, which is the anti-pattern this
 * refactor exists to avoid — the differences live in the components, and the
 * components compose around the driver.
 */

/**
 * The protocol a collection manager must satisfy to be driven. Structural on
 * purpose: `platform/` cannot name `FabriksCollectionManager`, and neither
 * manager should implement a nominal interface it does not otherwise need.
 */
export interface DrivableCollection {
  /** Resolved before the first plan; rejects are the caller's to report. */
  ensureIndex(): Promise<unknown>;
  /**
   * `unknown`, not `Promise<void>`: the network manager's is async because it
   * swaps a whole level, the mesh manager's is not. Typing it as a promise
   * would invite an `await` here, and awaiting a plan changes the cadence.
   */
  updatePlan(view: CollectionPlanView): unknown;
  setVoxelToWorld(matrix: THREE.Matrix4): void;
  setSlabClip(slab: { z: number; thickness: number } | null): void;
  /** Show/hide the collection's group. Managers may stop planning while
   *  hidden — the driver replans on the show edge, so they need not. */
  setVisible(visible: boolean): void;
  getPlanConfig(): { readonly pixelBudget: number };
}

export type CollectionEnvironment = {
  viewApi: StoreApi<PlanViewState & { cameraMoving: boolean }>;
  viewerApi: StoreApi<{ currentZ: number; worldUnitsPerPixel: number }>;
  invalidate: () => void;
  /** `[fabriks]` / `[konnektion]`, for the index-load failure. */
  logTag: string;
};

/** What the component pushes down when a UI-cadence value changes. */
export type CollectionInputs = {
  matrix: THREE.Matrix4;
  /** null in 3D — z is not clipped there. */
  slab: { thickness: number } | null;
  /** The layer's `visible` flag. A hidden collection stops planning, so the
   *  driver OWNS the re-show replan — see `update()`. */
  visible: boolean;
};

export class CollectionDriver<M extends DrivableCollection> {
  private readonly unsubscribes: (() => void)[] = [];
  private disposed = false;
  private indexReady = false;
  private slab: CollectionInputs["slab"];
  private visible: boolean;

  constructor(
    private readonly target: M,
    private readonly env: CollectionEnvironment,
    inputs: CollectionInputs,
  ) {
    this.slab = inputs.slab;
    this.visible = inputs.visible;
    this.target.setVoxelToWorld(inputs.matrix);
    this.target.setVisible(inputs.visible);
    this.applySlab();

    // The plan cadence: once on mount (after the catalog lands) and on every
    // camera SETTLE — never per camera tick.
    void this.target
      .ensureIndex()
      .then(() => {
        if (this.disposed) return;
        this.indexReady = true;
        this.plan();
      })
      .catch((error: unknown) =>
        console.error(`${this.env.logTag} failed to load the cell catalog:`, error),
      );

    // The falling edge of `cameraMoving`. `bindField`'s first call passes
    // `previous === undefined`, so binding is not itself a settle.
    this.unsubscribes.push(
      bindField(
        this.env.viewApi,
        (state) => state.cameraMoving,
        (moving, previous) => {
          if (previous && !moving) this.plan();
        },
      ),
    );

    // z-scrub: `setSlabClip` mutates plane constants only, so a scrub tick
    // must not re-render the component to reach the manager.
    if (this.slab) {
      this.unsubscribes.push(
        bindField(this.env.viewerApi, (state) => state.currentZ, () => this.applySlab()),
      );
    }
  }

  /** Re-plan against the live camera. Also the hook the component calls after
   *  its own plan-config writes. */
  plan(): void {
    // Before the catalog lands there is nothing to plan against, and calling
    // through would ask the manager to plan over an empty index.
    if (this.disposed || !this.indexReady) return;
    const view = deriveCollectionPlanView(
      this.env.viewApi.getState(),
      this.target.getPlanConfig().pixelBudget,
      this.env.viewerApi.getState().worldUnitsPerPixel,
    );
    if (!view) return;
    void this.target.updatePlan(view);
  }

  /** Push a UI-cadence input. Idempotent per field: the manager no-ops on a
   *  value-equal matrix, and an unchanged slab re-writes the same constants. */
  update(inputs: Partial<CollectionInputs>): void {
    if (this.disposed) return;
    if (inputs.matrix) this.target.setVoxelToWorld(inputs.matrix);
    if (inputs.slab !== undefined) {
      this.slab = inputs.slab;
      this.applySlab();
    }
    if (inputs.visible !== undefined && inputs.visible !== this.visible) {
      this.visible = inputs.visible;
      this.target.setVisible(inputs.visible);
      // The SHOW edge replans. A manager that dropped every plan while hidden
      // (konnektion) has nothing mounted, and one that kept planning against a
      // stale camera has the wrong cells — `plan()` reads the LIVE camera and
      // the managers dedupe an unchanged plan, so this is correct for both.
      // Without it the layer waits for the next camera settle, which is what
      // made a re-show need a pan.
      if (inputs.visible) this.plan();
    }
  }

  private applySlab(): void {
    this.target.setSlabClip(
      this.slab ? { z: this.env.viewerApi.getState().currentZ, thickness: this.slab.thickness } : null,
    );
    this.env.invalidate();
  }

  /** Unsubscribes and stops planning. Does NOT dispose the target: the
   *  component built it and owns its lifetime. */
  dispose(): void {
    this.disposed = true;
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
  }
}
