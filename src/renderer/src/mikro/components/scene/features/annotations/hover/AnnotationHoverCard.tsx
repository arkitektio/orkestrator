import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EllipsisIcon, XIcon } from "lucide-react";

import { Button } from "@/core/ui/button";
import { MikroAnnotation } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { useGetAnnotationCreatorQuery } from "@/mikro/api/graphql";
import { useSettings } from "@/core/settings/store/SettingsContext";

import { projectScreenRect } from "../../../platform/float/projectScreenRect";
import { SceneFloat, type FloatView } from "../../../platform/float/SceneFloat";
import { annotationFloatOwner, useOptionalSceneFloatStoreApi } from "../../../platform/float/floatStore";
import { useFloatStaging } from "../../staging/FloatStaging";
import { FloatStagingScope } from "../../staging/StageToggle";
import {
  findVisibleRoi,
  useRoiSelectionStore,
  useRoiSelectionStoreApi,
  type VisibleRoi,
} from "../roiSelectionStore";
import { formatAnnotationKind } from "../../../platform/model/selectionFormat";
import { AnnotationFloatMenu } from "./AnnotationFloatMenu";
import { BUTTON_POINTER_OFFSET_PX, projectTopRightCorner, projectWorldPoint } from "./projectRoiBox";

/** How long the pointer rests on the avatar before the card unfolds: a
 * pointer that only crosses it on the way somewhere opens nothing. */
export const PEEK_DELAY_MS = 150;
/** How long an unfolded (not pinned) card survives the pointer leaving it. */
export const PEEK_GRACE_MS = 250;

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
 *   experiment off, this is the only way the card appears. It opens BESIDE
 *   the shape (right of its visible right edge, else left: never over it),
 *   and stays there while it is open. Pinning a peek (a click on its avatar)
 *   leaves the card where it is, under the pointer.
 * A pinned card closes on Escape, its close button and a press outside it —
 * but not a click on the shape (it stays, or moves to the shape clicked), not
 * a drag that moved the camera, and not a finished action: what that returns
 * is STAGED under the card (`features/staging`), shown in the scene and saved
 * nowhere until kept. Closing the card discards what it staged and nobody
 * kept.
 *
 * Its body is a short menu (`AnnotationFloatMenu`): Run, Derived, Details and,
 * while something is staged, In the scene, each sliding in its own pane.
 *
 * The frame — placement, the spring, closing like a popover — is the scene's
 * one float (`platform/float/SceneFloat`), which the mesh float shares.
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
  const visible = useRoiSelectionStore((s) =>
    targetId ? findVisibleRoi(s.visibleRois, targetId) : undefined,
  );
  if (!targetId || !visible) return null;
  // Keyed by the shape, not the click: a hover that turns into a click on the
  // same shape keeps its card (and its queries) and just unfolds.
  return <AttachedCard key={targetId} roi={visible} />;
};

const AttachedCard = ({ roi }: { roi: VisibleRoi }) => {
  const selectionApi = useRoiSelectionStoreApi();
  const floatApi = useOptionalSceneFloatStoreApi();
  // The store's menu entry IS the pin: a click on the shape, a draw and a
  // click on the avatar all set it, and every close clears it.
  const menu = useRoiSelectionStore((s) => (s.menuRoi?.roi.id === roi.id ? s.menuRoi : null));
  const pinned = menu !== null;
  const [peeking, setPeeking] = useState(false);
  const [fullMenuOpen, setFullMenuOpen] = useState(false);
  const expanded = pinned || peeking;
  // Where the hover button is attached: where the pointer entered, or where a
  // click landed (a draw: no point, the box corner).
  const [entry, setEntry] = useState(() => {
    const state = selectionApi.getState();
    if (state.menuRoi?.roi.id === roi.id) return state.menuRoi.point;
    return state.hoveredRoi?.id === roi.id ? state.hoverPoint() : null;
  });
  // Opened by a click on the shape (or a draw) while folded: the card sits
  // BESIDE the shape. Pinning a peek keeps it where it already is, so it never
  // jumps from under the pointer.
  const [beside, setBeside] = useState(() => selectionApi.getState().menuRoi?.roi.id === roi.id);
  const wasOpenRef = useRef(expanded);
  useEffect(() => {
    if (!menu || wasOpenRef.current) return;
    if (menu.point) setEntry(menu.point);
    setBeside(true);
  }, [menu]);
  useEffect(() => {
    wasOpenRef.current = expanded;
    if (!expanded) setBeside(false);
  }, [expanded]);
  // One float at a time: a shape's card replaces a mesh object's.
  useEffect(() => {
    if (pinned) floatApi?.getState().close();
  }, [pinned, floatApi]);
  // While unfolded, the shape's layer draws what was made from it over it
  // (refinements are hidden otherwise; `lib/annotations/derivedShapes`).
  useEffect(() => {
    if (!expanded) return;
    selectionApi.getState().setCardRoi({ id: roi.id, layerId: roi.layerId });
    return () => selectionApi.getState().setCardRoi(null, roi.id);
  }, [expanded, roi.id, roi.layerId, selectionApi]);
  const pointerInsideRef = useRef(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // What this card staged: closing it discards whatever was not kept.
  const owner = annotationFloatOwner(roi.id);
  const staging = useFloatStaging(owner);
  // Which pane of the card's menu is open; a folded card starts at its root.
  const [pane, setPane] = useState<string | null>(null);
  useEffect(() => {
    if (!expanded) setPane(null);
  }, [expanded]);

  const anchor = useCallback(
    ({ viewProjection, viewport }: FloatView) => {
      if (beside) {
        const rect = projectScreenRect(
          {
            min: { x: roi.bounds.minX, y: roi.bounds.minY, z: roi.zSpan.min },
            max: { x: roi.bounds.maxX, y: roi.bounds.maxY, z: roi.zSpan.max },
          },
          viewProjection,
          viewport,
        );
        if (rect) return { kind: "beside" as const, rect };
      }
      const entryOnScreen = entry ? projectWorldPoint(entry, viewProjection, viewport) : null;
      const point = entryOnScreen
        ? { x: entryOnScreen.x + BUTTON_POINTER_OFFSET_PX, y: entryOnScreen.y - BUTTON_POINTER_OFFSET_PX }
        : projectTopRightCorner(roi.bounds, roi.zSpan, viewProjection, viewport);
      return point ? { kind: "point" as const, point } : null;
    },
    [beside, entry, roi],
  );

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

  // Holding staged layers pins the card where it is: a peek folds when the
  // pointer leaves it, and a folded card could not ask about them.
  useEffect(() => {
    if (!staging.holding || selectionApi.getState().menuRoi?.roi.id === roi.id) return;
    cancelPeek();
    selectionApi.getState().openRoiMenu(object, entry ?? undefined);
  }, [staging.holding, selectionApi, roi.id, object, entry, cancelPeek]);

  const onAvatarClick = () => {
    if (pinned) {
      close();
      return;
    }
    cancelPeek();
    selectionApi.getState().openRoiMenu(object, entry ?? undefined);
  };

  return (
    // Around the whole float, header menu included: whatever an action run
    // from here returns is staged under this card, and a derivation it lists
    // can be shown in the scene for now.
    <FloatStagingScope owner={owner}>
    <SceneFloat
      anchor={anchor}
      expanded={expanded}
      // Not while the full menu is up: Escape and the next press are that
      // menu's first.
      dismissable={!fullMenuOpen}
      onDismiss={close}
      // A click on a shape re-opens the menu, on this shape or another, and
      // that card is the answer.
      sceneClaim={() => selectionApi.getState().menuRoi}
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
      button={
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
      }
      header={
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
            // A finished action leaves the card open: what it returns is
            // staged here, under this card.
            onDone={() => setFullMenuOpen(false)}
          >
            <Button variant="ghost" size="icon-xs" aria-label="Annotation actions">
              <EllipsisIcon />
            </Button>
          </MikroAnnotation.ObjectButton>
          <Button variant="ghost" size="icon-xs" className="mr-0.5" aria-label="Close" onClick={close}>
            <XIcon />
          </Button>
        </>
      }
    >
      <AnnotationFloatMenu
        roi={object}
        staging={staging}
        pane={pane}
        onPaneChange={setPane}
        // A click: nothing is held, the keyboard is the card's (type-to-search
        // lands in Run). A draw (no point) still holds its key; a peek leaves
        // typing to the scene.
        autoFocus={menu?.point != null}
      />
    </SceneFloat>
    </FloatStagingScope>
  );
};
