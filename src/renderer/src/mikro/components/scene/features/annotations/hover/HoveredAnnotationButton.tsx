import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EllipsisIcon, XIcon } from "lucide-react";

import { Button } from "@/core/ui/button";
import { MikroAnnotation } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { useGetAnnotationCreatorQuery } from "@/mikro/api/graphql";
import { useSettings } from "@/core/settings/store/SettingsContext";

import { useViewStoreApi } from "../../../platform/stores/viewStore";
import {
  useRoiSelectionStore,
  useRoiSelectionStoreApi,
  type VisibleRoi,
} from "../roiSelectionStore";
import { formatAnnotationKind } from "../../../platform/model/selectionFormat";
import { AnnotationInfoCard } from "./AnnotationInfoCard";
import {
  BUTTON_POINTER_OFFSET_PX,
  cardOriginFor,
  projectTopRightCorner,
  projectWorldPoint,
} from "./projectRoiBox";

/** The bare button, and the card it grows into (CSS px). */
const BUTTON_SIZE = 24;
const CARD_WIDTH = 288;
const BUTTON_BOX = { width: BUTTON_SIZE, height: BUTTON_SIZE };

/**
 * The button attached to the hovered annotation: one small button just
 * up-right of where the pointer ENTERED the shape
 * (`roiSelectionStore.hoverPoint`). A click GROWS it into a card about the
 * shape — who drew it, where it sits, what was cut to it and computed from
 * it (`AnnotationInfoCard`, asked for on that click) — whose header carries
 * the annotation's `SmartContext` behind an ellipsis (the same menu as the
 * sidebar row's button and the viewport's right-click,
 * `shell/SceneContextMenu`). Next to the pointer rather than on the shape's
 * box corner, because for a long path that corner can be half a screen from
 * the stroke the pointer is on. It stays where it appeared while the pointer
 * moves along the shape — a target that fled would be no easier to reach.
 * A hover that reported no point falls back to the box's most top-right
 * corner (`projectTopRightCorner`).
 *
 * Plain DOM over the canvas, in the viewport's overlay block. Hover comes
 * from the pick surfaces through `roiSelectionStore.hoveredRoi` (enter/leave
 * cadence); PLACEMENT never touches React — a view-store subscription projects
 * the shape's world box on every camera emission and writes the transform
 * straight onto the node (P17). Hidden while the camera moves, re-placed by
 * the trailing settle emission.
 *
 * The hover is HELD (`holdHover`) while the pointer is on the button, or its
 * card or its menu is open, so travelling from the shape to the button,
 * reading the card or picking a menu entry never loses the target — and no
 * other shape the pointer crosses takes it over. The card closes on Escape,
 * on its close button and on a press anywhere outside it.
 *
 * The growing is an inner element's (a width/height spring): the outer node
 * keeps its imperative transform, re-placed as the card resizes so it unfolds
 * right and down from the avatar and stays inside the frame (`cardOriginFor`).
 *
 * The button wears the avatar of whoever drew the shape, so a hover already
 * says whose it is; the ellipsis stands in until that is known, and for a
 * shape with no recorded author. The author is asked for per hovered shape
 * (`GetAnnotationCreator`, one row by id), never selected on the scene list,
 * which ships every shape of every layer.
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
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Read once: this component is keyed by the hovered id, so its lifetime IS
  // one hover, and the entry point never moves within it.
  const [entry] = useState(() => selectionApi.getState().hoverPoint());
  const pointerInsideRef = useRef(false);
  // The smart object is the SELECTION shape (what the sidebar card and the
  // local actions expect), not the placement box: strip the world extent,
  // and spell out `name` — the store's may be `undefined`, which JSON has no
  // word for.
  const { bounds: _bounds, zSpan: _zSpan, ...selected } = roi;
  const object = { ...selected, name: selected.name ?? null };
  const { data: creatorData } = useGetAnnotationCreatorQuery({
    variables: { id: roi.id },
  });
  const creator = creatorData?.annotation.creator?.sub;

  // Placement: imperative, off the published view matrix — and again whenever
  // the node changes size, which it does on every frame of the card's spring.
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const place = () => {
      const view = viewApi.getState();
      const matrix = view.viewProjectionMatrix;
      const entryOnScreen =
        entry && matrix ? projectWorldPoint(entry, matrix, view.viewportSize) : null;
      const anchor =
        !matrix || view.cameraMoving
          ? null
          : entryOnScreen
            ? {
                x: entryOnScreen.x + BUTTON_POINTER_OFFSET_PX,
                y: entryOnScreen.y - BUTTON_POINTER_OFFSET_PX,
              }
            : projectTopRightCorner(roi.bounds, roi.zSpan, matrix, view.viewportSize);
      if (!anchor) {
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
        return;
      }
      const { left, top } = cardOriginFor(
        anchor,
        BUTTON_BOX,
        { width: node.offsetWidth, height: node.offsetHeight },
        view.viewportSize,
      );
      node.style.transform = `translate(${left}px, ${top}px)`;
      node.style.opacity = "1";
      node.style.pointerEvents = "auto";
    };
    place();
    const unsubscribe = viewApi.subscribe(place);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(node);
    return () => {
      unsubscribe();
      observer?.disconnect();
    };
  }, [roi, entry, viewApi]);

  // The grip: held for as long as anything of this button is in use.
  const syncHold = useCallback(
    (open: boolean) => selectionApi.getState().holdHover(open || pointerInsideRef.current),
    [selectionApi],
  );
  useEffect(() => syncHold(expanded || menuOpen), [expanded, menuOpen, syncHold]);
  // Release the grip on unmount too — a held hover with nobody holding it
  // would never clear.
  useEffect(
    () => () => {
      selectionApi.getState().holdHover(false);
    },
    [selectionApi],
  );

  // An open card closes like a popover does. Not while its menu is up: the
  // menu's rows are portaled out of this node, and Escape is the menu's first.
  useEffect(() => {
    if (!expanded || menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && nodeRef.current?.contains(event.target)) return;
      setExpanded(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, menuOpen]);

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
        syncHold(expanded || menuOpen);
      }}
    >
      <motion.div
        initial={false}
        animate={{
          width: expanded ? CARD_WIDTH : BUTTON_SIZE,
          height: expanded ? "auto" : BUTTON_SIZE,
          borderRadius: expanded ? 12 : BUTTON_SIZE / 2,
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="overflow-hidden border border-border bg-background/80 text-foreground shadow-sm backdrop-blur"
      >
        {/* Laid out at the card's width from the first frame: the spring
            reveals the content, it does not reflow it. */}
        <div style={{ width: CARD_WIDTH - 2 }}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              // -1px: the surface's border is inside the 24px the avatar fills.
              className="-m-px flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Annotation details"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
            >
              {creator ? (
                <StructureDisplay
                  identifier="@lok/user"
                  id={creator}
                  variant="avatar"
                  className="h-6 w-6"
                  fallback={<EllipsisIcon className="h-3.5 w-3.5" />}
                />
              ) : (
                <EllipsisIcon className="h-3.5 w-3.5" />
              )}
            </button>
            {expanded && (
              <>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {formatAnnotationKind(roi.kind)}
                </span>
                <MikroAnnotation.ObjectButton
                  object={object}
                  open={menuOpen}
                  onOpenChange={setMenuOpen}
                  onDone={() => setMenuOpen(false)}
                >
                  <Button variant="ghost" size="icon-xs" aria-label="Annotation actions">
                    <EllipsisIcon />
                  </Button>
                </MikroAnnotation.ObjectButton>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="mr-0.5"
                  aria-label="Close"
                  onClick={() => setExpanded(false)}
                >
                  <XIcon />
                </Button>
              </>
            )}
          </div>
          {expanded && <AnnotationInfoCard id={roi.id} />}
        </div>
      </motion.div>
    </div>
  );
};
