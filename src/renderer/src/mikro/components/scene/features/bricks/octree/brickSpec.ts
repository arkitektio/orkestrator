import type { LayerLevelGeometry, Vec3 } from "../../../platform/coords/levelGeometry";
import { buildPageTableLayout, levelPageGrids } from "./pageTableLayout";

/**
 * Brick sizing for a (layer, display mode). Bricks are the atlas/streaming
 * unit and are deliberately decoupled from the zarr chunk shape (which varies
 * wildly across datasets) — a repack step copies the brick's voxel box out of
 * the decoded chunk(s).
 *
 *  - 3D: 64³ payload + 1-voxel replicated border so linear filtering never
 *    bleeds across brick seams.
 *  - 2D: one 256×256 single-z slab per brick, no border (nearest filtering,
 *    matching ChunkPlane's current look).
 */

export type BrickSpec = {
  /** Voxels of real data per brick along [x, y, z]. */
  payload: Vec3;
  /** Voxels replicated on every side (interpolation guard band). */
  border: 0 | 1;
  /** payload + 2 * border — the atlas slot extents (before channel stacking). */
  stored: Vec3;
  /** Channel slabs stacked along z inside one slot. */
  channelCount: number;
};

export const BRICK_PAYLOAD_3D = 64;
export const BRICK_PAYLOAD_2D = 256;

/** Safety cap for the payload-doubling loop (2^20 × base is beyond any data). */
const MAX_DOUBLINGS = 20;

const storedFor = (payload: Vec3, border: 0 | 1): Vec3 => [
  payload[0] + 2 * border,
  payload[1] + 2 * border,
  payload[2] + 2 * border,
];

/**
 * Resolve the brick spec for a layer: start from the mode default (clamped to
 * the finest level's extents so shallow volumes don't waste slot space), then
 * double the payload until every level's page grid — packed into one page
 * texture — fits `maxExtent` (the device's maxTextureDimension3D).
 */
export function resolveBrickSpec(
  geo: LayerLevelGeometry,
  mode: "2D" | "3D",
  maxExtent = 2048,
): BrickSpec {
  const base = geo.levels[0].spatialShape;
  const payload: [number, number, number] =
    mode === "3D"
      ? [
          Math.min(BRICK_PAYLOAD_3D, base[0]),
          Math.min(BRICK_PAYLOAD_3D, base[1]),
          Math.min(BRICK_PAYLOAD_3D, base[2]),
        ]
      : [Math.min(BRICK_PAYLOAD_2D, base[0]), Math.min(BRICK_PAYLOAD_2D, base[1]), 1];
  const border: 0 | 1 = mode === "3D" ? 1 : 0;

  for (let i = 0; i < MAX_DOUBLINGS; i++) {
    if (buildPageTableLayout(geo, payload, maxExtent)) break;
    // Coarsen the axis with the largest page-grid extent. In 2D mode a brick
    // should stay a single slab (fetch economy), so z is only doubled when its
    // own grid extent exceeds the texture limit — no amount of x/y coarsening
    // can fix that (stacks deeper than `maxExtent` slices).
    const grids = levelPageGrids(geo, payload);
    const axisMax = [0, 1, 2].map((axis) =>
      Math.max(...grids.map((grid) => grid[axis])),
    );
    const candidates: (0 | 1 | 2)[] =
      mode === "2D" && axisMax[2] <= maxExtent ? [0, 1] : [0, 1, 2];
    const worst = candidates.reduce((a, b) => (axisMax[a] >= axisMax[b] ? a : b));
    payload[worst] *= 2;
  }

  return {
    payload,
    border,
    stored: storedFor(payload, border),
    channelCount: geo.channelCount,
  };
}

/** Bytes one atlas slot occupies (all channel slabs, stored extents). */
export const brickSlotBytes = (spec: BrickSpec, bytesPerVoxel: number): number =>
  spec.stored[0] * spec.stored[1] * spec.stored[2] * spec.channelCount * bytesPerVoxel;
