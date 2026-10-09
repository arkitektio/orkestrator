import { AttributeRowsSection } from "../../platform/layerui/AttributeRowsSection";
import { useCreateSceneAnnotation } from "../annotations/useCreateSceneAnnotation";
import { useModeStore } from "../../platform/stores/modeStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import { ProbeChannelValues, useProbedLayer } from "./ProbeChannelValues";
import { ProbePointList } from "./ProbePointList";

/**
 * The probe panel — the "Probe" tab of the page sidebar: the probed voxel
 * with per-channel raw values and their provenance (exact vs LOD-approximate
 * vs pending), the attribute-plan rows for that pixel, the action that makes
 * the probe durable (mark it as a point annotation), and the pinned probe
 * points compared side by side. A READOUT, nothing more: how the probe behaves
 * (target layer, strategy, threshold) is configured in `SceneSettings`.
 *
 * A sidebar tab unmounts while another tab is open, so nothing the scene
 * depends on may live here: the readout's settling, the attribute lookups for
 * the live probe, the pinning and the stale-target reconciliation are all
 * headless components of the viewport (`ProbeReadoutSettler`,
 * `AttributeProbeTracker`, `ProbePointPinner`, `StaleProbeReconciler`).
 */

const smallButton =
  "rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70 hover:bg-white/15 hover:text-white";

export const ProbePanel = () => {
  perfMonitor.countRender("ProbePanel"); // no-op unless a perf recording is armed
  const interactionMode = useModeStore((s) => s.interactionMode);
  const probeFollowsCursor = useModeStore((s) => s.probeFollowsCursor);
  // The SETTLED snapshot, never the hot `probedCoordinate`: that changes once
  // per voxel crossing (≈ once per frame while sweeping) and this is a React
  // subtree — P17. `ProbeReadoutSettler` publishes this once the cursor rests,
  // flushing immediately for clicks, retractions and target changes.
  const probedCoordinate = useViewerStore((s) => s.probeReadout);
  const setProbedCoordinate = useViewerStore((s) => s.setProbedCoordinate);
  const { createPointAnnotation } = useCreateSceneAnnotation();
  const hasProbePoints = useViewerStore((s) => s.probePoints.length > 0);
  const layer = useProbedLayer(probedCoordinate?.layerId ?? null);
  const inProbeMode = interactionMode === "PROBE";

  return (
    // The tab (`SceneProbeSidebar`) owns the scroll and the padding.
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-white/60">
        <span>Probe</span>
        <div className="flex gap-1">
          {/* The hover-to-probe toggle lives in `SceneModeControls`; target,
              strategy and threshold live in `SceneSettings`. */}
          {probedCoordinate && (
            <>
              <button
                className={`${smallButton} disabled:cursor-not-allowed disabled:opacity-40`}
                disabled={!probedCoordinate.worldPos}
                title="Create a point annotation at this probe"
                onClick={() =>
                  probedCoordinate.worldPos &&
                  createPointAnnotation(probedCoordinate.worldPos)
                }
              >
                Mark point
              </button>
              <button className={smallButton} onClick={() => setProbedCoordinate(null)}>
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {!probedCoordinate && !hasProbePoints && (
        <p className="mt-2 text-[10px] leading-4 text-white/50">
          {inProbeMode ? (
            <>
              {probeFollowsCursor ? "Hover a layer to read it. " : ""}Click to pin a probe point
              here. Shift+click to drop a point annotation instead.
            </>
          ) : (
            <>Hold P over the scene to probe it, and click to pin a probe point here.</>
          )}
        </p>
      )}

      {/* With points pinned the live probe is a column among them ("live",
          in `ProbePointList`), not a second readout above them. */}
      {probedCoordinate && !hasProbePoints && (
        <div className="mt-2 space-y-1.5 text-[11px]">
          <ProbeChannelValues probe={probedCoordinate} layer={layer} />
          {/* Attribute-plan results: what the tables attached to this pixel's
              object know about it (AttributeProbeTracker fills the store). */}
          <AttributeRowsSection probe={probedCoordinate} />
        </div>
      )}

      <ProbePointList />
    </div>
  );
};
