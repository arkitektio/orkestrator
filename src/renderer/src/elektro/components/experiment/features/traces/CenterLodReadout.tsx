import { useMemo } from "react";
import {
  drawnLayersKey,
  isLayerHidden,
  useExperimentStore,
  useExperimentStoreApi,
} from "../../platform/stores/experimentStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * Which pyramid level the middle of the window is actually showing — the
 * timeline's counterpart of mikro's `CenterLodReadout`, same place, same wording.
 *
 * The tile renderer degrades silently by design: a fine tile still in flight is
 * stood in for by its coarse resident ancestor, so a trace can look finished while
 * it is a 1/16 stand-in. This badge is the one place that says so. It reports the
 * level SERVED at the window's centre, not the one the plan asked for; when they
 * differ the target is shown alongside — which is what "still refining" looks like.
 *
 * With several views there is no single layer to report, so it shows the COARSEST
 * served level among the drawn views (the picture is only as sharp as its blurriest
 * row) and names every view in the tooltip.
 *
 * Subscribes to SCALARS (P17): the stats version (bumped once per settled window
 * or landed tile — UI cadence) and the drawn-layers key; the records are read
 * through `getState()` inside the memo.
 */
export const CenterLodReadout = () => {
  const statsVersion = useViewerStore((s) => s.statsVersion);
  const drawnKey = useExperimentStore(drawnLayersKey);
  const viewerApi = useViewerStoreApi();
  const experimentApi = useExperimentStoreApi();

  const summary = useMemo(() => {
    const stats = viewerApi.getState().stats;
    const views = experimentApi.getState().layers;
    const rows = views
      .filter((v) => v.source && !isLayerHidden(v) && stats[v.id])
      .map((v) => ({ label: v.label, s: stats[v.id] }));
    if (rows.length === 0) return null;

    // The coarsest served level decides the badge; an unserved view counts as
    // coarsest of all, since nothing of it is on screen yet.
    const worst = rows.reduce((a, b) => {
      const la = a.s.centerLevelIndex ?? Infinity;
      const lb = b.s.centerLevelIndex ?? Infinity;
      return lb > la ? b : a;
    });
    return { rows, worst };
    // The version and key STAND FOR the records.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsVersion, drawnKey, viewerApi, experimentApi]);

  if (!summary) return null;
  const { rows, worst } = summary;
  const level = worst.s.centerLevelIndex;
  const target = worst.s.targetLevelIndex;
  const refining = level !== null && level > target;
  const resolutionLabel =
    worst.s.centerFactor === null
      ? "streaming"
      : worst.s.centerFactor <= 1
        ? "full res"
        : `1/${worst.s.centerFactor}`;

  const title =
    rows
      .map(({ label, s }) =>
        s.centerLevelIndex === null
          ? `${label}: nothing resident at the centre yet (plan asks for level ${s.targetLevelIndex})`
          : `${label}: level ${s.centerLevelIndex} of ${s.levelCount - 1}` +
            (s.centerFactor && s.centerFactor > 1 ? ` (1/${s.centerFactor})` : " (full res)") +
            (s.centerLevelIndex > s.targetLevelIndex
              ? `, refining towards ${s.targetLevelIndex}`
              : ""),
      )
      .join("\n") + "\nTiles still in flight are drawn from a coarser resident level.";

  return (
    <div
      className="pointer-events-none absolute bottom-14 left-2 z-10 flex items-center gap-1 rounded bg-black/40 px-1 py-0.5 font-mono text-[10px] tabular-nums text-white"
      title={title}
    >
      <span>LOD {level ?? "—"}</span>
      <span className="text-white/50">{resolutionLabel}</span>
      {refining && <span className="text-amber-300">→ {target}</span>}
    </div>
  );
};
