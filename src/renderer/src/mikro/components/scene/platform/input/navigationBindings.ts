import * as THREE from "three";
import { NAVIGATE_BUTTONS_3D } from "@/core/data/scene/camera/navigateButtons";
import type { DisplayMode } from "../stores/modeStore";

/**
 * How the mouse moves the view — one grammar for every mode, tool and view:
 *
 * 1. LEFT is the current tool's. NAVIGATE's tool IS the hand, so there (and in
 *    DESIGN with no tool armed) a left-drag pans.
 * 2. Holding SPACE makes the left button the hand anywhere
 *    (`modeStore.handHeld`); the tools ignore presses meanwhile.
 * 3. MIDDLE-drag pans, always.
 * 4. RIGHT-drag orbits in 3D and pans in 2D, where there is nothing to orbit.
 *    A right-click without a drag stays the context menu.
 * 5. The wheel zooms; Shift + wheel walks z (`KeyboardModeController`).
 * 6. Shift never moves the camera with the mouse — it means "more of the
 *    same": add to the selection, save the probe.
 *
 * The maps are module-level constants: R3F diffs object props by REFERENCE,
 * so an inline literal would re-apply on every commit. Every case answers an
 * explicit map — `mouseButtons={undefined}` is a latch, not a reset (R3F's
 * `applyProps` skips undefined values). A tool's map simply OMITS LEFT, which
 * three-stdlib's button switch treats as no action at all (`STATE.NONE`).
 */

const HAND_BUTTONS_2D = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.PAN,
} as const;

const TOOL_BUTTONS_2D = {
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.PAN,
} as const;

const HAND_BUTTONS_3D = NAVIGATE_BUTTONS_3D;

const TOOL_BUTTONS_3D = {
  MIDDLE: NAVIGATE_BUTTONS_3D.MIDDLE,
  RIGHT: NAVIGATE_BUTTONS_3D.RIGHT,
} as const;

export type CameraButtons = {
  readonly LEFT?: THREE.MOUSE;
  readonly MIDDLE: THREE.MOUSE;
  readonly RIGHT: THREE.MOUSE;
};

/** The map for this view, with the left button the hand's or the tool's. */
export const cameraButtonsFor = ({
  displayMode,
  leftIsHand,
}: {
  displayMode: DisplayMode;
  leftIsHand: boolean;
}): CameraButtons =>
  displayMode === "3D"
    ? leftIsHand
      ? HAND_BUTTONS_3D
      : TOOL_BUTTONS_3D
    : leftIsHand
      ? HAND_BUTTONS_2D
      : TOOL_BUTTONS_2D;

/**
 * Who a left press belongs to — decided once, at press time
 * (`shell/pointer/LeftPressArbiter`), and read by both sides: the camera
 * gets the matching button map, and the tools ignore a press that is the
 * camera's (`modeStore.leftPress`).
 *
 * ANNOTATE is navigable without a modifier: until a shape is under way a
 * left-drag moves the view, and only the SECOND press of a double-click
 * starts a shape (or a stroke — double-click and drag). Once one is under
 * way, single clicks add to it. The marquee keeps its plain drag.
 */
export type LeftPressInput = {
  interactionMode: "NAVIGATE" | "ANNOTATE" | "PROBE" | "DESIGN";
  /** DESIGN has a tool armed. */
  designArmed: boolean;
  /** Space is held. */
  handHeld: boolean;
  annotate: {
    /** Some annotate tool is selected at all. */
    armed: boolean;
    /** It is the marquee (Select), whose plain drag selects. */
    marquee: boolean;
    /** A shape is half-drawn. */
    inProgress: boolean;
  };
  /**
   * Which press of a multi-click this is: 2 on the second press of a
   * double-click. From `createPressCounter`, NOT `PointerEvent.detail` —
   * Chromium reports 0 there for every pointerdown (only mousedown and click
   * carry the count, and both arrive after the press has been handed out).
   */
  detail: number;
};

export type LeftPressOwner = "camera" | "tool";

export const leftPressOwner = (input: LeftPressInput): LeftPressOwner => {
  if (input.handHeld) return "camera";
  switch (input.interactionMode) {
    case "NAVIGATE":
      return "camera";
    case "DESIGN":
      return input.designArmed ? "tool" : "camera";
    case "ANNOTATE": {
      const { armed, marquee, inProgress } = input.annotate;
      if (!armed) return "camera";
      if (marquee || inProgress) return "tool";
      return input.detail >= 2 ? "tool" : "camera";
    }
    default:
      return "tool";
  }
};

/**
 * How long, and how far, a second press may follow the first and still make
 * a double-click. The browser's own count follows the OS setting, which a
 * page cannot read; 500 ms is the common default (Windows, GTK).
 */
export const DOUBLE_PRESS_MS = 500;
export const DOUBLE_PRESS_SLOP_PX = 6;

/**
 * Counts presses the way the browser counts clicks: each press within
 * `DOUBLE_PRESS_MS` and `DOUBLE_PRESS_SLOP_PX` of the previous one adds one,
 * anything else starts again at 1.
 */
export const createPressCounter = () => {
  let last: { at: number; x: number; y: number; count: number } | null = null;
  return (press: { at: number; x: number; y: number }): number => {
    const continues =
      last !== null &&
      press.at - last.at <= DOUBLE_PRESS_MS &&
      Math.hypot(press.x - last.x, press.y - last.y) <= DOUBLE_PRESS_SLOP_PX;
    const count = continues && last ? last.count + 1 : 1;
    last = { ...press, count };
    return count;
  };
};
