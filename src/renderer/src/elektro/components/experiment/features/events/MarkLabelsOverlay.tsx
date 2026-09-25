import { useEffect, useMemo, useRef } from "react";
import { bindFields } from "@/core/data/scene/stores/bindStore";
import { pixelAtTime } from "../../platform/camera/rangeToCamera";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import { bandKey, useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * Labels of point marks (event names), drawn in the DOM over the canvas.
 *
 * Which labels exist changes at UI cadence (a layer publishes them when a read
 * lands or the committed window moves); WHERE they sit follows the live window,
 * so each label's `left` is written imperatively from a vanilla subscription —
 * one style write per label per change, no React render (P17).
 *
 * Vertical placement is the layer's band: its row, then its lane within it.
 */
export const MarkLabelsOverlay = () => {
  // Scalars (P17): which labels exist and where rows are both change at UI
  // cadence; the records themselves are read through `getState()` below.
  const labelsVersion = useViewerStore((s) => s.labelsVersion);
  const layoutVersion = useViewerStore((s) => s.layoutVersion);
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const entries = useMemo(() => {
    const { markLabels, bands, rowCount } = viewerApi.getState();
    return Object.entries(markLabels).flatMap(([layerId, labels]) => {
    const band = bands[bandKey(layerId, 0)];
    if (!band || rowCount === 0) return [];
    return labels.map((label, i) => {
      const laneHeight = (band.top - band.bottom) / Math.max(1, label.laneCount);
      const yWorld = band.top - label.lane * laneHeight;
      return { key: `${layerId}:${i}`, time: label.time, text: label.text, topPct: (-yWorld / rowCount) * 100 };
    });
    });
    // The versions STAND FOR the records.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelsVersion, layoutVersion, viewerApi]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return bindFields(
      rangeApi,
      [(s) => s.liveRange.start, (s) => s.liveRange.end],
      (s) => {
        const width = viewerApi.getState().viewportPx.width;
        for (const el of Array.from(container.children) as HTMLElement[]) {
          const time = Number(el.dataset.time);
          el.style.left = `${pixelAtTime(time, width, s.liveRange) + 3}px`;
        }
      },
    );
  }, [rangeApi, viewerApi, entries]);

  if (entries.length === 0) return null;
  return (
    <div ref={containerRef} className="pointer-events-none absolute top-0 bottom-12 left-0 w-full overflow-hidden">
      {entries.map((entry) => (
        <span
          key={entry.key}
          data-time={entry.time}
          className="absolute max-w-[12rem] truncate font-mono text-[10px] text-foreground/80 drop-shadow"
          style={{ top: `calc(${entry.topPct}% + 1px)` }}
        >
          {entry.text}
        </span>
      ))}
    </div>
  );
};
