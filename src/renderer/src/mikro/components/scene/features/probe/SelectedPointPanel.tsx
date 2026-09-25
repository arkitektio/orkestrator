import { memo, useEffect, useMemo } from "react";
import { AttributeRowsSection } from "../../platform/layerui/AttributeRowsSection";
import type { ProbeResult } from "../../platform/probe/probeTypes";
import { formatProbeValue } from "../../platform/probe/valueFormat";
import { effectiveProbeLayerId } from "../../platform/probe/probeTargeting";
import { useCreateSceneAnnotation } from "../annotations/useCreateSceneAnnotation";
import { useModeStore } from "../../platform/stores/modeStore";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import type { LayerState } from "../../platform/model/layerModel";

/**
 * The probe HUD: the probed voxel with per-channel raw values and their
 * provenance (exact vs LOD-approximate vs pending), the attribute-plan rows
 * for that pixel, and the actions that make the probe durable — mark it as a
 * point annotation or start a path draw anchored at it. A READOUT, nothing
 * more: how the probe behaves (target layer, strategy, threshold) is
 * configured in `SceneSettings`, so the HUD only shows what was measured.
 *
 * Renderer-owned and self-positioning: it docks bottom-right, directly above
 * `SceneModeControls`, because it is the readout for the mode those controls
 * put you in. `w-fit` so it hugs the right edge instead of reaching a fixed
 * width into the canvas. Not part of the composable column — nothing about
 * where it sits is a host's layout choice.
 */

const ProvenanceBadge = ({ probe }: { probe: ProbeResult }) => {
  const { source, level } = probe.provenance;
  if (source === "exact") {
    return (
      <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-medium text-emerald-300">
        exact
      </span>
    );
  }
  if (source === "resident") {
    return (
      <span className="rounded bg-white/10 px-1 text-[9px] font-medium text-white/50">
        {level === 0 ? "level 0" : `~LOD ${level}`}
      </span>
    );
  }
  return (
    <span className="rounded bg-white/10 px-1 text-[9px] font-medium text-white/40">…</span>
  );
};

const smallButton =
  "pointer-events-auto rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70 hover:bg-white/15 hover:text-white";

/**
 * The measured values. Split out and memoized so the header — whose three
 * action buttons get fresh closures on every render — is not rebuilt whenever
 * the reading changes, and so a re-render of the panel for an unrelated reason
 * (a mode toggle, a layer edit) does not walk the channel list.
 */
const ProbeReadoutBody = memo(
  ({ probe, layer }: { probe: ProbeResult; layer: LayerState | null | undefined }) => {
    // One pass over the channel list instead of a `find` per channel.
    const labels = useMemo(() => {
      const byIndex = new Map<number, string>();
      for (const node of layer?.channels ?? []) {
        if (node.intensityIndex != null) byIndex.set(node.intensityIndex, node.label ?? "");
      }
      return byIndex;
    }, [layer?.channels]);

    return (
      <div className="mt-2 space-y-1.5 text-[11px]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-white/50">Voxel</span>
          <span className="font-mono text-white/90">[{probe.voxelIndex.join(", ")}]</span>
        </div>

        <div className="space-y-0.5 rounded border border-white/10 bg-white/5 px-2 py-1.5">
          {probe.strategy === "mesh" ? (
            // A mesh pick: the "value" is the instance's object id.
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[10px] text-white/60">Instance</span>
              <span className="font-mono text-white/90">
                #{probe.values[0]?.value ?? "…"}
              </span>
            </div>
          ) : (
            probe.values.map((entry) => (
              <div key={entry.channel} className="flex items-center justify-between gap-3">
                <span className="truncate text-[10px] text-white/60">
                  {labels.get(entry.channel) || `Ch ${entry.channel}`}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-white/90">
                    {formatProbeValue(entry.value, probe.dtype)}
                  </span>
                  <ProvenanceBadge probe={probe} />
                </span>
              </div>
            ))
          )}
        </div>

        {/* Attribute-plan results: what the tables attached to this pixel's
            object know about it (AttributeProbeTracker fills the store). */}
        <AttributeRowsSection probe={probe} />
      </div>
    );
  },
);
ProbeReadoutBody.displayName = "ProbeReadoutBody";

export const SelectedPointPanel = () => {
  perfMonitor.countRender("SelectedPointPanel"); // no-op unless a perf recording is armed
  const interactionMode = useModeStore((s) => s.interactionMode);
  const probeFollowsCursor = useModeStore((s) => s.probeFollowsCursor);
  // The SETTLED snapshot, never the hot `probedCoordinate`: that changes once
  // per voxel crossing (≈ once per frame while sweeping) and this is a React
  // subtree — P17. `ProbeReadoutSettler` publishes this once the cursor rests,
  // flushing immediately for clicks, retractions and target changes.
  const probedCoordinate = useViewerStore((s) => s.probeReadout);
  const setProbedCoordinate = useViewerStore((s) => s.setProbedCoordinate);
  const { createPointAnnotation } = useCreateSceneAnnotation();
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  const sceneStoreApi = useSceneStoreApi();
  const probedLayerId = probedCoordinate?.layerId ?? null;
  // A SCALAR key over what the readout reads from the probed layer — its
  // channel labels (P9c/P17). The layer OBJECT is replaced on every per-tick
  // window edit while the labels stay put, and handing the readout a fresh
  // identity per tick would defeat `ProbeReadoutBody`'s memo.
  const layerLabelsKey = useSceneStore((s) => {
    if (probedLayerId === null) return "";
    const probed = s.layers.find((candidate) => candidate.id === probedLayerId);
    if (!probed) return "";
    return `#${probed.channels
      .map((node) => `${node.intensityIndex ?? ""}:${node.label ?? ""}`)
      .join("|")}`;
  });
  const layer = useMemo(
    () =>
      probedLayerId !== null
        ? (sceneStoreApi
            .getState()
            .layers.find((candidate) => candidate.id === probedLayerId) ?? null)
        : null,
    // The key STANDS FOR the layer read via getState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [probedLayerId, layerLabelsKey, sceneStoreApi],
  );

  // Reconcile a stale reading with a moved target. All NEW probes come from
  // the effective target (the brick layers gate on it), so a mismatch can only
  // mean the target shifted underneath an old reading — unpin, first layer
  // hidden, probed layer hidden — and one layer's values must not sit under
  // another layer's name. `probeAfterPinChange` cannot catch these: it has no
  // layer list, so it cannot compute the default target. A SCALAR selector —
  // the id string is all the reconciliation needs.
  const effectiveTargetId = useSceneStore((s) =>
    effectiveProbeLayerId(probeLayerId, s.layers),
  );
  const staleProbe =
    probedCoordinate !== null &&
    // Mesh probes are owned by their mesh layer (never the image target).
    probedCoordinate.strategy !== "mesh" &&
    effectiveTargetId !== null &&
    probedCoordinate.layerId !== effectiveTargetId;
  useEffect(() => {
    if (staleProbe) setProbedCoordinate(null);
  }, [staleProbe, setProbedCoordinate]);

  const inProbeMode = interactionMode === "PROBE";
  if (!inProbeMode && !probedCoordinate) return null;

  return (
    <div className="pointer-events-auto absolute bottom-12 right-2 z-30 max-h-[60vh] w-fit min-w-44 max-w-72 overflow-y-auto rounded-lg border border-black/10 bg-black/40 p-2 backdrop-blur-md">
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

      {!probedCoordinate && (
        <p className="mt-2 text-[10px] leading-4 text-white/50">
          Click a layer to probe it{probeFollowsCursor ? " (or hover)" : ""}.
          Shift+click to drop a point annotation.
        </p>
      )}

      {probedCoordinate && <ProbeReadoutBody probe={probedCoordinate} layer={layer} />}
    </div>
  );
};
