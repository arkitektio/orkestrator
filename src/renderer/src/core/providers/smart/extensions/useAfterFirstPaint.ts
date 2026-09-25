import React from "react";

/**
 * False on the first render, true from the frame after the first paint.
 *
 * `requestAnimationFrame` runs before the frame paints, and a state update
 * scheduled from it is a separate task the event loop only runs after that
 * frame's rendering steps — so whatever the first render put on screen is
 * painted alone before anything gated on this hook mounts. `startTransition`
 * keeps a keystroke into the search input ahead of the deferred mount.
 * (`useDeferredValue` / a bare transition do not guarantee a paint in between.)
 */
export const useAfterFirstPaint = (): boolean => {
  const [painted, setPainted] = React.useState(false);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      React.startTransition(() => setPainted(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return painted;
};
