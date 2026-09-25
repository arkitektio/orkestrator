import type { LayerLevelGeometry, Vec3 } from "../../../platform/coords/levelGeometry";

/**
 * Packing of all pyramid levels' page grids into ONE 3D integer texture per
 * (layer, mode). One texture because GLSL ES 3.0 forbids non-uniformly
 * indexed sampler arrays — the shader picks the level via `uPageOffset[lvl]`
 * ivec3 offsets into this single texture instead.
 *
 * Texel encoding (RGBA8, one byte per component): R,G,B = brick-pool slot
 * coords, A = PageFlag. The texture is sampled as unorm; the shader decodes
 * bytes with `round(value * 255)`.
 */

export const PAGE_FLAG_UNMAPPED = 0;
export const PAGE_FLAG_RESIDENT = 1;
/** Uniform-fill brick: renders as its fill value and consumes no pool slot. */
export const PAGE_FLAG_EMPTY = 2;

export type PageFlag =
  | typeof PAGE_FLAG_UNMAPPED
  | typeof PAGE_FLAG_RESIDENT
  | typeof PAGE_FLAG_EMPTY;

export type PageTableLayout = {
  /** Texture size in texels. */
  size: Vec3;
  /** Axis (0=x, 1=y, 2=z) along which the level grids are stacked. */
  stackAxis: 0 | 1 | 2;
  /** Per-level texel offset of the level's grid region. */
  levelOffset: readonly Vec3[];
  /** Per-level page-grid extents (bricks per axis). */
  levelGrid: readonly Vec3[];
};

/** Page grid (bricks per axis) of every level for a given brick payload. */
export function levelPageGrids(geo: LayerLevelGeometry, payload: Vec3): Vec3[] {
  return geo.levels.map(
    (level) =>
      [
        Math.ceil(level.spatialShape[0] / payload[0]),
        Math.ceil(level.spatialShape[1] / payload[1]),
        Math.ceil(level.spatialShape[2] / payload[2]),
      ] as const,
  );
}

/**
 * Stack the level grids along the first axis (z preferred, then x, then y)
 * where the packed texture fits `maxExtent` per dimension. Returns null when
 * no axis fits — the caller (brick-spec resolution) then coarsens the payload.
 */
export function buildPageTableLayout(
  geo: LayerLevelGeometry,
  payload: Vec3,
  maxExtent = 2048,
): PageTableLayout | null {
  const grids = levelPageGrids(geo, payload);

  for (const stackAxis of [2, 0, 1] as const) {
    const size: [number, number, number] = [0, 0, 0];
    for (const axis of [0, 1, 2] as const) {
      size[axis] =
        axis === stackAxis
          ? grids.reduce((sum, grid) => sum + grid[axis], 0)
          : Math.max(...grids.map((grid) => grid[axis]));
    }
    if (size[0] > maxExtent || size[1] > maxExtent || size[2] > maxExtent) continue;

    let cursor = 0;
    const levelOffset = grids.map((grid) => {
      const offset: [number, number, number] = [0, 0, 0];
      offset[stackAxis] = cursor;
      cursor += grid[stackAxis];
      return offset as Vec3;
    });
    return { size, stackAxis, levelOffset, levelGrid: grids };
  }

  return null;
}

/** Linear texel index of a brick within ONE level's CPU mirror array. */
export const pageEntryIndex = (grid: Vec3, brick: Vec3): number =>
  (brick[2] * grid[1] + brick[1]) * grid[0] + brick[0];

/** Write one RGBA8 page entry into a level mirror (4 bytes per texel). */
export function encodePageEntry(
  mirror: Uint8Array,
  entryIndex: number,
  slot: Vec3 | null,
  flag: PageFlag,
): void {
  const base = entryIndex * 4;
  mirror[base] = slot ? slot[0] : 0;
  mirror[base + 1] = slot ? slot[1] : 0;
  mirror[base + 2] = slot ? slot[2] : 0;
  mirror[base + 3] = flag;
}
