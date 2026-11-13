/* eslint-disable react-hooks/immutability --
 * This component's whole job is imperative render orchestration: it drives
 * renderer state (targets, autoClear, clear color), toggles scene-graph
 * visibility inside the frame callback, and mutates its own render target —
 * all deliberately outside React's data flow (see useVolumeRayUniforms for
 * the same contract on uniforms). */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { NodeMaterial, QuadMesh } from "three/webgpu";
import * as TSLTyped from "three/tsl";
import {
  DEPTH_VIEW_CODE,
  emitDepthComposite,
  makeDepthCompositeUniforms,
  type DepthCompositeUniforms,
} from "../bricks/gpu/depthCodeNodes";
import {
  DEPTH_TERMINATED_RAYS,
  PLACEHOLDER_OCCLUDER_DEPTH,
  type OccluderDepthHandles,
} from "../bricks/gpu/brickNodeMaterials";
import { boxViewDepthRange } from "../bricks/shaderspec/depthCode";
import {
  buildVolumeCompositeNode,
  isPostInert,
  updateVolumePostUniforms,
} from "../../platform/gpu/volumePost";
import { useModeStore, useModeStoreApi } from "../../platform/stores/modeStore";
import { EXCLUDE_FROM_CAPTURE } from "@/core/data/scene/capture/captureVisibility";
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
  SETTLE_ACCUMULATE,
  SETTLE_ACCUM_FRAMES,
  SETTLE_ACCUM_INTERVAL_MS,
  SETTLE_REFINE_DELAY_MS,
  buildVolumeStructureKey,
  createCompositorStats,
  createSettledRenderMeter,
  decideSettleAccumulate,
  decideSettleRefine,
  decideVolumeFrame,
  settleAccumPhase,
  STREAM_RENDER_CADENCE_SHARE,
  streamRenderDue,
  needsTargetResize,
  resolveVolumeScale,
  resolveVolumeTargetSize,
  settleRefineAffordable,
  type VolumeFrameKey,
} from "../../platform/gpu/volumeCompositor";
import { useViewStoreApi } from "../../platform/stores/viewStore";
import { toolPressOpen, usePressLedger } from "../../platform/input/sceneInput";
import { perfMonitor } from "../../platform/perf/perfMonitor";

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

/* eslint-disable @typescript-eslint/no-explicit-any -- TSL node graph, see brickNodeMaterials. */
const TSL = TSLTyped as any;

/**
 * Latch the relief frame for what the depth pass just wrote: the scene box's
 * view-depth range (the same box the volume shader normalised against, read
 * off a volume material) and the world size of one depth-target texel. With
 * these the composite turns depth-per-texel back into a world slope.
 */
const latchReliefFrame = (
  u: DepthCompositeUniforms,
  meshes: readonly THREE.Object3D[],
  camera: THREE.Camera,
  targetHeight: number,
): void => {
  let box: { min: { value: THREE.Vector3 }; max: { value: THREE.Vector3 } } | undefined;
  for (const mesh of meshes) {
    const material = (mesh as THREE.Mesh).material as THREE.Material | undefined;
    box = (material as THREE.Material | undefined)?.userData?.depthBox;
    if (box) break;
  }
  if (box) {
    const { near, far } = boxViewDepthRange(
      box.min.value.toArray() as [number, number, number],
      box.max.value.toArray() as [number, number, number],
      camera.matrixWorldInverse.elements,
    );
    u.uDepthNear.value = near;
    u.uDepthRange.value = Math.max(far - near, 1e-6);
  }
  const perspective = camera as THREE.PerspectiveCamera;
  const height = Math.max(targetHeight, 1);
  if (perspective.isPerspectiveCamera) {
    u.uPerspective.value = 1;
    u.uPxScale.value = (2 * Math.tan(THREE.MathUtils.degToRad(perspective.fov) / 2)) / height;
  } else {
    const ortho = camera as THREE.OrthographicCamera;
    u.uPerspective.value = 0;
    u.uPxScale.value = (ortho.top - ortho.bottom) / (ortho.zoom || 1) / height;
  }
};

/** The flag a volume material exposes for the depth pass (`brickNodeMaterials`). */
const setDepthEncoding = (meshes: readonly THREE.Object3D[], on: boolean): void => {
  for (const mesh of meshes) {
    const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    const list = Array.isArray(material) ? material : material ? [material] : [];
    for (const m of list) {
      const flag = m.userData?.depthCodeUniform as { value: number } | undefined;
      if (flag) flag.value = on ? 1 : 0;
    }
  }
};

/** Every material of the given meshes (a mesh may carry an array). */
const forEachMaterial = (
  meshes: readonly THREE.Object3D[],
  visit: (material: THREE.Material, mesh: THREE.Object3D) => void,
): void => {
  for (const mesh of meshes) {
    const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) for (const m of material) visit(m, mesh);
    else if (material) visit(material, mesh);
  }
};

/**
 * Hand the image volume materials the occluder depth of THIS pass (or turn
 * the read off with `depth === null`). `driven` collects every handle set
 * touched, so unmount can point them back at the placeholder — a material
 * outlives the compositor across a 2D↔3D switch and must not keep a disposed
 * depth texture bound.
 */
const setOccluderDepth = (
  meshes: readonly THREE.Object3D[],
  depth: THREE.Texture | null,
  camera: THREE.Camera,
  width: number,
  height: number,
  driven: Set<OccluderDepthHandles>,
): void => {
  forEachMaterial(meshes, (material, mesh) => {
    const handles = material.userData?.occluderDepth as OccluderDepthHandles | undefined;
    if (!handles) return;
    if (depth === null) {
      handles.enabled.value = 0;
      return;
    }
    driven.add(handles);
    handles.texture.value = depth;
    handles.texel.value.set(1 / Math.max(width, 1), 1 / Math.max(height, 1));
    // clip → the mesh's local unit box, the frame the ray is built in.
    handles.clipToLocal.value
      .copy(mesh.matrixWorld)
      .invert()
      .multiply(camera.matrixWorld)
      .multiply(camera.projectionMatrixInverse);
    handles.enabled.value = 1;
  });
};

/** The settle-accumulation jitter phase (`uJitterPhase`), 0 = ordinary. */
const setJitterPhase = (meshes: readonly THREE.Object3D[], phase: number): void => {
  forEachMaterial(meshes, (material) => {
    const uniform = material.userData?.jitterPhaseUniform as { value: number } | undefined;
    if (uniform) uniform.value = phase;
  });
};

/** Every volume in the pass is a max projection (`maxProjectionOnly`). */
const allMaxProjections = (meshes: readonly THREE.Object3D[]): boolean => {
  let all = meshes.length > 0;
  forEachMaterial(meshes, (material) => {
    if (material.userData?.maxProjectionOnly !== true) all = false;
  });
  return all;
};

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
  // What the latest settled render cost, read before a ladder stage is spent.
  const meter = useMemo(() => createSettledRenderMeter(), []);
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

  // The DEPTH view's target (hold Q / Shift+Q): the same volume passes with
  // `uDepthCode` on write `(frac·s, s)` here, and the composite reads a 3×3
  // neighbourhood of it to find depth JUMPS between rays. Held at 2×2 until
  // a depth view first renders — it costs nothing while unused.
  const depthTarget = useMemo(
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
  // DEPTH-TERMINATED RAYS: the occluder prepass writes HERE, into a depth
  // TEXTURE the volume shader reads to end each ray at the surface in front
  // of it. (It cannot stay in the volume target's own depth buffer: a pass
  // cannot sample the attachment it is drawing into.) 2×2 until a frame has
  // occluders.
  const occluderTarget = useMemo(() => {
    const created = new THREE.RenderTarget(2, 2, {
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture(2, 2),
      generateMipmaps: false,
    });
    return created;
  }, []);
  const drivenOccludersRef = useRef(new Set<OccluderDepthHandles>());

  // SETTLE ACCUMULATION: one jittered re-render lands here, then is merged
  // into `target` with a per-texel MAX (`accumBlit`). 2×2 until first used.
  const accumTarget = useMemo(
    () =>
      new THREE.RenderTarget(2, 2, {
        depthBuffer: true,
        type: THREE.HalfFloatType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        generateMipmaps: false,
      }),
    [],
  );
  const accumBlit = useMemo(() => {
    const material = new NodeMaterial();
    // Texel for texel (both targets have one size): no sampler, no uv
    // convention to get wrong.
    material.colorNode = TSL.texture(
      accumTarget.texture,
      TSL.ivec2(TSL.screenCoordinate.xy),
    ).setSampler(false);
    material.transparent = true;
    material.blending = THREE.CustomBlending;
    // WebGPU requires both factors to be One for a max equation.
    material.blendEquation = THREE.MaxEquation;
    material.blendSrc = THREE.OneFactor;
    material.blendDst = THREE.OneFactor;
    material.blendEquationAlpha = THREE.MaxEquation;
    material.blendSrcAlpha = THREE.OneFactor;
    material.blendDstAlpha = THREE.OneFactor;
    material.depthTest = false;
    material.depthWrite = false;
    material.fog = false;
    material.lights = false;
    return new QuadMesh(material);
  }, [accumTarget]);
  useEffect(
    () => () => {
      for (const handles of drivenOccludersRef.current) {
        handles.enabled.value = 0;
        handles.texture.value = PLACEHOLDER_OCCLUDER_DEPTH;
      }
      drivenOccludersRef.current.clear();
      occluderTarget.depthTexture?.dispose();
      occluderTarget.dispose();
      accumTarget.dispose();
      (accumBlit.material as THREE.Material).dispose();
    },
    [occluderTarget, accumTarget, accumBlit],
  );

  // Stable across quad rebuilds: the frame loop writes these every frame.
  const depthUniforms = useMemo(
    () => makeDepthCompositeUniforms() as DepthCompositeUniforms & Record<string, any>,
    [],
  );
  const modeStoreApi = useModeStoreApi();
  const ledger = usePressLedger();
  /** What `depthTarget` currently holds — latched when a pass renders, so
   * the composite never decodes a frame the target does not contain. */
  const depthInTargetRef = useRef<number>(DEPTH_VIEW_CODE.off);

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
  // Depth coding (hold Q) suspends the post: bloom and grading would shift
  // the depth hues off the legend. Rebuilds only this small composite quad.
  const depthViewOn = useModeStore((s) => s.depthView !== null);
  const postActive = cinematic && !depthViewOn && !isPostInert(post);
  // Read by the material builder without making it a dep: the SHAPE of the
  // chain depends on `postActive`, its VALUES ride live uniforms.
  const postRef = useRef(post);
  postRef.current = post;
  // The bloom re-runs only when its input or its settings changed (see
  // `VolumeBloomScheduling`): set on a volume render, a settings push and a
  // chain rebuild; cleared once a canvas pass has drawn the composite.
  const bloomDirtyRef = useRef(true);

  const quad = useMemo(() => {
    const material = new NodeMaterial();
    bloomDirtyRef.current = true;
    const chain = buildVolumeCompositeNode(
      target.texture,
      postActive ? postRef.current : null,
      {
        shouldUpdate: () => bloomDirtyRef.current,
        sizeOf: () => ({ width: target.width, height: target.height }),
      },
    );
    // The depth view composes over the SCIENTIFIC passthrough only (a depth
    // view turns the cinematic post off, see `postActive`). A runtime branch
    // on a uniform: pressing Q never rebuilds this material, and the 9 depth
    // taps (relief normal) run only while a depth view is on.
    material.colorNode = postActive
      ? chain.colorNode
      : TSL.Fn(() => {
          const out = TSL.vec4(chain.colorNode).toVar("compositeOut");
          TSL.If(TSL.float(depthUniforms.uDepthView).greaterThan(0.5), () => {
            out.assign(
              emitDepthComposite(depthUniforms, chain.colorNode, depthTarget.texture, TSL.screenUV),
            );
          });
          return out;
        })();
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
  }, [target, depthTarget, depthUniforms, postActive]);

  useEffect(
    () => () => {
      target.dispose();
      depthTarget.dispose();
      quad.geometry.dispose();
      const material = quad.material as THREE.Material;
      // Release the bloom node's mip render targets before the material.
      (material.userData.postChain as { dispose: () => void } | undefined)?.dispose();
      material.dispose();
    },
    [target, depthTarget, quad],
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
    bloomDirtyRef.current = true;
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
      settledRenderMs: meter.costMs(),
      settleAccumFrames: accumDoneRef.current,
    }));
    return () => viewerStoreApi.getState().registerVolumeCompositor(null);
  }, [viewerStoreApi, target, stats, meter]);

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
  /** When the volume target was last re-rendered (`streamRenderDue`). */
  const lastVolumeRenderAtRef = useRef(Number.NEGATIVE_INFINITY);
  /** The frame owed after a not-yet-due streaming frame was served cached. */
  const streamFrameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A tool's press holds stream-only renders back (see `streamDue` below);
  // when it ends, ask for the frame that shows what landed meanwhile — the
  // load may have finished under the press, and then nothing else would.
  useEffect(() => ledger.onEnd(() => invalidate()), [ledger, invalidate]);
  useEffect(
    () => () => {
      if (streamFrameTimerRef.current !== null) clearTimeout(streamFrameTimerRef.current);
    },
    [],
  );
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
      // Only when the settled render it doubles was cheap (the meter's probe
      // frames have run by now: they follow the render, the timer waits
      // 200 ms). A declined stage is simply not scheduled again until the
      // next settled render arms the ladder afresh.
      if (!settleRefineAffordable({ settledRenderMs: meter.costMs(), nextStage })) return;
      // The emit runs the whole chain: useStepScaleUniform recomputes the
      // boosted uMaxSteps (image material only), bumps volumeInputs and
      // invalidates; the next frame re-renders the target exactly once.
      perfMonitor.markEvent("volume:refineStage", { info: String(nextStage) }); // no-op unless recording
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

  // --- Settle accumulation (R12) --------------------------------------------
  /** Extra frames merged onto the settled render in the target; −1 = none. */
  const accumDoneRef = useRef(-1);
  /** The timer asked for the next accumulation frame. */
  const accumDueRef = useRef(false);
  const accumTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAccumTimer = () => {
    if (accumTimerRef.current !== null) {
      clearTimeout(accumTimerRef.current);
      accumTimerRef.current = null;
    }
    accumDueRef.current = false;
  };
  const scheduleAccum = (delayMs: number) => {
    clearAccumTimer();
    accumTimerRef.current = setTimeout(() => {
      accumTimerRef.current = null;
      const view = viewStoreApi.getState();
      if (view.cameraMoving || view.interacting || qualityGovernor.isStreaming()) return;
      // One accumulation frame costs what the settled render cost: spend it
      // only when that fits the budget of one ladder stage. Unmeasured = no.
      if (!settleRefineAffordable({ settledRenderMs: meter.costMs(), nextStage: 0 })) return;
      accumDueRef.current = true;
      invalidate();
    }, delayMs);
  };
  useEffect(() => clearAccumTimer, []);

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
      clearAccumTimer();
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
    const { scene, camera } = state;

    // World matrices BEFORE key derivation — the renderer would refresh them
    // mid-render, which is too late for a frame-accurate structure compare.
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();

    // ...and ONLY here. Every `gl.render` re-walks the whole graph for this
    // otherwise (`Renderer.render`: `if (scene.matrixWorldAutoUpdate)`), and a
    // volume frame renders up to three times — nothing moves between them
    // (the passes only toggle visibility and colorWrite; the composite quad
    // writes its matrixWorld directly).
    const sceneAutoUpdate = scene.matrixWorldAutoUpdate;
    const cameraAutoUpdate = camera.matrixWorldAutoUpdate;
    scene.matrixWorldAutoUpdate = false;
    camera.matrixWorldAutoUpdate = false;
    try {
      renderPasses(state);
    } finally {
      scene.matrixWorldAutoUpdate = sceneAutoUpdate;
      camera.matrixWorldAutoUpdate = cameraAutoUpdate;
    }
  };

  const renderPasses = (state: FrameState) => {
    const gl = state.gl as unknown as CompositorRenderer;
    const { scene, camera } = state;

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
    const streaming = qualityGovernor.isStreaming();
    const scale = resolveVolumeScale(qualityGovernor.getTier(), interacting, streaming);
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
      perfMonitor.markEvent("volume:targetResize", {
        info: `${nextSize.width}x${nextSize.height}`,
      }); // no-op unless recording
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
    const frameAt = performance.now();
    // Not while a tool's press is in flight: a re-raymarch only to show
    // newly landed bricks is the most expensive frame there is (~50 ms of GPU
    // on a slow machine), and under a drag it is the drag that pays — few,
    // late pointer moves. The cached composite is shown instead; the owed
    // frame below keeps knocking and renders once the press is over.
    const streamDue =
      !toolPressOpen(ledger) &&
      streamRenderDue(frameAt, lastVolumeRenderAtRef.current, profile.residencyBumpMs);
    const decision = decideVolumeFrame({
      cacheEnabled: true,
      hasTargetContent: hasContentRef.current,
      streaming,
      streamRenderDue: streamDue,
      key,
      trackerReason: viewer.volumeInputs.lastReason,
      previous: previousKeyRef.current,
    });
    if (decision.render) {
      lastVolumeRenderAtRef.current = frameAt;
    } else if (streaming && !streamDue && streamFrameTimerRef.current === null) {
      // Bricks may have landed that this cached frame does not show. Owe the
      // frame that will: nothing else is guaranteed to ask for one once the
      // cadence elapses (the residency gate's own invalidate may have been
      // this very frame).
      streamFrameTimerRef.current = setTimeout(
        () => {
          streamFrameTimerRef.current = null;
          invalidate();
        },
        Math.max(
          // Held back by a press, the cadence has long elapsed: knock at the
          // cadence, not on every frame.
          toolPressOpen(ledger) ? STREAM_RENDER_CADENCE_SHARE * profile.residencyBumpMs : 0,
          STREAM_RENDER_CADENCE_SHARE * profile.residencyBumpMs -
            (frameAt - lastVolumeRenderAtRef.current),
        ),
      );
    }
    stats.onFrame(decision);
    perfMonitor.markVolumeFrame(decision.render ? decision.reason : "cached"); // no-op unless recording
    // The RESOLVED key, not the thunk-bearing input: it carries structureKey
    // only when the decision actually needed it (null otherwise, which the next
    // frame reads as "changed").
    previousKeyRef.current = decision.resolved;

    // --- Volume pass(es) into the target(s) ---------------------------------
    // The depth view (hold Q / Shift+Q) re-marches the same meshes with
    // `uDepthCode` on into `depthTarget`; hues need only that pass, the
    // relief view (normal colours, relief-shaded) both — 2× the march, but
    // only on re-render frames while the key is held.
    const depthView = modeStoreApi.getState().depthView;
    const renderVolumePass = (into: THREE.RenderTarget, depthEncoded: boolean) => {
      setDepthEncoding(sets.volumeMeshes, depthEncoded);
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
        gl.setRenderTarget(into);
        if (sets.occluders.length > 0 && DEPTH_TERMINATED_RAYS) {
          // Occluders alone, with their OWN materials and colorWrite off
          // (never scene.overrideMaterial — a plain override corrupts
          // BatchedMesh multi-draw ranges), into the occluder target's depth
          // TEXTURE; then the volumes alone, each ray ending at that depth.
          if (
            needsTargetResize(
              { width: occluderTarget.width, height: occluderTarget.height },
              { width: into.width, height: into.height },
            )
          ) {
            occluderTarget.setSize(into.width, into.height);
          }
          hideObjectsInto(sets.volumeMeshes, hideScratch.volumesPrepass);
          disableColorWriteInto(sets.occluders, hideScratch.colorWrite);
          gl.setRenderTarget(occluderTarget);
          gl.autoClear = true;
          try {
            gl.render(scene, camera);
          } finally {
            restoreColorWrite(hideScratch.colorWrite);
            restoreHidden(hideScratch.volumesPrepass);
          }
          hideObjectsInto(sets.occluders, hideScratch.occluders);
          setOccluderDepth(
            sets.volumeMeshes,
            occluderTarget.depthTexture,
            camera,
            into.width,
            into.height,
            drivenOccludersRef.current,
          );
          gl.setRenderTarget(into);
          gl.autoClear = true;
          gl.render(scene, camera);
        } else if (sets.occluders.length > 0) {
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
        bloomDirtyRef.current = true;
      } finally {
        // The canvas pass (labels, a direct render) must never read a depth
        // texture that belongs to another pass.
        setOccluderDepth(sets.volumeMeshes, null, camera, 1, 1, drivenOccludersRef.current);
        // `restoreHidden` is a no-op on an empty (never filled) list.
        restoreHidden(hideScratch.occluders);
        restoreHidden(hideScratch.others);
        sceneWithBackground.background = prevBackground;
        gl.autoClear = prevAutoClear;
        gl.setClearColor(scratchClearColor, prevClearAlpha);
        gl.setRenderTarget(prevTarget);
      }
    };
    if (decision.render) {
      try {
        if (depthView !== "hues") renderVolumePass(target, false);
        if (depthView) {
          if (needsTargetResize({ width: depthTarget.width, height: depthTarget.height }, nextSize)) {
            depthTarget.setSize(nextSize.width, nextSize.height);
          }
          renderVolumePass(depthTarget, true);
          latchReliefFrame(depthUniforms, sets.volumeMeshes, camera, depthTarget.height);
        }
        depthInTargetRef.current = depthView ? DEPTH_VIEW_CODE[depthView] : DEPTH_VIEW_CODE.off;
      } finally {
        // The canvas pass (and any capture) must never see a material left
        // writing packed depth.
        setDepthEncoding(sets.volumeMeshes, false);
      }
    }
    depthUniforms.uDepthView.value = depthInTargetRef.current;
    depthUniforms.uDepthTexel.value.set(1 / depthTarget.width, 1 / depthTarget.height);

    // --- Settle accumulation (R12) -----------------------------------------
    // Refine a settled max-projection frame over a few ORDINARY-cost renders
    // (jitter moved by a fraction of the pitch, per-texel max into the
    // target) instead of the ladder's one double-cost render.
    const settledDpr = resolveDpr(profile, state.viewport.initialDpr, false);
    const accumEligible =
      SETTLE_ACCUMULATE && !depthView && allMaxProjections(sets.volumeMeshes);
    const accumAction = decideSettleAccumulate({
      enabled: accumEligible,
      quiet: !interacting && !streaming && scale === 1 && dpr >= settledDpr - 1e-6,
      rendered: decision.render,
      due: accumDueRef.current,
      done: accumDoneRef.current,
    });
    if (accumAction === "base") {
      accumDoneRef.current = 0;
      // 200 ms of quiet first — the ladder's own delay, and long enough for
      // the settled-render meter's probe frames to have read its cost.
      scheduleAccum(SETTLE_REFINE_DELAY_MS);
    } else if (accumAction === "reset") {
      accumDoneRef.current = -1;
      clearAccumTimer();
    } else if (accumAction === "accumulate") {
      accumDueRef.current = false;
      const index = accumDoneRef.current + 1;
      if (needsTargetResize({ width: accumTarget.width, height: accumTarget.height }, nextSize)) {
        accumTarget.setSize(nextSize.width, nextSize.height);
      }
      setJitterPhase(sets.volumeMeshes, settleAccumPhase(index));
      try {
        renderVolumePass(accumTarget, false);
      } finally {
        setJitterPhase(sets.volumeMeshes, 0);
      }
      const prevTarget = gl.getRenderTarget();
      const prevAutoClear = gl.autoClear;
      try {
        gl.autoClear = false;
        gl.setRenderTarget(target);
        accumBlit.render(gl as unknown as Parameters<typeof accumBlit.render>[0]);
      } finally {
        gl.autoClear = prevAutoClear;
        gl.setRenderTarget(prevTarget);
      }
      bloomDirtyRef.current = true;
      accumDoneRef.current = index;
      perfMonitor.markEvent("volume:accumulate", { info: String(index) }); // no-op unless recording
      if (index < SETTLE_ACCUM_FRAMES - 1) scheduleAccum(SETTLE_ACCUM_INTERVAL_MS);
    }

    // --- Settled-render cost ---------------------------------------------------
    // The meter needs the frames AFTER a settled render to see what it cost
    // (the GPU is still on it when gl.render returns); it asks for them here
    // and they are cached composites. Read when the ladder timer fires.
    const { probe } = meter.onFrame(
      performance.now(),
      decision.render && scale === 1 && !interacting && !streaming,
    );
    if (probe) invalidate();

    // --- Settle refinement ladder seam -------------------------------------
    // "A volume render just completed while settled at full res" is literally
    // true here; advance is deferred by the quiet timer, reset is immediate.
    const refine = decideSettleRefine({
      // The OR'd interaction flag: a window drag holds the ladder down
      // exactly as camera motion does, and its falling edge advances it.
      cameraMoving: interacting,
      streaming,
      // Accumulation replaces the ladder where it applies; the ladder keeps
      // the frames it cannot refine (a VOLUME or ISO member on screen).
      enabled: !accumEligible,
      cacheEnabled: true,
      renderedThisFrame: decision.render,
      scale,
      // Wait for QualityAdapter's DPR restore before spending boosted
      // renders — see decideSettleRefine's atSettledDpr doc.
      atSettledDpr: dpr >= settledDpr - 1e-6,
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
      // The composite drew, so the bloom (if any) consumed its input.
      if (quad.visible) bloomDirtyRef.current = false;
    } finally {
      quad.visible = false;
      restoreHidden(volumesCanvas);
    }
  };

  return <primitive object={quad} />;
};
