import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { effectiveProbeLayerId } from "../../../../../platform/probe/probeTargeting";
import { useBrushSkeleton } from "./useBrushSkeleton";
import { smoothSoupNormals } from "../../meshes/soupNormals";
import { PreviewLine, type PreviewLineHandle } from "../../../../../platform/draw/PreviewLine";
import { useBrushSkeletonStore, useBrushSkeletonStoreApi } from "../../brushSkeletonStore";
import { useModeStore } from "../../../../../platform/stores/modeStore";
import { useRoiDrawingStore } from "../../../roiDrawingStore";
import { useSceneStoreApi } from "../../../../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../../../../platform/stores/viewerStore";

/**
 * The skeleton brush's in-canvas session: everything around the stroke that
 * is not the capture itself (that lives in `BrickVolumeLayer`'s pointer
 * handlers, next to the probe march it reuses).
 *
 * - Suspends OrbitControls for the stroke's duration — a paint drag must not
 *   orbit. Subscribed OUTSIDE React (vanilla zustand), so the suspend lands
 *   synchronously with `beginStroke`, before the controls see a move.
 * - Triggers extraction on the painting → extracting transition.
 * - Draws the stroke and the candidate centerline through `PreviewLine`
 *   handles at pointer cadence, no React re-render per sample (P17).
 * - Escape cancels; disarming the tool cancels; unmount restores controls.
 */

/** OrbitControls surface this component needs — same idiom as KeyboardSceneNavigation. */
type SuspendableControls = { enabled: boolean };

/** Floor between live re-mesh STARTS. The GPU round itself is a few ms; this
 * mostly paces the readback→geometry-rebuild churn on the main thread. */
const LIVE_TUBE_INTERVAL_MS = 140;

export const BrushStrokeSession = () => {
  const controls = useThree((s) => s.controls);
  const brushApi = useBrushSkeletonStoreApi();
  const sceneStoreApi = useSceneStoreApi();
  const viewerStoreApi = useViewerStoreApi();
  const { initRadiusForLayer, extract, previewLiveTube } = useBrushSkeleton();

  const interactionMode = useModeStore((s) => s.interactionMode);
  const activeTool = useRoiDrawingStore((s) => s.activeTool);
  // ANNOTATE and DESIGN share the gesture; only the verdict differs
  // (`useBrushSkeleton.save`).
  const armed =
    (interactionMode === "ANNOTATE" || interactionMode === "DESIGN") &&
    (activeTool === "BRUSH" || activeTool === "BLOB");
  // Gesture-cadence facts, fine to select on: which phase drives extraction
  // and whether a candidate line should be shown. `liveTube` moves at the
  // preview THROTTLE (~7 Hz), not pointer cadence — the re-render it costs
  // is the geometry rebuild it exists for.
  const status = useBrushSkeletonStore((s) => s.status);
  const candidate = useBrushSkeletonStore((s) => s.candidate);
  const liveTube = useBrushSkeletonStore((s) => s.liveTube);

  const strokeRef = useRef<PreviewLineHandle | null>(null);
  const candidateRef = useRef<PreviewLineHandle | null>(null);

  // Controls suspension — synchronous with the store write (see above).
  useEffect(() => {
    const ctrl =
      controls && "enabled" in controls
        ? (controls as unknown as SuspendableControls)
        : null;
    if (!ctrl) return;
    const apply = (painting: boolean) => {
      ctrl.enabled = !painting;
    };
    apply(brushApi.getState().status === "painting");
    const unsubscribe = brushApi.subscribe((state, previous) => {
      if ((state.status === "painting") !== (previous.status === "painting")) {
        apply(state.status === "painting");
      }
    });
    return () => {
      unsubscribe();
      // Whatever happens to this component, the camera must come back.
      ctrl.enabled = true;
    };
  }, [controls, brushApi]);

  // The stroke polyline, painted imperatively per kept sample.
  useEffect(() => {
    const paint = () => {
      const { stroke, status: phase } = brushApi.getState();
      if (phase !== "painting" || stroke.length < 2) {
        strokeRef.current?.clear();
        return;
      }
      strokeRef.current?.setPoints(
        // Readonly-in, readonly-out: setPoints only reads, the cast is safe.
        stroke.map((s) => s.world as [number, number, number]),
      );
    };
    paint();
    return brushApi.subscribe((state, previous) => {
      if (
        state.strokeVersion !== previous.strokeVersion ||
        state.status !== previous.status
      ) {
        paint();
      }
    });
  }, [brushApi]);

  // The tube surface preview — the final candidate's tube when it exists,
  // else the live one from the drag.
  const tubeGeometry = useMemo(() => {
    const tube = candidate?.tube ?? liveTube;
    if (!tube || tube.positions.length === 0) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(tube.positions, 3));
    // Smooth normals on the soup, without welding it: corners that share a
    // position share a normal, so the preview reads like the surface the
    // design will keep — not like its triangles.
    geometry.setAttribute("normal", new THREE.BufferAttribute(smoothSoupNormals(tube.positions), 3));
    return geometry;
  }, [candidate, liveTube]);
  useEffect(() => () => tubeGeometry?.dispose(), [tubeGeometry]);

  // The live re-mesh loop: while painting with the tube on, re-extract the
  // surface around the stroke-so-far — throttled, never more than one in
  // flight, and re-armed by new samples or a slider move mid-stroke.
  useEffect(() => {
    if (!armed) return;
    let cancelled = false;
    let inFlight = false;
    let dirty = false;
    let lastStart = 0;
    let timer: number | undefined;

    const run = () => {
      inFlight = true;
      dirty = false;
      lastStart = performance.now();
      void previewLiveTube().finally(() => {
        inFlight = false;
        if (!cancelled && dirty) kick();
      });
    };
    const kick = () => {
      if (cancelled) return;
      if (inFlight) {
        dirty = true;
        return;
      }
      const wait = Math.max(0, LIVE_TUBE_INTERVAL_MS - (performance.now() - lastStart));
      if (wait === 0) {
        run();
      } else {
        window.clearTimeout(timer);
        timer = window.setTimeout(run, wait);
      }
    };

    const unsubscribe = brushApi.subscribe((state, previous) => {
      if (state.status !== "painting" || !(state.tubeEnabled || interactionMode === "DESIGN")) return;
      if (
        state.strokeVersion !== previous.strokeVersion ||
        state.tubeEnabled !== previous.tubeEnabled ||
        state.tubeThreshold !== previous.tubeThreshold ||
        state.radiusWorld !== previous.radiusWorld ||
        state.status !== previous.status
      ) {
        kick();
      }
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [armed, brushApi, previewLiveTube, interactionMode]);

  // The candidate centerline — click cadence, so plain React is fine.
  useEffect(() => {
    if (candidate && (status === "preview" || status === "saving")) {
      candidateRef.current?.setPoints(
        candidate.points.map((p) => p as [number, number, number]),
      );
    } else {
      candidateRef.current?.clear();
    }
  }, [candidate, status]);

  // Arming fills the blank radius from the probe target's own scale.
  useEffect(() => {
    if (!armed) return;
    const layerId = effectiveProbeLayerId(
      viewerStoreApi.getState().probeLayerId,
      sceneStoreApi.getState().layers,
    );
    if (layerId) initRadiusForLayer(layerId);
  }, [armed, initRadiusForLayer, sceneStoreApi, viewerStoreApi]);

  // The handover: pointer-up moved the store to "extracting"; run it.
  useEffect(() => {
    if (status === "extracting") void extract();
  }, [status, extract]);

  // Disarming the tool mid-session cancels it; Escape cancels while armed.
  useEffect(() => {
    if (!armed) {
      if (brushApi.getState().status !== "idle") brushApi.getState().clear();
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (brushApi.getState().status === "idle") return;
      event.stopPropagation();
      brushApi.getState().clear();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [armed, brushApi]);

  return (
    <>
      {/* The raw stroke: dashed, the color of a work-in-progress. */}
      <PreviewLine ref={strokeRef} color="#f59e0b" lineWidth={2} dashed capacity={512} />
      {/* The extracted centerline awaiting a verdict. */}
      <PreviewLine ref={candidateRef} color="#34d399" lineWidth={3} capacity={1024} />
      {/* The tube surface preview: translucent, NO handler props (P20 — it
          must never join the pointermove raycast set). Shown while PAINTING
          too — that is the live re-mesh. */}
      {tubeGeometry &&
        (status === "painting" ||
          status === "extracting" ||
          status === "preview" ||
          status === "saving") && (
        <mesh geometry={tubeGeometry} renderOrder={9} frustumCulled={false}>
          {/* depthTest OFF, like PreviewLine: the volume box spans real depth
              and would otherwise swallow a surface INSIDE the data. */}
          <meshStandardMaterial
            color="#34d399"
            transparent
            opacity={0.35}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </>
  );
};
