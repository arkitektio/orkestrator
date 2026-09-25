import type * as THREE from "three";

import { tubeClampValue } from "../../meshes/tubeMarch";
import type { MarcherId } from "../../meshes/marcher";
import { corridorVoxelCount } from "../../shared/corridorPlan";
import { voxelCost, type SkeletonWeights } from "../../shared/corridorCost";
import { backtrackPath } from "../../shared/geodesicReference";
import type {
  CenterlineResult,
  LevelTube,
  SkeletonEngine,
  SkeletonEngineContext,
  TubeOptions,
} from "../../shared/engine";
import {
  boxRelative,
  centerlineToWorld,
  soupToWorld,
  touchesBoundary,
  type PickedCorridor,
} from "../../shared/planning";
import { resampleStroke, type BrushSample, type Vec3 } from "../../shared/strokeModel";
import type { TubeSurface } from "../../brushSkeletonStore";

/**
 * The ENGINE-LEVEL half of the brush/blob extractions, hook-free: everything
 * between "a stroke/click in world coordinates" and "a centerline and/or a
 * world-space tube surface". `useBrushSkeleton` (the ANNOTATE gesture) and
 * the mesh-design tools (`features/meshDesign/tools/*`) both run through
 * these, so the two paths cannot drift — and neither imports the other,
 * which keeps the module graph acyclic.
 */

/** The stroke polyline the corridor test walks per voxel — kept small. */
export const MAX_STROKE_POINTS = 128;

/** The GROW gesture (a click, not a stroke): the search sphere expands by
 * this factor per step until the surface stops touching its boundary. */
const GROW_FACTOR = 1.5;
const MAX_GROW_STEPS = 10;

/**
 * Everything an extraction needs about the target layer, resolved once per
 * gesture from the stores (by `useBrushSkeleton.resolveContext`).
 */
export type ExtractionContext = {
  layerId: string;
  affine: THREE.Matrix4;
  inverse: THREE.Matrix4;
  voxelSize: readonly [number, number, number];
  levelSteps: readonly (readonly [number, number, number])[];
  shape: readonly [number, number, number];
  startLevel: number;
  engineContext: SkeletonEngineContext;
  /** GPU first when alive, CPU always last. */
  engines: SkeletonEngine[];
  plan: (opts: {
    strokeWorld: readonly Vec3[];
    radiusWorld: number;
    maxVoxels: number;
    /** Detail floor in world units; see `brushSkeletonStore.detailVoxels`. */
    minSpacingWorld?: number;
  }) => PickedCorridor | null;
};

export type StrokeExtractionOptions = {
  radiusWorld: number;
  weights: SkeletonWeights;
  /** Windowed-intensity threshold τ the tube wraps (`voxelCost(τ)` = iso). */
  tau: number;
  wantTube: boolean;
  marcher: MarcherId;
  minSpacingWorld?: number;
  /** True aborts the walk (a newer gesture took over). */
  stale: () => boolean;
};

export type StrokeExtraction = {
  picked: PickedCorridor;
  /** Centerline in scene WORLD coordinates, seed → release. */
  points: Vec3[];
  holes: number;
  tube: TubeSurface | null;
  /** Human-readable degradations, in order. */
  notes: string[];
};

/**
 * The stroke pipeline: corridor plan → engines in order (each at its own
 * budget) → geodesic backtrack → world centerline (+ tube). Null when no
 * engine could answer or the ends could not be connected — the `notes` of
 * the failure are thrown as an Error message the caller shows verbatim.
 */
export async function runStrokeExtraction(
  ctx: ExtractionContext,
  stroke: readonly BrushSample[],
  opts: StrokeExtractionOptions,
): Promise<StrokeExtraction | null> {
  const strokeWorld = resampleStroke(stroke as BrushSample[], MAX_STROKE_POINTS);
  const tubeIso = voxelCost(opts.tau, opts.weights);
  const tubeOptions: TubeOptions | null = opts.wantTube
    ? {
        iso: tubeIso,
        clampValue: tubeClampValue(tubeIso),
        marcher: opts.marcher,
        smoothVoxels: 0,
        connectivity: null,
      }
    : null;

  let picked: PickedCorridor | null = null;
  let result: CenterlineResult | null = null;
  for (const engine of ctx.engines) {
    const enginePick = ctx.plan({
      strokeWorld,
      radiusWorld: opts.radiusWorld,
      maxVoxels: engine.maxCorridorVoxels,
      minSpacingWorld: opts.minSpacingWorld,
    });
    if (!enginePick) continue;
    result = await engine.centerline({
      picked: enginePick,
      strokeLevelPts: strokeWorld.map(enginePick.worldToLevelVoxel),
      radiusWorld: opts.radiusWorld,
      weights: opts.weights,
      seed: boxRelative(stroke[0].voxel, enginePick.box, enginePick.step),
      tube: tubeOptions,
    });
    if (opts.stale()) return null;
    if (result) {
      picked = enginePick;
      break;
    }
  }
  if (!picked || !result) {
    throw new Error("The stroke spans too much data — paint a shorter stroke");
  }

  // Tube asked for but not delivered (e.g. the GPU's tube pipeline is dead
  // while its centerline works): ask the CPU engine for the tube alone
  // rather than silently answering "just a path".
  let levelTube: LevelTube | null = result.tube;
  if (tubeOptions && !levelTube) {
    const cpu = ctx.engines.find((engine) => engine.kind === "cpu");
    if (cpu && corridorVoxelCount(picked.box) <= cpu.maxCorridorVoxels) {
      levelTube = await cpu.tube({
        picked,
        strokeLevelPts: strokeWorld.map(picked.worldToLevelVoxel),
        radiusWorld: opts.radiusWorld,
        weights: opts.weights,
        tube: tubeOptions,
      });
      if (opts.stale()) return null;
    }
  }

  const target = boxRelative(stroke[stroke.length - 1].voxel, picked.box, picked.step);
  const nodes = backtrackPath(result.field, picked.box, target);
  if (!nodes) {
    throw new Error(
      result.holes > 0
        ? "Could not connect the stroke's ends — data is still streaming in, try again"
        : "Could not connect the stroke's ends — try a larger radius",
    );
  }
  const points = centerlineToWorld(nodes, picked, ctx.affine);
  const tube: TubeSurface | null = levelTube
    ? {
        positions: soupToWorld(levelTube.positions, picked.step, ctx.affine),
        triangles: levelTube.triangles,
        truncated: levelTube.truncated,
      }
    : null;

  const notes: string[] = [];
  if (result.holes > 0) {
    notes.push(
      `Centerline may detour around ${result.holes} unloaded region${result.holes === 1 ? "" : "s"} — let streaming settle and re-extract`,
    );
  }
  if (tubeOptions && !tube) notes.push("Tube surface unavailable (GPU tube kernel failed)");
  if (tube?.truncated) notes.push("Tube surface truncated — raise the threshold or shrink the radius");

  return { picked, points, holes: result.holes, tube, notes };
}

export type GrowOptions = {
  seed: BrushSample;
  startRadius: number;
  weights: SkeletonWeights;
  /** Windowed-intensity inside threshold τ (also the connectivity's). */
  tau: number;
  smoothVoxels: number;
  gapVoxels: number;
  minSpacingWorld?: number;
  marcher: MarcherId;
  stale: () => boolean;
  publishLive: (tube: TubeSurface) => void;
};

export type GrowOutcome = { tube: TubeSurface; level: number; spacing: Vec3; closed: boolean };

/**
 * The blob's grow loop: expand the search sphere, extract the (smoothed,
 * connectivity-masked) surface each round via the first engine that answers,
 * stop when the surface closes.
 */
export async function runGrowLoop(ctx: ExtractionContext, opts: GrowOptions): Promise<GrowOutcome | null> {
  const { seed, weights, stale } = opts;
  const tubeIso = voxelCost(opts.tau, weights);
  const seedWorld = seed.world;
  let radius = opts.startRadius;
  let grown: { tube: TubeSurface; level: number; spacing: Vec3 } | null = null;

  for (let step = 0; step < MAX_GROW_STEPS; step += 1) {
    if (stale()) return null;

    let stepTube: LevelTube | null = null;
    let stepPick: PickedCorridor | null = null;
    for (const engine of ctx.engines) {
      const picked = ctx.plan({
        strokeWorld: [seedWorld],
        radiusWorld: radius,
        maxVoxels: engine.maxCorridorVoxels,
        minSpacingWorld: opts.minSpacingWorld,
      });
      if (!picked) continue;
      // Gap N bridges dark gaps up to ~N voxels: crossing a one-voxel gap
      // costs about one voxel of world length in the connectivity metric
      // (two half-priced boundary edges), and the +0.75 tolerates a seed
      // that probed a hair off the bright core.
      const gapLimitWorld = (opts.gapVoxels + 0.75) * Math.max(...picked.spacing);
      stepTube = await engine.tube({
        picked,
        strokeLevelPts: [picked.worldToLevelVoxel(seedWorld)],
        radiusWorld: radius,
        weights,
        tube: {
          iso: tubeIso,
          clampValue: tubeClampValue(tubeIso),
          marcher: opts.marcher,
          smoothVoxels: opts.smoothVoxels,
          connectivity: {
            tau: opts.tau,
            gapLimitWorld,
            seed: boxRelative(seed.voxel, picked.box, picked.step),
          },
        },
      });
      if (stale()) return null;
      if (stepTube) {
        stepPick = picked;
        break;
      }
    }
    if (!stepTube || !stepPick) break; // every engine declined: keep the last

    const worldTube: TubeSurface = {
      positions: soupToWorld(stepTube.positions, stepPick.step, ctx.affine),
      triangles: stepTube.triangles,
      truncated: stepTube.truncated,
    };
    grown = { tube: worldTube, level: stepPick.level, spacing: stepPick.spacing };
    const margin = 2 * Math.max(...stepPick.spacing);
    if (worldTube.triangles > 0 && !touchesBoundary(worldTube.positions, seedWorld, radius, margin)) {
      return { ...grown, closed: true };
    }
    if (worldTube.truncated) break; // growing further only truncates more
    opts.publishLive(worldTube); // the expansion animation
    radius *= GROW_FACTOR;
  }

  return grown ? { ...grown, closed: false } : null;
}
