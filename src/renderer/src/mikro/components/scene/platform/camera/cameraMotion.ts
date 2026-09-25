/**
 * What "the camera is moving" means, separated from "the view-projection
 * matrix changed at all".
 *
 * These were the same test, and inertial damping made that wrong. With drei's
 * default `enableDamping`, releasing the mouse leaves the camera COASTING for
 * a few hundred milliseconds. Every frame of that coast changed the matrix, so
 * `cameraMoving` stayed true for the whole tail — and while it is true the
 * volume renders at HALF resolution (`resolveVolumeScale`), the settle ladder
 * cannot advance (`decideSettleRefine`), and the plan tracker replans on the
 * slower motion interval. The decay is exponential, so the tail could also
 * hover just above the emit threshold, stretching the low-quality window well
 * past the gesture and ending in a visible snap to full resolution.
 *
 * Two distinct questions, two thresholds:
 *
 *  - **Did anything change?** (should we publish, recompute visibility, replan)
 *    An absolute epsilon on the matrix elements. Unchanged — correctness work
 *    must follow the camera all the way down to rest.
 *  - **Is it moving enough to degrade quality for?** A RELATIVE threshold, so
 *    it means the same thing on a scene whose world units are micrometres
 *    (translation elements ~1e4) as on one in unit space. The absolute epsilon
 *    cannot answer this: 1e-5 against a translation of 50000 is nine orders of
 *    magnitude below the value it is compared to.
 *
 * `interacting` (a pointer drag, or a wheel hold — see `cameraInteraction`) is
 * OR-ed in so a drag that pauses (mouse held still mid-gesture)
 * still counts as motion — the user is driving, and snapping to full quality
 * mid-drag only to drop again is worse than staying cheap. Deriving motion from
 * the matrix rather than from pointer state alone is deliberate: keyboard
 * navigation (`shell/keyboard/KeyboardSceneNavigation.tsx`) and animation
 * playback (`features/animation/AnimationPlayer.tsx`) move the camera with no
 * pointer involved, and a pointer-only rule would render those full-resolution
 * every frame.
 */

/**
 * Largest RELATIVE change across two 4×4 matrices, element-wise.
 *
 * Scale-free: each element's delta is divided by the larger of the two
 * magnitudes, so a rotation element near 1 and a translation element near 1e4
 * are held to the same standard. `floor` keeps elements that are both ~0 from
 * dividing by nothing.
 */
export function matrixRelativeDelta(
  cur: ArrayLike<number>,
  prev: ArrayLike<number>,
  floor = 1e-6,
): number {
  let worst = 0;
  for (let i = 0; i < 16; i++) {
    const a = cur[i];
    const b = prev[i];
    const scale = Math.max(Math.abs(a), Math.abs(b), floor);
    const rel = Math.abs(a - b) / scale;
    if (rel > worst) worst = rel;
  }
  return worst;
}

/**
 * Relative per-frame change below which the camera counts as settling rather
 * than moving.
 *
 * An active drag or a keyboard/animation step sits orders of magnitude above
 * this; a damped coast crosses it early in its decay, which is the point — the
 * tail finishes at full quality instead of holding the whole scene at half
 * resolution until it stops.
 */
export const MOTION_RELATIVE_THRESHOLD = 1e-3;

/** Is the camera moving enough to render cheaply for? */
export function isCameraMoving(
  interacting: boolean,
  relativeDelta: number,
  threshold = MOTION_RELATIVE_THRESHOLD,
): boolean {
  return interacting || relativeDelta > threshold;
}

/**
 * Whether a user gesture is currently driving the controls.
 *
 * Two sources, because the controls cannot report the second one:
 *
 *  - **Pointer drags** latch `begin`/`end` from the controls' own `start`/`end`
 *    events, which bracket the whole gesture.
 *  - **The wheel** is a time-based hold. three-stdlib's `onMouseWheel`
 *    dispatches `start` → dolly → `end` SYNCHRONOUSLY per wheel event, so the
 *    latch above is a no-op for it and `interacting` read false all through a
 *    zoom. That left `cameraMoving` to the relative matrix delta alone, which a
 *    trackpad tick (~5e-4…2e-3 per frame) straddles — so it flickered at the
 *    emit cadence, and every flip paid a volume-target realloc, a settle-refine
 *    reset/advance, a `retarget()` and an idle replan. A zoom sequence is one
 *    gesture, exactly like a drag: each wheel event extends the hold, and it
 *    lapses `WHEEL_INTERACTION_HOLD_MS` after the last one. `end` never touches
 *    it — it fires right after `start` on every wheel event.
 *
 * A module singleton rather than store state on purpose: it flips on every
 * pointer down/up and wheel event, is read once per frame from
 * `CameraMatrixSync`, and has no React consumers — routing it through a store
 * would publish a render-hot write for something nothing renders from (P17).
 */
let pointerInteracting = false;
let wheelHoldUntil = Number.NEGATIVE_INFINITY;
/**
 * How many times the user has taken hold of the camera, ever.
 *
 * `isInteracting` answers "is a gesture happening RIGHT NOW", which cannot
 * answer "has this view been touched at all" — the question the auto-snapshot
 * asks to decide whether it is still looking at the default fit-to-scene rig.
 * A monotonic count answers it without any per-scene bookkeeping: mark it at
 * mount, compare later.
 */
let interactionCount = 0;

/**
 * How long after the last wheel event the camera still counts as being
 * driven. Longer than `CameraMatrixSync`'s 150 ms settle debounce and than the
 * gap between mouse-wheel notches; short enough that a single notch settles
 * in about a quarter second.
 */
export const WHEEL_INTERACTION_HOLD_MS = 250;

export const cameraInteraction = {
  begin(): void {
    pointerInteracting = true;
    interactionCount += 1;
  },
  end(): void {
    pointerInteracting = false;
  },
  /** A wheel event landed at `nowMs`: (re)arm the hold. */
  wheel(nowMs: number): void {
    wheelHoldUntil = nowMs + WHEEL_INTERACTION_HOLD_MS;
    interactionCount += 1;
  },
  isInteracting(nowMs: number): boolean {
    return pointerInteracting || nowMs < wheelHoldUntil;
  },
  /** Time left on the wheel hold (0 when none) — lets the settle timer wait it out. */
  holdRemainingMs(nowMs: number): number {
    return Math.max(0, wheelHoldUntil - nowMs);
  },
  /**
   * A count of gestures so far, only ever increasing. Compare a mark taken
   * earlier against a later read: different means the camera was driven in
   * between.
   */
  count(): number {
    return interactionCount;
  },
  /**
   * Tests and teardown: controls that unmount mid-drag never fire `onEnd`.
   *
   * Clears the IN-PROGRESS flags only. `interactionCount` is history, not
   * state, and zeroing it here would let a display-mode switch (which calls
   * this) read back as "nobody ever touched the camera".
   */
  reset(): void {
    pointerInteracting = false;
    wheelHoldUntil = Number.NEGATIVE_INFINITY;
  },
};
