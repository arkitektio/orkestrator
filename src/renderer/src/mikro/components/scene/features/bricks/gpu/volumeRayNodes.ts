import * as THREE from "three";
import * as TSLTyped from "three/tsl";

// Same dynamic-typing bargain as `brickNodeMaterials.ts` — see its header.
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const {
  Break,
  Fn,
  If,
  Loop,
  cameraPosition,
  float,
  floor,
  int,
  max,
  min,
  modelWorldMatrixInverse,
  positionGeometry,
  sign,
  varying,
  vec3,
  vec4,
} = TSL;

/**
 * The ray-march scaffolding a brick-pool VOLUME material needs before it can
 * sample anything: the unit-box ray, the base-voxel map, the per-sample LOD pick
 * and the empty-space hop.
 *
 * Extracted so the intensity raymarcher and the LABEL raymarcher share one copy.
 * Not a tidiness move — `desiredLevelAt` mirrors the planner's `wantFiner`
 * (`nodePlanning.ts`) and the module it came from says in as many words that the
 * two must stay in lockstep. A second hand-copied version is precisely how that
 * invariant rots: the planner would fetch one level and the shader read another,
 * which shows up as detail flipping with zoom rather than as anything that looks
 * like a bug in either file.
 *
 * Everything here is CHANNEL-AGNOSTIC. What a sample MEANS — an intensity to
 * normalize through a transfer function, or an object id to compare against a
 * background — is the caller's, and is the only thing the two materials do
 * differently.
 */

/** Compile-time ray-loop bound. The per-tier cap is a uniform; see `uMaxSteps`. */
export const MAX_RAY_STEPS = 512;

/**
 * The uniforms the scaffolding reads. Owned by the caller, so it can drive them.
 *
 * Typed `any` for the same reason the rest of the node graph is (see the header):
 * these are TSL nodes, and the graph calls comparison/arith METHODS on them that
 * three's TypeScript surface does not expose. The consumer-facing view — what a
 * layer component writes `.value` on — is hand-typed as `UniformNodeLike` on each
 * material's public `…MaterialNodes` record, exactly as `TraversalNodesPublic` is
 * the typed view of `makeTraversalNodes`'s `any`.
 *
 *  - `uBaseShape` — base-level (level-0) spatial shape in voxels.
 *  - `uDesiredLevel` — floor on the per-sample level: never finer than the plan
 *    fetched.
 *  - `uLodBias` — multiplier on the px-per-voxel test; >1 biases FINER (the
 *    test is `pxPerVoxel * lodBias >= 1`, so a larger multiplier lets a finer
 *    level pass it). The DebugPanel exposes it as "LOD Aggressiveness",
 *    default 1. This comment previously said "coarser", contradicting both
 *    its own code below and `features/bricks/octree/viewportPlanning.ts`'s `chooseLodForScale`.
 *  - `uPxPerVoxelAtUnitDist` — screen px per base voxel at unit distance; ≤0
 *    disables the per-sample LOD pick entirely.
 *  - `uVoxelWorldSize` — per-axis world length of one base voxel (the planner's
 *    `NodeCamera.voxelWorldSize`; `voxelWorldSizeOf(affine)`). Drives the
 *    world-metric LOD pick in `desiredLevelAt` — UNIFORM-driven, no compile
 *    branch: at the default (1,1,1) every expression reduces to the legacy
 *    voxel metric exactly, which is also how `orkestrator.worldLod` OFF is
 *    expressed (the push site sends identity).
 */
export type VolumeRayUniforms = {
  uBaseShape: any;
  uDesiredLevel: any;
  uLodBias: any;
  uPxPerVoxelAtUnitDist: any;
  uVoxelWorldSize: any;
};

export const makeVolumeRayUniforms = (): VolumeRayUniforms => ({
  uBaseShape: TSL.uniform(new THREE.Vector3(1, 1, 1), "vec3"),
  uDesiredLevel: TSL.uniform(0, "int"),
  uLodBias: TSL.uniform(1, "float"),
  uPxPerVoxelAtUnitDist: TSL.uniform(0, "float"),
  uVoxelWorldSize: TSL.uniform(new THREE.Vector3(1, 1, 1), "vec3"),
});

export type VolumeRayNodes = {
  /** Camera in object space, interpolated per fragment. */
  vOrigin: any;
  /** Object-space direction from the camera toward this fragment's vertex. */
  vDirection: any;
  /** Unit-box local ([-0.5,0.5]) → base voxel. */
  toBaseVoxel: any;
  /** The level to sample at a point, given the camera's base-voxel position. */
  desiredLevelAt: any;
  /** Exit distance along the ray (from a point) of a level's brick cell. */
  brickExitRel: any;
};

/**
 * Build the scaffolding against a traversal-node record (`makeTraversalNodes`)
 * and the caller's uniforms.
 */
export const makeVolumeRayNodes = (t: any, u: VolumeRayUniforms): VolumeRayNodes => {
  // Unit-box local ray, interpolated per fragment (parity with the GLSL vertex
  // stage): origin = camera in object space, direction toward vertex.
  const vOrigin = varying(
    modelWorldMatrixInverse.mul(vec4(cameraPosition, 1.0)).xyz,
    "vOrigin",
  );
  const vDirection = varying(positionGeometry.sub(vOrigin), "vDirection");

  // Corner-anchored, no flip: the mesh is positioned so group-local spans
  // [0..shape], and this map only undoes the unit-box parameterization
  // (COORDINATE_SYSTEMS.md conventions).
  const toBaseVoxel = Fn(([p]: any[]) => {
    const q = vec3(p);
    return vec3(q.x.add(0.5), q.y.add(0.5), q.z.add(0.5)).mul(u.uBaseShape);
  });

  const desiredLevelAt = Fn(([baseVoxel, cameraBase]: any[]) => {
    const out = int(t.uNumLevels).sub(1).toVar("lodOut");
    If(u.uPxPerVoxelAtUnitDist.lessThanEqual(0.0), () => {
      out.assign(u.uDesiredLevel);
    }).Else(() => {
      // WORLD-metric distance and level factors (planner lockstep — this
      // mirrors `wantFiner`'s `footprintPxOf`/`finerFactorOf`, nodePlanning
      // .ts): voxel displacement scaled per axis by uVoxelWorldSize, min
      // clamp one world voxel (max axis; ≡ the legacy `max(dist, 1)` at the
      // identity uniform).
      const w = vec3(u.uVoxelWorldSize);
      const worldDelta = vec3(baseVoxel).sub(vec3(cameraBase)).mul(w);
      const minWorld = max(w.x, max(w.y, w.z));
      const dist = max(TSL.length(worldDelta), minWorld);
      const pxPerWorldUnit = float(u.uPxPerVoxelAtUnitDist).div(dist);
      // Unique iterator name: this Fn inlines into the ray loop (see the
      // emitResolveBrickResidency shadowing note).
      Loop(
        { start: int(0), end: int(t.uNumLevels).sub(1), type: "int", condition: "<", name: "dlv" },
        ({ dlv }: any) => {
          // MAX spatial factor — DELIBERATELY stays max-based even when the
          // planner's `wantFiner` runs the anisotropy-aware criterion
          // (`orkestrator.anisoLod`, nodePlanning.ts `anisoEffectiveFactor`):
          // this clamps to uDesiredLevel below and falls back per-sample to
          // resident coarser data, so the planner alone decides what is
          // fetched AND displayed — a max-based "desire" finer than the
          // admission just resolves to the fetched level. The residual cost
          // is stride only (bounded ≤2×, ≈1.46× on true-factor pyramids).
          // `Break` on the first hit — this runs per SAMPLE per FRAGMENT,
          // and the previous flag-guarded loop always walked every level.
          // Factors are the level's WORLD sample sizes (lvlScale·w) to match
          // pxPerWorldUnit; identity w ⇒ the legacy voxel factors.
          const lvlScale = vec3(t.uLevelScale.element(dlv)).mul(w);
          If(
            pxPerWorldUnit
              .mul(max(lvlScale.x, max(lvlScale.y, lvlScale.z)))
              .mul(u.uLodBias)
              .greaterThanEqual(1.0),
            () => {
              out.assign(max(int(dlv), int(u.uDesiredLevel)));
              Break();
            },
          );
        },
      );
    });
    return out;
  });

  // Exit distance (along the ray, from pB) of the level's brick cell.
  const brickExitRel = Fn(([pB, invD, lvl]: any[]) => {
    const cell = vec3(t.uBrickPayload).mul(vec3(t.uLevelScale.element(lvl)));
    const lo = floor(vec3(pB).div(cell)).mul(cell);
    const t1 = lo.sub(pB).mul(invD);
    const t2 = lo.add(cell).sub(pB).mul(invD);
    const tf = max(t1, t2);
    return max(min(tf.x, min(tf.y, tf.z)), 0.0);
  });

  return { vOrigin, vDirection, toBaseVoxel, desiredLevelAt, brickExitRel };
};

/** The ray's entry/exit along itself, in base-voxel space. */
export type VolumeRayBounds = {
  originB: any;
  dirB: any;
  invD: any;
  /** Entry distance, clamped to ≥0 (the camera may be inside the box). */
  boundsX: any;
  /** Exit distance. */
  boundsY: any;
  /** Exit − entry, floored away from zero. */
  rayLen: any;
};

/**
 * Emit the ray ∩ [0, baseShape] slab test into the CURRENT scope, discarding the
 * fragment when the ray misses the volume.
 *
 * A plain emitter rather than a TSL `Fn` for the same reason
 * `emitResolveBrickResidency` is: it has several outputs, and TSL inlines `Fn`
 * bodies in ways that have silently shadowed caller variables before.
 */
export const emitVolumeRayBounds = (
  rays: VolumeRayNodes,
  u: VolumeRayUniforms,
): VolumeRayBounds => {
  const originB = vec3(rays.toBaseVoxel(rays.vOrigin)).toVar();
  const exitLocal = vec3(rays.vOrigin).add(TSL.normalize(vec3(rays.vDirection)));
  const dirB = TSL.normalize(vec3(rays.toBaseVoxel(exitLocal)).sub(originB)).toVar();
  const safeDir = sign(dirB).mul(max(dirB.abs(), vec3(1e-6)));
  const invD = vec3(1.0).div(safeDir).toVar();

  const t0 = vec3(0.0).sub(originB).mul(invD);
  const t1v = vec3(u.uBaseShape).sub(originB).mul(invD);
  const tminv = min(t0, t1v);
  const tmaxv = max(t0, t1v);
  const boundsX = max(max(tminv.x, tminv.y), tminv.z).toVar();
  const boundsY = min(min(tmaxv.x, tmaxv.y), tmaxv.z).toVar();

  TSL.Discard(boundsX.greaterThan(boundsY));
  boundsX.assign(max(boundsX, 0.0));

  const rayLen = max(boundsY.sub(boundsX), 0.00001);
  return { originB, dirB, invD, boundsX, boundsY, rayLen };
};
