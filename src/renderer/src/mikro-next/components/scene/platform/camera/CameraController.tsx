import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { useModeStore, useModeStoreApi } from "../stores/modeStore";
import { useViewerStore, useViewerStoreApi } from "../stores/viewerStore";
import { useSceneStoreApi } from "../stores/sceneStore";
import { useAnimationStore, useAnimationStoreApi } from "../stores/animationStore";
import { computeProbeWorldPosition } from "../probe/probeWorld";
import { repivotPreservingView, shouldRepivot } from "./orbitPivot";
import {
  contentDistanceAlongRay,
  orbitDepthAlongRay,
  resolvePanSpeed,
} from "./panScale";
import { gatherLayerWorldBoxes } from "../visibility/layerBoxes";
import { computeSceneWorldBox } from "./sceneFit";
import { useViewStoreApi } from "../stores/viewStore";

import { cameraInteraction } from "./cameraMotion";
import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";

/**
 * Button maps per (display mode × interaction mode).
 *
 * These must be module-level constants: R3F diffs object props by *reference*,
 * so an inline literal would re-apply on every commit. And every branch must
 * pass an explicit map — `mouseButtons={undefined}` is a latch, not a reset
 * (R3F's `applyProps` skips undefined values), so once a map is applied it
 * sticks for the life of the controls instance.
 *
 * In NAVIGATE, left-drag pans (OrbitControls' own default maps LEFT to rotate).
 * In the tool modes the left button belongs to the tool, so the controls must
 * not claim it — the maps simply omit LEFT, which three-stdlib's button switch
 * treats as no action at all (`STATE.NONE`). Right/middle-drag and the wheel
 * still navigate, which is what keeps a 2D probe session from being stuck in
 * place. Omitting LEFT is also the only assignment where shift-click (save
 * probe) and shift-drag (merge selection) can't be hijacked: three-stdlib swaps
 * PAN↔ROTATE when shift is held.
 */
const NAVIGATE_BUTTONS_3D = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
} as const;

const NAVIGATE_BUTTONS_2D = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
} as const;

const TOOL_BUTTONS_3D = {
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.ROTATE,
} as const;

const TOOL_BUTTONS_2D = {
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
} as const;

/**
 * Keeps the OrbitControls pivot on the probed point while "Orbit around probe"
 * is on. The geometry and the when-do-we-move rule live in `platform/camera/orbitPivot.ts`;
 * this is the store glue. Mounted inside the Canvas (needs `useThree`) and only
 * in 3D.
 */
const ProbeOrbitPivot = () => {
  const controls = useThree((s) => s.controls);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const pivotOnProbe = useModeStore((s) => s.pivotOnProbe);
  const probedCoordinate = useViewerStore((s) => s.probedCoordinate);
  const playingId = useAnimationStore((s) => s.playingId);
  const viewerApi = useViewerStoreApi();
  const sceneApi = useSceneStoreApi();
  const wasEnabledRef = useRef(false);

  useEffect(() => {
    // Turning the setting on pivots to whatever probe is current, even a
    // hover-origin one, so the switch has an immediate visible effect.
    const justEnabled = pivotOnProbe && !wasEnabledRef.current;
    wasEnabledRef.current = pivotOnProbe;

    if (
      !shouldRepivot({
        pivotOnProbe,
        probe: probedCoordinate,
        isAnimationPlaying: playingId !== null,
        justEnabled,
      })
    ) {
      return;
    }
    // `probedCoordinate` is non-null here — `shouldRepivot` returned true.
    const probe = probedCoordinate!;

    // Any controls without a `.target` are skipped.
    const ctrl =
      controls && "target" in controls
        ? (controls as unknown as { target: THREE.Vector3; update: () => void })
        : null;

    const { getArrayForStoreId } = viewerApi.getState();
    const layer = sceneApi.getState().layers.find((l) => l.id === probe.layerId);
    if (!layer) return;

    const world = computeProbeWorldPosition(layer, probe, getArrayForStoreId);
    if (!world) return;

    if (repivotPreservingView({ camera, controls: ctrl }, world)) invalidate();
    // `controls` is a dependency because a 2D↔3D switch remounts OrbitControls,
    // yielding a fresh object with the target back at the origin — the pivot has
    // to be re-applied then. Camera-setting changes no longer remount it.
  }, [
    pivotOnProbe,
    probedCoordinate,
    playingId,
    controls,
    camera,
    invalidate,
    viewerApi,
    sceneApi,
  ]);

  return null;
};

/**
 * Zoom-sensitive navigation (3D only — the orthographic pan already divides
 * by `camera.zoom`). OrbitControls scales pan AND dolly by the camera→target
 * distance, which both dolly and zoomToCursor collapse toward zero as you
 * zoom into a volume — pan and zoom freeze while the screen is still full of
 * voxels at real distances. Two mechanisms, both fed by the layer boxes along
 * the view ray (`platform/camera/panScale.ts`):
 *
 * - **Continuous** (every throttled camera emission, ≤16 Hz): keep
 *   `controls.panSpeed = contentDistance / targetDistance`, so a drag stays
 *   screen-space correct at the CONTENT even mid-gesture, whatever the orbit
 *   radius did.
 * - **On settle** (cameraMoving true→false edge): re-seat the orbit target
 *   ALONG THE VIEW RAY at the visible chord's midpoint
 *   (`orbitDepthAlongRay`). The camera does not move and keeps looking the
 *   same way — the view is pixel-identical — but the radius becomes the
 *   content depth, so three's OWN radius-proportional math makes dolly steps,
 *   pan scale and the rotate pivot zoom-sensitive natively. (Scaling
 *   `zoomSpeed` instead cannot work: dolly is multiplicative toward the
 *   target, so no speed factor lets a step escape a collapsed radius.)
 *
 * Skipped while "orbit around probe" or an animation owns the target/camera.
 * All outside React — no store writes, no re-renders. The box walk mirrors
 * `platform/visibility/visibility.ts` (`Box3.setFromObject` per layer trackable), which
 * already runs per rAF; this runs strictly less often.
 */
const PanScaleSync = () => {
  const controls = useThree((s) => s.controls);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const viewApi = useViewStoreApi();
  const viewerApi = useViewerStoreApi();
  const animationApi = useAnimationStoreApi();
  const modeApi = useModeStoreApi();

  useEffect(() => {
    const ctrl =
      controls && "target" in controls
        ? (controls as unknown as {
            target: THREE.Vector3;
            panSpeed: number;
            update: () => void;
            minDistance?: number;
            maxDistance?: number;
            mouseButtons?: Record<string, number | undefined>;
          })
        : null;
    const perspective = camera as THREE.PerspectiveCamera;
    if (!ctrl || !perspective?.isPerspectiveCamera) return;

    const viewDirection = new THREE.Vector3();
    const boxes: THREE.Box3[] = []; // pooled — grown once, reused per gather

    // Layer boxes are WORLD-space and camera-independent, so they are
    // gathered on mount and per retarget (settle / gesture start) — not per
    // camera emission: the setFromObject subtree walks were running at
    // ~17 Hz per layer during a gesture for values that cannot change
    // mid-gesture.
    const gatherBoxes = () => gatherLayerWorldBoxes(viewerApi.getState().trackables, boxes);

    const applyPanSpeed = () => {
      const targetDistance = perspective.position.distanceTo(ctrl.target);
      perspective.getWorldDirection(viewDirection);
      const contentDistance = contentDistanceAlongRay(
        perspective.position,
        viewDirection,
        boxes,
        targetDistance,
      );
      const next = resolvePanSpeed(contentDistance, targetDistance);
      // Write only on real change: panSpeed is read by the NEXT drag delta,
      // so a 1% dead band avoids churning the property mid-gesture for noise.
      if (Math.abs(next - ctrl.panSpeed) > 0.01 * Math.max(ctrl.panSpeed, 1e-6)) {
        ctrl.panSpeed = next;
      }
    };

    const retarget = () => {
      // The probe pivot owns the target and the animation player owns the
      // whole camera — never fight either.
      if (modeApi.getState().pivotOnProbe) return;
      if (animationApi.getState().playingId !== null) return;

      gatherBoxes();
      const targetDistance = perspective.position.distanceTo(ctrl.target);
      perspective.getWorldDirection(viewDirection);
      let depth = orbitDepthAlongRay(
        perspective.position,
        viewDirection,
        boxes,
        targetDistance,
      );
      // Respect the controls' own distance limits: a target seated past
      // maxDistance would make the next update() clamp the RADIUS by moving
      // the camera — a visible jump on what must be a view-preserving slide.
      depth = Math.min(
        Math.max(depth, ctrl.minDistance ?? 0),
        ctrl.maxDistance ?? Number.POSITIVE_INFINITY,
      );
      // 5% dead band: a settle right after a settle-retarget must be a no-op.
      if (!(depth > 0) || Math.abs(depth - targetDistance) <= 0.05 * targetDistance) return;
      ctrl.target.copy(perspective.position).addScaledVector(viewDirection, depth);
      // Camera position and look direction are unchanged (the target moved
      // along the view ray), so update() emits no camera change — no
      // emission loop, no visual change, no invalidate needed.
      ctrl.update();
      applyPanSpeed(); // radius just became the content depth → ratio ≈ 1
    };

    // Gesture-START retarget: rotating right after a zoom otherwise orbits
    // the collapsed radius until the first settle. A DOM pointerdown — NOT
    // the controls' "start" event, which three-stdlib fires on EVERY wheel
    // tick and whose zoomToCursor branch seats the target itself; hooking it
    // would re-base each wheel step onto the content depth and change zoom
    // semantics. The retarget is view-preserving, so running it for any
    // mapped button is safe: PAN is neutral (applyPanSpeed keeps
    // panSpeed·targetDistance pinned to the content distance), DOLLY-drag
    // becomes content-proportional like the settled state, ROTATE is the
    // point. Wheel has no pointerdown; touch is out of scope (desktop app).
    const onPointerDown = (event: PointerEvent) => {
      const buttonAction =
        event.button === 0
          ? ctrl.mouseButtons?.LEFT
          : event.button === 1
            ? ctrl.mouseButtons?.MIDDLE
            : event.button === 2
              ? ctrl.mouseButtons?.RIGHT
              : undefined;
      if (buttonAction === undefined || buttonAction === null) return;
      retarget();
    };
    gl.domElement.addEventListener("pointerdown", onPointerDown);

    gatherBoxes();
    applyPanSpeed();
    retarget();
    let lastMatrix = viewApi.getState().viewProjectionMatrix;
    let lastMoving = viewApi.getState().cameraMoving;
    const unsubscribe = viewApi.subscribe((state) => {
      if (state.viewProjectionMatrix !== lastMatrix) {
        lastMatrix = state.viewProjectionMatrix;
        applyPanSpeed();
      }
      if (state.cameraMoving !== lastMoving) {
        lastMoving = state.cameraMoving;
        if (!lastMoving) retarget();
      }
    });
    return () => {
      unsubscribe();
      gl.domElement.removeEventListener("pointerdown", onPointerDown);
      // Leave stock behavior behind for the next controls consumer.
      ctrl.panSpeed = 1;
    };
  }, [controls, camera, gl, viewApi, viewerApi, animationApi, modeApi]);

  return null;
};

export const CameraController = () => {
  const interactionMode = useModeStore((s) => s.interactionMode);
  const designTool = useModeStore((s) => s.designTool);
  const displayMode = useModeStore((s) => s.displayMode);
  const zoomToCursor = useModeStore((s) => s.zoomToCursor);
  const smoothOrbit = useModeStore((s) => s.smoothOrbit);

  // `onEnd` never fires for controls that unmount mid-drag — a 2D↔3D switch
  // remounts them (the key carries the display mode), and a stuck `interacting`
  // would pin `cameraMoving` true, holding the scene at half resolution with
  // nothing moving. Keyed on displayMode so the remount clears it too (the
  // wheel hold along with it).
  useEffect(() => cameraInteraction.reset, [displayMode]);

  // The wheel is the one gesture the controls cannot report as a gesture:
  // three-stdlib's `onMouseWheel` dispatches `start` → dolly → `end`
  // synchronously per event, so `onStart`/`onEnd` below latch nothing for a
  // zoom and `cameraMoving` was left to the per-frame matrix delta, which a
  // trackpad tick straddles (flicker → target reallocs, settle-refine resets,
  // retargets and replans per tick). A DOM listener, not the controls' `start`
  // event, because only the DOM can tell a wheel from a drag. Passive: it
  // never prevents default; the controls own the event. Both display modes.
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const element = gl.domElement;
    const onWheel = () => cameraInteraction.wheel(performance.now());
    element.addEventListener("wheel", onWheel, { passive: true });
    return () => element.removeEventListener("wheel", onWheel);
  }, [gl]);
  const frustumNear = useViewerStore((s) => s.frustumNear);
  const frustumFar = useViewerStore((s) => s.frustumFar);
  const sceneApi = useSceneStoreApi();

  // Orbit-distance limits from the metadata scene box, derived ONCE per store
  // scope (same precedent and rationale as InitialCameraFit's box memo: layer
  // reconciliation must not re-derive camera facts — and the 10× / 1e-4
  // headroom means a late-arriving layer cannot make these bite). They cap
  // plain dolly, keyboard zoom AND three's zoomToCursor radius (clampDistance
  // covers all three), so extreme cursor-zooms stop collapsing the orbit
  // radius toward zero. Explicit 0/Infinity fallbacks — never undefined, which
  // R3F's applyProps would latch (see the mouseButtons note above). 3D only:
  // the ortho camera has no radius pathology (pan divides by zoom).
  const { minDistance, maxDistance } = useMemo(() => {
    const box = computeSceneWorldBox(sceneApi.getState().layers);
    if (!box) return { minDistance: 0, maxDistance: Number.POSITIVE_INFINITY };
    const diagonal = box.getSize(new THREE.Vector3()).length();
    if (!(diagonal > 0)) return { minDistance: 0, maxDistance: Number.POSITIVE_INFINITY };
    return {
      minDistance: Math.max(diagonal * 1e-4, frustumNear * 2),
      maxDistance: diagonal * 10,
    };
  }, [sceneApi, frustumNear]);

  // Pan and rotate stay *enabled* in every mode; the button map alone decides
  // what a drag does. Disabling them was only ever a blunt way of neutering the
  // left button, and it left tool modes with no way to move the view at all.
  // DESIGN navigates like NAVIGATE — the left button is the camera's — until
  // a brush key (C/V/X) is held, when it hands the left button to the stroke.
  const isNavigate =
    interactionMode === "NAVIGATE" || (interactionMode === "DESIGN" && designTool === null);

  return (
    <>
      {/* Camera Rig */}
      {displayMode === "3D" ? (
        <PerspectiveCamera
          key="perspective-camera"
          makeDefault
          position={[0, -200, 200]}
          fov={45}
          up={[0, 0, 1]}
          near={frustumNear}
          far={frustumFar}
        />
      ) : (
        <OrthographicCamera
          key="orthographic-camera"
          makeDefault
          zoom={5}
          position={[0, 0, 50000]}
          up={[0, 1, 0]}
          near={frustumNear}
          far={frustumFar}
        />
      )}

      {/* Orbit Controls. The key deliberately carries only the display mode:
            camera settings are live props now, so toggling one no longer
            remounts the controls (which used to reset the orbit target to the
            origin, breaking the probe pivot the moment you enabled it).

            `enableDamping` is the user's "Smooth camera" setting, DEFAULT OFF
            — drei defaults it to true. Even with the coast no longer charged as
            camera MOTION (`cameraMotion.ts` measures a RELATIVE per-frame
            change, so the tail settles at full quality), it still pays
            full-resolution renders and visibility/replan work for the length of
            the decay. `onStart`/`onEnd` publish the gesture itself, so a drag
            that pauses still counts as motion even when the mouse is held
            still. */}
      {displayMode === "3D" ? (
        <OrbitControls
          key="orbit-controls-3d"
          makeDefault
          enableDamping={smoothOrbit}
          onStart={cameraInteraction.begin}
          onEnd={cameraInteraction.end}
          enableRotate={true}
          enablePan={true}
          enableZoom={true}
          zoomToCursor={zoomToCursor}
          minDistance={minDistance}
          maxDistance={maxDistance}
          mouseButtons={isNavigate ? NAVIGATE_BUTTONS_3D : TOOL_BUTTONS_3D}
        />
      ) : (
        <OrbitControls
          key="orbit-controls-2d"
          makeDefault
          enableDamping={smoothOrbit}
          onStart={cameraInteraction.begin}
          onEnd={cameraInteraction.end}
          enableRotate={false}
          enablePan={true}
          enableZoom={true}
          screenSpacePanning={true}
          mouseButtons={isNavigate ? NAVIGATE_BUTTONS_2D : TOOL_BUTTONS_2D}
        />
      )}

      {displayMode === "3D" && <ProbeOrbitPivot />}
      {displayMode === "3D" && <PanScaleSync />}
    </>
  );
};
