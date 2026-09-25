import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";

import { resolveProbeMarkerGeometry } from "../../platform/probe/probeWorld";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { bindAll } from "@/core/lib/scene/stores/bindStore";

/**
 * Binds the probe marker to the live probe WITHOUT re-rendering per move.
 *
 * `probedCoordinate` changes once per voxel crossing — while sweeping, once
 * per frame — so a React subscription to it re-ran `resolveProbeMarkerGeometry`
 * (a `layers.find`, an affine build, a matrix inverse, inside a try/catch) at
 * frame rate and reconciled the marker's subtree with it (P17). React here
 * subscribes to one SCALAR instead: WHICH marker should exist. That changes
 * only when the probe target does.
 *
 * Everything continuous is written straight onto the three.js objects from a
 * vanilla store subscription — the `PreviewLine` idiom. The camera-dependent
 * radius is not part of this at all; it stays in the caller's `useFrame`,
 * reading `minAxisRef`.
 *
 * Shared by the 2D and 3D markers, which differ only in their geometry, their
 * pixel radius and clamps, and 2D's z-lift off the image plane.
 */
export function useProbeMarkerBinding() {
  const viewerStoreApi = useViewerStoreApi();
  const sceneStoreApi = useSceneStoreApi();
  const invalidate = useThree((state) => state.invalidate);

  /**
   * Which marker should be mounted, or null for none. A scalar by design (the
   * P9c corollary) — a probe OBJECT selector would re-render on every crossing,
   * which is the whole thing this avoids.
   */
  const identity = useViewerStore((s) =>
    s.probedCoordinate ? `${s.probedCoordinate.layerId}:${s.probedCoordinate.strategy}` : null,
  );

  /** Carries the layer affine; the marker offset rides on the inner group. */
  const outerRef = useRef<THREE.Group | null>(null);
  /** Carries the marker offset and the screen-size scale. */
  const innerRef = useRef<THREE.Group | null>(null);
  /** Smallest physical extent of the probed volume — the radius clamp basis. */
  const minAxisRef = useRef(0);
  /** The marker's own z before the caller's lift (2D only; 0 otherwise). */
  const baseZRef = useRef(0);
  /** False until geometry resolves, so nothing draws at a stale position. */
  const visibleRef = useRef(false);

  useEffect(() => {
    const apply = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      const probe = viewerStoreApi.getState().probedCoordinate;
      const layer = probe
        ? sceneStoreApi.getState().layers.find((candidate) => candidate.id === probe.layerId)
        : null;
      const geometry =
        probe && layer && layer.visible !== false
          ? resolveProbeMarkerGeometry(
              layer,
              probe,
              viewerStoreApi.getState().getArrayForStoreId,
            )
          : null;

      if (!geometry) {
        if (visibleRef.current) {
          visibleRef.current = false;
          outer.visible = false;
          invalidate();
        }
        return;
      }

      outer.matrix.copy(geometry.affineMatrix);
      inner.position.set(...geometry.markerPosition);
      minAxisRef.current = geometry.minAxis;
      baseZRef.current = geometry.markerPosition[2];
      outer.visible = true;
      visibleRef.current = true;
      invalidate();
    };

    // Re-apply on ANY viewer-store change, not just the probe: the layer's
    // affine and the marker's slice come from the store too, and a probe that
    // has not moved still has to follow a layer that has. `bindAll` is the
    // deliberate blunt option here — a change test would read more of the
    // state than the apply does.
    return bindAll(viewerStoreApi, apply);
    // `identity` is a dep so the binding re-applies against the newly mounted
    // group refs when the target marker changes.
  }, [identity, viewerStoreApi, sceneStoreApi, invalidate]);

  return { identity, outerRef, innerRef, minAxisRef, baseZRef };
}
