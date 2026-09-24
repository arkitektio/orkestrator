import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  createPlaneNodeMaterial,
  updateChannelNodes,
  updateChannelWindows,
} from "../gpu/brickNodeMaterials";
import { buildChannelUniformData, buildChannelWindows } from "../gpu/channelUniforms";
import {
  buildChannelDataSignature,
  buildChannelWindowSignature,
} from "../gpu/channelDataSignature";
import {
  createIntensityPlaneMaterial,
  createRgbPlaneMaterial,
  updateIntensityNodes,
  updateRgbNodes,
} from "../gpu/intensityNodeMaterials";
import { buildRgbUniformData } from "../gpu/rgbUniforms";
import { buildIntensityUniformData, buildIntensityWindow } from "../gpu/intensityUniforms";
import { buildAffineMatrix } from "../../../platform/coords/worldTransform";
import { useViewerStore } from "../../../platform/stores/viewerStore";
import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { getBackendTexture, type SceneRenderer } from "../../../platform/gpu/sceneRenderer";
import { slabBaseZOf, useBrickLayer, useBrickPlaneProbe } from "./useBrickPlaneProbe";
import {
  useBrickMaterialBundle,
  usePlaneTraversalUniforms,
} from "./useBrickMaterialBundle";
import { useBrickStore } from "../store/brickSlice";

/**
 * Brick-pool replacement for `PlaneLayer` + per-chunk `ChunkPlane` meshes:
 * ONE full-layer quad whose fragment shader samples the layer's brick atlas
 * through the page table (`sampleBrick`), falling back to coarser resident
 * bricks per pixel — which is what retires the whole cover/backdrop
 * machinery. The multi-channel compositor (colormap atlas, clim/gamma/
 * opacity/invert, blend modes) is lifted from ChunkPlane verbatim.
 *
 * The probe — the group registration, the pointer gating and the voxel
 * resolution — lives in `useBrickPlaneProbe`, because it is the half a LABEL
 * plane needs unchanged: mapping a hit to a base voxel and reading the resident
 * value is the same question whether that value is an intensity or an object id.
 */

export const BrickPlaneLayer = ({ layerId }: { layerId: string }) => {
  perfMonitor.countRender("BrickPlaneLayer"); // no-op unless a perf recording is armed

  // SCALAR plan subscriptions only (P9c/P17, see BrickVolumeLayer): the plan
  // object churns identity per replan; this component consumes only these.
  const planTargetLevel = useBrickStore((s) => s.nodePlans[layerId]?.targetLevel);
  const planSlabZ = useBrickStore((s) => s.nodePlans[layerId]?.slabZ);
  const planHasNodes = useBrickStore(
    (s) => (s.nodePlans[layerId]?.nodes.length ?? 0) > 0,
  );
  // Re-render when the pool handle appears/rebuilds/disposes — pool lifecycle
  // only (see BrickVolumeLayer), never the streaming residency counter.
  useBrickStore((s) => s.poolsVersion);
  const brickSystem = useBrickStore((s) => s.brickSystem);
  const isDebug = useViewerStore((s) => s.debug);
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const layer = useBrickLayer(layerId);

  // VALUE-stable (the NetworkCollectionLayer idiom): a per-tick layer
  // replacement recomputes, but an unchanged placement returns the SAME
  // Matrix4 — R3F's matrix apply and every effect keyed on it stay quiet.
  // `buildAffineMatrix` reads ONLY `layer.affineMatrix` (worldTransform.ts).
  const affineRef = useRef<THREE.Matrix4 | null>(null);
  const affineMatrix = useMemo(() => {
    const next = layer ? buildAffineMatrix(layer) : new THREE.Matrix4().identity();
    if (affineRef.current?.equals(next)) return affineRef.current;
    affineRef.current = next;
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer?.affineMatrix]);

  const pool = brickSystem?.getLayerPool(layerId) ?? null;

  // Owns the group ref, the viewer registration and the pointer handlers —
  // shared with the label plane, which probes the same way over the same pool.
  const { groupRef, handlers } = useBrickPlaneProbe({ layerId, layer, pool });

  // --- Which compositor -----------------------------------------------------
  // Read ONCE per mount, like every other build-time shader flag: a material is
  // specialised when it is compiled, so a mid-session toggle takes effect on the
  // next scene mount rather than leaving a half-built material bound.
  const fastPathEnabled = true;
  // The layer's own `renderKind` is EARNED from its sources (layerModel.ts), so
  // this demotes itself the moment an edit gives the layer something the
  // specialised shader cannot express — and `variantKey` turns that into a
  // rebuild.
  const kind = layer?.renderKind;
  const variant: "intensity" | "rgb" | "graph" =
    fastPathEnabled && (kind === "intensity" || kind === "rgb") ? kind : "graph";

  // --- Channel derivation (ChunkPlane parity) -------------------------------
  // STRUCTURE-keyed (see channelDataSignature.ts): a clim/gamma drag moves
  // only the window signature, so this rebuild — a colormap atlas plus two
  // DataTextures per run — no longer fires per drag tick; the window effect
  // below writes the fresh scalars into the existing nodes instead.
  const channelStructureKey = useMemo(() => buildChannelDataSignature(layer), [layer]);
  const channelWindowKey = useMemo(() => buildChannelWindowSignature(layer), [layer]);
  const channelData = useMemo(
    () =>
      buildChannelUniformData(
        layer,
        Math.max(0, (pool?.geometry.channelSlabCount ?? 1) - 1),
        pool?.minValue ?? 0,
        pool?.maxValue ?? 1,
        pool?.geometry,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      channelStructureKey,
      pool?.geometry,
      pool?.spec.channelCount,
      pool?.minValue,
      pool?.maxValue,
    ],
  );

  // The slim counterpart: no `sourceParams`/`cursors` DataTextures at all, so
  // the fast path also skips two RGBA32F allocations per transfer edit. Built
  // only when the variant takes it — `null` otherwise, so the general path pays
  // nothing for its existence.
  // STRUCTURE-keyed like `channelData` above: the structure signature already
  // covers colormap/color/slab/visibility/renderKind, and the window scalars
  // this leaves stale are re-written by the window fast path below — so a
  // clim drag no longer rebuilds the colormap atlas `buildIntensityUniformData`
  // allocates, nor re-uploads it (updateIntensityNodes memcpy + needsUpdate).
  const intensityData = useMemo(
    () =>
      variant === "intensity"
        ? buildIntensityUniformData(
            layer,
            Math.max(0, (pool?.geometry.channelSlabCount ?? 1) - 1),
            pool?.minValue ?? 0,
            pool?.maxValue ?? 1,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, channelStructureKey, pool?.geometry, pool?.minValue, pool?.maxValue],
  );

  // The rgb counterpart: five scalars, no textures of its own at all.
  const rgbData = useMemo(
    () =>
      variant === "rgb"
        ? buildRgbUniformData(
            layer,
            Math.max(0, (pool?.geometry.channelSlabCount ?? 1) - 1),
            pool?.minValue ?? 0,
            pool?.maxValue ?? 1,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, channelStructureKey, pool?.geometry, pool?.minValue, pool?.maxValue],
  );

  // NOTE: the colormap atlas is NOT disposed per channelData change — the
  // material stays bound to one long-lived texture whose contents
  // `updateChannelNodes` refreshes in place (disposing a still-bound texture
  // made WebGPU sample its default white texture → gray composites). The
  // bound texture is disposed with the bundle below.

  const slabBaseZ = slabBaseZOf(planSlabZ, pool);

  // TSL node material. Recreated only when
  // the pool is rebuilt (mesh remounts on that key); everything dynamic flows
  // through the uniform NODES below.
  const bundle = useBrickMaterialBundle(
    pool,
    (p) =>
      rgbData
        ? { variant: "rgb" as const, ...createRgbPlaneMaterial(p, p, rgbData) }
        : intensityData
          ? { variant: "intensity" as const, ...createIntensityPlaneMaterial(p, p, intensityData) }
          : { variant: "graph" as const, ...createPlaneNodeMaterial(p, p, channelData) },
    (b) => {
      // The rgb material owns no textures; the other two own a colormap atlas
      // (whatever is bound at teardown — adoption keeps it long-lived), and only
      // the general one allocated the two params textures.
      if (b.variant === "rgb") return;
      b.nodes.colormapAtlas.value?.dispose();
      if (b.variant === "graph") {
        b.nodes.sourceParams?.value?.dispose();
        b.nodes.cursorParams?.value?.dispose();
      }
    },
    variant,
  );

  // Push dynamic values straight to the uniform nodes (no material rebuild).
  useEffect(() => {
    if (!bundle || planTargetLevel === undefined) return;
    if (bundle.variant === "rgb") {
      if (rgbData) updateRgbNodes(bundle.nodes, rgbData);
    } else if (bundle.variant === "intensity") {
      if (intensityData) updateIntensityNodes(bundle.nodes, intensityData);
    } else {
      updateChannelNodes(bundle.nodes, channelData);
    }
    bundle.nodes.minValue.value = pool?.minValue ?? 0;
    bundle.nodes.maxValue.value = pool?.maxValue ?? 1;
    // EMPTY page entries are re-encoded against the pool range whenever it
    // moves (auto-contrast float pools) — the decode uniforms must follow or
    // uniform-fill bricks render at increasingly wrong intensities. The 3D
    // path does the same in BrickVolumeLayer's decode-uniform effect; this
    // effect re-runs on range moves via the channelData memo + the
    // poolsVersion subscription above.
    bundle.nodes.uEmptyDecodeMin.value = pool?.minValue ?? 0;
    bundle.nodes.uEmptyDecodeRange.value = (pool?.maxValue ?? 1) - (pool?.minValue ?? 0);

    // Channel-compositor diagnostic (debug overlay on): the exact uniform +
    // colormap-row state the shader consumes, one line per update. Pair with
    // the debug report's channelSlabProbe (atlas slab contents) to separate
    // LUT bugs / repack bugs / shader-tap bugs when channels look wrong.
    if (isDebug && bundle.variant === "intensity" && intensityData) {
      // The fast path's counterpart of the channel-uniform dump below. Smaller
      // because the state IS smaller — that is the point — but it must exist:
      // the kill switch is the only GPU-regression tool here, and a bisect
      // needs both sides to say what they were handed.
      const atlasData = intensityData.atlas.image.data as Uint8Array;
      console.log(`[bricks] ${layerId} intensity uniforms`, {
        variant: "intensity",
        slab: intensityData.slab,
        climMin: intensityData.climMin,
        climMax: intensityData.climMax,
        gamma: intensityData.gamma,
        // Centre texel of the single LUT row — the tint the shader multiplies
        // by the normalized intensity.
        rowColor: [atlasData[128 * 4], atlasData[128 * 4 + 1], atlasData[128 * 4 + 2]],
        colormapAtlasOnGpu: !!getBackendTexture(
          gl as unknown as SceneRenderer,
          bundle.nodes.colormapAtlas.value,
        ),
        slabBaseZ,
        targetLevel: planTargetLevel,
      });
    }
    if (isDebug && bundle.variant === "rgb" && rgbData) {
      console.log(`[bricks] ${layerId} rgb uniforms`, {
        variant: "rgb",
        ...rgbData,
        slabBaseZ,
        targetLevel: planTargetLevel,
      });
    }
    if (isDebug && bundle.variant === "graph") {
      const atlasData = channelData.atlas.image.data as Uint8Array;
      const rows = Math.max(1, channelData.numChannels);
      console.log(`[bricks] ${layerId} channel uniforms`, {
        numChannels: channelData.numChannels,
        channelIndex: channelData.channelIndex.slice(0, rows),
        visible: channelData.visible.slice(0, rows),
        row: channelData.row.slice(0, rows),
        climMin: channelData.climMin.slice(0, rows),
        climMax: channelData.climMax.slice(0, rows),
        // Center texel of each LUT row — the tint the shader multiplies by
        // the channel's normalized intensity.
        rowColors: Array.from({ length: rows }, (_, r) => {
          const idx = (r * 256 + 128) * 4;
          return [atlasData[idx], atlasData[idx + 1], atlasData[idx + 2]];
        }),
        // Backend GPU handles (of the BOUND textures): false = three is
        // sampling its default texture (silent-substitution family).
        colormapAtlasOnGpu: !!getBackendTexture(
          gl as unknown as SceneRenderer,
          bundle.nodes.colormapAtlas.value,
        ),
        brickAtlasOnGpu: pool
          ? !!getBackendTexture(gl as unknown as SceneRenderer, pool.atlas.texture)
          : null,
        slabDepth: pool?.spec.stored[2],
        channelCount: pool?.spec.channelCount,
        slabBaseZ,
        targetLevel: planTargetLevel,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, channelData, intensityData, rgbData, planTargetLevel, slabBaseZ, isDebug]);

  // WINDOW fast path, ALL variants: a clim/gamma/opacity drag moved only the
  // window signature, so the structure-keyed rebuilds above stayed put —
  // write the fresh scalars into the existing uniform nodes instead. Runs
  // redundantly after a structural rebuild — a harmless double write of
  // identical values.
  //
  // It MUST also re-run whenever the full push above does (same deps, and it
  // is declared after it so it lands last): that push writes the
  // STRUCTURE-keyed data, whose window scalars (clim, and an rgb layer's
  // white-balance gains) are stale by design. A zoom moves `planTargetLevel`,
  // re-runs the full push, and without this re-apply the window reverted to
  // whatever it was at the last structural rebuild. The explicit `invalidate()` matters: the frameloop is
  // "demand" (SceneViewport), and with the bridges isolated a drag tick may
  // cause NO React commit near the canvas to carry the redraw.
  useEffect(() => {
    if (!bundle) return;
    if (bundle.variant === "graph") {
      updateChannelWindows(
        bundle.nodes,
        buildChannelWindows(layer, pool?.minValue ?? 0, pool?.maxValue ?? 1),
      );
    } else if (bundle.variant === "intensity") {
      const window = buildIntensityWindow(layer, pool?.minValue ?? 0, pool?.maxValue ?? 1);
      bundle.nodes.uClimMin.value = window.climMin;
      bundle.nodes.uClimMax.value = window.climMax;
      bundle.nodes.uGamma.value = window.gamma;
    } else {
      // rgb owns no textures, so re-deriving the whole scalar set is the
      // window write (slabs land on their current values during a drag).
      updateRgbNodes(
        bundle.nodes,
        buildRgbUniformData(
          layer,
          Math.max(0, (pool?.geometry.channelSlabCount ?? 1) - 1),
          pool?.minValue ?? 0,
          pool?.maxValue ?? 1,
        ),
      );
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bundle,
    channelWindowKey,
    pool?.minValue,
    pool?.maxValue,
    // The full push's triggers — see above.
    channelData,
    intensityData,
    rgbData,
    planTargetLevel,
    slabBaseZ,
    isDebug,
  ]);

  // The traversal contract, shared with the other plane material.
  usePlaneTraversalUniforms(bundle?.nodes, {
    desiredLevel: planTargetLevel,
    slabBaseZ,
  });

  // Debug: dump the GENERATED fragment shader (WGSL on WebGPU) once per
  // material — ground truth for how TSL compiled the channel loop /
  // uniform-array indexing (the CPU-side uniform state can be perfect while
  // the codegen collapses e.g. `element(i)` — this is how we catch it).
  useEffect(() => {
    if (!isDebug || !bundle) return;
    const group = groupRef.current;
    const mesh = group?.children.find((child) => (child as THREE.Mesh).isMesh);
    if (!mesh) return;
    const debugApi = (
      gl as unknown as {
        debug?: {
          getShaderAsync?: (
            scene: THREE.Scene,
            camera: THREE.Camera,
            object: THREE.Object3D,
          ) => Promise<{ fragmentShader: string | null }>;
        };
      }
    ).debug;
    if (!debugApi?.getShaderAsync) return;
    void debugApi
      .getShaderAsync(scene, camera, mesh)
      .then(({ fragmentShader }) => {
        console.log(`[bricks] ${layerId} fragment shader\n`, fragmentShader);
      })
      .catch((error) => {
        console.warn(`[bricks] ${layerId} shader dump failed`, error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDebug, bundle]);

  if (layer?.visible === false) return null;
  if (!planHasNodes || !pool || !bundle) return null;

  const base = pool.geometry.levels[0];
  const totalX = base.spatialShape[0] * base.scale[0];
  const totalY = base.spatialShape[1] * base.scale[1];

  return (
    <group
      matrix={affineMatrix}
      matrixAutoUpdate={false}
      ref={groupRef}
      // The probe handlers come from `useBrickPlaneProbe` — spread rather than
      // written out, because `undefined` vs a function is the raycast gate (P20)
      // and the hook is what decides it.
      {...handlers}
    >
      {/* Corner-anchored: the unit quad is offset by half its size so group-
          local spans [0..shape] and voxel v renders at exactly affine(v) —
          COORDINATE_SYSTEMS.md "Coordinate conventions". */}
      <mesh
        key={pool.structureSignature}
        scale={[totalX, totalY, 1]}
        position={[totalX / 2, totalY / 2, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[1, 1]} />
        {/* TSL node material — see brickNodeMaterials.ts (WGSL + GLSL). */}
        <primitive object={bundle.material} attach="material" />
      </mesh>
    </group>
  );
};
