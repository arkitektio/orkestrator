/**
 * What one wheel event means in the scene: a ZOOM (a mouse wheel, a pinch,
 * Ctrl + wheel) or a SWIPE (two fingers on a trackpad — pans in 2D, orbits in
 * 3D; `platform/camera/ScrollGestureNavigation`).
 *
 * The browser does not say which device sent a wheel event, so `"auto"`
 * guesses from its deltas: a trackpad sends fractional amounts, or motion on
 * both axes; a mouse wheel sends whole notches on one. A guess is never
 * certain — a precision mouse looks like a trackpad, and some platforms round
 * trackpad deltas to integers — which is what the setting is for.
 *
 * "Whole notches" is only true before scaling: Chromium reports `deltaY` in
 * CSS px, i.e. divided by devicePixelRatio (display scale × page zoom), so on
 * a 150 % display one notch is `66.67`. Two things see through that: the
 * legacy `wheelDeltaY`, which Blink builds from wheel TICKS × 120 whatever
 * the scale, and — where that is missing — the delta times the ratio.
 *
 * The guess is LATCHED per gesture: once a burst of events has looked like a
 * trackpad it stays one until the events stop for `BURST_GAP_MS`, so a swipe
 * whose later events happen to be whole numbers does not flip to zooming
 * half-way.
 */

export type ScrollGestureSetting = "auto" | "zoom" | "pan";

export type ScrollIntent = "zoom" | "pinch" | "swipe";

export type WheelSample = {
  deltaX: number;
  deltaY: number;
  /** `WheelEvent.deltaMode`: 0 pixels, 1 lines, 2 pages. */
  deltaMode: number;
  /** Set by the browser for a trackpad pinch, and by a held Ctrl. */
  ctrlKey: boolean;
  /** `Event.timeStamp`, ms. */
  timeStamp: number;
  /**
   * Chromium's legacy `WheelEvent.wheelDeltaX/Y`: wheel ticks × 120 (and
   * of the opposite sign), so a mouse notch is a multiple of 120 at any
   * display scale or zoom.
   */
  wheelDeltaX?: number;
  wheelDeltaY?: number;
  /** `window.devicePixelRatio` (display scale × zoom); default 1. */
  devicePixelRatio?: number;
};

/** Silence that ends one gesture and lets the next be guessed afresh. */
export const BURST_GAP_MS = 250;

const TICK = 120;

const isTick = (wheelDelta: number) => wheelDelta % TICK === 0;

const isNearInteger = (value: number) => Math.abs(value - Math.round(value)) < 1e-3;

/** Does this one event look like it came from a trackpad? */
export const looksLikeTrackpad = (sample: WheelSample): boolean => {
  // Line/page deltas are a wheel's notches by definition.
  if (sample.deltaMode !== 0) return false;
  const { wheelDeltaX, wheelDeltaY } = sample;
  if (
    wheelDeltaX !== undefined &&
    wheelDeltaY !== undefined &&
    (wheelDeltaX !== 0 || wheelDeltaY !== 0)
  ) {
    // Whole ticks on one axis: a wheel (or a tilt wheel), at any scale.
    if ((wheelDeltaX === 0 || wheelDeltaY === 0) && isTick(wheelDeltaX) && isTick(wheelDeltaY)) {
      return false;
    }
  }
  const ratio = sample.devicePixelRatio || 1;
  return sample.deltaX !== 0 || !isNearInteger(sample.deltaY * ratio);
};

export const createScrollClassifier = () => {
  let lastAt = -Infinity;
  let trackpad = false;

  return (sample: WheelSample, setting: ScrollGestureSetting): ScrollIntent => {
    if (sample.timeStamp - lastAt > BURST_GAP_MS) trackpad = false;
    lastAt = sample.timeStamp;
    trackpad = trackpad || looksLikeTrackpad(sample);

    // A pinch arrives as Ctrl + wheel, from either device: always a zoom,
    // and a proportional one (see the handler).
    if (sample.ctrlKey) return "pinch";
    if (setting === "zoom") return "zoom";
    if (setting === "pan") return "swipe";
    return trackpad ? "swipe" : "zoom";
  };
};
