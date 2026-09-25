import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import { AnnotationKind } from "@/mikro/api/graphql";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";
import type { ZSpan } from "./annotationVisibility";

export interface SelectedRoi {
  id: string;
  layerId: string;
  name: string | null | undefined;
  kind: AnnotationKind;
  /** The collection's coordinate system — attribute lookups start here (the
   * server resolves the path to every reachable table). */
  systemId: string | null;
  /** Ordered axis names of that system (spatial = last three, reversed —
   * the `resolveCollectionMatrix` convention). */
  axisNames: string[];
  /** RAW collection-space annotation vectors. */
  vectors: number[][];
  /** The annotation's pinned discrete coords. */
  coordinates: { name: string; value: number }[];
}

export interface RoiBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface VisibleRoi extends SelectedRoi {
  bounds: RoiBounds;
  /** World z extent — with `bounds`, the box the hover button is pinned to. */
  zSpan: ZSpan;
}

/**
 * How long a hover survives the pointer leaving the shape. Long enough to
 * travel from the shape onto its attached button, short enough that a
 * button never lingers on a shape the pointer merely crossed.
 */
export const HOVER_GRACE_MS = 200;

interface RoiSelectionState {
  selectedRois: SelectedRoi[];
  visibleRois: Record<string, VisibleRoi>;
  /**
   * The shape under the pointer (UI cadence: it CHANGES on enter/leave only —
   * the pick surfaces call `hoverRoi` per move, and the same id is a no-op).
   */
  hoveredRoi: SelectedRoi | null;
  /** Cancels a pending grace clear; sets when the id changed. Cheap enough to
   * call per pointer move — re-asserting is what heals a grace clear that
   * landed while the pointer was still on the shape. */
  hoverRoi: (roi: SelectedRoi) => void;
  /**
   * Clears after `HOVER_GRACE_MS` — unless the hover is held, or another
   * shape took over in the meantime. Ignored for a roi that is not hovered.
   */
  unhoverRoi: (roiId: string) => void;
  /**
   * The overlay's grip: true while the pointer is on the attached button or
   * its popover is open. Releasing with the pointer on no shape clears after
   * the grace, like a pointer-out.
   */
  holdHover: (held: boolean) => void;
  selectOnlyRoi: (roi: SelectedRoi) => void;
  replaceSelectedRois: (rois: SelectedRoi[]) => void;
  mergeSelectedRois: (rois: SelectedRoi[]) => void;
  toggleSelectedRoi: (roi: SelectedRoi) => void;
  removeSelectedRoi: (roiId: string) => void;
  clearSelectedRois: () => void;
  /**
   * Drop every selection belonging to layers that have left the scene.
   *
   * A selection outlives its layer otherwise, and a selected shape with no
   * layer is worse than nothing: everything that resolves the collection by
   * `layerId` keeps describing something that is no longer in the scene.
   */
  dropLayerSelections: (layerIds: readonly string[]) => void;
  setVisibleLayerRois: (layerId: string, rois: VisibleRoi[]) => void;
  clearVisibleLayerRois: (layerId: string) => void;
}

export const createRoiSelectionStore = () => {
  // Hover bookkeeping lives in the closure, not the state: a timer handle and
  // a hold flag are not things a subscriber should ever re-render on.
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  let held = false;
  const cancelGrace = () => {
    if (graceTimer === null) return;
    clearTimeout(graceTimer);
    graceTimer = null;
  };

  return createStore<RoiSelectionState>()(
    immer((set, get) => {
      const scheduleClear = () => {
        cancelGrace();
        graceTimer = setTimeout(() => {
          graceTimer = null;
          if (held) return;
          set((state) => {
            state.hoveredRoi = null;
          });
        }, HOVER_GRACE_MS);
      };

      return {
        selectedRois: [],
        visibleRois: {},
        hoveredRoi: null,
        hoverRoi: (roi) => {
          cancelGrace();
          if (get().hoveredRoi?.id === roi.id) return;
          set((state) => {
            state.hoveredRoi = roi;
          });
        },
        unhoverRoi: (roiId) => {
          if (get().hoveredRoi?.id !== roiId) return;
          scheduleClear();
        },
        holdHover: (next) => {
          if (held === next) return; // a release without a hold must not clear
          held = next;
          if (next) {
            cancelGrace();
            return;
          }
          if (get().hoveredRoi) scheduleClear();
        },
        selectOnlyRoi: (roi) =>
          set((state) => {
            state.selectedRois = [roi];
          }),
        replaceSelectedRois: (rois) =>
          set((state) => {
            state.selectedRois = rois;
          }),
        mergeSelectedRois: (rois) =>
          set((state) => {
            const next = new Map(state.selectedRois.map((roi) => [roi.id, roi]));
            rois.forEach((roi) => {
              next.set(roi.id, roi);
            });
            state.selectedRois = Array.from(next.values());
          }),
        toggleSelectedRoi: (roi) =>
          set((state) => {
            const index = state.selectedRois.findIndex((selected) => selected.id === roi.id);
            if (index === -1) {
              state.selectedRois.push(roi);
              return;
            }

            state.selectedRois.splice(index, 1);
          }),
        removeSelectedRoi: (roiId) =>
          set((state) => {
            state.selectedRois = state.selectedRois.filter((roi) => roi.id !== roiId);
          }),
        clearSelectedRois: () =>
          set((state) => {
            state.selectedRois = [];
          }),
        dropLayerSelections: (layerIds) =>
          set((state) => {
            const gone = new Set(layerIds);
            const next = state.selectedRois.filter((roi) => !gone.has(roi.layerId));
            // Skip the write when nothing was selected in those layers — this
            // runs on every reconcile that removes a layer.
            if (next.length !== state.selectedRois.length) state.selectedRois = next;
            if (state.hoveredRoi && gone.has(state.hoveredRoi.layerId)) state.hoveredRoi = null;
          }),
        setVisibleLayerRois: (layerId, rois) =>
          set((state) => {
            Object.keys(state.visibleRois).forEach((roiId) => {
              if (state.visibleRois[roiId]?.layerId === layerId) {
                delete state.visibleRois[roiId];
              }
            });

            rois.forEach((roi) => {
              state.visibleRois[roi.id] = roi;
            });
          }),
        clearVisibleLayerRois: (layerId) =>
          set((state) => {
            Object.keys(state.visibleRois).forEach((roiId) => {
              if (state.visibleRois[roiId]?.layerId === layerId) {
                delete state.visibleRois[roiId];
              }
            });
            // The layer unmounted: its shapes can no longer report a leave.
            if (state.hoveredRoi?.layerId === layerId) state.hoveredRoi = null;
          }),
      };
    }),
  );
};

const {
  StoreContext: RoiSelectionStoreContext,
  useScopedStore: useRoiSelectionStore,
  useStoreApi: useRoiSelectionStoreApi,
} = createScopedStoreHooks<RoiSelectionState>("RoiSelectionStore");

export {
  RoiSelectionStoreContext,
  useRoiSelectionStore,
  useRoiSelectionStoreApi,
};
