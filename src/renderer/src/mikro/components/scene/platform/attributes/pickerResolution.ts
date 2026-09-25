import { useEffect, useRef } from "react";

/**
 * The DATA half's lifecycle for a picker-driven build: run when the key
 * changes, let only the still-wanted build reach the GPU, and hand the loser
 * to whoever owns freeing it.
 *
 * ## Why this is shared when the builds are not
 *
 * The four picker-bearing layers build very different things — a mask paints a
 * value-code texture, a mesh paints into a reused arena, a network scatters
 * per-node styling with no texture at all, a point cloud fills a compute
 * buffer. None of that is shared and none of it should be.
 *
 * What IS the same, four times over, is the choreography around it, and it is
 * the part that has actually leaked GPU memory: start an async build, race it
 * against the next edit, and decide what happens to the build that loses. Each
 * copy spelled it as a `let cancelled = false` plus a `stillWanted` callback
 * plus a hand-rolled dispose, and the branch that frees the loser's texture is
 * easy to write as "do nothing" — which leaks, silently, only when two edits
 * overlap.
 *
 * ## `dispose` is the reason this is an object and not a flag
 *
 * A boolean can say "this build is stale". It cannot say who frees what the
 * stale build allocated. Every sink here disposes only what it REPLACES, so a
 * build that never got bound is nobody's business but its own — stating that
 * as a callback is the whole point.
 *
 * ## `signal`, today and later
 *
 * `build` receives an `AbortSignal` alongside `stillWanted`. Nothing awaited
 * inside currently accepts one (`plansFor`, `loadSparseSource`, `listObjects`,
 * DuckDB), so today it is only a second way to ask the same question. It is in
 * the signature now so that when the data layer grows a `signal` parameter —
 * a change with a real payoff on fast gene switches — it plumbs through
 * without touching a call site.
 */
export type PickerBuildContext = {
  /** False once a newer resolve has superseded this build. Check it after
   *  every await, and before the first write to anything shared. */
  stillWanted: () => boolean;
  signal: AbortSignal;
};

export type PickerResolutionOptions<T> = {
  /** The async build. Must not touch anything shared before checking
   *  `stillWanted()`. */
  build: (ctx: PickerBuildContext) => Promise<T>;
  /** Bind the winner. Called only while it is still wanted. */
  apply: (built: T) => void;
  /** Switch the colouring off: nothing is active, or the build threw. */
  reset: () => void;
  /** Free what a SUPERSEDED build allocated. Omit when a build owns nothing
   *  (a mesh's prepared paint allocates no texture until `apply`). */
  dispose?: (built: T) => void;
  onError?: (error: unknown) => void;
  /**
   * Whether a failed build switches the colouring off. Default true: a stale
   * colouring is worse than none, because it looks like an answer.
   *
   * The network layer sets it false deliberately — its styling is per-node
   * scatter rather than a bound texture, and dropping to identity on a
   * transient read failure would repaint the whole graph grey for something
   * the next edit will retry anyway.
   */
  resetOnError?: boolean;
};

/**
 * Runs `build` whenever `key` changes; `null` means nothing is active and
 * calls `reset()` instead.
 *
 * `build`/`apply`/`reset`/`dispose` are read through a ref, so the effect
 * honestly depends on `key` alone — which is what lets the caller compose a
 * content key (`entryKeys.ts`) and stop fighting `exhaustive-deps` over
 * closures that change identity every render.
 */
export function usePickerResolution<T>(
  key: string | null,
  options: PickerResolutionOptions<T>,
): void {
  const ref = useRef(options);
  ref.current = options;

  useEffect(() => {
    const { build, apply, reset, dispose, onError } = ref.current;
    if (key === null) {
      reset();
      return;
    }

    let wanted = true;
    const controller = new AbortController();
    const stillWanted = () => wanted;

    void build({ stillWanted, signal: controller.signal })
      .then((built) => {
        // The check comes BEFORE the first write: a superseded build that
        // painted into a shared arena would corrupt the bytes the live
        // texture uploads, which is not something `apply` can undo.
        if (!wanted) {
          dispose?.(built);
          return;
        }
        apply(built);
      })
      .catch((error: unknown) => {
        if (!wanted) return;
        onError?.(error);
        if (ref.current.resetOnError !== false) reset();
      });

    return () => {
      wanted = false;
      controller.abort();
    };
  }, [key]);
}
