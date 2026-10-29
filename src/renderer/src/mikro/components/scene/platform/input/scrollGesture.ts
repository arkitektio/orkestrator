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
};

/** Silence that ends one gesture and lets the next be guessed afresh. */
export const BURST_GAP_MS = 250;

/** Does this one event look like it came from a trackpad? */
export const looksLikeTrackpad = (sample: WheelSample): boolean =>
  // Line/page deltas are a wheel's notches by definition.
  sample.deltaMode === 0 &&
  (sample.deltaX !== 0 || !Number.isInteger(sample.deltaY));

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
