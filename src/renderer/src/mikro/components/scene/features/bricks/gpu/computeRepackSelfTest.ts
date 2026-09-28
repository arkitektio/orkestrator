import { repackBrick, type RepackChunk } from "../octree/brickRepack";
import type { BrickSpec } from "../octree/brickSpec";
import type { LevelGeometry } from "../../../platform/coords/levelGeometry";
import { getWebGPUDevice, type SceneRenderer } from "../../../platform/gpu/sceneRenderer";
import { createBrickAtlas, disposeBrickAtlas, type BrickAtlas } from "./brickAtlas";
import { createGpuRepacker, type GpuRepacker } from "./computeRepack";
import type { RepackDispatchInput } from "./repackKernel";
import { R16F_DATA_SCALE, type AtlasKind } from "../octree/atlasFormat";
import { encodeHalfArray } from "../octree/halfFloat";

/**
 * Dev-only GPU↔CPU repack parity check, run from the DebugPanel on the LIVE
 * renderer: repacks one synthetic multi-chunk brick both ways — once per
 * atlas kind (f32 storage-texture kernel, r8 packed-buffer kernel) — reads
 * the atlas slot back (`copyTextureToBuffer`), and compares voxel-for-voxel
 * plus min/max/uniform. The vitest suite pins the dispatch math against
 * `repackBrick`; this pins the WGSL + binding model against the dispatch
 * math — together they cover the whole GPU path, including any behavior
 * change from a future three upgrade (e.g. the `isStorageTexture` usage bit).
 */

export type GpuRepackSelfTestResult = {
  supported: boolean;
  pass: boolean;
  detail: string;
};

// Structural typings for the readback-only members this module touches
// beyond what computeRepack needs (see sceneRenderer.ts for the convention).
type ReadbackDevice = {
  queue: { submit(commandBuffers: unknown[]): void };
  createBuffer(descriptor: { label?: string; size: number; usage: number }): {
    destroy(): void;
    mapAsync(mode: number): Promise<void>;
    getMappedRange(): ArrayBuffer;
    unmap(): void;
  };
  createCommandEncoder(): {
    copyTextureToBuffer(
      source: { texture: unknown; origin: [number, number, number] },
      destination: { buffer: unknown; bytesPerRow: number; rowsPerImage: number },
      size: [number, number, number],
    ): void;
    finish(): unknown;
  };
};

const BYTES_PER_ROW_ALIGN = 256;

type Fixture = {
  input: RepackDispatchInput;
  elementCount: number;
  dtype: "float32" | "uint8" | "uint16";
  /** Atlas kind override (r16f: the dtype alone would pick r32f). */
  kind?: AtlasKind;
};

/** Synthetic f32 brick: 4³ payload + border, 2 channels, 2×2 spatial chunks
 * of 8×8×4 — every interesting case at once (chunk straddling, border
 * replication at the volume edge, channel slabs). */
function makeF32Fixture(): Fixture {
  const spec: BrickSpec = {
    payload: [4, 4, 4],
    border: 1,
    stored: [6, 6, 6],
    channelCount: 2,
  };
  const level: LevelGeometry = {
    spatialShape: [12, 12, 4],
    spatialChunks: [8, 8, 4],
    // zarr dim order [c, z, y, x]:
    shape: [2, 4, 12, 12],
    chunks: [1, 4, 8, 8],
    scale: [1, 1, 1],
    dtype: "float32",
    storeId: "gpu-selftest",
  } as unknown as LevelGeometry;

  const chunks: RepackChunk[] = [];
  for (let channel = 0; channel < 2; channel++) {
    for (const cy of [0, 1]) {
      for (const cx of [0, 1]) {
        const data = new Float32Array(4 * 8 * 8);
        for (let z = 0; z < 4; z++)
          for (let y = 0; y < 8; y++)
            for (let x = 0; x < 8; x++) {
              const gx = cx * 8 + x;
              const gy = cy * 8 + y;
              data[(z * 8 + y) * 8 + x] =
                gx < 12 && gy < 12 ? channel * 1000 + z * 100 + gy * 10 + gx : -999;
            }
        chunks.push({
          coords: [cx, cy, 0],
          channelChunk: channel,
          data: data as unknown as RepackChunk["data"],
          shape: [1, 4, 8, 8],
          stride: [256, 64, 8, 1],
        });
      }
    }
  }

  return {
    input: {
      spec,
      level,
      axes: { xPos: 3, yPos: 2, zPos: 1, intensityPos: 0, phasorPos: -1 },
      // Two plain channel slabs: the GPU kernel is a strided copy and never
      // sees a phasor layer (those take the CPU worker path).
      slabs: [
        { kind: "channel", channel: 0 },
        { kind: "channel", channel: 1 },
      ],
      phasorBins: 0,
      // Brick [1,1,0]: payload x,y ∈ [4,8) straddles all four chunks; the
      // z border leaves the volume on both sides (replication).
      brickBox: { min: [4, 4, 0], max: [8, 8, 4] },
      fetchBox: { min: [3, 3, 0], max: [9, 9, 4] },
      fixedOffsets: [0, 0, 0, 0],
      chunks,
    },
    elementCount: 6 * 6 * 6 * 2,
    dtype: "float32",
  };
}

/** Synthetic uint8 brick for the r8 packed-buffer kernel. Chunks are 9×9×3 —
 * 243 bytes, deliberately NOT a multiple of 4, to exercise the padded
 * writeBuffer scratch path — and rows are 6 texels wide, so every row pads
 * to the 256-byte copyBufferToTexture alignment. */
function makeU8Fixture(): Fixture {
  const spec: BrickSpec = {
    payload: [4, 4, 3],
    border: 1,
    stored: [6, 6, 5],
    channelCount: 2,
  };
  const level: LevelGeometry = {
    spatialShape: [12, 12, 3],
    spatialChunks: [9, 9, 3],
    // zarr dim order [c, z, y, x]:
    shape: [2, 3, 12, 12],
    chunks: [1, 3, 9, 9],
    scale: [1, 1, 1],
    dtype: "uint8",
    storeId: "gpu-selftest-r8",
  } as unknown as LevelGeometry;

  const chunks: RepackChunk[] = [];
  for (let channel = 0; channel < 2; channel++) {
    for (const cy of [0, 1]) {
      for (const cx of [0, 1]) {
        const data = new Uint8Array(3 * 9 * 9);
        for (let z = 0; z < 3; z++)
          for (let y = 0; y < 9; y++)
            for (let x = 0; x < 9; x++) {
              const gx = cx * 9 + x;
              const gy = cy * 9 + y;
              data[(z * 9 + y) * 9 + x] =
                gx < 12 && gy < 12 ? (channel * 90 + z * 25 + gy * 7 + gx * 3) % 256 : 255;
            }
        chunks.push({
          coords: [cx, cy, 0],
          channelChunk: channel,
          data: data as unknown as RepackChunk["data"],
          shape: [1, 3, 9, 9],
          stride: [243, 81, 9, 1],
        });
      }
    }
  }

  return {
    input: {
      spec,
      level,
      axes: { xPos: 3, yPos: 2, zPos: 1, intensityPos: 0, phasorPos: -1 },
      slabs: [
        { kind: "channel", channel: 0 },
        { kind: "channel", channel: 1 },
      ],
      phasorBins: 0,
      // Brick [1,1,0]: payload x,y ∈ [4,8) straddles all four chunks; the
      // z border leaves the volume on both sides (replication).
      brickBox: { min: [4, 4, 0], max: [8, 8, 3] },
      fetchBox: { min: [3, 3, 0], max: [9, 9, 3] },
      fixedOffsets: [0, 0, 0, 0],
      chunks,
    },
    elementCount: 6 * 6 * 5 * 2,
    dtype: "uint8",
  };
}

/** The f32 fixture's data through an r16f atlas: uint16-range values (plus
 * the -999 fill outside the volume, which the half encode carries as a
 * negative half exactly like the worker path does). */
function makeR16Fixture(): Fixture {
  const base = makeF32Fixture();
  return { ...base, dtype: "uint16", kind: "r16f" };
}

/** The same brick through the raw-uint16 kernel (`orkestrator.raw16`):
 * chunks arrive UNWIDENED as Uint16Array, so the -999 fill is clamped to 0 —
 * a real uint16 chunk cannot hold negatives. Exercises the extractBits
 * 16-bit-lane read (odd strides included) end-to-end on the device. */
function makeR16U16Fixture(): Fixture {
  const base = makeF32Fixture();
  return {
    ...base,
    input: {
      ...base.input,
      chunks: base.input.chunks.map((chunk) => {
        const f32 = chunk.data as Float32Array;
        const u16 = new Uint16Array(f32.length);
        for (let i = 0; i < f32.length; i++) u16[i] = Math.max(0, f32[i]);
        return { ...chunk, data: u16 as unknown as RepackChunk["data"] };
      }),
    },
    dtype: "uint16",
    kind: "r16f",
  };
}

export async function runGpuRepackSelfTest(
  renderer: SceneRenderer,
): Promise<GpuRepackSelfTestResult> {
  if (!getWebGPUDevice(renderer)) {
    return { supported: false, pass: false, detail: "no GPU device (no compute)" };
  }
  const repacker = createGpuRepacker<string>(renderer);
  if (!repacker) {
    return { supported: false, pass: false, detail: "gpu repacker unavailable" };
  }

  try {
    const f32 = await runFixture(renderer, repacker, makeF32Fixture());
    if (!f32.pass) return { ...f32, detail: `f32: ${f32.detail}` };
    const r8 = await runFixture(renderer, repacker, makeU8Fixture());
    if (!r8.pass) return { ...r8, detail: `r8: ${r8.detail}` };
    const r16 = await runFixture(renderer, repacker, makeR16Fixture());
    if (!r16.pass) return { ...r16, detail: `r16f: ${r16.detail}` };
    const r16u16 = await runFixture(renderer, repacker, makeR16U16Fixture());
    if (!r16u16.pass) return { ...r16u16, detail: `r16f/u16: ${r16u16.detail}` };
    return {
      supported: true,
      pass: true,
      detail: `f32: ${f32.detail}; r8: ${r8.detail}; r16f: ${r16.detail}; r16f/u16: ${r16u16.detail}`,
    };
  } finally {
    repacker.dispose();
  }
}

async function runFixture(
  renderer: SceneRenderer,
  repacker: GpuRepacker<string>,
  fixture: Fixture,
): Promise<GpuRepackSelfTestResult> {
  const { input, elementCount, dtype } = fixture;
  const atlas = createBrickAtlas({
    spec: input.spec,
    dtype,
    desiredSlots: 1,
    maxExtent: 64,
    filter: "nearest",
    computeStorage: true,
    kind: fixture.kind,
  });

  try {
    (renderer as unknown as { initTexture?: (t: unknown) => void }).initTexture?.(atlas.texture);

    // Pipeline creation is async; give this fixture's variant a moment.
    for (let waited = 0; !(repacker.ready() && repacker.supports(atlas, input.chunks)); waited += 50) {
      if (waited > 3000) {
        return {
          supported: true,
          pass: false,
          detail: repacker.ready()
            ? "supports() rejected the fixture"
            : "pipeline never became ready",
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    repacker.dispatch({
      atlas,
      input,
      chunkKeys: input.chunks.map((_, i) => `selftest-${atlas.kind}:${i}`),
      slotCoords: [0, 0, 0],
      token: "selftest",
    });
    const outcome = await repacker.flush()!;
    if (outcome.failed.length > 0) {
      return { supported: true, pass: false, detail: "dispatch failed (see console)" };
    }

    // CPU truth. r16f: the worker path — raw repack into a float scratch,
    // then the half encode — compared as half BITS with 1-ulp tolerance
    // (pack2x16float's rounding is implementation-defined among the nearest).
    const cpuScratch =
      dtype === "uint8" ? new Uint8Array(elementCount) : new Float32Array(elementCount);
    const cpuResult = repackBrick({ ...input, output: cpuScratch });
    let cpuOut: Uint8Array | Uint16Array | Float32Array = cpuScratch;
    if (atlas.kind === "r16f") {
      const half = new Uint16Array(elementCount);
      encodeHalfArray(cpuScratch as Float32Array, half, 1 / R16F_DATA_SCALE);
      cpuOut = half;
    }
    const tolerance = atlas.kind === "r16f" ? 1 : 0;

    // Read the slot back (the atlas is exactly one slot).
    const gpuOut = await readAtlasSlot(renderer, atlas, [
      atlas.slotSize[0],
      atlas.slotSize[1],
      atlas.slotSize[2],
    ]);

    let mismatches = 0;
    let firstMismatch = "";
    for (let i = 0; i < elementCount; i++) {
      const same =
        cpuOut[i] === gpuOut[i] ||
        Math.abs(cpuOut[i] - gpuOut[i]) <= tolerance ||
        (Number.isNaN(cpuOut[i]) && Number.isNaN(gpuOut[i]));
      if (!same && mismatches++ === 0) {
        firstMismatch = ` first@${i}: cpu=${cpuOut[i]} gpu=${gpuOut[i]}`;
      }
    }
    const [gpu] = outcome.results;
    const statsMatch =
      gpu.min === cpuResult.min &&
      gpu.max === cpuResult.max &&
      gpu.uniformValue === cpuResult.uniformValue &&
      // Per-slab brackets (orkestrator.occPerSlab): the kernel's per-channel
      // reduction must agree with the CPU scan slab for slab.
      gpu.slabRanges.length === cpuResult.slabRanges.length &&
      gpu.slabRanges.every(
        (range, s) => range[0] === cpuResult.slabRanges[s][0] && range[1] === cpuResult.slabRanges[s][1],
      );

    const pass = mismatches === 0 && statsMatch;
    return {
      supported: true,
      pass,
      detail: pass
        ? `voxels + min/max identical (min ${gpu.min}, max ${gpu.max})`
        : `${mismatches}/${elementCount} voxel mismatches${firstMismatch};` +
          ` minmax gpu=[${gpu.min},${gpu.max},${gpu.uniformValue}]` +
          ` cpu=[${cpuResult.min},${cpuResult.max},${cpuResult.uniformValue}]` +
          ` slabs gpu=${JSON.stringify(gpu.slabRanges)} cpu=${JSON.stringify(cpuResult.slabRanges)}`,
    };
  } catch (error) {
    return { supported: true, pass: false, detail: String(error) };
  } finally {
    disposeBrickAtlas(atlas);
  }
}

async function readAtlasSlot(
  renderer: SceneRenderer,
  atlas: BrickAtlas,
  size: [number, number, number],
): Promise<Float32Array | Uint16Array | Uint8Array> {
  const device = getWebGPUDevice(renderer) as unknown as ReadbackDevice;
  const backend = (renderer as unknown as { backend: { get(o: object): { texture?: unknown } } })
    .backend;
  const gpuTexture = backend.get(atlas.texture)?.texture;
  if (!gpuTexture) throw new Error("atlas GPUTexture missing after initTexture");

  const bytesPerTexel = atlas.kind === "r8" ? 1 : atlas.kind === "r16f" ? 2 : 4;
  const bytesPerRow =
    Math.ceil((size[0] * bytesPerTexel) / BYTES_PER_ROW_ALIGN) * BYTES_PER_ROW_ALIGN;
  const buffer = device.createBuffer({
    label: "gpu-repack selftest readback",
    size: bytesPerRow * size[1] * size[2],
    usage: 0x0001 | 0x0008, // MAP_READ | COPY_DST
  });
  try {
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture: gpuTexture, origin: [0, 0, 0] },
      { buffer, bytesPerRow, rowsPerImage: size[1] },
      size,
    );
    device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(0x0001); // MAP_MODE_READ
    const mapped = buffer.getMappedRange();
    const count = size[0] * size[1] * size[2];
    const out =
      atlas.kind === "r8"
        ? new Uint8Array(count)
        : atlas.kind === "r16f"
          ? new Uint16Array(count)
          : new Float32Array(count);
    for (let z = 0; z < size[2]; z++) {
      for (let y = 0; y < size[1]; y++) {
        const offset = (z * size[1] + y) * bytesPerRow;
        const row =
          atlas.kind === "r8"
            ? new Uint8Array(mapped, offset, size[0])
            : atlas.kind === "r16f"
              ? new Uint16Array(mapped, offset, size[0])
              : new Float32Array(mapped, offset, size[0]);
        out.set(row as never, (z * size[1] + y) * size[0]);
      }
    }
    buffer.unmap();
    return out;
  } finally {
    buffer.destroy();
  }
}
