/**
 * Leading + trailing throttle: run NOW if `intervalMs` has passed since the
 * last run, otherwise once at the end of the current window.
 *
 * The third of `platform/perf`'s three cadence valves, and the one that kept
 * being hand-rolled — five copies before this, most visibly the two
 * byte-identical stats throttles in `FabriksCollectionLayer` and
 * `NetworkCollectionLayer`.
 *
 * ## Which valve
 *
 * | producer → consumer | primitive |
 * |---|---|
 * | render cadence → render cadence, latest wins | `createRafCoalescer` (leading, per frame) |
 * | streaming cadence → store, capped rate, never drops the last | `createLeadingThrottle` (this) |
 * | hot stream → React, only once it goes quiet | `createSettler` (trailing debounce) |
 *
 * This one is the P17 valve for a STREAMING-cadence producer publishing into a
 * scene store: it caps the write rate without ever dropping the final event,
 * which a plain leading throttle would, and without waiting for quiet, which a
 * settler would — streaming never goes quiet until it is done.
 *
 * ## `cancel()` is not optional
 *
 * Both hand-rolled copies omitted it, so a stats change within one window of a
 * layer unmounting fired a `setTimeout` into a torn-down scoped store. Callers
 * must cancel in their effect cleanup.
 *
 * `run` takes no arguments: every caller means "something changed, go look".
 * Timers are injectable, exactly as in `settle.ts` and `rafCoalesce.ts`.
 */
export function createLeadingThrottle(opts: {
  intervalMs: number;
  run: () => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  now?: () => number;
}): { trigger(): void; cancel(): void } {
  const setTimer = opts.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms) as unknown);
  const clearTimer = opts.clearTimer ?? ((handle: unknown) => clearTimeout(handle as never));
  const now = opts.now ?? (() => performance.now());

  let handle: unknown = null;
  // -Infinity, not 0: the FIRST trigger must run immediately whatever the
  // clock reads. Seeding with 0 works only while `now()` is already past
  // `intervalMs`, which is true for `performance.now()` and false for an
  // injected clock starting at 0 — the kind of difference a test finds and
  // production does not.
  let last = -Infinity;

  const fire = () => {
    last = now();
    opts.run();
  };

  return {
    trigger() {
      const elapsed = now() - last;
      if (elapsed >= opts.intervalMs) {
        if (handle !== null) {
          clearTimer(handle);
          handle = null;
        }
        fire();
      } else if (handle === null) {
        handle = setTimer(() => {
          handle = null;
          fire();
        }, opts.intervalMs - elapsed);
      }
    },
    cancel() {
      if (handle !== null) {
        clearTimer(handle);
        handle = null;
      }
    },
  };
}
