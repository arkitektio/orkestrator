import { useFrame } from "@react-three/fiber";
import { useViewStore } from "../stores/viewStore";
import * as THREE from "three";
import { useRef, useEffect } from "react";
import { cameraInteraction, isCameraMoving, matrixRelativeDelta } from "./cameraMotion";

interface CameraMatrixSyncProps {
  /** Max cadence (ms) at which camera data is pushed DURING continuous motion. */
  throttleMs?: number;
  /** Trailing delay (ms) for the final push once the camera settles. */
  settleMs?: number;
  threshold?: number;
}

export const CameraMatrixSync = ({
  throttleMs = 60,
  settleMs = 150,
  threshold = 0.00001
}: CameraMatrixSyncProps) => {
  const updateCameraData = useViewStore((s) => s.updateCameraData);

  const matrixRef = useRef(new THREE.Matrix4());
  const previousFrameMatrix = useRef(new THREE.Matrix4());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitRef = useRef(0);
  // Last-seen projection inputs (NaN-initialized so the first frame always
  // updates). Order matches writes in the frame callback below.
  const projSigRef = useRef<Float64Array>(new Float64Array(14).fill(Number.NaN));
  const projSigScratch = useRef<Float64Array>(new Float64Array(14));
  // Latest changed-frame state, recorded IN PLACE (no allocation) every
  // changed frame; snapshots for the store are built only at EMISSION time
  // (≤ ~17/s leading + 1 settle), not per frame. The previous code allocated
  // a Matrix4 clone + size + pose + world position on every moving frame
  // (~360 objects/s) and cleared+set the settle timer per frame — the exact
  // anti-pattern CanvasSync documents having fixed on its own path.
  const pendingSize = useRef({ width: 0, height: 0 });
  const pendingPosition = useRef(new THREE.Vector3());
  const pendingPerspective = useRef(false);
  const pendingFovY = useRef(0);
  const pendingCoordinateSystem = useRef<number>(THREE.WebGLCoordinateSystem);
  const lastChangeAtRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useFrame(({ camera, size }) => {
    // 1. CRITICAL: keep the projection matrix in sync with Zoom/FOV changes —
    // but only RECOMPUTE it when a projection input actually changed. During
    // multi-second streaming bursts the demand loop renders at full cadence
    // with a stationary camera; an unconditional updateProjectionMatrix()
    // every frame is pure waste. The signature must cover EVERY input
    // updateProjectionMatrix reads (zoom changes were silently missed once
    // before) — perspective: fov/aspect/near/far/zoom/film*; ortho:
    // left/right/top/bottom/near/far/zoom — plus canvas size and view-offset
    // enablement.
    const cam = camera as THREE.PerspectiveCamera & THREE.OrthographicCamera;
    const sig = projSigScratch.current;
    sig[0] = cam.zoom ?? 0;
    sig[1] = cam.near ?? 0;
    sig[2] = cam.far ?? 0;
    sig[3] = cam.fov ?? 0;
    sig[4] = cam.aspect ?? 0;
    sig[5] = cam.left ?? 0;
    sig[6] = cam.right ?? 0;
    sig[7] = cam.top ?? 0;
    sig[8] = cam.bottom ?? 0;
    sig[9] = cam.filmGauge ?? 0;
    sig[10] = cam.filmOffset ?? 0;
    sig[11] = cam.view && cam.view.enabled ? 1 : 0;
    sig[12] = size.width;
    sig[13] = size.height;
    const prevSig = projSigRef.current;
    let projectionDirty = false;
    for (let i = 0; i < sig.length; i++) {
      if (sig[i] !== prevSig[i]) {
        projectionDirty = true;
        break;
      }
    }
    if (projectionDirty) {
      camera.updateProjectionMatrix();
      prevSig.set(sig);
    }

    // 2. Calculate the combined View-Projection Matrix
    matrixRef.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );

    // 3. Movement/Zoom check. The viewport SIZE is a dirty input in its own
    // right: an aspect-preserving resize of a perspective camera changes no
    // element of the VP matrix, yet every px-per-viewport-height consumer
    // (`viewRange.scale`, the planner's pxPerVoxelAtUnitDistance) depends on
    // the height — without this the store served a stale viewportSize until
    // the camera next moved.
    const sizeChanged =
      size.width !== pendingSize.current.width ||
      size.height !== pendingSize.current.height;
    let hasChanged = sizeChanged;
    const cur = matrixRef.current.elements;
    const prev = previousFrameMatrix.current.elements;

    for (let i = 0; !hasChanged && i < 16; i++) {
      if (Math.abs(cur[i] - prev[i]) > threshold) {
        hasChanged = true;
      }
    }

    // Separate question from `hasChanged`, and a RELATIVE one — see
    // cameraMotion.ts. `hasChanged` decides whether to PUBLISH (correctness
    // work must follow the camera to rest); this decides whether the frame is
    // cheap-quality. A damped coast keeps changing the matrix long after the
    // gesture, and treating that as motion held the whole scene at half
    // resolution until it stopped.
    // Wall clock, NOT r3f's `clock` — see the note above the settle timer.
    const nowMs = performance.now();
    const moving = isCameraMoving(
      cameraInteraction.isInteracting(nowMs),
      sizeChanged ? Number.POSITIVE_INFINITY : matrixRelativeDelta(cur, prev),
    );

    // 4. If nothing changed, we exit early to save CPU
    if (!hasChanged) return;

    // 5. Update previous state for next frame check
    previousFrameMatrix.current.copy(matrixRef.current);

    // Record the state of this changed frame IN PLACE — allocation-free.
    // Snapshots are minted only when an emission actually happens.
    pendingSize.current.width = size.width;
    pendingSize.current.height = size.height;
    camera.getWorldPosition(pendingPosition.current);
    const perspective = (camera as THREE.PerspectiveCamera).isPerspectiveCamera === true;
    pendingPerspective.current = perspective;
    pendingFovY.current = perspective
      ? THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov)
      : 0;
    // The renderer stamps its convention onto cameras it renders; under the
    // WebGPU-only backend this is WebGPUCoordinateSystem (NDC z ∈ [0,1]).
    pendingCoordinateSystem.current = camera.coordinateSystem;

    // Fresh objects per EMISSION: viewStore consumers key on identity, so the
    // matrix/size/pose must be new objects each time they are published.
    const emit = (moving: boolean) => {
      const position = pendingPosition.current;
      updateCameraData(
        matrixRef.current.clone(),
        { width: pendingSize.current.width, height: pendingSize.current.height },
        {
          position: [position.x, position.y, position.z] as [number, number, number],
          isPerspective: pendingPerspective.current,
          fovY: pendingFovY.current,
          coordinateSystem: pendingCoordinateSystem.current,
        },
        moving,
      );
    };

    // Wall clock, NOT r3f's `clock`: setFrameloop() resets clock.elapsedTime to
    // 0 (PerfFrameProbe flips the loop to "always" when a recording is armed),
    // while lastEmitRef keeps the pre-reset value. On any canvas that has been
    // open more than a moment that leaves nowMs far behind lastEmitRef, and the
    // leading emission below is suppressed for the whole recording — which is
    // exactly how a report of continuous panning came back with almost no
    // replans. The trailing settle already uses wall time (setTimeout).
    lastChangeAtRef.current = nowMs;

    // 6a. Trailing settle: guarantees a final, crisp update once the camera
    // comes to rest (the last motion frame may fall inside the throttle gap).
    // Armed ONCE per motion window and self-re-arming until the camera has
    // been quiet for settleMs — NOT cleared+set per frame (timer-heap churn).
    if (timeoutRef.current === null) {
      const armSettle = (delayMs: number) => {
        timeoutRef.current = setTimeout(() => {
          const now = performance.now();
          const quietForMs = now - lastChangeAtRef.current;
          if (quietForMs < settleMs) {
            armSettle(settleMs - quietForMs);
            return;
          }
          // Quiet matrix, but the user is still driving: a wheel hold (the
          // matrix is still between trackpad ticks) or a paused drag. Publishing
          // `false` here would flip cameraMoving mid-gesture — exactly the
          // flicker the hold exists to prevent — so wait the hold out instead.
          // A drag's `end` produces no matrix change of its own, so poll at the
          // settle cadence until it lets go.
          if (cameraInteraction.isInteracting(now)) {
            armSettle(Math.max(settleMs, cameraInteraction.holdRemainingMs(now)));
            return;
          }
          timeoutRef.current = null;
          emit(false); // settled — matrixRef/pending hold the last change
        }, delayMs);
      };
      armSettle(settleMs);
    }

    // 6b. Leading throttle: push DURING continuous motion at a bounded cadence
    // so panning retriggers the (linked) visibility + chunk-planning pipeline
    // live, instead of only after the camera stops.
    if (nowMs - lastEmitRef.current >= throttleMs) {
      lastEmitRef.current = nowMs;
      emit(moving); // false while a damped coast decays to rest
    }
  });

  return null;
};
