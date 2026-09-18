import { useEffect, useMemo, useRef } from "react";
import { bindFields } from "@/lib/scene/stores/bindStore";
import { pixelAtTime } from "../../platform/camera/rangeToCamera";
import { sampleAt } from "../../platform/probe/sampleAt";
import {
  drawnLayersKey,
  isLayerHidden,
  useExperimentStore,
  useExperimentStoreApi,
} from "../../platform/stores/experimentStore";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import {
  useViewerStore,
  useViewerStoreApi,
} from "../../platform/stores/viewerStore";
import { formatValue } from "../../platform/probe/formatValue";

/**
 * The hover probe: a cursor line across every row, and a readout of each view's
 * value at that time.
 *
 * Two parts on two planes. The LINE follows the pointer and the live window, so it
 * is positioned imperatively (a vanilla subscription writing one `transform`). The
 * READOUT is text, which only needs to change when the hovered time does — coalesced
 * to one write per frame upstream — so it is a normal React component.
 *
 * Values are read from what is DRAWN (`probeSources`), not fetched: the readout
 * must agree with the line under the cursor. When the drawn level is not the finest,
 * the readout says so — presenting a pyramid level's value as the raw sample would
 * be a lie a user could act on.
 */
export const ProbeReadout = () => {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();

  // --- the line: imperative ---
  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    const place = () => {
      const { hoverTime, viewportPx } = viewerApi.getState();
      if (hoverTime == null) {
        line.style.display = "none";
        return;
      }
      line.style.display = "";
      const x = pixelAtTime(hoverTime, viewportPx.width, rangeApi.getState().liveRange);
      line.style.transform = `translateX(${x}px)`;
    };
    const unbindHover = bindFields(
      viewerApi,
      [(s) => s.hoverTime, (s) => s.viewportPx.width],
      place,
    );
    const unbindRange = bindFields(
      rangeApi,
      [(s) => s.liveRange.start, (s) => s.liveRange.end],
      place,
    );
    return () => {
      unbindHover();
      unbindRange();
    };
  }, [rangeApi, viewerApi]);

  return (
    <>
      <div
        ref={lineRef}
        className="pointer-events-none absolute top-0 bottom-12 left-0 w-px bg-foreground/40"
        style={{ display: "none" }}
      />
      <ReadoutPanel />
    </>
  );
};

const ReadoutPanel = () => {
  const hoverTime = useViewerStore((s) => s.hoverTime);
  const viewerApi = useViewerStoreApi();
  const timeOrigin = useExperimentStore((s) => s.timeOrigin);
  // Scalars (P17): what is drawn changes when tiles land (`probeVersion`) or the
  // drawn set changes (`drawnLayersKey`) — both refresh the readout without the
  // pointer having to move.
  const probeVersion = useViewerStore((s) => s.probeVersion);
  const drawnKey = useExperimentStore(drawnLayersKey);
  const experimentApi = useExperimentStoreApi();

  const rows = useMemo(() => {
    if (hoverTime == null) return [];
    const { probeSources, stats } = viewerApi.getState();
    const layers = experimentApi.getState().layers;
    const x = hoverTime - timeOrigin;
    return layers
      .filter((l) => l.kind === "trace" && !isLayerHidden(l))
      .map((layer) => {
        const channels = probeSources.get(layer.id) ?? [];
        const finestPeriod = Math.abs(layer.source?.levels[0]?.period ?? 0);
        const drawnLevel = stats[layer.id]?.levelIndex ?? -1;
        const drawnPeriod = Math.abs(layer.source?.levels[Math.max(0, drawnLevel)]?.period ?? finestPeriod);
        const values = channels.map((c) => sampleAt(c.xs, c.ys, x, drawnPeriod * 1.5 + 1e-12));
        return {
          id: layer.id,
          label: layer.label,
          color: layer.color,
          unit: layer.valueUnit,
          values,
          // Anything coarser than the finest level is a pyramid value, not a sample.
          decimated: drawnLevel > 0 || channels.some((c) => c.decimated),
        };
      })
      .filter((row) => row.values.some((v) => v != null));
    // The version and key STAND FOR the records.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverTime, probeVersion, drawnKey, timeOrigin, viewerApi, experimentApi]);

  if (hoverTime == null || rows.length === 0) return null;
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-20 w-fit max-w-xs rounded-md border border-border/60 bg-background/80 p-2 text-xs shadow-sm backdrop-blur">
      <div className="mb-1 font-mono tabular-nums text-muted-foreground">
        t = {formatValue(hoverTime)}
      </div>
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="truncate">{row.label}</span>
          <span className="ml-auto pl-2 font-mono tabular-nums">
            {row.values
              .map((v) => (v == null ? "—" : formatValue(v.value)))
              .join(" / ")}
            {row.unit ? ` ${row.unit}` : ""}
          </span>
          {row.decimated && (
            <span className="text-[10px] text-amber-500" title="Read from a coarser pyramid level, not the raw samples">
              ~
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
