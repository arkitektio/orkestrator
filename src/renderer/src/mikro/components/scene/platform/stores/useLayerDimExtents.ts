import { useEffect } from "react";

import type { DimExtent } from "../model/dimExtents";
import { useSceneStore } from "./sceneStore";

/**
 * Publish what this layer OBSERVED in its data, so a scrubber for it can exist.
 *
 * For table-backed layers only. A lens-backed layer's extents are declared in
 * its fragment and derived by `DimSliderPanel` directly — publishing those from
 * a renderer would tie a fact that never changes to whether the renderer
 * mounted, and `LayerRenderer` culls layers by budget and remounts them on a
 * mode toggle. A parquet timeline has no such shortcut: it is unknowable until
 * the scan returns, so the renderer that read it is the only thing that can say.
 *
 * Pass `null` while the layer is hidden or has no timed column — a hidden layer
 * must not keep a slider alive. The entry clears on unmount, which is what makes
 * a removed layer's scrubber disappear with it.
 *
 * The store guards the write structurally, so re-publishing an unchanged extent
 * list on every geometry reload costs nothing (P17).
 */
export function usePublishDimExtents(layerId: string, extents: DimExtent[] | null): void {
  const publish = useSceneStore((s) => s.setLayerDimExtents);
  // The array is rebuilt by the caller on every render; the store compares it by
  // VALUE, so the effect may safely re-run — but keying the effect on a scalar
  // digest keeps it from firing at all in the common case.
  const digest = extents
    ? extents.map((e) => `${e.dim}:${e.maxIndex}:${e.defaultIndex}`).join("|")
    : "";

  useEffect(() => {
    publish(layerId, digest === "" ? null : (extents as DimExtent[]));
    return () => publish(layerId, null);
    // `digest` STANDS FOR `extents` — the value the store actually compares.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publish, layerId, digest]);
}
