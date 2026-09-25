import { useEffect, useRef } from "react";
import { bindFields } from "@/core/lib/scene/stores/bindStore";
import { pixelAtTime } from "../../platform/camera/rangeToCamera";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * The rubber band of an EXPLORE drag — the stretch that will be zoomed into on
 * release.
 *
 * It moves at pointer rate, so it is positioned imperatively from a vanilla
 * subscription (one `style` write per change, no React render — P17), the same
 * way the probe line is.
 */
export const ZoomBoxOverlay = () => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const viewerApi = useViewerStoreApi();
  const rangeApi = useRangeStoreApi();

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    return bindFields(
      viewerApi,
      [(s) => s.zoomBox?.from, (s) => s.zoomBox?.to, (s) => s.viewportPx.width],
      (s) => {
        const zoom = s.zoomBox;
        if (!zoom) {
          box.style.display = "none";
          return;
        }
        const window = rangeApi.getState().liveRange;
        const a = pixelAtTime(zoom.from, s.viewportPx.width, window);
        const b = pixelAtTime(zoom.to, s.viewportPx.width, window);
        box.style.display = "";
        box.style.left = `${Math.min(a, b)}px`;
        box.style.width = `${Math.abs(b - a)}px`;
      },
    );
  }, [viewerApi, rangeApi]);

  return (
    <div
      ref={boxRef}
      className="pointer-events-none absolute top-0 bottom-12 z-10 border-x border-sky-400/80 bg-sky-400/15"
      style={{ display: "none" }}
    />
  );
};
