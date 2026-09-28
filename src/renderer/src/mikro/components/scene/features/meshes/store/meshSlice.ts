import { makeViewerSliceHooks, type ViewerSliceOf } from "../../../platform/stores/viewerStore";
import type { FabriksCollectionManager } from "../fabriks/fabriksManager";

/**
 * The mesh renderer's slice of the viewer store — the per-layer fabriks
 * managers and their streaming-progress counter.
 *
 * Here rather than in `platform/stores` because it names
 * `FabriksCollectionManager`. Note what is NOT here: `meshSelection` lives in
 * the probe slice, because the picked mesh instance is one scene-wide
 * selection of the same kind as the probed point, and putting it here would
 * make `probe -> meshes` an edge.
 */
export interface MeshSlice {
  /** Per-MeshLayer fabriks managers (owned by FabriksCollectionLayer), for
   * debug consumers — the mesh twin of `brickSystem`. */
  meshSystems: Record<string, FabriksCollectionManager>;
  registerMeshSystem: (layerId: string, manager: FabriksCollectionManager | null) => void;
  /** Bumped (throttled by the layer) as mesh cells plan/stream. STREAMING
   * cadence — only debug consumers may subscribe (P17), like `residencyVersion`. */
  meshVersion: number;
  bumpMeshVersion: () => void;
}

export const createMeshSlice: ViewerSliceOf<MeshSlice> = (set) => ({
  meshSystems: {},
  registerMeshSystem: (layerId, manager) =>
    set((state) => {
      const meshSystems = { ...state.meshSystems };
      if (manager) meshSystems[layerId] = manager;
      else delete meshSystems[layerId];
      return { meshSystems };
    }),
  meshVersion: 0,
  bumpMeshVersion: () => set((state) => ({ meshVersion: state.meshVersion + 1 })),
});

export const { useSlice: useMeshStore, useSliceApi: useMeshStoreApi } =
  makeViewerSliceHooks<MeshSlice>();
