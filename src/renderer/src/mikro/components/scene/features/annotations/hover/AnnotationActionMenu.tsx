import { useEffect, useMemo, useRef } from "react";
import { TriangleAlert } from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import { SmartContext } from "@/core/smart/ObjectButton";
import type { SmartSectionSelection } from "@/core/smart/extensions/section";
import { Popover, PopoverAnchor, PopoverContent } from "@/core/ui/popover";
import { useGetAnnotationDescriptorsQuery } from "@/mikro/api/graphql";

import { layerDisplayLabel } from "../../../platform/layerui/layerIdentity";
import { effectiveProbeLayerId } from "../../../platform/probe/probeTargeting";
import { useSceneStore, useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useViewStoreApi } from "../../../platform/stores/viewStore";
import { useViewerStore } from "../../../platform/stores/viewerStore";
import { useRoiSelectionStore, type HoverPoint, type SelectedRoi } from "../roiSelectionStore";
import { annotationObject, probeLensPartner } from "./annotationActionTarget";
import { projectTopRightCorner, projectWorldPoint } from "./projectRoiBox";

/**
 * Only what takes the PAIR. By id, as strings: the sections are rekuest's,
 * and this module imports none of it — each brings its own guard, so a
 * deployment without rekuest shows an empty menu, not an error.
 */
const PAIR_SECTIONS: SmartSectionSelection = {
  only: ["rekuest.shortcuts", "rekuest.actions", "rekuest.implementations"],
};

/**
 * The little menu a CLICK on a shape opens, where the click landed: the
 * actions that take this annotation and the image under it —
 * `f(Annotation, ArrayLens, ...)`, in that order, whatever they are called.
 * (The Run and Shortcuts sections match the two leading ports and let an
 * action carry further arguments, as on every drop; Implementations pins
 * exactly two.) Both sides go out with the descriptors they provide
 * (`annotationActionTarget`), so a port's `Requires` narrows the list: an
 * action wanting a rectangle is not offered on a point, one wanting a
 * single-channel image not against a stack.
 *
 * "The image under it" is the lens the probe reads — the pinned layer, else
 * the first visible one — the same rule as the probe readout, so pinning a
 * layer is how you say which image the action runs on.
 *
 * Beside, not instead of, the two other ways in: the right-click menu and the
 * ellipsis on the hover button's card open the shape's FULL menu (delete,
 * open, ...), with no partner.
 *
 * Opened by `roiSelectionStore.openRoiMenu` (the pick surfaces' plain click,
 * never a shift-click) and closed by Radix' dismissal, a finished row, or the
 * shape's layer leaving.
 */
export const AnnotationActionMenu = () => {
  const menu = useRoiSelectionStore((s) => s.menuRoi);
  if (!menu) return null;
  // Keyed by the click, not the shape: a second click on the same shape
  // re-anchors the menu instead of leaving it where the first one landed.
  return <OpenMenu key={`${menu.roi.id}:${menu.point?.join(",")}`} roi={menu.roi} point={menu.point} />;
};

const OpenMenu = ({ roi, point }: { roi: SelectedRoi; point: HoverPoint | null }) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const viewApi = useViewStoreApi();
  const closeRoiMenu = useRoiSelectionStore((s) => s.closeRoiMenu);
  const box = useRoiSelectionStore((s) => s.visibleRois[roi.id]);
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  // A scalar subscription (the target's id), then a `getState()` read: a
  // whole-array subscription would re-render on every layer edit.
  const sceneApi = useSceneStoreApi();
  const targetLayerId = useSceneStore((s) => effectiveProbeLayerId(probeLayerId, s.layers));
  const lens = useMemo(() => {
    const layers = sceneApi.getState().layers;
    return probeLensPartner(targetLayerId, layers, (layerId) => {
      const layer = layers.find((candidate) => candidate.id === layerId);
      return layer ? layerDisplayLabel(layer) : undefined;
    });
  }, [targetLayerId, sceneApi]);
  const { data, error, refetch } = useGetAnnotationDescriptorsQuery({ variables: { id: roi.id } });
  const descriptors = data?.annotation.descriptors;
  const objects = useMemo(() => [annotationObject(roi, descriptors)], [roi, descriptors]);
  const partners = useMemo(() => (lens ? [lens] : []), [lens]);
  // Opened by a DRAW (no click point), the draw key (`a`, held) is still
  // down: a focused search field would fill with its auto-repeat. A click on
  // a shape holds no key, and keeps type-to-search.
  const takeFocus = point !== null;

  // Placement: imperative, off the published view matrix, like the hover
  // button — the anchor follows the click point while the menu is open.
  useEffect(() => {
    const node = anchorRef.current;
    if (!node) return;
    const place = () => {
      const view = viewApi.getState();
      const matrix = view.viewProjectionMatrix;
      if (!matrix) return;
      const onScreen = point
        ? projectWorldPoint(point, matrix, view.viewportSize)
        : box
          ? projectTopRightCorner(box.bounds, box.zSpan, matrix, view.viewportSize)
          : null;
      if (onScreen) node.style.transform = `translate(${onScreen.x}px, ${onScreen.y}px)`;
    };
    place();
    return viewApi.subscribe(place);
  }, [point, box, viewApi]);

  // A shape just drawn has no click point, and no box until its layer has
  // shown it: wait for the box rather than open in the frame's corner.
  if (!point && !box) return null;

  return (
    <Popover open onOpenChange={(open) => !open && closeRoiMenu()}>
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-0 w-0"
        />
      </PopoverAnchor>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-72 border-border px-2 py-2 text-foreground"
        // `data-nonbreaker`: SelectionBox's global mousedown must not clear
        // the selection because the user picked a row here.
        data-nonbreaker
        // Radix focuses the content's first field on its own, `autoFocus` or not.
        onOpenAutoFocus={takeFocus ? undefined : (event) => event.preventDefault()}
      >
        {error ? (
          <StatusPage
            variant="compact"
            icon={TriangleAlert}
            tone="warning"
            title="Could not read this annotation"
            description={classifyError(error).message}
            actions={<RetryButton onRetry={() => refetch()} />}
          />
        ) : !lens ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No image layer to run on. Show one, or pin it as the probe target.
          </p>
        ) : descriptors === undefined ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>
        ) : (
          <SmartContext
            objects={objects}
            partners={partners}
            sections={PAIR_SECTIONS}
            autoFocus={takeFocus}
            onDone={closeRoiMenu}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};
