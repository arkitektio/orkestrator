import { exceedsDragThreshold } from "../features/annotations/drawGesture";

/**
 * When a pointer gesture in the viewport is a right-CLICK: the menu button
 * went down and came up again without the pointer moving (a move is a pan or
 * an orbit). Pure, so the platform quirks are testable without a canvas:
 *
 * - **macOS, Control-click.** The usual "secondary click" of a one-button
 *   trackpad or mouse arrives as the PRIMARY button with `ctrlKey` set, never
 *   as button 2.
 * - **A release nobody reports.** The platform raises its context-menu event
 *   at the press (macOS, Linux), and the release that follows does not always
 *   arrive as a `pointerup`. A move with no button held says the same thing:
 *   the button is up.
 */

export type ContextPointerSample = {
  button: number;
  /** The buttons held (`PointerEvent.buttons`). */
  buttons: number;
  ctrlKey: boolean;
  clientX: number;
  clientY: number;
};

type Point = { x: number; y: number };

/** Whether a press of this sample asks for the context menu. */
export const isContextPress = (sample: Pick<ContextPointerSample, "button" | "ctrlKey">, mac: boolean): boolean =>
  sample.button === 2 || (mac && sample.button === 0 && sample.ctrlKey);

export const createContextGesture = (options: { mac: boolean; onClick: (at: Point) => void }) => {
  /** Where the menu button went down, and with which button; null while no such press is open. */
  let press: (Point & { button: number }) | null = null;

  const finish = (at: Point) => {
    const start = press;
    press = null;
    if (start && !exceedsDragThreshold(start, at)) options.onClick(at);
  };

  return {
    down: (sample: ContextPointerSample) => {
      press = isContextPress(sample, options.mac)
        ? { x: sample.clientX, y: sample.clientY, button: sample.button }
        : null;
    },
    move: (sample: ContextPointerSample) => {
      if (!press) return;
      const at = { x: sample.clientX, y: sample.clientY };
      // Held and moved: a pan or an orbit, not a click.
      if (sample.buttons !== 0) {
        if (exceedsDragThreshold(press, at)) press = null;
        return;
      }
      // Nothing held any more: the release was never reported. It happened
      // where the press was, wherever the pointer has drifted to since.
      finish({ x: press.x, y: press.y });
    },
    up: (sample: ContextPointerSample) => {
      if (!press || sample.button !== press.button) return;
      finish({ x: sample.clientX, y: sample.clientY });
    },
    cancel: () => {
      press = null;
    },
  };
};
