import { AttributeRowsSection } from "../../platform/layerui/AttributeRowsSection";
import { useCreateSceneAnnotation } from "../annotations/useCreateSceneAnnotation";
import { useModeStore } from "../../platform/stores/modeStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import { ProbeChannelValues, useProbedLayer } from "./ProbeChannelValues";
import { ProbePointList } from "./ProbePointList";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import type { ProbeResult } from "../../platform/probe/probeTypes";

/**
 * The probe panel — the "Probe" tab of the page sidebar: the probed voxel
 * with per-channel raw values and their provenance (exact vs LOD-approximate
 * vs pending), the attribute-plan rows for that pixel, the action that makes
 * the probe durable (mark it as a point annotation), and the pinned probe
 * points compared side by side. A READOUT, nothing more: which layers it
 * involves is the control bar's `LayerTargetPicker`, how it behaves
 * (strategy, threshold) is configured in `SceneSettings`.
 *
 * A sidebar tab unmounts while another tab is open, so nothing the scene
 * depends on may live here: the readout's settling, the attribute lookups for
 * the live probe, the pinning and the stale-target reconciliation are all
 * headless components of the viewport (`ProbeReadoutSettler`,
 * `AttributeProbeTracker`, `ProbePointPinner`, `StaleProbeReconciler`).
 */

const smallButton =
  "rounded border border-foreground/10 bg-foreground/5 px-1.5 py-0.5 text-[10px] text-foreground/70 hover:bg-foreground/15 hover:text-foreground";

/** One info layer's reading: its name when there are several, its channel
 * values, and the attribute-plan rows for that pixel's object
 * (AttributeProbeTracker fills the store). */
const ReadingBlock = ({ reading, named }: { reading: ProbeResult; named: boolean }) => {
  const layer = useProbedLayer(reading.layerId);
  return (
    <div className="space-y-1.5">
      {named && layer && (
        <div className="truncate text-[10px] font-medium text-foreground/60">
          {layerDisplayLabel(layer)}
        </div>
      )}
      <ProbeChannelValues probe={reading} layer={layer} />
      <AttributeRowsSection probe={reading} />
    </div>
  );
};

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
  // What the readout shows: each info layer's reading at the hit, or a mesh
  // pick itself (a pick measures the mesh, not the image layers).
  const probeInfo = useViewerStore((s) => s.probeInfo);
  const readings =
    probedCoordinate?.strategy === "mesh" ? [probedCoordinate] : probeInfo;
  const inProbeMode = interactionMode === "PROBE";

  return (
    // The tab (`SceneProbeSidebar`) owns the scroll and the padding.
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-foreground/60">
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
        <p className="mt-2 text-[10px] leading-4 text-foreground/50">
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
        <div className="mt-2 space-y-3 text-[11px]">
          {readings.map((reading) => (
            <ReadingBlock
              key={reading.layerId}
              reading={reading}
              named={readings.length > 1}
            />
          ))}
          {readings.length === 0 && (
            <p className="text-[10px] leading-4 text-foreground/50">
              No layer to show here: choose what the probe shows under "Show under cursor" in
              the layer picker.
            </p>
          )}
        </div>
      )}

      <ProbePointList />
    </div>
  );
};
