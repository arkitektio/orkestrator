import { useMemo } from "react";

import { assessLayerPoolViability } from "../../features/bricks/octree/poolViability";
import { useModeStore } from "../../platform/stores/modeStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import type { LayerState } from "../../platform/stores/sceneStore";
import type { UnplannableLayerInfo } from "../../features/bricks/store/brickSlice";

const formatBytes = (bytes: number): string =>
  bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
    : `${Math.round(bytes / 1024 ** 2)} MB`;

/**
 * Warning strip for a layer refused by the pool-viability guard (P18): its
 * coarsest pyramid level's pinned atlas floor exceeds the GPU budget — usually
 * a dataset with no multiscale pyramid. Offers a one-click mode switch when the
 * OTHER display mode is affordable. Numbers live in the tooltip.
 *
 * Lives in `shell/`, not `platform/layerui/`, because it reaches into
 * `features/bricks` for the viability verdict — a platform module may not.
 * Every brick-backed card shows it, which is why it is its own file rather than
 * an inline in one of them.
 */
export const UnplannableNotice = ({
  layer,
  info,
}: {
  layer: LayerState;
  info: UnplannableLayerInfo;
}) => {
  const getArrayForStoreId = useViewerStore((s) => s.getArrayForStoreId);
  const setDisplayMode = useModeStore((s) => s.setDisplayMode);
  const otherMode = info.mode === "3D" ? "2D" : "3D";
  const otherViable = useMemo(
    () => assessLayerPoolViability(layer, getArrayForStoreId, otherMode)?.viable === true,
    [layer, getArrayForStoreId, otherMode],
  );

  return (
    <div
      className="flex items-center gap-2 border-t border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200"
      title={`This layer has no usable multiscale pyramid: keeping its coarsest level resident would need ${formatBytes(info.floorBytes)} of GPU memory (budget ${formatBytes(info.capBytes)}). Provide a pyramidal (multiscale) version of the data to render it in ${info.mode}.`}
    >
      <span className="min-w-0 flex-1 truncate">
        ⚠ too large for {info.mode} — no usable pyramid
      </span>
      {otherViable && (
        <button
          className="shrink-0 rounded border border-amber-400/40 px-1.5 py-0.5 font-medium transition-colors hover:bg-amber-400/20"
          onClick={() => setDisplayMode(otherMode)}
        >
          switch to {otherMode}
        </button>
      )}
    </div>
  );
};
