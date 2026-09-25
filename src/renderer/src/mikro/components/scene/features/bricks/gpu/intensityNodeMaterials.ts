import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import * as TSLTyped from "three/tsl";

// Same dynamic-node discipline as `brickNodeMaterials.ts`: the node GRAPH is
// typed dynamically, the PUBLIC surface (the uniform-node record the layer
// components write to) is hand-typed below.
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const { Fn, If, float, uniform, uv, vec2, vec3, vec4 } = TSL;

import {
  commonMaterialSettings,
  emitChannelTap,
  emitResolveBrickResidency,
  emitRgbTaps,
  emitScalarNormalize,
  makeTraversalNodes,
  type TraversalNodesPublic,
  type UniformNodeLike,
} from "./brickNodeMaterials";
import type { LayerBrickPool } from "../residency/brickResidency";
import { INTENSITY_ATLAS_ROW, type IntensityUniformData } from "./intensityUniforms";
import type { RgbUniformData } from "./rgbUniforms";

// FIXED-SHAPE materials: the 2D plane compositors for the recipe shapes
// `resolveRenderKind` can declare — "intensity" (one scalar channel) and "rgb"
// (three basis-tinted channels over one window). The 3D counterparts are the
// `emitSimple` / `emitRgb` member arms of the volume raymarcher in
// `brickNodeMaterials.ts`; the uniform data they are all handed comes from
// `intensityUniforms.ts` / `rgbUniforms.ts`, each pinned equal to the general
// builder's slots by its own test.

/**
 * The compositor for a layer whose recipe shape is DECLARED.
 *
 * **This material computes nothing the general material does not; it computes
 * less of it.** Every value it is handed is produced by the same helpers
 * (`buildIntensityUniformData`, asserted equal to slot 0 of
 * `buildChannelUniformData` in `intensityUniforms.test.ts`), and every piece of
 * traversal is IMPORTED from `brickNodeMaterials` rather than restated:
 * `makeTraversalNodes`, `emitResolveBrickResidency`, `emitChannelTap`,
 * `commonMaterialSettings`. What is different is only what is left out.
 *
 * Left out, and what each cost in the general emitter's innermost region:
 *
 * | Dropped | Cost it carried |
 * |---|---|
 * | `Loop(0..MAX_CHANNELS)` + its `Break` and `Continue` | a loop header and two dynamic branches per fragment |
 * | `chParamsA` / `chParamsB` `uniformArray(vec4 × 16)` | **two of the ~12 WebGPU uniform-buffer bindings per stage** — replaced by four plain `uniform()`s, which pack into three's shared node group and cost none |
 * | the `sourceParams` kind tap and the phasor branch | one texture binding plus a `textureLoad` per slot |
 * | the `cursorParams` binding | one texture binding (and its `DataTexture`, never allocated) |
 * | the blend-mode `If/ElseIf/Else` | two dynamic branches per slot |
 * | `invert` and per-slot `opacity` | a branch and a multiply, both constants here |
 * | the `row` uniform | a one-row atlas puts the row at a compile-time 0.5 |
 *
 * The blend collapse is exact, and `resolveRenderKind` is what makes it so: at
 * ONE slot the general emitter's additive and normal arms both reduce to
 * `color * weight` over a zero-seeded accumulator, while MULTIPLICATIVE seeds
 * to `vec3(1)` and does not — so a multiplicative layer never earns
 * `renderKind === "intensity"` and keeps the general path.
 */
export type IntensityPlaneNodes = TraversalNodesPublic & {
  /** One-row colormap LUT. A tint and a named ramp are both baked into it. */
  colormapAtlas: UniformNodeLike<THREE.Texture>;
  /** The pool's base-native value range — it MOVES on an auto-range pool. */
  minValue: UniformNodeLike<number>;
  maxValue: UniformNodeLike<number>;
  uClimMin: UniformNodeLike<number>;
  uClimMax: UniformNodeLike<number>;
  uGamma: UniformNodeLike<number>;
  /** Atlas-slab index of the single source's channel. */
  uSlab: UniformNodeLike<number>;
  uDesiredLevel: UniformNodeLike<number>;
  uSlabBaseZ: UniformNodeLike<number>;
  uBaseShape: UniformNodeLike<THREE.Vector3>;
};

export type IntensityPlaneBundle = {
  material: NodeMaterial;
  nodes: IntensityPlaneNodes;
};

const makeIntensityNodes = (data: IntensityUniformData): any => ({
  // A shared TextureNode, so a colormap edit swaps the rebuilt atlas via
  // `.value = next` without rebuilding the material — same contract the
  // general material keeps.
  colormapAtlas: TSL.texture(data.atlas),
  minValue: uniform(0, "float"),
  maxValue: uniform(1, "float"),
  uClimMin: uniform(data.climMin, "float"),
  uClimMax: uniform(data.climMax, "float"),
  uGamma: uniform(data.gamma, "float"),
  uSlab: uniform(data.slab, "int"),
});

/**
 * Push fresh uniform data into an existing bundle (no rebuild).
 *
 * The sibling of `updateChannelNodes`, and it adopts the colormap atlas the
 * same way: the material stays bound to one long-lived texture whose CONTENTS
 * are refreshed, because disposing a still-bound texture makes WebGPU sample
 * its default white texture (gray composites).
 */
export function updateIntensityNodes(
  nodes: IntensityPlaneNodes,
  data: IntensityUniformData,
): void {
  const bound = nodes.colormapAtlas.value as THREE.DataTexture | null;
  const next = data.atlas;
  if (bound && bound !== next && bound.image.width === next.image.width) {
    (bound.image.data as Uint8Array).set(next.image.data as Uint8Array);
    bound.needsUpdate = true;
    next.dispose();
  } else if (bound !== next) {
    bound?.dispose();
    nodes.colormapAtlas.value = next;
  }
  nodes.uClimMin.value = data.climMin;
  nodes.uClimMax.value = data.climMax;
  nodes.uGamma.value = data.gamma;
  nodes.uSlab.value = data.slab;
}

/**
 * The scalar transfer for the intensity path: the SHARED `emitScalarNormalize`
 * (the same emitter `makeChannelNormalize` wraps for the general path) fed
 * plain uniforms instead of a `chParamsA.element(i)` read, and without the
 * `invert` branch `renderKind === "intensity"` rules out. Sharing the emitter
 * is what keeps the arithmetic identical by construction rather than by
 * discipline.
 */
const emitNormalize = (n: any, raw: any) =>
  emitScalarNormalize(n, { climMin: n.uClimMin, climMax: n.uClimMax, gamma: n.uGamma }, raw);

/**
 * 2D plane compositor for a fixed-shape intensity layer.
 *
 * The traversal is byte-for-byte the general plane material's: the same uv →
 * base-voxel mapping (corner-anchored, no flip — COORDINATE_SYSTEMS.md), the
 * same single `emitResolveBrickResidency` with `slabZ`, and nothing resident
 * leaves the accumulator at zero (transparent).
 */
export function createIntensityPlaneMaterial(
  pool: LayerBrickPool,
  dataRange: { minValue: number; maxValue: number },
  data: IntensityUniformData,
): IntensityPlaneBundle {
  const t = makeTraversalNodes(pool, dataRange);
  const n = makeIntensityNodes(data);
  n.minValue.value = dataRange.minValue;
  n.maxValue.value = dataRange.maxValue;

  const uDesiredLevel = uniform(0, "int");
  /** INTEGER base slab z — the slab-mode resolve does the per-level floor +
   * recenter itself (see emitResolveBrickResidency), so no +0.5 here. */
  const uSlabBaseZ = uniform(0, "float");
  const uBaseShape = uniform(new THREE.Vector3(1, 1, 1), "vec3");

  const material = new NodeMaterial();
  commonMaterialSettings(material);
  material.depthTest = false;

  material.fragmentNode = Fn(() => {
    const baseVoxel = vec3(
      uv().x.mul(uBaseShape.x),
      uv().y.mul(uBaseShape.y),
      uSlabBaseZ,
    ).toVar("pxBaseVoxel");

    const accum = vec3(0.0).toVar("accum");

    const resolved = emitResolveBrickResidency(t, baseVoxel, uDesiredLevel, {
      slabZ: true,
    });

    If(resolved.status.greaterThanEqual(0.5), () => {
      const raw = emitChannelTap(t, resolved, n.uSlab, "ch");
      const norm = emitNormalize(n, raw);
      // Additive onto a zero accumulator IS assignment at one slot; per-slot
      // opacity is 1 by construction, so the weight is the normalized value.
      accum.assign(
        n.colormapAtlas.sample(vec2(norm, float(INTENSITY_ATLAS_ROW))).rgb.mul(norm),
      );
    });

    return vec4(accum, 1.0);
  })();

  return {
    material,
    nodes: { ...t, ...n, uDesiredLevel, uSlabBaseZ, uBaseShape } as IntensityPlaneNodes,
  };
}

// ---------------------------------------------------------------------------
// RGB
// ---------------------------------------------------------------------------

export type RgbPlaneNodes = TraversalNodesPublic & {
  /** The pool's base-native value range — it MOVES on an auto-range pool. */
  minValue: UniformNodeLike<number>;
  maxValue: UniformNodeLike<number>;
  /** The ONE contrast window all three channels share. */
  uClimMin: UniformNodeLike<number>;
  uClimMax: UniformNodeLike<number>;
  /** White-balance gain per primary (the slot opacities). */
  uGainR: UniformNodeLike<number>;
  uGainG: UniformNodeLike<number>;
  uGainB: UniformNodeLike<number>;
  /** Atlas-slab index of the red / green / blue channel. */
  uSlabR: UniformNodeLike<number>;
  uSlabG: UniformNodeLike<number>;
  uSlabB: UniformNodeLike<number>;
  uDesiredLevel: UniformNodeLike<number>;
  uSlabBaseZ: UniformNodeLike<number>;
  uBaseShape: UniformNodeLike<THREE.Vector3>;
};

export type RgbPlaneBundle = {
  material: NodeMaterial;
  nodes: RgbPlaneNodes;
};

const makeRgbNodes = (data: RgbUniformData): any => ({
  minValue: uniform(0, "float"),
  maxValue: uniform(1, "float"),
  uClimMin: uniform(data.climMin, "float"),
  uClimMax: uniform(data.climMax, "float"),
  uGainR: uniform(data.gainR, "float"),
  uGainG: uniform(data.gainG, "float"),
  uGainB: uniform(data.gainB, "float"),
  uSlabR: uniform(data.slabR, "int"),
  uSlabG: uniform(data.slabG, "int"),
  uSlabB: uniform(data.slabB, "int"),
});

/** Push fresh uniform data into an existing RGB bundle (no rebuild). Nothing
 * to adopt: this material owns no textures beyond the pool's. */
export function updateRgbNodes(nodes: RgbPlaneNodes, data: RgbUniformData): void {
  nodes.uClimMin.value = data.climMin;
  nodes.uClimMax.value = data.climMax;
  nodes.uGainR.value = data.gainR;
  nodes.uGainG.value = data.gainG;
  nodes.uGainB.value = data.gainB;
  nodes.uSlabR.value = data.slabR;
  nodes.uSlabG.value = data.slabG;
  nodes.uSlabB.value = data.slabB;
}

/**
 * The RGB transfer: the shared `emitScalarNormalize` per slab with the ONE
 * window and NO gamma (`pow(x, 1)` is `x`; the omission is exact), each
 * primary scaled by its white-balance gain.
 * CPU mirror: `shaderspec/rgbComposite.ts` `rgbSampleContribution`.
 */
export const emitRgbNormalize = (n: any, raw: { r: any; g: any; b: any }): any => {
  const window = { climMin: n.uClimMin, climMax: n.uClimMax, gamma: null };
  return vec3(
    emitScalarNormalize(n, window, raw.r).mul(n.uGainR),
    emitScalarNormalize(n, window, raw.g).mul(n.uGainG),
    emitScalarNormalize(n, window, raw.b).mul(n.uGainB),
  );
};

/**
 * 2D plane compositor for a fixed-shape RGB layer.
 *
 * Same traversal as the intensity plane (one residency resolve per pixel, then
 * taps), and the composite is the identity: the general path's contribution
 * for slot k is a CONSTANT basis tint × (gain_k · norm_k) summed additively
 * over a zero accumulator — see `rgbUniforms.ts` for why the tint rows are
 * constant — so three taps and three normalizes ARE the colour. Dropped
 * relative to the general plane material, per pixel: the 16-slot loop with its
 * `Break`/`Continue`, both `chParamsA/B` uniform-array bindings, the
 * `sourceParams` kind tap, the `cursorParams` binding, THREE colormap-atlas
 * samples and the colormap atlas texture itself, three blend branches, three
 * `pow`s. Bindings: the three traversal `uniformArray`s only.
 */
export function createRgbPlaneMaterial(
  pool: LayerBrickPool,
  dataRange: { minValue: number; maxValue: number },
  data: RgbUniformData,
): RgbPlaneBundle {
  const t = makeTraversalNodes(pool, dataRange);
  const n = makeRgbNodes(data);
  n.minValue.value = dataRange.minValue;
  n.maxValue.value = dataRange.maxValue;

  const uDesiredLevel = uniform(0, "int");
  const uSlabBaseZ = uniform(0, "float");
  const uBaseShape = uniform(new THREE.Vector3(1, 1, 1), "vec3");

  const material = new NodeMaterial();
  commonMaterialSettings(material);
  material.depthTest = false;

  material.fragmentNode = Fn(() => {
    const baseVoxel = vec3(
      uv().x.mul(uBaseShape.x),
      uv().y.mul(uBaseShape.y),
      uSlabBaseZ,
    ).toVar("pxBaseVoxel");

    const accum = vec3(0.0).toVar("accum");

    const resolved = emitResolveBrickResidency(t, baseVoxel, uDesiredLevel, {
      slabZ: true,
    });

    If(resolved.status.greaterThanEqual(0.5), () => {
      // ONE tap on an rgba8 atlas, three otherwise (emitRgbTaps).
      accum.assign(emitRgbNormalize(n, emitRgbTaps(t, resolved, [n.uSlabR, n.uSlabG, n.uSlabB], "ch")));
    });

    return vec4(accum, 1.0);
  })();

  return {
    material,
    nodes: { ...t, ...n, uDesiredLevel, uSlabBaseZ, uBaseShape } as RgbPlaneNodes,
  };
}
