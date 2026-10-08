import { useViewerStore } from "../stores/viewerStore";

/** A hairline along the top while any layer is still reading. */
export const LoadingBar = () => {
  // A scalar the stats slice maintains — not a scan of every stats write.
  const loading = useViewerStore((s) => s.anyLoading);
  if (!loading) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 animate-pulse bg-primary/70" />
  );
};
