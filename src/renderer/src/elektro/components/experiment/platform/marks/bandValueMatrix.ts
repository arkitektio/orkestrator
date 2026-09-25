import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type * as THREE from "three";
import { bindFields } from "@/core/lib/scene/stores/bindStore";
import { valueToY } from "../coords/rowMap";
import { effectiveClim, useViewerStoreApi } from "../stores/viewerStore";

/**
 * Bind an object's matrix to one row's VALUE map: geometry in
 * `(time − origin, value)`, placed by `y = scale · value + offset` for the band
 * `bandKey` names and its effective clim.
 *
 * The rule the trace lines follow (see `TraceLines`), shared with anything else
 * drawn in a trace's own units — the value shapes an annotation draws over a
 * row. A relayout or a clim change is one matrix write; nothing is rebuilt.
 *
 * Bound with a vanilla subscription on SCALARS (the band's identity, which the
 * store keeps stable across relayouts, and the clim's two numbers). Hidden until
 * the band and its clim exist, and whenever `enabled` is false (nothing to draw).
 */
export const useBandValueMatrix = (object: THREE.Object3D, key: string, enabled: boolean) => {
  const invalidate = useThree((s) => s.invalidate);
  const viewerApi = useViewerStoreApi();

  useEffect(() => {
    const apply = () => {
      const state = viewerApi.getState();
      const band = state.bands[key];
      const clim = band ? effectiveClim(state.clims, band) : null;
      // No band (not laid out) or no clim (no data seeded): draw nothing rather
      // than at a guessed scale that snaps on the first real window.
      if (!band || !clim || !enabled) {
        object.visible = false;
        invalidate();
        return;
      }
      const { scale, offset } = valueToY(band, clim);
      object.matrix.set(
        1, 0, 0, 0,
        0, scale, 0, offset,
        0, 0, 1, 0,
        0, 0, 0, 1,
      );
      object.matrixWorldNeedsUpdate = true;
      object.visible = true;
      invalidate();
    };

    return bindFields(
      viewerApi,
      [
        (s) => s.bands[key],
        (s) => {
          const band = s.bands[key];
          return band ? effectiveClim(s.clims, band)?.lo : undefined;
        },
        (s) => {
          const band = s.bands[key];
          return band ? effectiveClim(s.clims, band)?.hi : undefined;
        },
      ],
      apply,
    );
  }, [viewerApi, key, object, enabled, invalidate]);
};
