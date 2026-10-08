/**
 * Coalesces a high-frequency event stream (pointermove) to at most one `run`
 * per animation frame, always with the latest arguments. raf/caf are
 * injectable for tests.
 */
export function createRafCoalescer<A>(
  run: (latest: A) => void,
  raf: (cb: () => void) => number = (cb) => requestAnimationFrame(cb),
  caf: (handle: number) => void = (handle) => cancelAnimationFrame(handle),
): { schedule(args: A): void; cancel(): void } {
  let handle: number | null = null;
  let latest: A;

  return {
    schedule(args: A) {
      latest = args;
      if (handle !== null) return;
      handle = raf(() => {
        handle = null;
        run(latest);
      });
    },
    cancel() {
      if (handle !== null) {
        caf(handle);
        handle = null;
      }
    },
  };
}

/**
 * Leading-edge variant: the FIRST `schedule` of a frame runs `run`
 * synchronously, inside the event; further calls in that frame coalesce to one
 * trailing run with the latest arguments.
 *
 * For work whose result must be on screen in the frame the event arrived in
 * (the hover probe, the draw preview). Chromium already delivers pointermove
 * at most once per frame, just before the rAF callbacks, so deferring that
 * work to a rAF only moved its `invalidate()` — and the render — one frame
 * later. Still at most one run per frame under an event storm.
 */
export function createLeadingRafCoalescer<A>(
  run: (latest: A) => void,
  raf: (cb: () => void) => number = (cb) => requestAnimationFrame(cb),
  caf: (handle: number) => void = (handle) => cancelAnimationFrame(handle),
): { schedule(args: A): void; cancel(): void } {
  /** Non-null while this frame's run is spent. */
  let handle: number | null = null;
  let pending = false;
  let latest: A;

  const onFrame = () => {
    handle = null;
    if (!pending) return;
    pending = false;
    // The trailing run spends the new frame too.
    handle = raf(onFrame);
    run(latest);
  };

  return {
    schedule(args: A) {
      if (handle !== null) {
        latest = args;
        pending = true;
        return;
      }
      handle = raf(onFrame);
      run(args);
    },
    cancel() {
      pending = false;
      if (handle !== null) {
        caf(handle);
        handle = null;
      }
    },
  };
}
