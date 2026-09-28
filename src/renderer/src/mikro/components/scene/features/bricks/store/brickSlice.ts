import { makeViewerSliceHooks, type ViewerSliceOf } from "../../../platform/stores/viewerStore";
import type { LayerNodePlan } from "../octree/nodePlanning";
import type { BrickResidencyManager } from "../residency/brickResidency";

/** Why a layer cannot be planned/rendered in the current display mode: its
 * coarsest pyramid level's pinned atlas floor exceeds the GPU budget (a layer
 * without a multiscale pyramid — see OCTREE_RENDERER.md P18). */
export interface UnplannableLayerInfo {
  mode: "2D" | "3D";
  floorBytes: number;
  capBytes: number;
}

/**
 * The brick engine's slice of the viewer store.
 *
 * Lives here rather than in `platform/stores` because these members name brick
 * types — `LayerNodePlan`, `BrickResidencyManager` — and `platform/` may not
 * import a feature. It is still the SAME store and the same `set`: slices
 * compose, they do not split, so nothing about write atomicity or subscription
 * cadence changes. `SceneProvider` registers it.
 *
 * Read it through `useBrickStore` / `useBrickStoreApi` below, not
 * `useViewerStore` — the hook name is what tells the next reader which module
 * owns the field.
 */
export interface BrickSlice {
  /* Brick- and mesh-owned members, still declared here until they move into
   * the features that own them (that is what removes the last
   * `platform -> features` type imports). */
  /** Declarative per-layer octree node plans, written by the node-plan tracker. */
  nodePlans: Record<string, LayerNodePlan>;
  setNodePlans: (plans: Record<string, LayerNodePlan>) => void;
  /** Bumped by the brick residency manager whenever bricks become resident.
   * STREAMING-progress cadence — only debug consumers (DebugPanel,
   * BrickResidencyOverlay) may subscribe; layer components must use
   * `poolsVersion` instead (P17). Deliberately NOT a node-plan replan trigger. */
  residencyVersion: number;
  bumpResidencyVersion: () => void;
  /** Bumped only when a layer's brick POOL is created, rebuilt or disposed —
   * the rare lifecycle event layer components actually need to re-render on
   * (their memos key on pool identity). */
  poolsVersion: number;
  bumpPoolsVersion: () => void;
  /** Handle to the brick residency manager (owned by BrickSystemProvider). */
  brickSystem: BrickResidencyManager | null;
  registerBrickSystem: (manager: BrickResidencyManager | null) => void;
  /** Layers refused by the pool-viability guard for the CURRENT display mode
   * (empty when all layers are plannable). Written by nodePlanTracker /
   * brickResidency; read by the layer panel badge and DebugPanel. */
  unplannableLayers: Record<string, UnplannableLayerInfo>;
  setUnplannableLayers: (layers: Record<string, UnplannableLayerInfo>) => void;

  lodBias: number;
  setLodBias: (bias: number) => void;
}

export const createBrickSlice: ViewerSliceOf<BrickSlice> = (set) => ({
  nodePlans: {},
  setNodePlans: (plans) => set({ nodePlans: plans }),
  residencyVersion: 0,
  bumpResidencyVersion: () => set((state) => ({ residencyVersion: state.residencyVersion + 1 })),
  poolsVersion: 0,
  bumpPoolsVersion: () => set((state) => ({ poolsVersion: state.poolsVersion + 1 })),
  brickSystem: null,
  registerBrickSystem: (manager) => set({ brickSystem: manager }),
  unplannableLayers: {},
  setUnplannableLayers: (layers) => set({ unplannableLayers: layers }),
  lodBias: 1,
  setLodBias: (bias) => set({ lodBias: bias }),
});

export const { useSlice: useBrickStore, useSliceApi: useBrickStoreApi } =
  makeViewerSliceHooks<BrickSlice>();
