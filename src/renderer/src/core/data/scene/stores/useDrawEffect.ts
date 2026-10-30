import { useThree } from "@react-three/fiber";
import { useLayoutEffect, type DependencyList } from "react";

/**
 * Write React state into drawn objects, in place. The write and the frame that
 * shows it are one call.
 *
 * The canvases here are `frameloop="demand"`, so an unasked-for change is simply
 * not drawn. R3F asks for tree and prop changes; it cannot see a geometry swap, a
 * colour attribute or a uniform written from an effect. Those used to get their
 * frame by accident, from handler props that happened to be fresh closures, which
 * stopped working wherever the handlers were `undefined` (P33, `ARCHITECTURE.md`).
 *
 * A layout effect, so the write lands before the rAF that draws it.
 *
 * The frame is all that lines and transparent interiors need: they draw in the
 * canvas pass of every frame. Anything that can enter the compositor's cached
 * volume target (a volume, an opaque occluder) must also `volumeInputs.bump`, or
 * the frame re-serves the cached image.
 *
 * Render-plane writes do not belong here: a store subscription goes through
 * `bindField` (`bindStore.ts`), whose `apply` asks for its own frame.
 */
export function useDrawEffect(
  write: () => void | (() => void),
  deps: DependencyList,
): void {
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    const cleanup = write();
    invalidate();
    return cleanup;
    // The caller's deps stand for what `write` reads, as in any effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, invalidate]);
}
