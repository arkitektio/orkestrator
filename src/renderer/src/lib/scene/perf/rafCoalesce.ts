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
