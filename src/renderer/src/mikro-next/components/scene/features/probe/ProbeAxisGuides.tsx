import { useEffect, useMemo, useRef } from "react";
import { EXCLUDE_FROM_CAPTURE } from "../../platform/visibility/captureVisibility";
import { computeSceneWorldBox } from "../../platform/camera/sceneFit";
import { layersPlanKey } from "../../platform/model/layerPlanKey";
import { useModeStore } from "../../platform/stores/modeStore";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import { PreviewLine, type PreviewLineHandle } from "../../platform/draw/PreviewLine";
import { bindAll } from "@/lib/scene/stores/bindStore";

/**
 * Three axis-aligned guide lines through the probed point, spanning the scene
 * extent — the "where in the coordinate system am I" answer for a point
 * floating inside a volume. Shown whenever a probe exists in PROBE or
 * ANNOTATE mode (3D annotating is probe-derived, so the guides double as the
 * anchor preview).
 *
 * X/Y reuse the origin crosshair's colors (`SceneAxis`); Z completes the
 * RGB=XYZ convention. Rendering follows the PreviewLine idiom: three
 * mount-styled Line2s whose buffers are rewritten at probe cadence — the
 * probe stream is already voxel-deduped and rAF-coalesced upstream, the same
 * cadence `SceneProbedPoint` rides.
 */

const X_COLOR = "#ef4444";
const Y_COLOR = "#22c55e";
const Z_COLOR = "#3b82f6";

/** Guides overshoot the scene box slightly so they read as axes, not edges. */
const padOf = (min: number, max: number) => (max - min) * 0.05 + 1e-3;

export const ProbeAxisGuides = () => {
  perfMonitor.countRender("ProbeAxisGuides"); // no-op unless a perf recording is armed
  const interactionMode = useModeStore((s) => s.interactionMode);
  const sceneStoreApi = useSceneStoreApi();
  // A SCALAR key, not the array (P9c/P17): `computeSceneWorldBox` reads only
  // fields `layerPlanSignature` captures (axis mapping, lens shape, affine),
  // so a contrast drag's per-tick layer replacement must not refit the box.
  const layersKey = useSceneStore((s) => layersPlanKey(s.layers));
  const viewerStoreApi = useViewerStoreApi();

  const xRef = useRef<PreviewLineHandle | null>(null);
  const yRef = useRef<PreviewLineHandle | null>(null);
  const zRef = useRef<PreviewLineHandle | null>(null);
  /** The point the buffers currently describe, for the value dedupe below. */
  const drawnRef = useRef<readonly [number, number, number] | null>(null);

  // The scene's three-space extent — the same box the initial camera fit
  // frames. The plan key only changes on real structural edits, so this is cold.
  const box = useMemo(
    () => computeSceneWorldBox(sceneStoreApi.getState().layers),
    // The key STANDS FOR the layers array read via getState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layersKey, sceneStoreApi],
  );

  const guidesApply =
    interactionMode === "PROBE" || interactionMode === "ANNOTATE";

  // A VANILLA subscription, not a `probedCoordinate` selector: the probe
  // changes once per voxel crossing (≈ per frame while sweeping) and this
  // component must not re-render at that cadence (P17). React here only tracks
  // the mode and the scene box, both cold.
  useEffect(() => {
    const clear = () => {
      if (drawnRef.current === null) return;
      drawnRef.current = null;
      xRef.current?.clear();
      yRef.current?.clear();
      zRef.current?.clear();
    };

    const apply = () => {
      const worldPos = guidesApply
        ? viewerStoreApi.getState().probedCoordinate?.worldPos
        : null;
      if (!worldPos || !box) {
        clear();
        return;
      }
      const [px, py, pz] = worldPos;
      // Compare by VALUE: the probe object is replaced on every publish (and
      // again on an exact-value upgrade) while the POINT often has not moved,
      // and rewriting three Line2 buffers for that is pure waste.
      const drawn = drawnRef.current;
      if (drawn && drawn[0] === px && drawn[1] === py && drawn[2] === pz) return;
      drawnRef.current = [px, py, pz];

      const padX = padOf(box.min.x, box.max.x);
      const padY = padOf(box.min.y, box.max.y);
      const padZ = padOf(box.min.z, box.max.z);
      xRef.current?.setPoints([
        [box.min.x - padX, py, pz],
        [box.max.x + padX, py, pz],
      ]);
      yRef.current?.setPoints([
        [px, box.min.y - padY, pz],
        [px, box.max.y + padY, pz],
      ]);
      zRef.current?.setPoints([
        [px, py, box.min.z - padZ],
        [px, py, box.max.z + padZ],
      ]);
    };

    // Any viewer-store change can move a guide: see `useProbeMarkerBinding`.
    return bindAll(viewerStoreApi, apply);
  }, [guidesApply, box, viewerStoreApi]);

  return (
    // Furniture: never baked into screenshots or animation captures.
    <group userData={{ [EXCLUDE_FROM_CAPTURE]: true }}>
      <PreviewLine ref={xRef} color={X_COLOR} lineWidth={1} renderOrder={8} />
      <PreviewLine ref={yRef} color={Y_COLOR} lineWidth={1} renderOrder={8} />
      <PreviewLine ref={zRef} color={Z_COLOR} lineWidth={1} renderOrder={8} />
    </group>
  );
};
