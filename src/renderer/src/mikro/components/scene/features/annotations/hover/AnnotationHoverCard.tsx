import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AnnotationPairActions } from "./AnnotationPairActions";
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
/** How long the pointer rests on the avatar before the card unfolds: a
 * pointer that only crosses it on the way somewhere opens nothing. */
export const PEEK_DELAY_MS = 150;
/** How long an unfolded (not pinned) card survives the pointer leaving it. */
export const PEEK_GRACE_MS = 250;
/** A press on the scene that travels further than this is a camera drag,
 * not a click on nothing: the card it follows stays open. */
const CLICK_SLOP_PX = 4;

/**
 * The one overlay of an annotation in the scene: a small button wearing the
 * avatar of whoever drew the shape, which unfolds into a card about it — its
 * kind and author in the header, then where it sits, what was cut to it and
 * computed from it
 * (`AnnotationInfoCard`) — and what can be run on it with the image under it
 * (`AnnotationPairActions`). The header's ellipsis is the shape's full menu
 * (the sidebar row's button and the viewport's right-click,
 * `shell/SceneContextMenu`).
 *
 * Two ways in, one card:
 * - HOVER (the `experimentAnnotationHover` experiment, Settings → General):
 *   the button sits just up-right of where the pointer ENTERED the shape
 *   (`roiSelectionStore.hoverPoint`), next to the pointer rather than on the
 *   box corner, which for a long path can be half a screen from the stroke.
 *   Resting on it unfolds the card (a PEEK, folded again once the pointer
 *   leaves it); a click on it pins the card open.
 * - A CLICK on the shape (`roiSelectionStore.openRoiMenu`), or a shape just
 *   drawn, opens it pinned, whatever the experiment says — with the
 *   experiment off, this is the only way the card appears. It opens where
 *   the click landed; a card already open stays where it is.
 * A pinned card closes on Escape, its close button, a finished action, and a
 * press outside it — but not a click on the shape (it stays, or moves to the
 * shape clicked) and not a drag that moved the camera.
 *
 * Plain DOM over the canvas, in the viewport's overlay block. PLACEMENT never
 * touches React: a view-store subscription projects the anchor on every
 * camera emission and writes the transform straight onto the node (P17), and
 * again whenever the card changes size. The bare button hides while the
 * camera moves; an open card follows it. The growing is an inner element's (a
 * width/height spring) so it unfolds right and down from the avatar and stays
 * inside the frame (`cardOriginFor`).
 *
 * The hover is HELD (`holdHover`) while the pointer is on the button or the
 * card is open, so travelling from the shape to the button or picking an
 * action never loses the target — and no other shape the pointer crosses
 * takes it over.
 *
 * The author is asked for per shape (`GetAnnotationCreator`, one row by id),
 * never selected on the scene list, which ships every shape of every layer;
 * the ellipsis stands in until it is known, and for a shape with no author.
 * The card's own queries run when it unfolds.
 */
export const AnnotationHoverCard = () => {
  const { settings } = useSettings();
  const hoverEnabled = settings.experimentAnnotationHover !== false;
  // A click (or a draw) names the shape outright; otherwise the hover does.
  const targetId = useRoiSelectionStore(
    (s) => s.menuRoi?.roi.id ?? (hoverEnabled ? s.hoveredRoi?.id : undefined),
  );
  // The world box, by identity: rewritten only when the layer's shown set
  // changes. Undefined once the shape scrolls out of the slab — and for a
  // shape just drawn until its layer shows it: no box, no card.
  const visible = useRoiSelectionStore((s) => (targetId ? s.visibleRois[targetId] : undefined));
  if (!targetId || !visible) return null;
  // Keyed by the shape, not the click: a hover that turns into a click on the
  // same shape keeps its card (and its queries) and just unfolds.
  return <AttachedCard key={targetId} roi={visible} />;
};

const AttachedCard = ({ roi }: { roi: VisibleRoi }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const viewApi = useViewStoreApi();
  const selectionApi = useRoiSelectionStoreApi();
  // The store's menu entry IS the pin: a click on the shape, a draw and a
  // click on the avatar all set it, and every close clears it.
  const menu = useRoiSelectionStore((s) => (s.menuRoi?.roi.id === roi.id ? s.menuRoi : null));
  const pinned = menu !== null;
  const [peeking, setPeeking] = useState(false);
  const [fullMenuOpen, setFullMenuOpen] = useState(false);
  const expanded = pinned || peeking;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  // Where the card is attached. A click (or a draw: no point, the box
  // corner) wins over where the pointer entered.
  const [entry, setEntry] = useState(() => {
    const state = selectionApi.getState();
    if (state.menuRoi?.roi.id === roi.id) return state.menuRoi.point;
    return state.hoveredRoi?.id === roi.id ? state.hoverPoint() : null;
  });
  // A click on the shape of a FOLDED button opens the card where it landed —
  // on a long path that can be far from where the pointer entered. An open
  // card stays where it is.
  const wasOpenRef = useRef(expanded);
  useEffect(() => {
    if (menu?.point && !wasOpenRef.current) setEntry(menu.point);
  }, [menu]);
  useEffect(() => {
    wasOpenRef.current = expanded;
  }, [expanded]);
  const pointerInsideRef = useRef(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Native events that passed through this card in React's tree — which
  // includes what it portals (the "Run on" picker, the full menu), unlike the
  // DOM's `contains`.
  const [insideEvents] = useState(() => new WeakSet<Event>());
  // The smart object is the SELECTION shape (what the sidebar card and the
  // local actions expect), not the placement box: strip the world extent,
  // and spell out `name` — the store's may be `undefined`, which JSON has no
  // word for. Memoised: the action list re-plans its sections on a new one.
  const object = useMemo(() => {
    const { bounds: _bounds, zSpan: _zSpan, ...selected } = roi;
    return { ...selected, name: selected.name ?? null };
  }, [roi]);
  const { data: creatorData } = useGetAnnotationCreatorQuery({
    variables: { id: roi.id },
  });
  const creator = creatorData?.annotation.creator?.sub;

  const schedulePeek = useCallback((next: boolean, ms: number) => {
    if (peekTimerRef.current !== null) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = setTimeout(() => {
      peekTimerRef.current = null;
      setPeeking(next);
    }, ms);
  }, []);
  const cancelPeek = useCallback(() => {
    if (peekTimerRef.current === null) return;
    clearTimeout(peekTimerRef.current);
    peekTimerRef.current = null;
  }, []);
  useEffect(() => cancelPeek, [cancelPeek]);

  const close = useCallback(() => {
    cancelPeek();
    setPeeking(false);
    const state = selectionApi.getState();
    if (state.menuRoi?.roi.id === roi.id) state.closeRoiMenu();
  }, [cancelPeek, selectionApi, roi.id]);

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
        !matrix || (view.cameraMoving && !expandedRef.current)
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

  // The grip: held for as long as anything of this card is in use.
  const syncHold = useCallback(
    (open: boolean) => selectionApi.getState().holdHover(open || pointerInsideRef.current),
    [selectionApi],
  );
  useEffect(() => syncHold(expanded || fullMenuOpen), [expanded, fullMenuOpen, syncHold]);
  // Release the grip on unmount too — a held hover with nobody holding it
  // would never clear.
  useEffect(
    () => () => {
      selectionApi.getState().holdHover(false);
    },
    [selectionApi],
  );

  // An open card closes like a popover does. Not while the full menu is up:
  // Escape and the next press are that menu's first.
  useEffect(() => {
    if (!expanded || fullMenuOpen) return;
    const onScene = (target: EventTarget | null) =>
      target instanceof Element && target.closest("canvas") !== null;
    let menuAtPress = selectionApi.getState().menuRoi;
    let pressedAt: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if (insideEvents.has(event)) return;
      menuAtPress = selectionApi.getState().menuRoi;
      pressedAt = { x: event.clientX, y: event.clientY };
      // A primary press on the scene waits for its click: one landing on a
      // shape opens the card there, and closing first would fold this card
      // only to unfold it again. Any other button never clicks.
      if (event.button === 0 && onScene(event.target)) return;
      close();
    };
    const onClick = (event: MouseEvent) => {
      if (insideEvents.has(event) || !onScene(event.target)) return;
      // A drag that orbited the camera, which the card followed.
      if (
        pressedAt &&
        Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > CLICK_SLOP_PX
      ) {
        return;
      }
      // The scene handled the click first (its listener sits below the
      // document): a click on a shape re-opened the menu, on this shape or
      // another, and that card is the answer.
      if (selectionApi.getState().menuRoi !== menuAtPress) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, fullMenuOpen, close, selectionApi, insideEvents]);

  const onAvatarClick = () => {
    if (pinned) {
      close();
      return;
    }
    cancelPeek();
    selectionApi.getState().openRoiMenu(object, entry ?? undefined);
  };

  return (
    <div
      ref={nodeRef}
      // `data-nonbreaker`: SelectionBox's global mousedown must not clear the
      // scene selection because the user clicked this card.
      data-nonbreaker
      className="absolute left-0 top-0 z-30 will-change-transform"
      style={{ opacity: 0, pointerEvents: "none" }}
      onPointerDown={(event) => insideEvents.add(event.nativeEvent)}
      onClick={(event) => insideEvents.add(event.nativeEvent)}
      // React's enter/leave follow its tree, portals included: moving into
      // the "Run on" picker or the full menu is not leaving the card.
      onPointerEnter={() => {
        pointerInsideRef.current = true;
        selectionApi.getState().holdHover(true);
        cancelPeek();
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false;
        syncHold(expanded || fullMenuOpen);
        if (peeking || peekTimerRef.current !== null) schedulePeek(false, PEEK_GRACE_MS);
      }}
    >
      <motion.div
        initial={{ width: BUTTON_SIZE, height: BUTTON_SIZE, borderRadius: BUTTON_SIZE / 2 }}
        animate={{
          width: expanded ? CARD_WIDTH : BUTTON_SIZE,
          height: expanded ? "auto" : BUTTON_SIZE,
          borderRadius: expanded ? 12 : BUTTON_SIZE / 2,
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="overflow-hidden border border-border bg-background/90 text-foreground shadow-md backdrop-blur"
      >
        {/* Laid out at the card's width from the first frame: the spring
            reveals the content, it does not reflow it. */}
        <div style={{ width: CARD_WIDTH - 2 }}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              // -1px: the surface's border is inside the 24px the avatar fills.
              className="-m-px flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Annotation details"
              aria-expanded={expanded}
              aria-pressed={pinned}
              onPointerEnter={() => {
                if (!expanded) schedulePeek(true, PEEK_DELAY_MS);
              }}
              onClick={onAvatarClick}
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
                {/* The avatar is the author; the header names them. */}
                <span className="min-w-0 flex-1 truncate text-xs">
                  <span className="font-medium">{formatAnnotationKind(roi.kind)}</span>
                  {creator && (
                    <span className="text-muted-foreground">
                      {" by "}
                      <StructureDisplay identifier="@lok/user" id={creator} variant="inline" />
                    </span>
                  )}
                </span>
                <MikroAnnotation.ObjectButton
                  object={object}
                  open={fullMenuOpen}
                  onOpenChange={setFullMenuOpen}
                  onDone={() => {
                    setFullMenuOpen(false);
                    close();
                  }}
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
                  onClick={close}
                >
                  <XIcon />
                </Button>
              </>
            )}
          </div>
          {expanded && (
            // Capped, so `cardOriginFor` can keep the whole card in a small
            // viewport; the action list scrolls on its own inside it.
            <div className="max-h-[min(34rem,75vh)] overflow-y-auto">
              <AnnotationInfoCard id={roi.id} />
              <div className="border-t border-border/60 px-1 pb-1 pt-1.5">
                <AnnotationPairActions
                  roi={object}
                  // A click: nothing is held, type-to-search. A draw (no
                  // point) still holds its key; a peek leaves typing to the
                  // scene.
                  autoFocus={menu?.point != null}
                  onDone={close}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
