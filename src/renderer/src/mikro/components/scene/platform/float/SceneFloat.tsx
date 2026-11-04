import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type * as THREE from "three";

import { useViewStoreApi } from "../stores/viewStore";
import type { ScreenPoint, ScreenRect, Viewport } from "./projectScreenRect";
import { cardOriginFor } from "./pointAnchor";
import { floatOriginBeside } from "./sideAnchor";

/** The bare button, and the card it grows into (CSS px). */
export const FLOAT_BUTTON_SIZE = 24;
export const FLOAT_CARD_WIDTH = 288;
const BUTTON_BOX = { width: FLOAT_BUTTON_SIZE, height: FLOAT_BUTTON_SIZE };
/** A press on the scene that travels further than this is a camera drag,
 * not a click on nothing: the float it follows stays open. */
const CLICK_SLOP_PX = 4;

/**
 * Where a float attaches.
 * - `point`: the bare button's BOTTOM-LEFT sits on the point, and the card
 *   unfolds right and down from it (the hover peek, next to the pointer).
 * - `beside`: the card sits beside the item's screen rectangle, never over it
 *   (`floatOriginBeside`: right of its visible right edge, else left).
 */
export type FloatAnchor = { kind: "point"; point: ScreenPoint } | { kind: "beside"; rect: ScreenRect };

/** What the anchor is asked with, on every camera emission. */
export type FloatView = { viewProjection: THREE.Matrix4; viewport: Viewport };

export interface SceneFloatProps {
  /**
   * Where the float attaches, asked on every camera emission and whenever the
   * card changes size. Null hides it (the item is off-slab, behind the eye).
   * Memoise it: a new function re-subscribes the placement.
   */
  anchor: (view: FloatView) => FloatAnchor | null;
  /** Unfolded into its card. */
  expanded: boolean;
  /**
   * Whether it closes like a popover: Escape, a press outside it, a click on
   * empty scene. False while something of it holds the keyboard and the next
   * press (its full menu).
   */
  dismissable: boolean;
  onDismiss: () => void;
  /**
   * Read at a press and again at its click. When it changed, the scene
   * answered the click by opening something (this object again, or another),
   * and that is the answer: the float does not also close.
   */
  sceneClaim?: () => unknown;
  /** The 24 px button the float is when folded, and its avatar when open. */
  button: ReactNode;
  /** The rest of the header row, when expanded. */
  header?: ReactNode;
  /** The card's body, when expanded. */
  children?: ReactNode;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

/**
 * The one floating card of an object in the scene: a small button that
 * unfolds into a card about it. Plain DOM over the canvas, in the viewport's
 * overlay block. What it is about, and when it opens, is its caller's
 * (`AnnotationHoverCard`, `MeshFloat`); this owns the frame.
 *
 * PLACEMENT never touches React: a view-store subscription asks `anchor` on
 * every camera emission and writes the transform straight onto the node
 * (P17), and again whenever the card changes size. The bare button hides
 * while the camera moves; an open card follows it. The growing is an inner
 * element's (a width/height spring) so it unfolds from the avatar. A `beside`
 * anchor decides its side by the card's FULL width, so the side does not flip
 * while the spring grows it.
 *
 * An open, dismissable float closes on Escape and on a press outside it —
 * not on a click the scene answered (`sceneClaim`), not on a drag that moved
 * the camera, and not inside a dialog over the scene (an assign form a run
 * from the float opened: the float waits for what it returns). "Outside" follows React's tree: what the float portals
 * (a picker, a menu) is inside it.
 */
export const SceneFloat = ({
  anchor,
  expanded,
  dismissable,
  onDismiss,
  sceneClaim,
  button,
  header,
  children,
  onPointerEnter,
  onPointerLeave,
}: SceneFloatProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const viewApi = useViewStoreApi();
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  // Native events that passed through this float in React's tree — which
  // includes what it portals, unlike the DOM's `contains`.
  const [insideEvents] = useState(() => new WeakSet<Event>());
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const claimRef = useRef(sceneClaim);
  claimRef.current = sceneClaim;

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const place = () => {
      const view = viewApi.getState();
      const matrix = view.viewProjectionMatrix;
      const attach =
        !matrix || (view.cameraMoving && !expandedRef.current)
          ? null
          : anchor({ viewProjection: matrix, viewport: view.viewportSize });
      if (!attach) {
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
        return;
      }
      const size = { width: node.offsetWidth, height: node.offsetHeight };
      const { left, top } =
        attach.kind === "point"
          ? cardOriginFor(attach.point, BUTTON_BOX, size, view.viewportSize)
          : floatOriginBeside(
              attach.rect,
              { width: expandedRef.current ? FLOAT_CARD_WIDTH : size.width, height: size.height },
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
  }, [anchor, viewApi]);

  useEffect(() => {
    if (!expanded || !dismissable) return;
    const onScene = (target: EventTarget | null) =>
      target instanceof Element && target.closest("canvas") !== null;
    // A dialog over the scene (the assign form a run from this float opened)
    // is not a press outside it: the float stays to take what the run returns.
    const inDialog = (target: EventTarget | null) =>
      target instanceof Element && target.closest('[role="dialog"], [role="alertdialog"]') !== null;
    let claimAtPress = claimRef.current?.();
    let pressedAt: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if (insideEvents.has(event) || inDialog(event.target)) return;
      claimAtPress = claimRef.current?.();
      pressedAt = { x: event.clientX, y: event.clientY };
      // A primary press on the scene waits for its click: one landing on an
      // object opens the float there, and closing first would fold this one
      // only to unfold it again. Any other button never clicks.
      if (event.button === 0 && onScene(event.target)) return;
      dismissRef.current();
    };
    const onClick = (event: MouseEvent) => {
      if (insideEvents.has(event) || !onScene(event.target)) return;
      // A drag that orbited the camera, which the float followed.
      if (pressedAt && Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > CLICK_SLOP_PX) {
        return;
      }
      // The scene handled the click first (its listener sits below the
      // document) and opened something: that is the answer.
      if (claimRef.current && claimRef.current() !== claimAtPress) return;
      dismissRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // A dialog's Escape closes the dialog, not this float behind it.
      if (event.key === "Escape" && !event.defaultPrevented && !inDialog(event.target)) dismissRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, dismissable, insideEvents]);

  return (
    <div
      ref={nodeRef}
      // `data-nonbreaker`: SelectionBox's global mousedown must not clear the
      // scene selection because the user clicked this float.
      data-nonbreaker
      className="absolute left-0 top-0 z-30 will-change-transform"
      style={{ opacity: 0, pointerEvents: "none" }}
      onPointerDown={(event) => insideEvents.add(event.nativeEvent)}
      onClick={(event) => insideEvents.add(event.nativeEvent)}
      // React's enter/leave follow its tree, portals included: moving into a
      // picker or a menu is not leaving the float.
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <motion.div
        initial={{ width: FLOAT_BUTTON_SIZE, height: FLOAT_BUTTON_SIZE, borderRadius: FLOAT_BUTTON_SIZE / 2 }}
        animate={{
          width: expanded ? FLOAT_CARD_WIDTH : FLOAT_BUTTON_SIZE,
          height: expanded ? "auto" : FLOAT_BUTTON_SIZE,
          borderRadius: expanded ? 12 : FLOAT_BUTTON_SIZE / 2,
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="overflow-hidden border border-border bg-background/90 text-foreground shadow-md backdrop-blur"
      >
        {/* Laid out at the card's width from the first frame: the spring
            reveals the content, it does not reflow it. */}
        <div style={{ width: FLOAT_CARD_WIDTH - 2 }}>
          <div className="flex items-center gap-2">
            {button}
            {expanded && header}
          </div>
          {expanded && children}
        </div>
      </motion.div>
    </div>
  );
};
