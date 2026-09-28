import { useEffect, useRef } from "react";

import type { DetailAnnotationFragment } from "@/mikro/api/graphql";

import type { AnnotationLayerVariant } from "./annotationBounds";
import { SceneGuard } from "../../platform/stores/sceneScope";
import { useRoiSelectionStoreApi } from "./roiSelectionStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStoreApi, type ViewerState } from "../../platform/stores/viewerStore";
import { useNavigateToAnnotation } from "./useNavigateToAnnotation";

/**
 * Opens a scene ON one annotation: selects it (the amber highlight the canvas
 * draws) and frames the camera on it, exactly once per (scope, annotation).
 * The annotation detail page's whole reason to render a scene — landing on the
 * scene's own default fit would show the composition, not the shape.
 *
 * Self-guarded, so a page can drop it anywhere under `Scene.Provider`. It is
 * deliberately NOT a viewport child: `SceneViewport` renders
 * `children ?? <DefaultScenePanels />`, so a child passed there would replace
 * the default panel stack.
 */
export const FocusAnnotationOnMount = (props: {
  annotation: DetailAnnotationFragment;
}) => (
  <SceneGuard>
    <FocusBody annotation={props.annotation} />
  </SceneGuard>
);

const canvasReady = (state: ViewerState) =>
  state.canvas !== null && state.canvas.controls !== null;

const FocusBody = ({ annotation }: { annotation: DetailAnnotationFragment }) => {
  const viewerApi = useViewerStoreApi();
  const selectionApi = useRoiSelectionStoreApi();
  const navigateToAnnotation = useNavigateToAnnotation();

  // The one reactive read. `sceneLayers` can now be rewritten on any layer
  // reconcile (the provider folds a changed layer set into the live stores
  // rather than rebuilding), but the reconcile preserves the object identity
  // of layers that did not structurally change — so this still settles on the
  // first commit and never churns at camera or poll cadence.
  const layer = useSceneStore((state) =>
    state.sceneLayers.find(
      (candidate): candidate is AnnotationLayerVariant =>
        candidate.__typename === "AnnotationLayer" &&
        candidate.annotationCollection?.id === annotation.collection.id,
    ),
  );

  // The effect keys on the annotation ID, so a cache re-emission of the same
  // annotation must not re-yank the camera — the live fragment is read through
  // a ref instead.
  const annotationRef = useRef(annotation);
  annotationRef.current = annotation;

  // Same reasoning on the layer axis: a registration refinement re-derives the
  // layer object mid-session, and firing the fly-to again would yank the
  // camera out from under a user who has since moved it. Only the layer's
  // IDENTITY (does it exist, and which one is it) may re-arm the focus.
  const layerRef = useRef(layer);
  layerRef.current = layer;
  const layerId = layer?.id ?? null;

  useEffect(() => {
    const layer = layerRef.current;
    if (!layerId || !layer) return;
    let cancelled = false;
    let frame = 0;
    let unsubscribe: (() => void) | null = null;

    const focus = () => {
      const current = annotationRef.current;
      const system = layer.annotationCollection?.coordinateSystem ?? null;
      // The same SelectedRoi the canvas layer and the annotations panel build:
      // RAW collection-space vectors plus the collection's own system, because
      // attribute plans do any frame conversion themselves. The canvas
      // highlight matches by annotation id, so this lands even before the
      // layer's own query has resolved.
      selectionApi.getState().selectOnlyRoi({
        id: current.id,
        layerId: layer.id,
        name: current.name,
        kind: current.kind,
        systemId: system?.id ?? null,
        axisNames: (system?.axes ?? []).map((axis) => axis.name),
        vectors: current.vectors ?? [],
        coordinates: current.coordinates ?? [],
      });

      // One frame later: `InitialCameraFit` frames the WHOLE scene in a layout
      // effect of the commit that installs OrbitControls, and its
      // "don't stomp the user" latch is armed only by real pointer
      // interaction — a fit issued in that same commit would be reframed away.
      // This makes the annotation the last word on the camera.
      frame = requestAnimationFrame(() => {
        if (!cancelled) navigateToAnnotation(current, layer);
      });
    };

    if (canvasReady(viewerApi.getState())) {
      focus();
    } else {
      // Canvas registration is a store write nothing subscribes to in React —
      // `CanvasSync` re-registers on every resize and DPR change, and states
      // as much. Wait for it on the vanilla store rather than re-rendering at
      // that cadence. Controls too, not just the canvas: `navigateToAnnotation`
      // returns early without a canvas, and a fit applied before OrbitControls
      // installs would leave the pivot behind.
      unsubscribe = viewerApi.subscribe((state) => {
        if (cancelled || !canvasReady(state)) return;
        unsubscribe?.();
        unsubscribe = null;
        focus();
      });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      unsubscribe?.();
    };
    // `annotation.id` / `layerId`, not the objects: fragment identity churn
    // must not re-fire the fly-to under a user who has since moved the camera.
  }, [viewerApi, selectionApi, navigateToAnnotation, layerId, annotation.id]);

  // Fires once, so a window resize after the fly-to re-runs `InitialCameraFit`
  // and reframes the whole scene (its latch is armed only by interaction). The
  // alternative — refocusing on every resize — would fight the user instead.
  return null;
};
