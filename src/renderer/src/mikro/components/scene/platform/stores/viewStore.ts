import { createStore } from "zustand/vanilla";
import * as THREE from "three";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";

/** Camera facts the matrix alone cannot provide (perspective LOD math). */
export interface CameraPose {
  /** Camera world position. */
  position: [number, number, number];
  isPerspective: boolean;
  /** Vertical field of view in radians; 0 for orthographic cameras. */
  fovY: number;
  /** `camera.coordinateSystem` at emission — decides the NDC z convention
   * ([-1,1] WebGL, [0,1] WebGPU) for frustum-plane extraction and NDC-corner
   * unprojection. Production is WebGPU-only (§5); tests build WebGL cameras.
   * Absent (older fixtures) means WebGL. */
  coordinateSystem?: number;
}

export interface ViewState {
  // We store the combined projection + view matrix
  viewProjectionMatrix: THREE.Matrix4 | null;
  viewportSize: { width: number; height: number };
  cameraPose: CameraPose | null;
  /** True while the camera is in continuous motion (throttled emissions);
   * false once the trailing settle emission lands. Render-quality scaling. */
  cameraMoving: boolean;
  /**
   * True while a NON-CAMERA live edit is in flight — a contrast-window drag,
   * a gamma nudge: anything that rewrites uniforms per tick. The quality
   * consumers OR it with `cameraMoving`, so a slider drag renders degraded
   * and refines on release exactly as an orbit does.
   */
  interacting: boolean;
  /**
   * Trailing pulse, mirroring `cameraMoving`'s settle semantics: each call
   * (re)arms a timer, and `interacting` falls false `ttlMs` after the LAST
   * one. Called per preview tick by the live-edit writers — no drag start/end
   * plumbing needed, and a stuck-true state is impossible.
   */
  markInteraction: (ttlMs?: number) => void;

  updateCameraData: (
    matrix: THREE.Matrix4,
    size: { width: number; height: number },
    pose?: CameraPose,
    moving?: boolean,
  ) => void;
}

const samePose = (a: CameraPose | null, b: CameraPose | null): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.isPerspective === b.isPerspective &&
    a.fovY === b.fovY &&
    a.coordinateSystem === b.coordinateSystem &&
    a.position[0] === b.position[0] &&
    a.position[1] === b.position[1] &&
    a.position[2] === b.position[2]);

export const createViewStore = () => {
  // Closure-held, not state: the timer is bookkeeping, and putting it in the
  // store would make every re-arm a subscriber notification.
  let interactionTimer: ReturnType<typeof setTimeout> | null = null;

  return createStore<ViewState>((set, get) => ({
    viewProjectionMatrix: null,
    viewportSize: { width: 0, height: 0 },
    cameraPose: null,
    cameraMoving: false,
    interacting: false,

    markInteraction: (ttlMs = 250) => {
      // Write-if-changed: during a drag only the FIRST tick notifies
      // subscribers; the rest merely push the falling edge out.
      if (!get().interacting) set({ interacting: true });
      if (interactionTimer) clearTimeout(interactionTimer);
      interactionTimer = setTimeout(() => {
        interactionTimer = null;
        set({ interacting: false });
      }, ttlMs);
    },

    // Camera emissions arrive ~16/s during a drag. Keep the PREVIOUS object
    // references for viewportSize/cameraPose when their values are unchanged —
    // otherwise every emission mints fresh identities and any React selector
    // returning one of these objects re-renders at frame rate (P9c/P17).
    updateCameraData: (matrix, size, pose, moving) => {
      const prev = get();
      const sameSize =
        prev.viewportSize.width === size.width &&
        prev.viewportSize.height === size.height;
      const nextPose = pose ?? null;
      set({
        viewProjectionMatrix: matrix,
        viewportSize: sameSize ? prev.viewportSize : size,
        cameraPose: samePose(prev.cameraPose, nextPose) ? prev.cameraPose : nextPose,
        cameraMoving: moving ?? false,
      });
    },
  }));
};

const {
  StoreContext: ViewStoreContext,
  useScopedStore: useViewStore,
  useStoreApi: useViewStoreApi,
} = createScopedStoreHooks<ViewState>("ViewStore");

export { ViewStoreContext, useViewStore, useViewStoreApi };
