import * as THREE from "three";
import { affineToMatrix4 } from "../coords/worldTransform";
import type { ProbeResult } from "./probeTypes";

/**
 * "What is under the cursor" on every visible layer (`readableLayerIds`),
 * read at the point the probe layer found.
 *
 * The probe layer decides WHERE (in 3D the ray stops in its volume); every
 * layer it can reach says WHAT is there. The probed layer's own reading is
 * reused as is; every other layer is mapped from the hit's world point
 * into its own base voxels (the affine maps corner-anchored base voxels to
 * world, COORDINATE_SYSTEMS.md §0) and read from what is resident — the same
 * `sampleResidentEx` the probes themselves read, so no read here ever
 * fetches.
 *
 * Each reading is a `ProbeResult` AT the hit, restated in its own layer:
 * `layerId`, `voxelIndex` (that layer's base voxels), `values`, `provenance`,
 * `dtype` and `sliceSignature` are that layer's; `worldPos`, `localPos`,
 * `strategy`, `origin` and `purpose` stay the hit's. So everything that
 * already reads a probe — the channel rows, the attribute key, the point
 * coordinates — reads a reading unchanged. A layer the hit point lies outside
 * has nothing there and gets no reading.
 *
 * Pure and structural, so it runs off the stores at UI cadence (the readout
 * settler, the point pinner) and is testable without a canvas.
 */

/** The slice of a layer this module reads (structural). */
export type InfoLayerLike = {
  id: string;
  affineMatrix: number[][] | null | undefined;
};

/** The slice of the residency manager this module reads (structural). */
export type InfoSampler = {
  getLayerPool: (layerId: string) => {
    geometry: {
      levels: readonly { spatialShape: readonly [number, number, number]; dtype: string }[];
      channelSlabCount: number;
    };
    sliceSignature: string;
  } | null;
  sampleResidentEx: (
    layerId: string,
    baseVoxel: readonly [number, number, number],
    desiredLevel: number,
  ) => { values: number[]; level: number } | null;
};

export type InfoReadContext = {
  layers: readonly InfoLayerLike[];
  /** The layers to read, in the order to show them (`readableLayerIds`). */
  layerIds: readonly string[];
  sampler: InfoSampler | null;
  /** Per-layer plans: the level to ask for, and in 2D the drawn slab. */
  nodePlans: Readonly<
    Record<string, { mode: "2D" | "3D"; targetLevel: number; slabZ?: number | null } | undefined>
  >;
};

const scratch = { matrix: new THREE.Matrix4(), point: new THREE.Vector3() };

/**
 * The base voxel of `layer` at a world point, or null outside it. In 2D the z
 * is the layer's own drawn slab, not the hit's: the flat view shows one slab
 * per layer, and the readout must name the one on screen.
 */
export const worldToLayerVoxel = (
  layer: InfoLayerLike,
  world: readonly [number, number, number],
  baseShape: readonly [number, number, number],
  slabZ: number | null,
): [number, number, number] | null => {
  const inverse = scratch.matrix.copy(affineToMatrix4(layer.affineMatrix)).invert();
  const local = scratch.point.set(world[0], world[1], world[2]).applyMatrix4(inverse);
  const z = slabZ ?? local.z;
  const inside = (value: number, extent: number) => value >= 0 && value < Math.max(1, extent);
  // A one-voxel axis (no z) holds every z: there is nothing to step off.
  const insideZ = slabZ !== null || baseShape[2] <= 1 || inside(z, baseShape[2]);
  if (!inside(local.x, baseShape[0]) || !inside(local.y, baseShape[1]) || !insideZ) return null;
  const clamp = (value: number, extent: number) =>
    Math.max(0, Math.min(Math.max(1, extent) - 1, Math.floor(value)));
  return [clamp(local.x, baseShape[0]), clamp(local.y, baseShape[1]), clamp(z, baseShape[2])];
};

/**
 * Every layer's reading at the hit. A mesh pick or a placement probe is not a
 * measurement of the image layers, so it yields none.
 */
export const readInfoLayers = (hit: ProbeResult | null, ctx: InfoReadContext): ProbeResult[] => {
  if (!hit || hit.strategy === "mesh" || hit.purpose !== "readout") return [];
  const out: ProbeResult[] = [];
  for (const layerId of ctx.layerIds) {
    if (layerId === hit.layerId) {
      out.push(hit);
      continue;
    }
    const layer = ctx.layers.find((candidate) => candidate.id === layerId);
    const pool = ctx.sampler?.getLayerPool(layerId) ?? null;
    if (!layer || !pool || !hit.worldPos) continue;
    const base = pool.geometry.levels[0];
    const plan = ctx.nodePlans[layerId];
    const level = plan?.targetLevel ?? 0;
    const voxelIndex = worldToLayerVoxel(
      layer,
      hit.worldPos,
      base.spatialShape,
      plan?.mode === "2D" ? (plan.slabZ ?? 0) : null,
    );
    if (!voxelIndex) continue;
    const resident = ctx.sampler?.sampleResidentEx(layerId, voxelIndex, level) ?? null;
    const channelCount = Math.max(1, pool.geometry.channelSlabCount);
    out.push({
      ...hit,
      layerId,
      voxelIndex,
      // Unreadable yet (a chunk evicted, bricks still streaming) reads as
      // pending per channel, exactly like the probes' own fallback.
      values: resident
        ? resident.values.map((value, channel) => ({ channel, value }))
        : Array.from({ length: channelCount }, (_, channel) => ({ channel, value: null })),
      provenance: resident ? { source: "resident", level: resident.level } : { source: "pending", level },
      dtype: base.dtype,
      sliceSignature: pool.sliceSignature,
    });
  }
  return out;
};

/** Value equality over what a reading SHOWS, so re-publishing the same
 * readings writes nothing (the hit's own entry compares by identity first). */
export const sameReadings = (a: readonly ProbeResult[], b: readonly ProbeResult[]): boolean =>
  a.length === b.length &&
  a.every((reading, index) => {
    const other = b[index];
    if (reading === other) return true;
    return (
      reading.layerId === other.layerId &&
      reading.worldPos === other.worldPos &&
      reading.origin === other.origin &&
      reading.sliceSignature === other.sliceSignature &&
      reading.provenance.source === other.provenance.source &&
      reading.provenance.level === other.provenance.level &&
      reading.voxelIndex.every((value, axis) => value === other.voxelIndex[axis]) &&
      reading.values.length === other.values.length &&
      reading.values.every(
        (entry, channel) =>
          entry.channel === other.values[channel].channel && entry.value === other.values[channel].value,
      )
    );
  });
