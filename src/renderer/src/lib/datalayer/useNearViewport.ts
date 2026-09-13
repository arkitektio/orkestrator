import React from "react";

/**
 * Whether `ref`'s element is (about to be) visible. Starts `false` and flips
 * to `true` once, the first time the element enters the viewport margin; the
 * fetch behind it should not start before then.
 */
export const useNearViewport = (ref: React.RefObject<Element | null>) => {
  // Without an IntersectionObserver (tests, old runtimes) everything counts
  // as near, so the fetch is not deferred forever.
  const [near, setNear] = React.useState(
    () => typeof IntersectionObserver === "undefined",
  );

  React.useEffect(() => {
    if (near) return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, near]);

  return near;
};
