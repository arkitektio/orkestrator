/**
 * How a displayed value follows what an agent publishes.
 *
 * An agent publishes where a part is (`value`) and, optionally, where it is
 * going (`target`) and how fast. State arrives at dashboard rates; the viewer
 * fills the frames in between. Pure: `stepMotion` is called once per frame
 * with the elapsed time and holds no clock of its own.
 */

/** Time constant of the default easing: settles (to 5 %) in about 300 ms. */
export const EASE_TAU = 0.1;

export type MotionInput = {
  /** Where the part is, as last measured. */
  value: number;
  /** Where it is going; `undefined` when the agent publishes no target. */
  target?: number;
  /** Units per second toward the target. */
  speed?: number;
  /** Seconds a move to a new target takes; ignored when `speed` is given. */
  duration?: number;
  /** `false` snaps to each new value instead of easing. */
  smooth?: boolean;
};

export type MotionState = {
  displayed: number;
  /** The last `value` seen, to notice a new measurement. */
  value: number;
  target?: number;
  /** Speed derived from `duration` when the target last changed. */
  derivedSpeed?: number;
  /** What is left of the last measurement's disagreement with the display. */
  correction: number;
};

/** A display that starts where the part is. Its target is taken up, and timed, by the first step. */
export const initialMotion = (input: MotionInput): MotionState => ({
  displayed: input.value,
  value: input.value,
  correction: 0,
});

const ease = (dt: number): number => 1 - Math.exp(-dt / EASE_TAU);

const toward = (from: number, to: number, step: number): number =>
  Math.abs(to - from) <= step ? to : from + Math.sign(to - from) * step;

/**
 * Advance the display by `dt` seconds.
 *
 * Without a target the display eases toward each new value. With one, the
 * target and speed (or duration) drive the motion, and each new measured
 * value pulls the display back toward where the part really is.
 */
export const stepMotion = (state: MotionState, input: MotionInput, dt: number): MotionState => {
  const next: MotionState = {...state};

  if (input.target === undefined) {
    next.target = undefined;
    next.derivedSpeed = undefined;
    next.correction = 0;
    next.value = input.value;
    next.displayed =
      input.smooth === false ? input.value : state.displayed + (input.value - state.displayed) * ease(dt);
    return next;
  }

  if (input.target !== state.target) {
    next.target = input.target;
    next.derivedSpeed =
      input.duration && input.duration > 0
        ? Math.abs(input.target - state.displayed) / input.duration
        : undefined;
  }
  if (input.value !== state.value) {
    next.value = input.value;
    next.correction = input.value - state.displayed;
  }

  const speed = input.speed && input.speed > 0 ? input.speed : next.derivedSpeed;
  let displayed = state.displayed;
  if (speed !== undefined) {
    displayed = toward(displayed, input.target, speed * dt);
  } else {
    displayed += (input.target - displayed) * ease(dt);
  }

  // The measurement is stale by the time it arrives, so it corrects the
  // display gradually instead of jerking it back.
  const applied = next.correction * ease(dt);
  next.correction -= applied;
  const corrected = displayed + applied;
  // A correction never carries the display past the target it is moving to.
  next.displayed =
    Math.sign(input.target - displayed) === Math.sign(input.target - corrected) || corrected === input.target
      ? corrected
      : input.target;
  return next;
};
