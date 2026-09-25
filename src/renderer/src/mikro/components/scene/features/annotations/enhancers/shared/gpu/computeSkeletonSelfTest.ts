import type { BrickSpec } from "../../../../bricks/octree/brickSpec";
import type { LayerLevelGeometry } from "../../../../../platform/coords/levelGeometry";
import {
  decodeEmptyValue,
  encodeEmptyValue,
} from "../../../../bricks/octree/brickEncoding";
import {
  PAGE_FLAG_EMPTY,
  PAGE_FLAG_RESIDENT,
  buildPageTableLayout,
} from "../../../../bricks/octree/pageTableLayout";
import {
  DEFAULT_SKELETON_WEIGHTS,
  buildCostField,
  connectivityFromCost,
  maskFieldByDistance,
  voxelCost,
} from "../corridorCost";
import { smoothCostField } from "../fieldSmooth";
import { marchTube, tubeClampValue } from "../../meshes/tubeMarch";
import { planCorridor } from "../corridorPlan";
import { backtrackPath, geodesicField } from "../geodesicReference";
import type { Vec3 } from "../strokeModel";
import { getWebGPUDevice, type SceneRenderer } from "../../../../../platform/gpu/sceneRenderer";
import { createBrickAtlas, disposeBrickAtlas, writeBrickToAtlas } from "../../../../bricks/gpu/brickAtlas";
import { createGpuSkeletonizer } from "./computeSkeleton";
import {
  createPageTableTexture,
  disposePageTable,
  flushPageTable,
  setPageEntry,
} from "../../../../bricks/gpu/pageTableTexture";

/**
 * Dev-only GPU↔CPU skeleton parity check, run from the DebugPanel on the
 * LIVE renderer (`computeRepackSelfTest.ts` structure): builds a synthetic
 * one-level pool — a bright tube that SHIFTS at a brick seam, one EMPTY
 * uniform brick, one UNMAPPED brick — runs the GPU extraction
 * (`computeSkeleton`) and the CPU reference (`features/annotations/enhancers/shared`) over the same
 * corridor, and compares hole counts, distance fields (small float
 * tolerance: the two accumulate in f64 vs f32) and the backtracked
 * centerline's endpoints. The vitest suite pins the packing math; this pins
 * the WGSL + page-table/atlas binding model against it.
 */

export type GpuSkeletonSelfTestResult = {
  supported: boolean;
  pass: boolean;
  detail: string;
};

/** Relative distance tolerance — f64 (CPU) vs f32 (GPU) accumulation. */
const DIST_RTOL = 1e-3;

// The fixture: 32×8×8 level, 8³ payload + border. Bricks along x:
//   0: tube at y=3   1: tube at y=4 (the seam shift)   2: EMPTY (background)
//   3: UNMAPPED (the corridor's tail reaches it → holes).
const SPEC: BrickSpec = {
  payload: [8, 8, 8],
  border: 1,
  stored: [10, 10, 10],
  channelCount: 1,
};
const LEVEL_SHAPE: Vec3 = [32, 8, 8];
const BACKGROUND = 100;
const BRIGHT = 1000;
const MIN_VALUE = BACKGROUND;
const MAX_VALUE = BRIGHT;
const RANGE = MAX_VALUE - MIN_VALUE;

const STROKE_WORLD: Vec3[] = [
  [1.5, 3.5, 3.5],
  [12.5, 4.5, 3.5],
  // Ends over the EMPTY brick's background, close enough to brick 3 that the
  // corridor tube (radius below) reaches UNMAPPED voxels → holes > 0.
  [22.5, 4.5, 3.5],
];
const RADIUS = 3;

/** Raw value at a voxel — the analytic truth both sides sample. */
const valueAt = (x: number, y: number, z: number): number => {
  if (x >= 16) return BACKGROUND; // bricks 2 and 3 are pure background
  const tubeY = x < 8 ? 3 : 4;
  return y === tubeY && z === 3 ? BRIGHT : BACKGROUND;
};

const brickOf = (x: number): number => Math.floor(x / SPEC.payload[0]);

export async function runGpuSkeletonSelfTest(
  renderer: SceneRenderer,
): Promise<GpuSkeletonSelfTestResult> {
  if (!getWebGPUDevice(renderer)) {
    return { supported: false, pass: false, detail: "no GPU device (no compute)" };
  }
  const skeletonizer = createGpuSkeletonizer(renderer);
  if (!skeletonizer) {
    return { supported: false, pass: false, detail: "gpu skeletonizer unavailable" };
  }

  const geometry = {
    levels: [{ spatialShape: LEVEL_SHAPE, scale: [1, 1, 1] }],
  } as unknown as LayerLevelGeometry;
  const layout = buildPageTableLayout(geometry, SPEC.payload);
  if (!layout) {
    skeletonizer.dispose();
    return { supported: true, pass: false, detail: "page table layout failed" };
  }

  const atlas = createBrickAtlas({
    spec: SPEC,
    dtype: "float32",
    desiredSlots: 2,
    maxExtent: 64,
    filter: "nearest",
  });
  const pageTable = createPageTableTexture(layout);

  try {
    (renderer as unknown as { initTexture?: (t: unknown) => void }).initTexture?.(
      atlas.texture,
    );

    // Bricks 0 and 1: RESIDENT slots, border texels clamp-replicated from the
    // analytic field (the same replication the real repack performs).
    for (const brick of [0, 1]) {
      const data = new Float32Array(SPEC.stored[0] * SPEC.stored[1] * SPEC.stored[2]);
      const originX = brick * SPEC.payload[0];
      for (let z = 0; z < SPEC.stored[2]; z += 1) {
        for (let y = 0; y < SPEC.stored[1]; y += 1) {
          for (let x = 0; x < SPEC.stored[0]; x += 1) {
            const gx = Math.min(LEVEL_SHAPE[0] - 1, Math.max(0, originX + x - SPEC.border));
            const gy = Math.min(LEVEL_SHAPE[1] - 1, Math.max(0, y - SPEC.border));
            const gz = Math.min(LEVEL_SHAPE[2] - 1, Math.max(0, z - SPEC.border));
            data[(z * SPEC.stored[1] + y) * SPEC.stored[0] + x] = valueAt(gx, gy, gz);
          }
        }
      }
      writeBrickToAtlas(renderer, atlas, [brick, 0, 0], data);
      setPageEntry(pageTable, 0, [brick, 0, 0], [brick, 0, 0], PAGE_FLAG_RESIDENT);
    }
    // Brick 2: EMPTY carrying the background as an 8-bit code.
    const emptyCode = encodeEmptyValue(
      BACKGROUND,
      { minValue: MIN_VALUE, maxValue: MAX_VALUE },
      8,
    );
    setPageEntry(pageTable, 0, [2, 0, 0], [emptyCode, 0, 0], PAGE_FLAG_EMPTY);
    // Brick 3 stays UNMAPPED.
    flushPageTable(renderer, pageTable);

    const box = planCorridor({
      strokeWorld: STROKE_WORLD,
      radiusWorld: RADIUS,
      worldToLevelVoxel: (w) => w,
      levelVoxelWorldSize: [1, 1, 1],
      levelShape: LEVEL_SHAPE,
    });
    if (!box) return { supported: true, pass: false, detail: "corridor plan failed" };

    const seed: Vec3 = [
      1 - box.origin[0],
      3 - box.origin[1],
      3 - box.origin[2],
    ];
    const target: Vec3 = [
      22 - box.origin[0],
      4 - box.origin[1],
      3 - box.origin[2],
    ];

    // Pipeline creation is async; give it a moment.
    for (let waited = 0; !skeletonizer.ready(); waited += 50) {
      if (waited > 3000) {
        return { supported: true, pass: false, detail: "pipelines never became ready" };
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // 0.47, not 0.5: with the fixture's value set, τ=0.5 admits blurred
    // corner sums landing EXACTLY on the iso — a knife-edge where CPU f64
    // and GPU f32 could legitimately disagree. 0.47 provably cannot.
    const tubeIso = voxelCost(0.47, DEFAULT_SKELETON_WEIGHTS);
    const gpu = await skeletonizer.run({
      atlas,
      pageTable,
      level: 0,
      box,
      strokeLevelPts: STROKE_WORLD,
      radiusWorld: RADIUS,
      weights: DEFAULT_SKELETON_WEIGHTS,
      channel: 0,
      minValue: MIN_VALUE,
      maxValue: MAX_VALUE,
      emptyCeiling: 0xff,
      poolMin: MIN_VALUE,
      poolRange: RANGE,
      payload: SPEC.payload,
      border: SPEC.border,
      storedZ: SPEC.stored[2],
      spacing: [1, 1, 1],
      seed,
      tube: {
        iso: tubeIso,
        clampValue: tubeClampValue(tubeIso),
        maxVertices: 120_000,
        // Exercises the smooth kernel too — the CPU comparison below blurs
        // with the twin (`smoothCostField`) before marching.
        smoothVoxels: 1,
      },
    });
    if (!gpu) {
      return { supported: true, pass: false, detail: "gpu run answered null (see console)" };
    }

    // CPU truth over the SAME semantics: UNMAPPED → null, EMPTY → the 8-bit
    // decode round-trip, RESIDENT → the analytic value.
    const cpuField = buildCostField({
      box,
      strokeLevelPts: STROKE_WORLD,
      radiusWorld: RADIUS,
      spacing: [1, 1, 1],
      weights: DEFAULT_SKELETON_WEIGHTS,
      sample: ([x, y, z]) => {
        const brick = brickOf(x);
        if (brick === 3) return null;
        const raw =
          brick === 2
            ? decodeEmptyValue(emptyCode, { minValue: MIN_VALUE, maxValue: MAX_VALUE }, 8)
            : valueAt(x, y, z);
        return Math.min(1, Math.max(0, (raw - MIN_VALUE) / RANGE));
      },
    });
    const cpu = geodesicField({
      cost: cpuField.cost,
      box,
      spacing: [1, 1, 1],
      seed,
    });

    if (gpu.holes !== cpuField.holes) {
      return {
        supported: true,
        pass: false,
        detail: `hole counts differ: gpu=${gpu.holes} cpu=${cpuField.holes}`,
      };
    }
    if (cpuField.holes === 0) {
      return { supported: true, pass: false, detail: "fixture bug: expected holes > 0" };
    }

    let mismatches = 0;
    let firstMismatch = "";
    for (let i = 0; i < cpu.dist.length; i += 1) {
      const a = cpu.dist[i];
      const b = gpu.dist[i];
      const same =
        a === b || Math.abs(a - b) <= DIST_RTOL * Math.max(Math.abs(a), Math.abs(b));
      if (!same && mismatches++ === 0) {
        firstMismatch = ` first@${i}: cpu=${a} gpu=${b}`;
      }
    }
    if (mismatches > 0) {
      return {
        supported: true,
        pass: false,
        detail: `${mismatches}/${cpu.dist.length} dist mismatches${firstMismatch}`,
      };
    }

    const cpuPath = backtrackPath(cpu, box, target);
    const gpuPath = backtrackPath({ dist: gpu.dist, pred: gpu.pred }, box, target);
    if (!cpuPath || !gpuPath) {
      return {
        supported: true,
        pass: false,
        detail: `backtrack failed: cpu=${!!cpuPath} gpu=${!!gpuPath}`,
      };
    }
    const ends = (path: Vec3[]) => `${path[0].join(",")}→${path[path.length - 1].join(",")}`;
    if (ends(cpuPath) !== ends(gpuPath)) {
      return {
        supported: true,
        pass: false,
        detail: `path endpoints differ: cpu ${ends(cpuPath)} gpu ${ends(gpuPath)}`,
      };
    }
    // The centerline must actually ride the tube through the seam shift.
    const crossesSeam =
      gpuPath.some(([, y]) => y === 3.5) && gpuPath.some(([, y]) => y === 4.5);
    if (!crossesSeam) {
      return {
        supported: true,
        pass: false,
        detail: "path did not follow the tube across the brick seam",
      };
    }

    // Tube surface parity: same triangles, ORDER-INSENSITIVE — the GPU's
    // atomic append order is nondeterministic, so compare canonicalized
    // triangle multisets (vertices quantized, sorted within the triangle,
    // triangles sorted). Both sides blur first (smooth kernel ↔ CPU twin).
    const cpuTube = marchTube({
      cost: smoothCostField({
        cost: cpuField.cost,
        box,
        radius: 1,
        clampValue: tubeClampValue(tubeIso),
      }),
      box,
      iso: tubeIso,
    });
    if (!gpu.tube) {
      return { supported: true, pass: false, detail: "gpu answered no tube surface" };
    }
    const canonical = (positions: Float32Array): string[] => {
      const triangles: string[] = [];
      for (let i = 0; i + 8 < positions.length; i += 9) {
        const vertices = [0, 3, 6].map(
          (o) =>
            `${positions[i + o].toFixed(3)},${positions[i + o + 1].toFixed(3)},${positions[i + o + 2].toFixed(3)}`,
        );
        triangles.push(vertices.sort().join("|"));
      }
      return triangles.sort();
    };
    const cpuTris = canonical(cpuTube.positions);
    const gpuTris = canonical(gpu.tube.positions);
    const tubesMatch =
      cpuTris.length === gpuTris.length &&
      cpuTris.every((triangle, i) => triangle === gpuTris[i]);
    if (!tubesMatch) {
      return {
        supported: true,
        pass: false,
        detail: `tube surfaces differ: cpu ${cpuTris.length} vs gpu ${gpuTris.length} triangles`,
      };
    }

    // The Gap chain parity (binary cost mode → connectivity geodesic → tube
    // mask): one strict-connectivity run compared against the CPU twins.
    const gapLimit = 0.75;
    const gpuGap = await skeletonizer.extractTube({
      atlas,
      pageTable,
      level: 0,
      box,
      strokeLevelPts: STROKE_WORLD,
      radiusWorld: RADIUS,
      weights: DEFAULT_SKELETON_WEIGHTS,
      channel: 0,
      minValue: MIN_VALUE,
      maxValue: MAX_VALUE,
      emptyCeiling: 0xff,
      poolMin: MIN_VALUE,
      poolRange: RANGE,
      payload: SPEC.payload,
      border: SPEC.border,
      storedZ: SPEC.stored[2],
      spacing: [1, 1, 1],
      tube: {
        iso: tubeIso,
        clampValue: tubeClampValue(tubeIso),
        maxVertices: 120_000,
        connectivity: { tau: 0.47, gapLimitWorld: gapLimit, seed },
      },
    });
    if (!gpuGap || gpuGap.triangles === 0) {
      return {
        supported: true,
        pass: false,
        detail: `gap run answered ${gpuGap ? "an empty surface" : "null"}`,
      };
    }
    const connect = geodesicField({
      cost: connectivityFromCost(cpuField.cost, tubeIso),
      box,
      spacing: [1, 1, 1],
      seed,
    });
    const cpuGapTube = marchTube({
      cost: maskFieldByDistance(
        cpuField.cost,
        connect.dist,
        gapLimit,
        tubeClampValue(tubeIso),
      ),
      box,
      iso: tubeIso,
    });
    const cpuGapTris = canonical(cpuGapTube.positions);
    const gpuGapTris = canonical(gpuGap.positions);
    const gapsMatch =
      cpuGapTris.length === gpuGapTris.length &&
      cpuGapTris.every((triangle, i) => triangle === gpuGapTris[i]);
    if (!gapsMatch) {
      return {
        supported: true,
        pass: false,
        detail: `gap surfaces differ: cpu ${cpuGapTris.length} vs gpu ${gpuGapTris.length} triangles`,
      };
    }

    return {
      supported: true,
      pass: true,
      detail:
        `dist fields match (${cpu.dist.length} voxels, holes ${gpu.holes}), ` +
        `path ${gpuPath.length} pts follows the seam shift, ` +
        `tube ${gpuTris.length} triangles identical, ` +
        `gap surface ${gpuGapTris.length} triangles identical`,
    };
  } catch (error) {
    return { supported: true, pass: false, detail: String(error) };
  } finally {
    skeletonizer.dispose();
    disposePageTable(pageTable);
    disposeBrickAtlas(atlas);
  }
}
