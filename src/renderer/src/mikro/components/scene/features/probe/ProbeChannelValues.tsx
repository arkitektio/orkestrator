import { memo, useMemo } from "react";
import type { LayerState } from "../../platform/model/layerModel";
import type { ProbeResult } from "../../platform/probe/probeTypes";
import { formatProbeValue } from "../../platform/probe/valueFormat";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";

/**
 * What a probe measured, as the HUD shows it: the voxel and one row per
 * channel slab with where the value came from. Shared by the live readout and
 * the pinned probe points, which differ only in the attribute rows under it.
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

/**
 * The probed layer, for its channel labels — behind a SCALAR key (P9c/P17).
 * The layer OBJECT is replaced on every per-tick window edit while the labels
 * stay put, and handing the readout a fresh identity per tick would defeat
 * `ProbeChannelValues`' memo.
 */
export const useProbedLayer = (layerId: string | null): LayerState | null => {
  const sceneStoreApi = useSceneStoreApi();
  const layerLabelsKey = useSceneStore((s) => {
    if (layerId === null) return "";
    const probed = s.layers.find((candidate) => candidate.id === layerId);
    if (!probed) return "";
    return `#${probed.channels
      .map((node) => `${node.intensityIndex ?? ""}:${node.label ?? ""}`)
      .join("|")}`;
  });
  return useMemo(
    () =>
      layerId !== null
        ? (sceneStoreApi.getState().layers.find((candidate) => candidate.id === layerId) ?? null)
        : null,
    // The key STANDS FOR the layer read via getState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layerId, layerLabelsKey, sceneStoreApi],
  );
};

/**
 * Memoized so a re-render of the panel for an unrelated reason (a mode
 * toggle, a layer edit) does not walk the channel list.
 */
export const ProbeChannelValues = memo(
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
      <>
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
      </>
    );
  },
);
ProbeChannelValues.displayName = "ProbeChannelValues";
