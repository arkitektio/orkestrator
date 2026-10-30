import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import { AnnotationKind } from "@/mikro/api/graphql";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";
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

/** A point in scene world coordinates. */
export type HoverPoint = readonly [number, number, number];

export interface RoiBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface VisibleRoi extends SelectedRoi {
  bounds: RoiBounds;
  /** World z extent — with `bounds`, the box the hover card is pinned to. */
  zSpan: ZSpan;
}

/**
 * How long a hover survives the pointer leaving the shape. Long enough to
 * travel from the shape onto its attached button — from a path that is a
 * few pixels of stroke and no interior to rest on — short enough that a
 * button never lingers on a shape the pointer merely crossed.
 */
export const HOVER_GRACE_MS = 350;

interface RoiSelectionState {
  selectedRois: SelectedRoi[];
  /**
   * What each layer shows now, by layer id then shape id: rewritten whole per
   * layer whenever its shown set changes, a z-scrub's cadence. Published frozen
   * and outside Immer (`setVisibleLayerRois`): reading a dictionary of thousands
   * through a draft costs a proxy per shape, and Immer would deep-freeze it all.
   */
  visibleRois: Readonly<Record<string, ReadonlyMap<string, VisibleRoi>>>;
  /**
   * The shape under the pointer (UI cadence: it CHANGES on enter/leave only —
   * the pick surfaces call `hoverRoi` per move, and the same id is a no-op).
   */
  hoveredRoi: SelectedRoi | null;
  /** Cancels a pending grace clear; sets when the id changed. Cheap enough to
   * call per pointer move — re-asserting is what heals a grace clear that
   * landed while the pointer was still on the shape. Ignored for another
   * shape while the hover is held (`holdHover`). */
  hoverRoi: (roi: SelectedRoi, point?: HoverPoint) => void;
  /**
   * Where the pointer ENTERED the hovered shape, scene world coordinates —
   * the attached button sits next to it. Recorded once per hover (a getter
   * over the closure, not state: nothing re-renders on it) and null when
   * nothing is hovered or the pick surface reported no point.
   */
  hoverPoint: () => HoverPoint | null;
  /**
   * Clears after `HOVER_GRACE_MS` — unless the hover is held, or another
   * shape took over in the meantime. Ignored for a roi that is not hovered.
   */
  unhoverRoi: (roiId: string) => void;
  /**
   * The overlay's grip: true while the pointer is on the attached button, or
   * its card or its menu is open. No other shape takes the hover over while
   * it is held. Releasing with the pointer on no shape clears after the
   * grace, like a pointer-out.
   */
  holdHover: (held: boolean) => void;
  /**
   * The shape whose card is pinned open (`hover/AnnotationHoverCard`: a
   * click on the shape, a draw, a click on its button), and where it was
   * clicked, scene world coordinates — a card that is not already showing
   * opens there. Null point: the pick surface reported none (a draw), and the
   * card falls back to the shape's box corner.
   */
  menuRoi: { roi: SelectedRoi; point: HoverPoint | null } | null;
  openRoiMenu: (roi: SelectedRoi, point?: HoverPoint) => void;
  closeRoiMenu: () => void;
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

/** A shape's visible entry, whichever layer shows it. */
export const findVisibleRoi = (
  visibleRois: RoiSelectionState["visibleRois"],
  id: string,
): VisibleRoi | undefined => {
  for (const layerId in visibleRois) {
    const hit = visibleRois[layerId].get(id);
    if (hit) return hit;
  }
  return undefined;
};

export const createRoiSelectionStore = () => {
  // Hover bookkeeping lives in the closure, not the state: a timer handle and
  // a hold flag are not things a subscriber should ever re-render on.
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  let held = false;
  let enteredAt: HoverPoint | null = null;
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
        hoverRoi: (roi, point) => {
          const current = get().hoveredRoi;
          // A held hover is the overlay's: its card or its menu is open on
          // that shape, and the pointer crossing another on the way must not
          // swap the target out from under it.
          if (held && current && current.id !== roi.id) return;
          cancelGrace();
          if (current?.id === roi.id) return;
          enteredAt = point ?? null;
          set((state) => {
            state.hoveredRoi = roi;
          });
        },
        hoverPoint: () => (get().hoveredRoi ? enteredAt : null),
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
        menuRoi: null,
        openRoiMenu: (roi, point) =>
          set((state) => {
            state.menuRoi = { roi, point: point ? [point[0], point[1], point[2]] : null };
          }),
        closeRoiMenu: () => {
          if (get().menuRoi === null) return;
          set((state) => {
            state.menuRoi = null;
          });
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
            if (state.menuRoi && gone.has(state.menuRoi.roi.layerId)) state.menuRoi = null;
          }),
        setVisibleLayerRois: (layerId, rois) =>
          set({
            visibleRois: Object.freeze({
              ...get().visibleRois,
              [layerId]: new Map(rois.map((roi) => [roi.id, roi])),
            }),
          }),
        clearVisibleLayerRois: (layerId) => {
          const { [layerId]: _gone, ...visibleRois } = get().visibleRois;
          const { hoveredRoi, menuRoi } = get();
          set({
            visibleRois: Object.freeze(visibleRois),
            // The layer unmounted: its shapes can no longer report a leave.
            hoveredRoi: hoveredRoi?.layerId === layerId ? null : hoveredRoi,
            menuRoi: menuRoi?.roi.layerId === layerId ? null : menuRoi,
          });
        },
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
