/**
 * Emits the LATEST pushed value once the stream has been quiet for `delayMs`
 * — a trailing debounce, the mirror image of `rafCoalesce`'s per-frame
 * leading coalescer.
 *
 * Where `createRafCoalescer` keeps a render-cadence consumer in step with a
 * render-cadence producer, this one deliberately breaks that step: it is how a
 * hot store field reaches a React subscriber without dragging it to the
 * producer's cadence (OCTREE_RENDERER.md P17, "publish a throttled or settled
 * snapshot").
 *
 * `flush` bypasses the wait for values that must not be held back, and resets
 * the window so a settle already in flight cannot land after it and overwrite
 * it with something older.
 *
 * Timers are injectable for tests, exactly as in `rafCoalesce.ts`.
 */
export function createSettler<A>(opts: {
  delayMs: number;
  emit: (latest: A) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}): { push(value: A): void; flush(value: A): void; cancel(): void } {
  const setTimer =
    opts.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms) as unknown);
  const clearTimer =
    opts.clearTimer ?? ((handle: unknown) => clearTimeout(handle as never));

  let handle: unknown = null;
  let pending: A;
  let hasPending = false;

  const cancel = () => {
    if (handle !== null) {
      clearTimer(handle);
      handle = null;
    }
    hasPending = false;
  };

  return {
    push(value: A) {
      pending = value;
      hasPending = true;
      // Restart the window: the point is to fire once the stream goes quiet,
      // so every new value pushes the deadline out.
      if (handle !== null) clearTimer(handle);
      handle = setTimer(() => {
        handle = null;
        if (!hasPending) return;
        hasPending = false;
        emitPending();
      }, opts.delayMs);
    },
    flush(value: A) {
      cancel();
      opts.emit(value);
    },
    cancel,
  };

  function emitPending() {
    opts.emit(pending);
  }
}
