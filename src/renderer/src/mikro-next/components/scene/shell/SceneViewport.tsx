import {
  Canvas,
  events as createPointerEvents,
  useStore as useThreeStore,
  useThree,
} from "@react-three/fiber";
import { useTabVisible } from "@/command/tabs/TabVisibilityContext";
import { useEffect, type ReactNode } from "react";
import { LongCommitProfiler } from "../platform/perf/commitProfiler";
import { useViewStoreApi } from "../platform/stores/viewStore";
import { createWebGPURendererFactory } from "@/lib/scene/gpu/createWebGPURenderer";
import * as THREE from "three";
import { CameraMatrixSync } from "../platform/camera/CameraMatrixSync";
import { PerfFrameProbe } from "../platform/perf/PerfFrameProbe";
import { ScaleBar } from "./chrome/ScaleBar";
import { ScaleGrid } from "./chrome/ScaleGrid";
import { SceneDock } from "./SceneDock";
import { SceneGuard, useSceneScopeStatus } from "./SceneProvider";
import { ThreeDScene } from "./ThreeDScene";
import { TwoDScene } from "./TwoDScene";
import { AnimationPlayer } from "../features/animation/AnimationPlayer";
import { CameraController } from "../platform/camera/CameraController";
import { CanvasSync } from "../platform/camera/CanvasSync";
import { LinePickTuning } from "../platform/draw/LinePickTuning";
import { InitialCameraFit } from "../platform/camera/InitialCameraFit";
import { QualityAdapter } from "../platform/quality/QualityAdapter";
import { KeyboardLayerVisibility } from "./keyboard/KeyboardLayerVisibility";
import { KeyboardModeController } from "./keyboard/KeyboardModeController";
import { KeyboardSceneNavigation } from "./keyboard/KeyboardSceneNavigation";
import { ModeCompatGuard } from "./keyboard/ModeCompatGuard";
import { SceneAxis } from "./chrome/SceneAxis";
import { AttributeProbeTracker } from "../features/probe/AttributeProbeTracker";
import { ProbeReadoutSettler } from "../features/probe/ProbeReadoutSettler";
import { BrickSystemProvider } from "../features/bricks/residency/BrickSystemProvider";
import { VisibilityManager } from "./VisibilityManager";
import { coldOpenTimeline } from "../platform/perf/coldOpenTimeline";
import { BrickSystemHost } from "../features/bricks/residency/BrickSystemHost";
import { BrickResidencyOverlay } from "../features/bricks/BrickResidencyOverlay";
import { SceneModeControls } from "./chrome/SceneModeControls";
import { SceneShortcuts } from "./keyboard/SceneShortcuts";
import { CenterLodReadout } from "../features/bricks/CenterLodReadout";
import { DrawSizeReadout } from "../features/annotations/DrawSizeReadout";
import { MetadataOverlay } from "../features/annotations/MetadataOverlay";
import { RoiToolbar } from "../features/annotations/RoiToolbar";
import { MeshDesignToolbar } from "../features/meshDesign/ui/MeshDesignToolbar";
import { SceneScreenshot } from "./chrome/SceneScreenshot";
import { CanvasHueProbe } from "./theme/CanvasHueProbe";
import { DebugPanel } from "../features/debug/DebugPanel";
import { DimSliderPanel } from "./chrome/DimSliderPanel";
import { SelectedPointPanel } from "../features/probe/SelectedPointPanel";
import { RoiDeleteKeybinding } from "../features/annotations/RoiDeleteKeybinding";
import { HoveredAnnotationButton } from "../features/annotations/hover/HoveredAnnotationButton";
import { ZSliderPanel } from "./chrome/ZSliderPanel";
import { WebGPUUnavailableError } from "@/lib/scene/gpu/webgpuSupport";
import { useModeStore } from "../platform/stores/modeStore";
import { useViewerStore } from "../platform/stores/viewerStore";

/**
 * R3F's default event manager raycasts the ENTIRE interaction set for every
 * DOM event it handles EXCEPT pointermove (see `pointerMoveGates` below for
 * that one exception) — including plain `wheel`, which nothing in this scene
 * subscribes to (no R3F `onWheel` props in the scene tree). Trackpad zoom
 * fires 60–120 wheel events/s, and because wheel is unfiltered each raycast
 * walks every Line2 annotation outline segment-by-segment — pure per-tick
 * main-thread waste, concurrent with the zoom itself. Dropping the handler
 * here removes the DOM wheel listener entirely; OrbitControls zooms through
 * its own listener and is unaffected.
 */
/**
 * Per-canvas gate for suppressing pointermove raycasts while the CAMERA is
 * navigating: a pan/orbit drag produces 60–120 pointermoves/s and each one
 * runs a raycast, concurrently with the gesture.
 *
 * NOTE the scope, which is narrower than the wheel case above and was once
 * documented wrongly here. R3F filters the *pointermove* interaction set to
 * objects carrying a pointer-move-family handler (`filterPointerEvents`), so
 * annotations — `onClick` only — were never in it. What this gate actually
 * saves is the picking layers' own raycasts, above all the fabriks
 * `BatchedMesh`, which three walks per mounted instance. Click-class events
 * are NOT filtered that way, which is why the layers gate their `onClick` /
 * `onPointerDown` props too (`platform/probe/probeGating.ts`).
 *
 * The gate reads `viewStore.cameraMoving`, so it lasts exactly as long as the
 * camera actually moves: drag-drawing tools (RoiDrawer/RectangleDrawer hold a
 * button while the camera is still) and hover probes (no buttons) are
 * untouched. Registered by `PointerMoveGate` below, keyed by the R3F root
 * store so multiple mounted canvases stay independent.
 */
const pointerMoveGates = new WeakMap<object, () => boolean>();

const sceneEvents: typeof createPointerEvents = (store) => {
  const manager = createPointerEvents(store);
  delete (manager.handlers as Partial<Record<"onWheel", unknown>> | undefined)?.onWheel;
  const handlers = manager.handlers as
    | Partial<Record<"onPointerMove", (event: PointerEvent) => void>>
    | undefined;
  const originalMove = handlers?.onPointerMove;
  if (handlers && originalMove) {
    handlers.onPointerMove = (event: PointerEvent) => {
      if (event.buttons !== 0 && (pointerMoveGates.get(store)?.() ?? false)) return;
      originalMove(event);
    };
  }
  return manager;
};

/** Registers this canvas's camera-motion gate (see pointerMoveGates). */
const PointerMoveGate = () => {
  const store = useThreeStore();
  const viewApi = useViewStoreApi();
  useEffect(() => {
    pointerMoveGates.set(store, () => viewApi.getState().cameraMoving);
    return () => void pointerMoveGates.delete(store);
  }, [store, viewApi]);
  return null;
};

/**
 * The tone-mapping half of the CINEMATIC <-> SCIENTIFIC preset.
 *
 * The scene was ACES-graded by accident until this existed: nothing in the
 * tree ever set `toneMapping`, so R3F's default (`ACESFilmicToneMapping`)
 * applied. The brick materials pin `material.toneMapped = false`, but that
 * flag is a documented NO-OP on the WebGPU backend — it is read only by
 * WebGLRenderer/WebGLPrograms, while the WebGPU output transform runs as a
 * separate full-screen pass. See the note beside `commonMaterialSettings` in
 * `features/bricks/gpu/brickNodeMaterials.ts`.
 *
 * SCIENTIFIC is `NoToneMapping`: a channel's screen value is its transfer
 * output, unfiltered. Note the honest limit — the brick materials blend
 * ADDITIVELY, so a multi-channel sum above 1.0 hard-clips here where ACES
 * would have rolled it off monotonically. That is deliberate: ACES does not
 * fix oversaturation, it HIDES it, and a clipping composite is something the
 * user should see and fix with per-channel opacity or clim.
 *
 * `outputColorSpace` is deliberately NOT touched — sRGB encoding is display
 * transfer, not grading, and `SceneScreenshot` reads it for capture.
 *
 * Cost: `NodeLibrary.getOutputCacheKey()` keys ONLY the output pass on
 * `renderer.toneMapping`, so flipping this recompiles one full-screen quad and
 * leaves every brick pipeline alone.
 */
const ToneMappingSync = () => {
  const cinematic = useModeStore((s) => s.cinematic);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    gl.toneMapping = cinematic ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    invalidate();
  }, [cinematic, gl, invalidate]);

  return null;
};

/**
 * Draw the first frame after a tab comes back on screen.
 *
 * With `frameloop="never"` while hidden, nothing has been scheduled; on
 * refocus the canvas would otherwise sit on its last frame until something
 * else invalidates it.
 */
const TabVisibilitySync = () => {
  const visible = useTabVisible();
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (visible) invalidate();
  }, [visible, invalidate]);
  return null;
};

/**
 * The WebGPU renderer, via the shared factory — the fallback-nulling, timestamp
 * parking and drei anisotropy shim all live there now, shared with elektro's
 * timeline. Module-level so r3f sees one stable `gl` prop.
 */
const sceneRendererFactory = createWebGPURendererFactory({
  label: "scene",
  // The device is live: everything before this was pre-GPU cold open.
  onInitialized: () => coldOpenTimeline.stamp("canvasMount"),
});

const SceneWrapper = ({ children }: { children: ReactNode }) => {
  // A tab that is mounted but not on screen must not schedule frames. In
  // demand mode a scene at rest already draws nothing; "never" also stops the
  // odd frame a chunk arriving in the background would otherwise trigger.
  const visible = useTabVisible();
  // `select-none` on the canvas surface stops a drag (pan / ROI draw / probe)
  // from ever turning into a text selection. Overlays keep normal selection.
  //
  // Renderer: three's WebGPURenderer (async init via R3F v9's gl factory).
  // WebGPU is required — SceneProvider gates on assertWebGPUSupported() before
  // this ever mounts. On macOS this is native Metal, which is what kills the
  // ANGLE texSubImage3D upload stalls (P19).
  return <Canvas
        className="select-none [-webkit-user-select:none]"
        frameloop={visible ? "demand" : "never"}
        events={sceneEvents}
        gl={sceneRendererFactory}>{children}</Canvas>;
};

const SceneModeContent = () => {
  const displayMode = useModeStore((state) => state.displayMode);

  return displayMode === "2D" ? <TwoDScene /> : <ThreeDScene />;
};

/**
 * The scene's `backgroundColor` as an inline style, or nothing at all.
 *
 * Null means "the viewer keeps its own", so it must fall through to the
 * `bg-black` class rather than resolve to a colour here. Components are RGBA in
 * 0..1 (the schema's own convention, as on `SceneSnapshot.majorColor`); alpha
 * is optional and defaults to opaque. The Canvas itself stays transparent, so
 * this div showing through IS the background.
 */
const backgroundStyle = (
  color: readonly number[] | null | undefined,
): { backgroundColor: string } | undefined => {
  if (!color || color.length < 3) return undefined;
  const [r, g, b, a = 1] = color;
  const channel = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return { backgroundColor: `rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${a})` };
};

/**
 * Mount-gate for debug consumers. The DebugPanel and BrickResidencyOverlay
 * subscribe to streaming-cadence state (`residencyVersion`, `nodePlans`); when
 * mounted with debug off they still re-render (to null) on every bump. Gating
 * the MOUNT here means those subscriptions don't exist at all outside debug.
 */
const WhenDebug = ({ children }: { children: ReactNode }) => {
  const debug = useViewerStore((s) => s.debug);
  return debug ? <>{children}</> : null;
};

/**
 * The panel stack a viewport gets when its host composes nothing: the two
 * scrubbers, docked at the edges the dimensions they scrub read along. Exported
 * as Scene.DefaultPanels so a host that only wants to *add* a panel can render
 * it alongside its own instead of restating it.
 *
 * There is no floating panel column any more. The view settings that used to
 * fill it are a gear in the bottom-right HUD (`SceneModeControls`), and the
 * layer list and animations live in the page's right-rail sidebar
 * (`sceneSidebarTabs.tsx`) — both outside the viewport. `Scene.Column` remains
 * for a host that has a panel of its own to float.
 */
export const DefaultScenePanels = () => (
  <>
    <SceneDock side="right">
      <ZSliderPanel />
    </SceneDock>
    <SceneDock side="bottom">
      <DimSliderPanel />
    </SceneDock>
  </>
);

/**
 * The rendered scene: the WebGPU canvas plus its overlay chrome, filling its
 * host. Must sit under a `SceneProvider`; until that scope is ready it renders
 * the matching message inside its own frame, so a missing GPU or a loading
 * scene never blanks the page around it.
 *
 * `children` compose the overlay panel stack (see `DefaultScenePanels` for the
 * default shape and `Scene.Column` for what positions it).
 *
 * `inCanvas` is the other slot: host-provided R3F content mounted INSIDE the
 * canvas, in world space, after the scene's own interaction layers — a host
 * workflow's handles and markers (the registration workspace's gizmo). R3F
 * bridges React context into the canvas, so a host's own provider above the
 * viewport reaches these children exactly as the scene's stores do. The scene
 * neither knows nor cares what is in it; what it draws must follow the same
 * rules as the scene's own overlays (P17 two-plane rule, P20 handler
 * attachment).
 */
export const SceneViewport = (props: { children?: ReactNode; inCanvas?: ReactNode }) => {
  const status = useSceneScopeStatus();

  if (status.phase !== "ready") {
    // A missing GPU is an environment problem, not a scene problem — saying
    // "scene initialization failed" would send the reader hunting in the
    // wrong place.
    const message =
      status.phase === "no-scene"
        ? "No scene selected."
        : status.phase === "error"
          ? `${
              status.error instanceof WebGPUUnavailableError
                ? "This scene cannot be rendered"
                : "Scene initialization failed"
            }: ${status.error.message}`
          : "Initializing scene data...";
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
        <div className="flex h-full w-full items-center justify-center px-8 text-center text-sm text-zinc-300">
          {message}
        </div>
      </div>
    );
  }

  return (
    <SceneGuard>
      <div
        className="relative h-full w-full overflow-hidden rounded-lg bg-black"
        style={backgroundStyle(status.scene.backgroundColor)}
      >
        <KeyboardModeController />
        <KeyboardLayerVisibility />
        <ModeCompatGuard />
        {/* OUTSIDE <SceneWrapper> deliberately: the canvas awaits
            renderer.init() before mounting any child, and brick fetch/decode/
            repack need no device — starting here overlaps the network with
            GPU setup. BrickSystemProvider (inside) binds the renderer. */}
        <BrickSystemHost />
        <SceneWrapper>
          <LongCommitProfiler id="scene-canvas">
          <ToneMappingSync />
          <ambientLight intensity={0.7} />
          <pointLight position={[100, 100, 100]} />

          {/* The Camera Matrix Sync ensures that we can access the view matrix outside in html world */}
          <CameraMatrixSync />
          <PointerMoveGate />
          <PerfFrameProbe />
          <CameraController />
          {/* Also after CameraController: needs the installed controls to pan
              and dolly against. Arrow keys, so it lives in the canvas rather
              than with the other keyboard components outside it. */}
          <KeyboardSceneNavigation />
          {/* Must follow CameraController: fits the as-loaded scene extent
              before the first painted frame (and on 2D/3D remounts). */}
          <InitialCameraFit />
          {/* Also after CameraController: drives the camera along a playing
              tour. Idle (and free) until something calls `play`. */}
          <AnimationPlayer />
          <QualityAdapter />
          <CanvasSync />
          <TabVisibilitySync />
          {/* Annotation outlines are hairline-thin to pick without this. */}
          <LinePickTuning />
          <SceneScreenshot />
          {/* Feeds SceneBrandTheme the majority hue of the rendered pixels. */}
          <CanvasHueProbe />

          {/* Interaction Layers */}
          {/* The SceneAxis is a simple XYZ axis helper that also shows the scale of the scene */}
          <SceneAxis />
          <ScaleGrid />

          <SceneModeContent />

          {props.inCanvas}

          <BrickSystemProvider />
          <WhenDebug>
            <BrickResidencyOverlay />
          </WhenDebug>

          </LongCommitProfiler>
        </SceneWrapper>

        {/* The panel stack is the host's to compose — see DefaultScenePanels
            for the shape, and Scene.Column for what positions it. Panels
            below this line are the renderer's own (they answer to the
            canvas, not to a layout choice) and are not composable. */}
        <LongCommitProfiler id="scene-chrome">
          {props.children ?? <DefaultScenePanels />}
        </LongCommitProfiler>

        <WhenDebug>
          <DebugPanel />
        </WhenDebug>
        {/* The renderer's own overlays, bracketed so their commits are
            attributable: `SelectedPointPanel` in particular used to sit
            outside every profiler, which made a HUD re-render storm show up
            as unexplained main-thread time. */}
        <LongCommitProfiler id="scene-overlays">
          {/* The annotation and mesh lists live in their sidebar tabs; the
              viewport keeps the Backspace-delete keybinding — sidebar tabs
              unmount when inactive, and a keybinding may not go with them. */}
          <RoiDeleteKeybinding />
          {/* The action button pinned to the hovered annotation — the one
              overlay that follows a shape rather than a corner. */}
          <HoveredAnnotationButton />
          <VisibilityManager />
          <AttributeProbeTracker />
          <ProbeReadoutSettler />
          <ScaleBar />
          {/* Bottom-left, under the scale bar: both answer "what am I
              actually looking at" — one in world units, one in pixels. */}
          <CenterLodReadout />
          {/* Bottom-right, above the mode controls: what was RECORDED about
              what you are looking at — the active layer's anchored acquisition
              metadata, folded to a single unfold button until asked. */}
          <MetadataOverlay />
          <DrawSizeReadout />
          {/* Both dock bottom-right: the probe readout sits directly above the
              mode controls that turn probing on. */}
          <SelectedPointPanel />
          <SceneModeControls />

          <RoiToolbar />
          <MeshDesignToolbar />
          {/* Last, and the only overlay that covers the canvas: on top of
              everything it documents. */}
          <SceneShortcuts />
        </LongCommitProfiler>
      </div>
    </SceneGuard>
  );
};
