import { useCallback, useEffect, useRef, useState } from "react";
import { EllipsisIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MikroAnnotation } from "@/linkers";
import { useSettings } from "@/providers/settings/SettingsContext";

import { useViewStoreApi } from "../../../platform/stores/viewStore";
import {
  useRoiSelectionStore,
  useRoiSelectionStoreApi,
  type VisibleRoi,
} from "../roiSelectionStore";
import { buttonOriginFor, projectTopRightCorner } from "./projectRoiBox";

/**
 * The action button attached to the hovered annotation: one small button
 * whose bottom-left sits exactly on the shape's most top-right corner on
 * screen (an actual corner of the shape's world box, `projectTopRightCorner`),
 * opening the annotation's `SmartContext` (the same menu as the sidebar row's button and
 * the right-click menu on a smart card).
 *
 * Plain DOM over the canvas, in the viewport's overlay block. Hover comes
 * from the pick surfaces through `roiSelectionStore.hoveredRoi` (enter/leave
 * cadence); PLACEMENT never touches React — a view-store subscription projects
 * the shape's world box on every camera emission and writes the transform
 * straight onto the node (P17). Hidden while the camera moves, re-placed by
 * the trailing settle emission.
 *
 * The hover is HELD (`holdHover`) while the pointer is on the button or its
 * popover is open, so travelling from the shape to the button — or picking a
 * menu entry — never loses the target.
 *
 * An experiment (Settings → General): with `experimentAnnotationHover` off the
 * button never appears and annotations are reached from the sidebar row and
 * the right-click menu, as before. Only the button is gated — the hover store
 * it reads is the picking layer's, which the scene needs either way.
 */
export const HoveredAnnotationButton = () => {
  const { settings } = useSettings();
  const hovered = useRoiSelectionStore((s) => s.hoveredRoi);
  // The world box, by identity: rewritten only when the layer's shown set
  // changes. Undefined once the shape scrolls out of the slab — no box, no
  // button.
  const visible = useRoiSelectionStore((s) =>
    s.hoveredRoi ? s.visibleRois[s.hoveredRoi.id] : undefined,
  );
  if (settings.experimentAnnotationHover === false) return null;
  if (!hovered || !visible || visible.id !== hovered.id) return null;
  return <AttachedButton key={hovered.id} roi={visible} />;
};

const AttachedButton = ({ roi }: { roi: VisibleRoi }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const viewApi = useViewStoreApi();
  const selectionApi = useRoiSelectionStoreApi();
  const [open, setOpen] = useState(false);
  const pointerInsideRef = useRef(false);
  // The smart object is the SELECTION shape (what the sidebar card and the
  // local actions expect), not the placement box: strip the world extent,
  // and spell out `name` — the store's may be `undefined`, which JSON has no
  // word for.
  const { bounds: _bounds, zSpan: _zSpan, ...selected } = roi;
  const object = { ...selected, name: selected.name ?? null };

  // Placement: imperative, off the published view matrix.
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const place = () => {
      const view = viewApi.getState();
      const matrix = view.viewProjectionMatrix;
      const anchor =
        matrix && !view.cameraMoving
          ? projectTopRightCorner(roi.bounds, roi.zSpan, matrix, view.viewportSize)
          : null;
      if (!anchor) {
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
        return;
      }
      const { left, top } = buttonOriginFor(
        anchor,
        { width: node.offsetWidth, height: node.offsetHeight },
        view.viewportSize,
      );
      node.style.transform = `translate(${left}px, ${top}px)`;
      node.style.opacity = "1";
      node.style.pointerEvents = "auto";
    };
    place();
    return viewApi.subscribe(place);
  }, [roi, viewApi]);

  // Release the grip on unmount too — a held hover with nobody holding it
  // would never clear.
  useEffect(
    () => () => {
      selectionApi.getState().holdHover(false);
    },
    [selectionApi],
  );

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      selectionApi.getState().holdHover(next || pointerInsideRef.current);
    },
    [selectionApi],
  );

  return (
    <div
      ref={nodeRef}
      // `data-nonbreaker`: SelectionBox's global mousedown must not clear the
      // scene selection because the user clicked this button.
      data-nonbreaker
      className="absolute left-0 top-0 z-30 will-change-transform"
      style={{ opacity: 0, pointerEvents: "none" }}
      onPointerEnter={() => {
        pointerInsideRef.current = true;
        selectionApi.getState().holdHover(true);
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false;
        if (!open) selectionApi.getState().holdHover(false);
      }}
    >
      <MikroAnnotation.ObjectButton
        object={object}
        open={open}
        onOpenChange={onOpenChange}
        onDone={() => onOpenChange(false)}
      >
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 rounded-full bg-background/80 shadow-sm backdrop-blur"
          aria-label="Annotation actions"
        >
          <EllipsisIcon className="h-3.5 w-3.5" />
        </Button>
      </MikroAnnotation.ObjectButton>
    </div>
  );
};
