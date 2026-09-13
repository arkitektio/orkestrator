import { createStore, type StoreApi } from "zustand/vanilla";
import { createViewSlice, type ViewSlice } from "./viewer/viewSlice";
import { createChromeSlice, type ChromeSlice } from "./viewer/chromeSlice";
import { createDimsSlice, type DimsSlice } from "./viewer/dimsSlice";
import { createArraySlice, type ArraySlice } from "./viewer/arraySlice";
import { createProbeSlice, type ProbeSlice } from "./viewer/probeSlice";
import { createBudgetSlice, type BudgetSlice } from "./viewer/budgetSlice";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore"
import { RefObject } from "react";
import * as THREE from 'three';
import type { OpenedZarrArray } from "../sources/arrayRegistry";

/** The subset of the R3F root state we need for camera operations */
export interface CanvasContext {
  camera: THREE.Camera;
  controls: { target: THREE.Vector3; update: () => void } | null;
  /** CSS pixels. */
  size: { width: number; height: number };
  /** Active device-pixel ratio — the quality governor modulates this per tier,
   * so it is NOT `window.devicePixelRatio`. `size * dpr` is the real fragment
   * count the raymarch pays; the debug report needs it to stop guessing. */
  dpr: number;
  invalidate: () => void;
}

export interface TrackableObject {
  kind: "layer" | "gizmo" | "other";
  id: string;
  ref: RefObject<THREE.Object3D | undefined>;
}

// The range model lives with the visibility math in core/; re-exported here
// for the store's many consumers.
export type { LayerViewRange } from "../visibility/visibility";
import type { CameraPose } from "./viewStore";

/**
 * The exact view the CURRENT `layerViewRanges` were computed from — published
 * by `visibilityTracker` in the SAME store write as the ranges. The node
 * planner builds its `NodeCamera` from this instead of a live
 * `viewStore.getState()`, which made camera/box coherence rest on zustand
 * listener-insertion order + rAF FIFO: ~1 in 4 mid-orbit replans paired a
 * fresh camera with one-emission-stale ranges (the stale box also solely
 * determines `rootRange`). With the snapshot the pairing is STRUCTURAL —
 * whatever the plan's age, camera and box describe the same moment.
 * Fields carry viewStore's object identities (write-if-changed friendly).
 */
export type ViewSnapshot = {
  viewProjectionMatrix: THREE.Matrix4;
  viewportSize: { width: number; height: number };
  cameraPose: CameraPose | null;
};

import type { ProbeFetchKey, ProbeResult } from "../probe/probeTypes";
import type { AttributeFetchKey } from "@/mikro-next/lib/attributes/attributeTypes";

/**
 * The scene's concrete attribute key: the generic `(systemId, pointId)`
 * identity PLUS the probe fields the panels compare against
 * (`isSameProbeKey`) and the tracker needs to rebuild coordinates.
 */
export type SceneAttributeKey = AttributeFetchKey &
  ProbeFetchKey & {
    /** Mesh probes only: the instance's objectId — the tracker's value-known
     * lookup key (no field-array sample needed). */
    instanceValue?: number;
  };

/**
 * Build the scene key for a probed point: `pointId` encodes the probe identity
 * — and the fetch selection's signature, so changing what a hover fetches is a
 * new request to the resolver and the service's point cache rather than a
 * stale hit. `isSameProbeKey` ignores it, so the HUD still matches the point.
 */
export const sceneAttributeKey = (
  probe: ProbeFetchKey & { strategy?: string; values?: readonly { value: number | null }[] },
  systemId: string,
  selectionSignature = "",
): SceneAttributeKey => {
  const instanceValue =
    probe.strategy === "mesh" && probe.values?.[0]?.value != null
      ? probe.values[0].value
      : undefined;
  return {
    layerId: probe.layerId,
    voxelIndex: probe.voxelIndex,
    sliceSignature: probe.sliceSignature,
    systemId,
    pointId: `${probe.layerId}:${probe.voxelIndex.join(",")}:${probe.sliceSignature}${
      selectionSignature ? `|${selectionSignature}` : ""
    }`,
    ...(instanceValue !== undefined ? { instanceValue } : {}),
  };
};

/** Historical name for the probe result; kept so the markers / probe-orbit
 * consumers (`layerId`/`localPos`/`voxelIndex`) compile untouched. */
export type ProbedCoordinate = ProbeResult;
export type { ProbeMode, ProbeResult } from "../probe/probeTypes";

/** One picked mesh instance (`FabriksCollectionLayer` click / card input). */
export interface MeshSelectionState {
  layerId: string;
  /** The dense per-vertex ordinal — what the shader highlights/isolates. */
  ordinal: number;
  /** Resolved asynchronously from the collection's object catalog. */
  objectId: number | null;
  /** Catalog stats, resolved alongside `objectId`. */
  stats: { vertices: number; indices: number } | null;
  isolate: boolean;
}

/** Why layers were culled from display by the render-cost budget. */
export interface RenderBudgetInfo {
  budgetBytes: number;
  usedBytes: number;
  culledLayerIds: string[];
}

/** Per-scene viewer state: camera-derived facts, trackables, probes and the
 * declarative chunk plans the scene managers write. */
export interface ViewerState
  extends ViewSlice,
    ChromeSlice,
    DimsSlice,
    ArraySlice,
    ProbeSlice,
    BudgetSlice {
  /* Every member now belongs to a slice. Feature-owned slices (bricks,
   * meshes) are registered by SceneProvider and reached through their own
   * hooks — see `makeViewerSliceHooks`. */
}

function createViewerStoreInternal(
  arraysByStoreId: Map<string, OpenedZarrArray>,
  extraSlices: readonly AnyViewerSlice[],
) {
  return createStore<ViewerState>((set, get) => ({
    ...createViewSlice(set, get),
    ...createChromeSlice(set, get),
    ...createDimsSlice(set, get),
    ...createArraySlice(arraysByStoreId),
    ...createProbeSlice(set),
    ...createBudgetSlice(set),
    // Feature-owned slices, supplied by SceneProvider. `platform/` cannot
    // import them, so composition happens at the shell.
    ...Object.assign({}, ...extraSlices.map((slice) => slice(set as never, get as never))),
  }));
}

/**
 * Build the viewer store over arrays that are ALREADY open.
 *
 * Opening them is the provider's job, not the store's: a store that fetches is
 * a service locator, and it forced platform/stores to import platform/sources
 * and the cold-open timeline just to construct itself. `SceneProvider` already
 * opens arrays in its reconcile effect, so it is the natural owner of the
 * opening on first build too.
 */
export function createViewerStore(
  arraysByStoreId: Map<string, OpenedZarrArray>,
  extraSlices: readonly AnyViewerSlice[] = [],
) {
  return createViewerStoreInternal(arraysByStoreId, extraSlices);
}

/**
 * A slice of the viewer store.
 *
 * Sees the WHOLE composed state through `set`/`get` — slices share one store,
 * so a write from any of them is as atomic as it ever was — and returns only
 * its own members. Hand-rolled rather than zustand's `StateCreator` because
 * there is no middleware here, so the mutator tuples would all be empty and
 * buy nothing but noise.
 */
export type ViewerSliceOf<S> = (
  set: (
    partial:
      | Partial<ViewerState & S>
      | ((state: ViewerState & S) => Partial<ViewerState & S>),
  ) => void,
  get: () => ViewerState & S,
) => S;

/**
 * Slices erase to this at the composition point so one array can hold a
 * heterogeneous set of them.
 *
 * `never[]` params rather than `ViewerSliceOf<Record<string, unknown>>`:
 * function parameters are contravariant, so a concretely-typed slice is not
 * assignable to a loosely-typed one. This is the type that actually means
 * "erased", and it matches how the composer invokes them.
 */
export type AnyViewerSlice = (...args: never[]) => object;

/**
 * Typed access to a feature's slice of the viewer store.
 *
 * Reuses the ONE `ViewerStoreContext` — there is a single store and this only
 * re-types it, so nothing about subscription or write atomicity changes.
 *
 * The cast is unavoidable and lives here, once. The context is declared
 * `StoreApi<ViewerState>` because `platform/` may not name a feature's slice,
 * while the composed store genuinely carries more; registering the slice in
 * `SceneProvider` is what makes the wider type true, and `shell/viewerStoreComposition.test.ts`
 * asserts the resulting key set so an unregistered slice cannot pass silently.
 */
export const makeViewerSliceHooks = <S,>() => ({
  useSlice: <T,>(selector: (state: ViewerState & S) => T): T =>
    useViewerStore(selector as (state: ViewerState) => T),
  useSliceApi: (): StoreApi<ViewerState & S> =>
    useViewerStoreApi() as unknown as StoreApi<ViewerState & S>,
});

const {
  StoreContext: ViewerStoreContext,
  useScopedStore: useViewerStore,
  useStoreApi: useViewerStoreApi,
} = createScopedStoreHooks<ViewerState>("ViewerStore");

export { ViewerStoreContext, useViewerStore, useViewerStoreApi };
