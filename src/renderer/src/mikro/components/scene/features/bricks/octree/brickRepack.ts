import type { AxisIndices } from "../../../platform/model/dims";
import type { BrickSpec } from "./brickSpec";
import type { LevelGeometry, SlabDesc, Vec3 } from "../../../platform/coords/levelGeometry";
import type { VoxelBox } from "./nodeAddress";

/**
 * Pure CPU repack: copy a brick's voxel box out of one or more decoded zarr
 * chunks into a contiguous stored-brick array, canonicalized to x-fastest
 * [x, y, z, slab] layout (this is what kills the shader-side `dimRemap`).
 * Border voxels come from neighboring data where the fetch box covered them and
 * are edge-replicated at volume boundaries, so linear filtering is defined
 * everywhere. A min==max scan flags uniform bricks — those become EMPTY page
 * entries and consume no atlas slot.
 *
 * Two paths:
 *
 *  - **copy** (no phasor node): a slab is one channel, copied verbatim. Every
 *    other axis was already collapsed to a single index by the caller
 *    (`fixedOffsets`).
 *
 *  - **reduce** (a phasor node in the layer's render graph): the phasor axis is
 *    fetched WHOLE and consumed here — every bin of every voxel is walked once.
 *    A phasor node's three slabs get the DFT of the voxel's profile at its
 *    harmonic (g, s — see `platform/model/phasor.ts`) plus the mean photon count; a plain
 *    channel slab gets the mean over the same axis, i.e. the ordinary intensity
 *    image. (It has to be *some* projection — the axis still exists in the data
 *    and no slider pins it — and the intensity image is the one that composites
 *    sensibly under a lifetime overlay.)
 *
 * The reduction happens ONCE per brick here, not per pixel per frame in the
 * shader, which is the whole reason the phasor axis may be tens or hundreds of
 * bins deep without the atlas paying for it.
 */

/** Uint16Array = an R16F atlas brick (half-float BITS, not values — encoded
 * by the worker after the raw repack; see halfFloat.ts). `repackBrick`
 * itself only ever writes raw values into Uint8Array/Float32Array outputs. */
export type BrickArray = Uint8Array | Uint16Array | Float32Array;

export type RepackChunk = {
  /** Spatial chunk-grid coords [cx, cy, cz] on the level's grid. */
  coords: Vec3;
  /** Chunk index along the intensity axis (0 when collapsed or absent). */
  channelChunk: number;
  /** Chunk index along the phasor axis (0 when the layer has no phasor). */
  phasorChunk?: number;
  data: BrickArray;
  /** Chunk dims in the array's own dim order (full chunk shape, edge-padded). */
  shape: readonly number[];
  stride: readonly number[];
};

export type RepackBrickInput = {
  spec: BrickSpec;
  level: LevelGeometry;
  axes: AxisIndices;
  /**
   * What each z-slab of the output holds (channels first, then phasor g/s/i).
   * Omitted = the plain layout every layer had before phasors existed: slab i is
   * channel i, `spec.channelCount` of them.
   */
  slabs?: readonly SlabDesc[];
  /** Samples along the reduced phasor axis; 0 (or omitted) = no phasor. */
  phasorBins?: number;
  /** Payload box of the brick, clamped to the level shape. */
  brickBox: VoxelBox;
  /** Payload + border box, clamped (the voxels the sources actually cover). */
  fetchBox: VoxelBox;
  /**
   * In-chunk element offsets for every collapsed dim (zarr dim order; 0 for the
   * spatial, channel and phasor axes, which are not collapsed).
   */
  fixedOffsets: readonly number[];
  chunks: readonly RepackChunk[];
  /** Length storedX·storedY·storedZ·slabs.length; overwritten fully. */
  output: BrickArray;
};

export type RepackResult = {
  min: number;
  max: number;
  /** Set when every written voxel holds the same value. */
  uniformValue: number | null;
  /**
   * Raw [min, max] PER OUTPUT SLAB (`spec.channelCount` entries, slab order)
   * — the per-slab occupancy sidecar's input (`orkestrator.occPerSlab`).
   * `min`/`max` above are their union, exactly as before; a slab the scan
   * never wrote carries the union (conservative). Zeros when nothing finite
   * was written, matching `min`/`max`.
   */
  slabRanges: readonly (readonly [number, number])[];
};

type ScanResult = { min: number; max: number; slabMin: number[]; slabMax: number[] };

const newScan = (slabCount: number): ScanResult => ({
  min: Number.POSITIVE_INFINITY,
  max: Number.NEGATIVE_INFINITY,
  slabMin: new Array<number>(slabCount).fill(Number.POSITIVE_INFINITY),
  slabMax: new Array<number>(slabCount).fill(Number.NEGATIVE_INFINITY),
});

const foldSlab = (scan: ScanResult, slab: number, lo: number, hi: number): void => {
  if (lo < scan.slabMin[slab]) scan.slabMin[slab] = lo;
  if (hi > scan.slabMax[slab]) scan.slabMax[slab] = hi;
  if (lo < scan.min) scan.min = lo;
  if (hi > scan.max) scan.max = hi;
};

/** Where one phasor node's three slabs live in the output. */
type PhasorSlabs = {
  channel: number;
  harmonic: number;
  gSlab: number;
  sSlab: number;
  iSlab: number;
};

export function repackBrick(input: RepackBrickInput): RepackResult {
  const phasorBins = input.phasorBins ?? 0;
  const slabs = input.slabs ?? defaultChannelSlabs(input.spec.channelCount);
  const phasors = resolvePhasorSlabs(slabs, phasorBins);
  const reducing = phasors.length > 0 && input.axes.phasorPos !== -1 && phasorBins > 0;

  const written = reducing
    ? reduceChunks(input, slabs, phasorBins, phasors)
    : copyChunks(input);
  replicateEdges(input);

  const slabCount = input.spec.channelCount;
  if (!Number.isFinite(written.min)) {
    input.output.fill(0);
    return {
      min: 0,
      max: 0,
      uniformValue: 0,
      slabRanges: Array.from({ length: slabCount }, () => [0, 0] as const),
    };
  }
  const slabRanges: (readonly [number, number])[] = [];
  for (let s = 0; s < slabCount; s++) {
    const lo = written.slabMin[s];
    const hi = written.slabMax[s];
    // A slab nothing wrote (cannot happen when the chunks tile the channel
    // range, but the contract is conservative either way) takes the union.
    slabRanges.push(
      Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : [written.min, written.max],
    );
  }
  return {
    min: written.min,
    max: written.max,
    uniformValue: written.min === written.max ? written.min : null,
    slabRanges,
  };
}

/** Spatial overlap of a chunk with the brick's fetch box, in level voxels. */
const chunkOverlap = (
  chunk: RepackChunk,
  level: LevelGeometry,
  fetchBox: VoxelBox,
): { origin: Vec3; lo: Vec3; hi: Vec3 } | null => {
  const origin: Vec3 = [
    chunk.coords[0] * level.spatialChunks[0],
    chunk.coords[1] * level.spatialChunks[1],
    chunk.coords[2] * level.spatialChunks[2],
  ];
  const lo: number[] = [];
  const hi: number[] = [];
  for (const axis of [0, 1, 2] as const) {
    lo.push(Math.max(fetchBox.min[axis], origin[axis]));
    hi.push(Math.min(fetchBox.max[axis], origin[axis] + level.spatialChunks[axis]));
    if (hi[axis] <= lo[axis]) return null;
  }
  return { origin, lo: lo as unknown as Vec3, hi: hi as unknown as Vec3 };
};

const inChunkBase = (
  chunk: RepackChunk,
  fixedOffsets: readonly number[],
): number => {
  let base = 0;
  for (let d = 0; d < fixedOffsets.length; d++) {
    if (fixedOffsets[d] !== 0) base += fixedOffsets[d] * (chunk.stride[d] ?? 0);
  }
  return base;
};

const destOriginOf = (brickBox: VoxelBox, border: number): Vec3 => [
  brickBox.min[0] - border,
  brickBox.min[1] - border,
  brickBox.min[2] - border,
];

/** The original path: one slab per channel, copied voxel for voxel. */
function copyChunks(input: RepackBrickInput): ScanResult {
  const { spec, level, axes, brickBox, fetchBox, fixedOffsets, chunks, output } = input;
  const { xPos, yPos, zPos, intensityPos } = axes;
  const [sx, sy] = spec.stored;
  const sz = spec.stored[2];
  const channelCount = spec.channelCount;
  const channelsPerChunk =
    intensityPos !== -1 ? Math.max(1, level.chunks[intensityPos] ?? 1) : 1;
  const destOrigin = destOriginOf(brickBox, spec.border);

  const scan = newScan(channelCount);

  for (const chunk of chunks) {
    const overlap = chunkOverlap(chunk, level, fetchBox);
    if (!overlap) continue;
    const { origin: chunkOrigin, lo, hi } = overlap;

    const strideOf = (pos: number) => (pos !== -1 ? chunk.stride[pos] ?? 0 : 0);
    const strideX = strideOf(xPos);
    const strideY = strideOf(yPos);
    const strideZ = strideOf(zPos);
    const strideC = strideOf(intensityPos);

    const fixedBase = inChunkBase(chunk, fixedOffsets);
    const chanStart = chunk.channelChunk * channelsPerChunk;
    const chanEnd = Math.min(channelCount, chanStart + channelsPerChunk);

    for (let c = chanStart; c < chanEnd; c++) {
      const srcChanBase = fixedBase + (c - chanStart) * strideC;
      // Per-slab scan, folded once per (chunk, channel) — the inner loop
      // stays as tight as the union-only scan it replaces.
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (let z = lo[2]; z < hi[2]; z++) {
        const srcZBase = srcChanBase + (z - chunkOrigin[2]) * strideZ;
        const destZBase = (c * sz + (z - destOrigin[2])) * sy;
        for (let y = lo[1]; y < hi[1]; y++) {
          let src =
            srcZBase + (y - chunkOrigin[1]) * strideY + (lo[0] - chunkOrigin[0]) * strideX;
          let dest = (destZBase + (y - destOrigin[1])) * sx + (lo[0] - destOrigin[0]);
          for (let x = lo[0]; x < hi[0]; x++) {
            const value = chunk.data[src];
            output[dest] = value;
            if (value < min) min = value;
            if (value > max) max = value;
            src += strideX;
            dest += 1;
          }
        }
      }
      foldSlab(scan, c, min, max);
    }
  }

  return scan;
}

/**
 * The phasor path: walk every bin of the phasor axis once, accumulating each
 * slab's running sums IN PLACE in the output (it arrives zeroed), then resolve
 * them. Channel slabs accumulate Σ I (→ mean); a phasor node's g/s slabs
 * accumulate Σ I·cos and Σ I·sin and its i slab Σ I (→ g, s and the mean).
 *
 * Accumulating in the output rather than in side buffers keeps a 3D brick's
 * repack allocation-free — and a float32 mantissa holds a 64³ brick's photon
 * sums exactly for any realistic bin count and dtype.
 */
function reduceChunks(
  input: RepackBrickInput,
  slabs: readonly SlabDesc[],
  phasorBins: number,
  phasors: PhasorSlabs[],
): ScanResult {
  const { spec, level, axes, brickBox, fetchBox, fixedOffsets, chunks, output } = input;
  const { xPos, yPos, zPos, intensityPos, phasorPos } = axes;
  const [sx, sy] = spec.stored;
  const sz = spec.stored[2];
  const voxelsPerSlab = sx * sy * sz;
  const channelsPerChunk =
    intensityPos !== -1 ? Math.max(1, level.chunks[intensityPos] ?? 1) : 1;
  const binsPerChunk = Math.max(1, level.chunks[phasorPos] ?? 1);
  const destOrigin = destOriginOf(brickBox, spec.border);

  const channelSlabs = slabs
    .map((slab, index) => ({ slab, index }))
    .filter((entry): entry is { slab: Extract<SlabDesc, { kind: "channel" }>; index: number } =>
      entry.slab.kind === "channel",
    );

  output.fill(0);

  for (const chunk of chunks) {
    const overlap = chunkOverlap(chunk, level, fetchBox);
    if (!overlap) continue;
    const { origin: chunkOrigin, lo, hi } = overlap;

    const strideOf = (pos: number) => (pos !== -1 ? chunk.stride[pos] ?? 0 : 0);
    const strideX = strideOf(xPos);
    const strideY = strideOf(yPos);
    const strideZ = strideOf(zPos);
    const strideC = strideOf(intensityPos);
    const strideP = strideOf(phasorPos);

    const fixedBase = inChunkBase(chunk, fixedOffsets);
    const chanStart = chunk.channelChunk * channelsPerChunk;
    const chanEnd = chanStart + channelsPerChunk;
    const binStart = (chunk.phasorChunk ?? 0) * binsPerChunk;
    const binEnd = Math.min(phasorBins, binStart + binsPerChunk);

    /** Accumulate one (channel, bin) plane of this chunk into `writer`. */
    const accumulatePlane = (
      channel: number,
      bin: number,
      writer: (voxel: number, value: number) => void,
    ) => {
      const srcBase =
        fixedBase +
        (intensityPos !== -1 ? (channel - chanStart) * strideC : 0) +
        (bin - binStart) * strideP;
      for (let z = lo[2]; z < hi[2]; z++) {
        const srcZBase = srcBase + (z - chunkOrigin[2]) * strideZ;
        const destZBase = (z - destOrigin[2]) * sy;
        for (let y = lo[1]; y < hi[1]; y++) {
          let src =
            srcZBase + (y - chunkOrigin[1]) * strideY + (lo[0] - chunkOrigin[0]) * strideX;
          let voxel = (destZBase + (y - destOrigin[1])) * sx + (lo[0] - destOrigin[0]);
          for (let x = lo[0]; x < hi[0]; x++) {
            writer(voxel, chunk.data[src]);
            src += strideX;
            voxel += 1;
          }
        }
      }
    };

    const carries = (channel: number) =>
      intensityPos === -1 || (channel >= chanStart && channel < chanEnd);

    for (const { slab, index } of channelSlabs) {
      if (!carries(slab.channel)) continue;
      const slabBase = index * voxelsPerSlab;
      for (let bin = binStart; bin < binEnd; bin++) {
        accumulatePlane(slab.channel, bin, (voxel, value) => {
          output[slabBase + voxel] += value;
        });
      }
    }

    for (const phasor of phasors) {
      if (!carries(phasor.channel)) continue;
      const gBase = phasor.gSlab * voxelsPerSlab;
      const sBase = phasor.sSlab * voxelsPerSlab;
      const iBase = phasor.iSlab * voxelsPerSlab;
      const step = (2 * Math.PI * phasor.harmonic) / phasorBins;
      for (let bin = binStart; bin < binEnd; bin++) {
        // Mirrors `reduceProfile` in platform/model/phasor.ts, one bin at a time —
        // the profile is spread across chunks, so the DFT is accumulated.
        const cos = Math.cos(step * bin);
        const sin = Math.sin(step * bin);
        accumulatePlane(phasor.channel, bin, (voxel, value) => {
          output[gBase + voxel] += value * cos;
          output[sBase + voxel] += value * sin;
          output[iBase + voxel] += value;
        });
      }
    }
  }

  const scan = newScan(spec.channelCount);
  const observe = (slab: number, value: number) => foldSlab(scan, slab, value, value);

  for (const { index } of channelSlabs) {
    const base = index * voxelsPerSlab;
    for (let voxel = 0; voxel < voxelsPerSlab; voxel++) {
      const mean = output[base + voxel] / phasorBins;
      output[base + voxel] = mean;
      observe(index, mean);
    }
  }

  for (const phasor of phasors) {
    const gBase = phasor.gSlab * voxelsPerSlab;
    const sBase = phasor.sSlab * voxelsPerSlab;
    const iBase = phasor.iSlab * voxelsPerSlab;
    for (let voxel = 0; voxel < voxelsPerSlab; voxel++) {
      const sum = output[iBase + voxel];
      // A voxel with no photons has no phasor at all (0/0): it becomes
      // (0, 0, 0), which the shader reads as "nothing here".
      const g = sum > 0 ? output[gBase + voxel] / sum : 0;
      const s = sum > 0 ? output[sBase + voxel] / sum : 0;
      // MEAN, not sum: the intensity slab stays in the data's own value range,
      // so the node's clim/gamma transfer works exactly like a channel's.
      const intensity = sum / phasorBins;
      output[gBase + voxel] = g;
      output[sBase + voxel] = s;
      output[iBase + voxel] = intensity;
      observe(phasor.gSlab, g);
      observe(phasor.sSlab, s);
      observe(phasor.iSlab, intensity);
    }
  }

  return scan;
}

/** Fill everything outside the valid (fetch) region by copying the nearest
 * written texel, per slab, axis by axis. By this point a phasor slab is an
 * ordinary scalar slab, so it replicates like any other. */
function replicateEdges({ spec, brickBox, fetchBox, output }: RepackBrickInput): void {
  const [sx, sy] = spec.stored;
  const sz = spec.stored[2];
  const slabCount = spec.channelCount;
  const destOrigin = destOriginOf(brickBox, spec.border);

  const vlo: Vec3 = [
    fetchBox.min[0] - destOrigin[0],
    fetchBox.min[1] - destOrigin[1],
    fetchBox.min[2] - destOrigin[2],
  ];
  const vhi: Vec3 = [
    vlo[0] + (fetchBox.max[0] - fetchBox.min[0]),
    vlo[1] + (fetchBox.max[1] - fetchBox.min[1]),
    vlo[2] + (fetchBox.max[2] - fetchBox.min[2]),
  ];

  for (let c = 0; c < slabCount; c++) {
    const slab = c * sz;
    // x: replicate columns within valid y/z rows.
    for (let z = vlo[2]; z < vhi[2]; z++) {
      for (let y = vlo[1]; y < vhi[1]; y++) {
        const row = ((slab + z) * sy + y) * sx;
        for (let x = 0; x < vlo[0]; x++) output[row + x] = output[row + vlo[0]];
        for (let x = vhi[0]; x < sx; x++) output[row + x] = output[row + vhi[0] - 1];
      }
    }
    // y: replicate whole rows.
    for (let z = vlo[2]; z < vhi[2]; z++) {
      const plane = (slab + z) * sy;
      const firstRow = (plane + vlo[1]) * sx;
      const lastRow = (plane + vhi[1] - 1) * sx;
      for (let y = 0; y < vlo[1]; y++)
        output.copyWithin((plane + y) * sx, firstRow, firstRow + sx);
      for (let y = vhi[1]; y < sy; y++)
        output.copyWithin((plane + y) * sx, lastRow, lastRow + sx);
    }
    // z: replicate whole planes.
    const planeSize = sy * sx;
    const firstPlane = (slab + vlo[2]) * planeSize;
    const lastPlane = (slab + vhi[2] - 1) * planeSize;
    for (let z = 0; z < vlo[2]; z++)
      output.copyWithin((slab + z) * planeSize, firstPlane, firstPlane + planeSize);
    for (let z = vhi[2]; z < sz; z++)
      output.copyWithin((slab + z) * planeSize, lastPlane, lastPlane + planeSize);
  }
}

/** The pre-phasor layout: slab i is channel i. */
const defaultChannelSlabs = (channelCount: number): SlabDesc[] =>
  Array.from({ length: channelCount }, (_, channel) => ({
    kind: "channel" as const,
    channel,
  }));

const resolvePhasorSlabs = (
  slabs: readonly SlabDesc[],
  phasorBins: number,
): PhasorSlabs[] => {
  if (phasorBins <= 0) return [];

  const byNode = new Map<number, PhasorSlabs>();
  slabs.forEach((slab, index) => {
    if (slab.kind !== "phasor") return;
    const entry = byNode.get(slab.node) ?? {
      channel: slab.channel,
      harmonic: slab.harmonic,
      gSlab: -1,
      sSlab: -1,
      iSlab: -1,
    };
    if (slab.component === "g") entry.gSlab = index;
    if (slab.component === "s") entry.sSlab = index;
    if (slab.component === "i") entry.iSlab = index;
    byNode.set(slab.node, entry);
  });

  return [...byNode.values()].filter(
    (entry) => entry.gSlab !== -1 && entry.sSlab !== -1 && entry.iSlab !== -1,
  );
};
