/* eslint-disable react-hooks/immutability --
 * This component's whole job is imperative render orchestration: it drives
 * renderer state (targets, autoClear, clear color), toggles scene-graph
 * visibility inside the frame callback, and mutates its own render target —
 * all deliberately outside React's data flow (see useVolumeRayUniforms for
 * the same contract on uniforms). */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import {
  buildVolumeCompositeNode,
  isPostInert,
  updateVolumePostUniforms,
} from "../../platform/gpu/volumePost";
import { useModeStore } from "../../platform/stores/modeStore";
import { EXCLUDE_FROM_CAPTURE } from "../../platform/visibility/captureVisibility";
import {
  COMPOSITOR_INTERNAL,
  collectPassSets,
  disableColorWriteInto,
  hideObjectsInto,
  restoreColorWrite,
  restoreHidden,
  type PassSets,
} from "../../platform/visibility/passVisibility";
import {
  MAX_SETTLE_REFINE_STAGES,
  qualityGovernor,
  resolveDpr,
} from "../../platform/quality/qualityGovernor";
import {
  SETTLE_REFINE_DELAY_MS,
  buildVolumeStructureKey,
  createCompositorStats,
  decideSettleRefine,
  decideVolumeFrame,
  needsTargetResize,
  resolveVolumeScale,
  resolveVolumeTargetSize,
  type VolumeFrameKey,
} from "../../platform/gpu/volumeCompositor";
import { useViewStoreApi } from "../../platform/stores/viewStore";

import { useBrickStoreApi } from "../bricks/store/brickSlice";

/**
 * The volume compositor (OCTREE_RENDERER.md §7 R1+R2): renders the tagged
 * volume raymarch meshes into a dedicated reduced-resolution render target
 * and composites the upsampled result into the canvas frame — re-rendering
 * the target only when a volume input changed.
 *
 * Mounted by `ThreeDScene` (3D only) behind `orkestrator.volumeTarget`. The
 * priority-1 `useFrame` is R3F's documented render takeover: with a
 * nonzero-priority subscriber R3F skips its own `gl.render`, so this
 * callback owns the frame — (1) optional volume pass into the target,
 * (2) canvas pass with volume meshes hidden and the composite quad shown.
 * Three's internal output pass (tone map + sRGB) still runs once, on the
 * canvas render, so tone mapping stays single and final. On unmount (2D
 * switch, flag off) the subscription drops and R3F's own render resumes.
 *
 * All decisions live in the pure core (`platform/gpu/volumeCompositor.ts`); this
 * shell only executes renders and restores state in `finally` (the
 * SceneScreenshot contract).
 */

/** The WebGPURenderer subset this drives (R3F types `gl` as WebGLRenderer). */
interface CompositorRenderer {
  autoClear: boolean;
  getPixelRatio: () => number;
  getRenderTarget: () => THREE.RenderTarget | null;
  setRenderTarget: (target: THREE.RenderTarget | null) => void;
  render: (scene: THREE.Object3D, camera: THREE.Camera) => void;
  setClearColor: (color: THREE.ColorRepresentation, alpha?: number) => void;
  getClearColor: (target: THREE.Color) => THREE.Color;
  getClearAlpha: () => number;
}

const scratchView = new THREE.Matrix4();
const scratchVP = new THREE.Matrix4();
const scratchClearColor = new THREE.Color();
const scratchQuadLocal = new THREE.Matrix4();

/**
 * Fit the composite quad's WORLD matrix to exactly fill the camera frustum
 * just past the near plane. The quad then rides the standard MVP vertex path
 * — no custom vertex stage, which is the construction three's own fullscreen
 * passes avoid too (QuadMesh uses a dedicated ortho camera instead); a
 * bespoke `vertexNode` is precisely the kind of node-graph edge that fails
 * SILENTLY on the WebGPU backend (the object is just skipped). depthTest is
 * off, so the chosen distance never occludes.
 */
const fitQuadToCamera = (quad: THREE.Mesh, camera: THREE.Camera): void => {
  const perspective = camera as THREE.PerspectiveCamera;
  const orthographic = camera as THREE.OrthographicCamera;
  let distance: number;
  let halfWidth: number;
  let halfHeight: number;
  if ((perspective as { isPerspectiveCamera?: boolean }).isPerspectiveCamera) {
    distance = perspective.near * 2;
    halfHeight =
      distance * Math.tan(THREE.MathUtils.degToRad(perspective.fov) / 2);
    halfWidth = halfHeight * perspective.aspect;
  } else {
    distance = orthographic.near + (orthographic.far - orthographic.near) * 0.001;
    const zoom = orthographic.zoom || 1;
    halfWidth = (orthographic.right - orthographic.left) / 2 / zoom;
    halfHeight = (orthographic.top - orthographic.bottom) / 2 / zoom;
  }
  scratchQuadLocal.makeScale(halfWidth, halfHeight, 1);
  scratchQuadLocal.setPosition(0, 0, -distance);
  quad.matrixWorld.multiplyMatrices(camera.matrixWorld, scratchQuadLocal);
};

export const VolumeCompositor = () => {
  const viewStoreApi = useViewStoreApi();
  const viewerStoreApi = useBrickStoreApi();
  const stats = useMemo(() => createCompositorStats(), []);
  const invalidate = useThree((state) => state.invalidate);

  const target = useMemo(
    () =>
      new THREE.RenderTarget(2, 2, {
        depthBuffer: true,
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
      }),
    [],
  );

  // Fullscreen composite quad: a camera-fitted plane (see fitQuadToCamera)
  // sampling the target at screenUV — resolution-independent, so the low-res
  // target upsamples bilinearly. The target is an ADDITIVE-DELTA buffer:
  // image volumes render into it with plain AdditiveBlending (rgb
  // (SrcAlpha, One), alpha (One, One)) over a (0,0,0,0) clear, so each texel
  // holds exactly the rgb+alpha delta the direct path would have added to
  // the canvas. Compositing with (One, One) on BOTH channels reproduces that
  // bit-for-bit over any background — including the transparent canvas,
  // where the accumulated ALPHA is what makes volumes visible at all (the
  // scene background is a DOM div behind the canvas).
  // CINEMATIC post (bloom + grading) lives in this quad's colorNode — see
  // `platform/gpu/volumePost.ts` for why it runs on the TARGET and not on the
  // scene. The material is rebuilt when the chain's SHAPE changes (cinematic
  // on/off, or the settings becoming inert) rather than when its values change:
  // a strength-0 bloom uniform still executes every downsample and upsample, so
  // scientific mode has to emit no bloom nodes at all, not zeroed ones. Value
  // changes ride the live uniforms in the effect below.
  const cinematic = useModeStore((s) => s.cinematic);
  const post = useModeStore((s) => s.post);
  const postActive = cinematic && !isPostInert(post);
  // Read by the material builder without making it a dep: the SHAPE of the
  // chain depends on `postActive`, its VALUES ride live uniforms.
  const postRef = useRef(post);
  postRef.current = post;

  const quad = useMemo(() => {
    const material = new NodeMaterial();
    const chain = buildVolumeCompositeNode(
      target.texture,
      postActive ? postRef.current : null,
    );
    material.colorNode = chain.colorNode;
    material.userData.postChain = chain;
    material.transparent = true;
    material.blending = THREE.CustomBlending;
    material.blendEquation = THREE.AddEquation;
    material.blendSrc = THREE.OneFactor;
    material.blendDst = THREE.OneFactor;
    material.blendEquationAlpha = THREE.AddEquation;
    material.blendSrcAlpha = THREE.OneFactor;
    material.blendDstAlpha = THREE.OneFactor;
    material.depthTest = false;
    material.depthWrite = false;
    material.side = THREE.DoubleSide;
    material.fog = false;
    material.lights = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    // The image volumes' slot: labels (2, live in the canvas pass), fabriks
    // slab overlays (3) and interaction overlays (8+) must draw OVER the
    // composited volumes, exactly as they draw over direct volumes today.
    mesh.renderOrder = 1;
    mesh.visible = false; // shown only inside the canvas pass
    mesh.raycast = () => {};
    // The world matrix is written directly by fitQuadToCamera every frame —
    // nothing may recompute it from parents.
    mesh.matrixAutoUpdate = false;
    mesh.matrixWorldAutoUpdate = false;
    mesh.userData[COMPOSITOR_INTERNAL] = true;
    mesh.userData[EXCLUDE_FROM_CAPTURE] = true;
    return mesh;
    // `postActive` only — the SHAPE of the chain. Rebuilding on every slider
    // tick would thrash the bloom node's mip targets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, postActive]);

  useEffect(
    () => () => {
      target.dispose();
      quad.geometry.dispose();
      const material = quad.material as THREE.Material;
      // Release the bloom node's mip render targets before the material.
      (material.userData.postChain as { dispose: () => void } | undefined)?.dispose();
      material.dispose();
    },
    [target, quad],
  );

  // Slider drags: push into the live uniforms and request a frame. The target
  // itself does not need re-rendering (post is applied at COMPOSITE time, in
  // the canvas pass, which runs every frame) — so this deliberately does not
  // invalidate the volume-frame cache.
  useEffect(() => {
    const chain = (quad.material as THREE.Material).userData.postChain as
      | Parameters<typeof updateVolumePostUniforms>[0]
      | undefined;
    if (!chain) return;
    updateVolumePostUniforms(chain, post);
    invalidate();
  }, [quad, post, invalidate]);

  const lastScaleRef = useRef(0);
  const brokenRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    viewerStoreApi.getState().registerVolumeCompositor(() => ({
      enabled: true,
      cacheEnabled: true,
      depthPrepass: true,
      broken: brokenRef.current,
      lastError: lastErrorRef.current,
      targetWidth: target.width,
      targetHeight: target.height,
      scale: lastScaleRef.current,
      volumeRenders: stats.volumeRenders(),
      cachedComposites: stats.cachedComposites(),
      lastRenderReason: stats.lastRenderReason(),
      settleRefineStage: qualityGovernor.getSettleRefineStage(),
    }));
    return () => viewerStoreApi.getState().registerVolumeCompositor(null);
  }, [viewerStoreApi, target, stats]);

  const previousKeyRef = useRef<VolumeFrameKey | null>(null);
  // Per-frame scratch, allocated once: the pass-set arrays `collectPassSets`
  // refills, and TWO camera-element buffers used ping-pong — the previous
  // frame's key holds one by reference (see decideVolumeFrame), so this frame
  // must write the other.
  const passSetsRef = useRef<PassSets>({ volumeMeshes: [], occluders: [], otherRenderables: [] });
  // Scratch for the per-pass hide/restore bookkeeping (one list per hide
  // site, since the sites nest) and the prepass colorWrite flags.
  const hideScratchRef = useRef({
    others: [] as THREE.Object3D[],
    volumesPrepass: [] as THREE.Object3D[],
    occluders: [] as THREE.Object3D[],
    volumesCanvas: [] as THREE.Object3D[],
    colorWrite: new Map<THREE.Material, boolean>(),
  });
  const cameraBuffersRef = useRef<[number[], number[]]>([new Array(16).fill(0), new Array(16).fill(0)]);
  const cameraBufferIndexRef = useRef(0);
  const hasContentRef = useRef(false);

  // --- Settle refinement ladder (sole driver) ------------------------------
  const refineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRefineTimer = () => {
    if (refineTimerRef.current !== null) {
      clearTimeout(refineTimerRef.current);
      refineTimerRef.current = null;
    }
  };
  const scheduleRefine = (nextStage: number) => {
    // Clear-and-reschedule: the ladder waits for SETTLE_REFINE_DELAY_MS of
    // true quiet after the LAST qualifying settled render.
    clearRefineTimer();
    refineTimerRef.current = setTimeout(() => {
      refineTimerRef.current = null;
      const view = viewStoreApi.getState();
      if (view.cameraMoving || view.interacting || qualityGovernor.isStreaming()) return;
      // The emit runs the whole chain: useStepScaleUniform recomputes the
      // boosted uMaxSteps (image material only), bumps volumeInputs and
      // invalidates; the next frame re-renders the target exactly once.
      qualityGovernor.setSettleRefineStage(nextStage);
    }, SETTLE_REFINE_DELAY_MS);
  };
  useEffect(
    () => () => {
      // A boosted stage must NOT survive into the direct (non-composited)
      // render path (2D switch, flag off): there is no cache to amortize it
      // and every frame would pay the 4× budget.
      clearRefineTimer();
      qualityGovernor.setSettleRefineStage(0);
    },
    [],
  );

  useFrame((state) => {
    const gl = state.gl as unknown as CompositorRenderer;
    const { scene, camera } = state;

    // Fail-safe: after any compositor error, fall back to plain rendering
    // for the rest of the session — the feature must never blank the scene.
    if (brokenRef.current) {
      gl.render(scene, camera);
      return;
    }
    try {
      renderCompositedFrame(state);
    } catch (error) {
      brokenRef.current = true;
      lastErrorRef.current = String(error);
      console.warn("[scene] volume compositor disabled after error:", error);
      clearRefineTimer();
      qualityGovernor.setSettleRefineStage(0);
      quad.visible = false;
      try {
        gl.setRenderTarget(null);
      } catch {
        /* renderer state already unusable — plain render below still runs */
      }
      gl.render(scene, camera);
    }
  }, 1);

  type FrameState = Parameters<Parameters<typeof useFrame>[0]>[0];
  const renderCompositedFrame = (state: FrameState) => {
    const gl = state.gl as unknown as CompositorRenderer;
    const { scene, camera } = state;

    // World matrices BEFORE key derivation — the renderer would refresh them
    // mid-render, which is too late for a frame-accurate structure compare.
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();

    const sets = collectPassSets(scene, passSetsRef.current);
    if (sets.volumeMeshes.length === 0) {
      // No volume passes mounted: plain frame, forget the cache.
      hasContentRef.current = false;
      previousKeyRef.current = null;
      gl.render(scene, camera);
      return;
    }

    // --- Target sizing (settled-DPR anchor, live-buffer clamp) -------------
    // Scale keys on LIVE INTERACTION — camera motion or a window drag
    // (`viewStore.interacting`) — never on streaming, which keeps full
    // resolution so progressive LOD sharpening stays visible
    // (see resolveVolumeScale).
    const profile = qualityGovernor.getProfile();
    const view = viewStoreApi.getState();
    const interacting = view.cameraMoving || view.interacting;
    const scale = resolveVolumeScale(qualityGovernor.getTier(), interacting);
    lastScaleRef.current = scale;
    const dpr = gl.getPixelRatio();
    const nextSize = resolveVolumeTargetSize({
      cssWidth: state.size.width,
      cssHeight: state.size.height,
      settledDpr: resolveDpr(profile, state.viewport.initialDpr, false),
      bufferWidth: state.size.width * dpr,
      bufferHeight: state.size.height * dpr,
      scale,
    });
    if (
      needsTargetResize({ width: target.width, height: target.height }, nextSize)
    ) {
      target.setSize(nextSize.width, nextSize.height);
      hasContentRef.current = false;
    }

    // --- Frame decision (R1) ------------------------------------------------
    scratchVP
      .copy(camera.projectionMatrix)
      .multiply(scratchView.copy(camera.matrixWorld).invert());
    const viewer = viewerStoreApi.getState();
    cameraBufferIndexRef.current ^= 1;
    const cameraElements = cameraBuffersRef.current[cameraBufferIndexRef.current];
    for (let i = 0; i < 16; i++) cameraElements[i] = scratchVP.elements[i];
    const key = {
      cameraElements,
      // Thunk: `decideVolumeFrame` calls this only if the camera/size/version
      // compares all pass. During a gesture they never do, so the per-frame
      // string build below simply does not happen.
      structureKey: () => buildVolumeStructureKey(sets),
      residencyVersion: viewer.residencyVersion,
      poolsVersion: viewer.poolsVersion,
      qualityVersion: qualityGovernor.getVersion(),
      trackerVersion: viewer.volumeInputs.version,
      targetWidth: nextSize.width,
      targetHeight: nextSize.height,
    };
    const decision = decideVolumeFrame({
      cacheEnabled: true,
      hasTargetContent: hasContentRef.current,
      streaming: qualityGovernor.isStreaming(),
      key,
      trackerReason: viewer.volumeInputs.lastReason,
      previous: previousKeyRef.current,
    });
    stats.onFrame(decision);
    // The RESOLVED key, not the thunk-bearing input: it carries structureKey
    // only when the decision actually needed it (null otherwise, which the next
    // frame reads as "changed").
    previousKeyRef.current = decision.resolved;

    // --- Volume pass into the target ---------------------------------------
    if (decision.render) {
      const prevTarget = gl.getRenderTarget();
      const prevAutoClear = gl.autoClear;
      gl.getClearColor(scratchClearColor);
      const prevClearAlpha = gl.getClearAlpha();
      // The additive-delta invariant REQUIRES the target to clear to
      // (0,0,0,0). On the WebGPU renderer a `scene.background` overrides the
      // clear color — nothing in this tree sets one today (the scene
      // background is a DOM div behind the transparent canvas), but a future
      // `<color attach="background">` would be additively composited over
      // the whole canvas. Enforce the invariant instead of assuming it.
      const sceneWithBackground = scene as THREE.Scene;
      const prevBackground = sceneWithBackground.background;
      const hideScratch = hideScratchRef.current;
      hideObjectsInto(sets.otherRenderables, hideScratch.others);
      try {
        sceneWithBackground.background = null;
        gl.setClearColor(0x000000, 0);
        gl.setRenderTarget(target);
        if (sets.occluders.length > 0) {
          // Depth-only prepass: occluders alone with their OWN materials and
          // colorWrite off (never scene.overrideMaterial — a plain override
          // corrupts BatchedMesh multi-draw ranges), then volumes on top of
          // the surviving depth (autoClear off keeps it).
          hideObjectsInto(sets.volumeMeshes, hideScratch.volumesPrepass);
          disableColorWriteInto(sets.occluders, hideScratch.colorWrite);
          gl.autoClear = true;
          try {
            gl.render(scene, camera);
          } finally {
            restoreColorWrite(hideScratch.colorWrite);
            restoreHidden(hideScratch.volumesPrepass);
          }
          hideObjectsInto(sets.occluders, hideScratch.occluders);
          gl.autoClear = false;
          gl.render(scene, camera);
        } else {
          hideObjectsInto(sets.occluders, hideScratch.occluders);
          gl.autoClear = true;
          gl.render(scene, camera);
        }
        hasContentRef.current = true;
      } finally {
        // `restoreHidden` is a no-op on an empty (never filled) list.
        restoreHidden(hideScratch.occluders);
        restoreHidden(hideScratch.others);
        sceneWithBackground.background = prevBackground;
        gl.autoClear = prevAutoClear;
        gl.setClearColor(scratchClearColor, prevClearAlpha);
        gl.setRenderTarget(prevTarget);
      }
    }

    // --- Settle refinement ladder seam -------------------------------------
    // "A volume render just completed while settled at full res" is literally
    // true here; advance is deferred by the quiet timer, reset is immediate.
    const refine = decideSettleRefine({
      // The OR'd interaction flag: a window drag holds the ladder down
      // exactly as camera motion does, and its falling edge advances it.
      cameraMoving: interacting,
      streaming: qualityGovernor.isStreaming(),
      enabled: true,
      cacheEnabled: true,
      renderedThisFrame: decision.render,
      scale,
      // Wait for QualityAdapter's DPR restore before spending boosted
      // renders — see decideSettleRefine's atSettledDpr doc.
      atSettledDpr:
        dpr >= resolveDpr(profile, state.viewport.initialDpr, false) - 1e-6,
      stage: qualityGovernor.getSettleRefineStage(),
      maxStages: MAX_SETTLE_REFINE_STAGES,
    });
    if (refine === "reset") {
      clearRefineTimer();
      // Emit mid-frame is safe (the setStreaming precedent): listeners write
      // uniforms + invalidate; during motion the step-uniform dedupe blocks
      // (active values are stage-independent) so this costs no extra render.
      qualityGovernor.setSettleRefineStage(0);
    } else if (refine === "advance") {
      scheduleRefine(qualityGovernor.getSettleRefineStage() + 1);
    }

    // --- Canvas pass: everything but volumes, plus the composite quad ------
    const volumesCanvas = hideScratchRef.current.volumesCanvas;
    hideObjectsInto(sets.volumeMeshes, volumesCanvas);
    quad.visible = hasContentRef.current;
    if (quad.visible) fitQuadToCamera(quad, camera);
    try {
      gl.render(scene, camera);
    } finally {
      quad.visible = false;
      restoreHidden(volumesCanvas);
    }
  };

  return <primitive object={quad} />;
};
