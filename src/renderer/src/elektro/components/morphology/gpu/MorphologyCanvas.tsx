import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useTabVisible } from "@/core/tabs/TabVisibilityContext";
import { isSceneNavigationTarget } from "@/core/dnd/keyboardTarget";
import { captureFrameBlob, type CaptureRenderer } from "@/core/data/scene/capture/captureFrame";
import { EXCLUDE_FROM_CAPTURE } from "@/core/data/scene/capture/captureVisibility";
import { computeSphereFitPose } from "@/core/data/scene/camera/fitPose";
import {
  asNavControls,
  orbitCamera,
  panCamera,
  zoomCamera,
} from "@/core/data/scene/camera/keyboardNavigation";
import { NAVIGATE_BUTTONS_3D } from "@/core/data/scene/camera/navigateButtons";
import {
  navigationActionForKey,
  worldUnitsPerPixelAt,
} from "@/core/data/scene/camera/sceneNavigation";
import { getNiceNumber } from "@/core/data/scene/chrome/ScaleBar";
import { createWebGPURendererFactory } from "@/core/data/scene/gpu/createWebGPURenderer";
import type { Morphology } from "../model/buildMorphology";
import { type Frame, wholeFrame } from "../model/focus";
import { useMorphologyStore, useMorphologyStoreApi } from "../stores/morphologyStore";

/**
 * The morphology's WebGPU canvas: renderer, lights, the orbit rig, framing,
 * keyboard navigation, the scale-bar readout, screenshot capture and the
 * grid/axis furniture. The picture itself (tubes, network, the editor's
 * handles) is `children`.
 *
 * The scene's and the timeline's setup: `createWebGPURendererFactory`, and
 * `frameloop="demand"` — nothing draws at rest, every change invalidates —
 * parked at `"never"` while the tab is hidden.
 */

const rendererFactory = createWebGPURendererFactory({ label: "morphology" });

/** The perspective fov the WebGL viewer used; a long lens flattens arbors less. */
const FOV = 34;

/**
 * Frames `frame` — the whole arbor orbiting its roots, or a zoomed-in render's
 * focus. On mount, when the frame changes, and on every `requestFit` (F, the
 * fit button). Keeps the current view direction, so a re-fit never yanks the
 * camera's orientation around.
 */
const FitController = ({ frame, empty }: { frame: Frame; empty: boolean }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const fitRequest = useMorphologyStore((s) => s.fitRequest);
  const { center, radius } = frame;
  // Extent, not identity: an editor edit that leaves the arbor where it was
  // must not re-frame what the user has navigated to.
  const extentKey = `${center.x.toFixed(1)}|${center.y.toFixed(1)}|${center.z.toFixed(1)}|${radius.toFixed(1)}`;

  useEffect(() => {
    const ctrl = asNavControls(controls);
    if (!ctrl || empty) return;
    const pose = computeSphereFitPose(center, Math.max(radius, 1), {
      fov: camera.fov,
      aspect: size.width / Math.max(size.height, 1),
      viewDirection: camera.position.clone().sub(ctrl.target),
    });
    camera.position.copy(pose.position);
    camera.near = pose.near;
    camera.far = pose.far;
    camera.updateProjectionMatrix();
    ctrl.target.copy(pose.target);
    ctrl.update();
    invalidate();
    // Size is read, not a trigger: a resize keeps the user's framing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extentKey, fitRequest, controls, camera, invalidate]);

  return null;
};

/**
 * Arrows pan, Shift+↑/↓ zooms, Shift+←/→ turns, F frames, Esc closes the
 * section panels — the scene's bindings (`sceneNavigation.ts`), applied by the
 * shared rig helpers.
 */
const KeyboardNavigation = () => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const store = useMorphologyStoreApi();

  useEffect(() => {
    const ctrl = asNavControls(controls);
    if (!ctrl) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as { tagName?: string; isContentEditable?: boolean } | null;
      if (!isSceneNavigationTarget(target)) return;

      if (e.key === "Escape") {
        // Claims the key only when there is something to close, so the
        // shortcuts sheet still gets its own Escape.
        if (Object.keys(store.getState().panels).length > 0) {
          e.preventDefault();
          store.getState().closeAll();
        }
        return;
      }

      const action = navigationActionForKey(e.code, e.shiftKey, "3D");
      if (!action || action.kind === "z") return;
      e.preventDefault();
      if (action.kind === "frame") store.getState().requestFit();
      else if (action.kind === "pan") panCamera(camera, ctrl, size.height, action.dx, action.dy);
      else if (action.kind === "zoom") zoomCamera(camera, ctrl, action.direction);
      else orbitCamera(ctrl, action.direction);
      invalidate();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [camera, controls, size.height, invalidate, store]);

  return null;
};

/**
 * Publishes µm-per-pixel at the orbit target for the scale bar, whenever the
 * rig moves or the canvas resizes.
 */
const ScaleSync = () => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const height = useThree((s) => s.size.height);
  const store = useMorphologyStoreApi();

  useEffect(() => {
    const ctrl = asNavControls(controls) as
      | (ReturnType<typeof asNavControls> & THREE.EventDispatcher<{ change: object }>)
      | null;
    if (!ctrl) return;
    const sync = () =>
      store
        .getState()
        .setWorldUnitsPerPixel(
          worldUnitsPerPixelAt(
            camera as { fov?: number },
            camera.position.distanceTo(ctrl.target),
            height,
          ),
        );
    sync();
    ctrl.addEventListener("change", sync);
    return () => ctrl.removeEventListener("change", sync);
  }, [camera, controls, height, store]);

  return null;
};

/** Registers the store's `capture()` against this canvas's renderer. */
const ScreenshotBinding = () => {
  const gl = useThree((s) => s.gl) as unknown as CaptureRenderer;
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const store = useMorphologyStoreApi();

  useEffect(() => {
    const capture = async (): Promise<Blob | null> => {
      try {
        const dpr = gl.getPixelRatio?.() ?? 1;
        return await captureFrameBlob(
          gl,
          scene,
          camera,
          Math.max(1, Math.floor(size.width * dpr)),
          Math.max(1, Math.floor(size.height * dpr)),
        );
      } catch (error) {
        console.error("[morphology] screenshot capture failed", error);
        return null;
      } finally {
        // The offscreen pass clobbered the live frame — repaint it.
        invalidate();
      }
    };
    store.getState().registerCapture(capture);
    return () => store.getState().registerCapture(null);
  }, [gl, scene, camera, size, invalidate, store]);

  return null;
};

/**
 * The grid (under the arbor, in the xz plane) and the origin axis — viewport
 * furniture, so both stay out of screenshots.
 */
const Furniture = ({ morphology }: { morphology: Morphology }) => {
  const grid = useMorphologyStore((s) => s.hud.grid);
  const axis = useMorphologyStore((s) => s.hud.axis);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [grid, axis, invalidate]);

  const span = getNiceNumber(Math.max(morphology.radius, 1) * 2.5);
  const floor = morphology.bounds.isEmpty() ? 0 : morphology.bounds.min.y;
  const excluded = useMemo(() => ({ [EXCLUDE_FROM_CAPTURE]: true }), []);

  return (
    <>
      {grid && (
        <gridHelper
          args={[span, 10, "#555555", "#2a2a2a"]}
          position={[morphology.rootCentroid.x, floor, morphology.rootCentroid.z]}
          userData={excluded}
        />
      )}
      {axis && <axesHelper args={[span / 10]} userData={excluded} />}
    </>
  );
};

export const MorphologyCanvas = ({
  morphology,
  frame,
  keyboard = true,
  onPointerMissed,
  children,
}: {
  morphology: Morphology;
  /** What to frame; the whole morphology when omitted. */
  frame?: Frame;
  /**
   * Window-level keys (arrows, F, Esc). Off for a mini viewer embedded in
   * another view, whose host owns those keys (the timeline's F and arrows).
   */
  keyboard?: boolean;
  onPointerMissed?: (event: MouseEvent) => void;
  children: React.ReactNode;
}) => {
  const visible = useTabVisible();
  const smoothCamera = useMorphologyStore((s) => s.hud.smoothCamera);
  const zoomToCursor = useMorphologyStore((s) => s.hud.zoomToCursor);

  return (
    <Canvas
      frameloop={visible ? "demand" : "never"}
      gl={rendererFactory}
      camera={{ fov: FOV, position: [0, 0, 5] }}
      onPointerMissed={onPointerMissed}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 50, 20]} intensity={1.2} />
      <directionalLight position={[-20, -30, -10]} intensity={0.35} />

      <OrbitControls
        makeDefault
        enableDamping={smoothCamera}
        zoomToCursor={zoomToCursor}
        mouseButtons={NAVIGATE_BUTTONS_3D}
      />
      <FitController
        frame={frame ?? wholeFrame(morphology)}
        empty={morphology.sections.length === 0}
      />
      {keyboard && <KeyboardNavigation />}
      <ScaleSync />
      <ScreenshotBinding />
      <Furniture morphology={morphology} />

      {children}
    </Canvas>
  );
};
