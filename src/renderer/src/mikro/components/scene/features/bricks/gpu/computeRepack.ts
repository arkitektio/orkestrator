import type * as THREE from "three";
import type { RepackChunk } from "../octree/brickRepack";
import type { Vec3 } from "../../../platform/coords/levelGeometry";
import {
  getBackendTexture,
  getWebGPUDevice,
  type SceneRenderer,
} from "../../../platform/gpu/sceneRenderer";
import {
  MINMAX_ENTRY_BYTES,
  MINMAX_INIT_MAX,
  MINMAX_INIT_MIN,
  REPACK_KERNEL_R16_U16_WGSL,
  REPACK_KERNEL_R16_WGSL,
  REPACK_KERNEL_R8_WGSL,
  REPACK_KERNEL_RGBA8_WGSL,
  REPACK_KERNEL_WGSL,
  REPACK_PARAMS_BYTES,
  REPACK_PARAMS_STRIDE,
  buildKernelDispatches,
  decodeMinMax,
  decodeMinMaxU8,
  decodeSlabRanges,
  dispatchWorkgroups,
  packKernelParams,
  arenaJobLayoutForKind,
  type RepackDispatchInput,
} from "./repackKernel";
import type { BrickAtlas } from "./brickAtlas";
import type { AtlasKind } from "../octree/atlasFormat";

/**
 * GPU brick repack: runs the fused repack kernels (`repackKernel.ts`) on the
 * raw `GPUDevice`, replacing the CPU worker repack + `writeBrickToAtlas`
 * upload on the native WebGPU backend. r32f atlases take the storage-texture
 * kernel (textureStore straight into the slot); r8 atlases take the buffer
 * kernel — uint8 texels packed 4-per-u32 into a zero-cleared arena, then
 * `copyBufferToTexture` into the slot in the same submit (`r8unorm` is not a
 * core storage-texture format). The residency manager queues `dispatch()`
 * calls during its drain (one per acquired slot), then `flush()` once per
 * frame submits the whole batch and resolves with each brick's min/max
 * readback (EMPTY demotion happens there, a few frames later — the page
 * entry is optimistically RESIDENT meanwhile).
 *
 * Availability is three-tiered, all falling back to the CPU worker path:
 * - no `GPUDevice`, or disabled via the kill switch → `createGpuRepacker` = null;
 * - pipelines still compiling / compile failed → `ready()` / `supports()` = false;
 * - unsupported job (chunk dtype not matching the atlas kind, chunk larger
 *   than `maxStorageBufferBindingSize`) → `supports()` = false per brick.
 * Any batch failure marks the repacker broken — every subsequent brick takes
 * the CPU path, and the failed bricks' tokens are reported for unmapping.
 *
 * Chunk data is uploaded into a small LRU cache of storage buffers: a chunk
 * typically feeds many bricks (up to 8 neighbors per level), so one
 * `writeBuffer` amortizes across all of them. SAB-backed views are written
 * directly when the implementation accepts shared sources, else through a
 * scratch copy (still far cheaper than a CPU repack).
 */

// The repo deliberately avoids @webgpu/types (see sceneRenderer.ts) —
// structural typings for exactly the members this module touches.
import {
  BufferUsage,
  MAP_MODE_READ,
  SHADER_STAGE_COMPUTE,
  type ComputeDevice,
  type GpuBindGroup,
  type GpuBindGroupLayout,
  type GpuBuffer,
  type GpuComputePipeline,
  type GpuTextureView,
} from "../../../platform/gpu/webgpuTypes";

/** WebGPU default when the limit is somehow unreadable (spec minimum). */
const DEFAULT_MAX_STORAGE_BINDING = 128 * 1024 * 1024;

/** GPU chunk-buffer cache cap — a cache, not a residency requirement; it
 * shares VRAM with the atlases, so it stays well below the CPU-side
 * decoded-chunk cache. Misses just re-upload. */
const CHUNK_CACHE_BYTES = 128 * 1024 * 1024;

/**
 * Was a kill switch; settled ON (OCTREE_RENDERER.md §6.9): lets a session A/B the GPU repack
 * path against the CPU worker path without a rebuild. Read once per
 * residency manager — toggling takes effect on the next scene mount.
 */
/**
 * r16f GPU repack (same pattern, default ON): lets uint16 intensity pools —
 * the R3 half-float atlases — take the compute path through the r16 arena
 * kernel instead of the CPU worker (strided scalar copy + float32 scratch +
 * scalar half-encode per brick). Effective only with `orkestrator.gpuRepack`
 * and `orkestrator.r16Atlas` on. Read once per repacker (scene mount).
 */
/** Kinds whose output rides the u32 arena + copyBufferToTexture path. */
type ArenaKind = "r8" | "r16f" | "rgba8";
const usesArena = (kind: AtlasKind): kind is ArenaKind =>
  kind === "r8" || kind === "r16f" || kind === "rgba8";

export type GpuRepackJob<Token> = {
  atlas: BrickAtlas;
  input: RepackDispatchInput;
  /** GPU chunk-cache keys, parallel to `input.chunks` (decoded-chunk keys). */
  chunkKeys: readonly string[];
  slotCoords: Vec3;
  token: Token;
};

export type GpuRepackResult<Token> = {
  token: Token;
  min: number;
  max: number;
  uniformValue: number | null;
  /** Per-slab [min, max] (`RepackResult.slabRanges`), slab order. */
  slabRanges: readonly (readonly [number, number])[];
};

export type GpuFlushOutcome<Token> = {
  results: GpuRepackResult<Token>[];
  /** Bricks whose slot content is NOT valid — the caller must unmap them.
   * RETRYABLE: a batch failure marks the repacker `broken`, so the caller's
   * requeue lands on the CPU path. */
  failed: Token[];
  /**
   * Bricks this repacker can NEVER produce, however many times they are
   * retried — currently "no chunk overlaps the brick", which is a property of
   * the brick's geometry, not of this attempt.
   *
   * Split out of `failed` because the caller's requeue assumes a failure marks
   * the whole repacker broken and therefore diverts to the CPU path. That is
   * true of the two BATCH failures (a throw, and `!ready()`) but was never
   * true of the per-job case below, so those keys were re-dispatched to the
   * GPU, failed identically, and looped forever at fetch cadence — unmapping
   * and refilling the page entry each time, with no camera motion required.
   * The caller must route these to the CPU path (or to a terminal state)
   * instead of retrying them here.
   */
  unsupported: Token[];
};

export interface GpuRepacker<Token = unknown> {
  /** Pipeline compiled and no batch has failed. False → use the CPU path. */
  ready(): boolean;
  /** Distinguishes the two `ready() === false` states for the debug report:
   * still compiling vs permanently reverted to the CPU path. */
  status(): "pending" | "ready" | "broken";
  supports(atlas: BrickAtlas, chunks: readonly RepackChunk[]): boolean;
  /** Whether a source chunk is already resident in the GPU chunk cache — the
   * drain budget charges `writeBuffer` bytes only for misses
   * (`gpuFlushUploadBytes`). */
  hasChunk(cacheKey: string): boolean;
  /** Queue one brick (slot already acquired). Commands record at `flush`. */
  dispatch(job: GpuRepackJob<Token>): void;
  /** Submit the queued batch; null when nothing is queued. Never rejects. */
  flush(): Promise<GpuFlushOutcome<Token>> | null;
  dispose(): void;
}

type ChunkCacheEntry = { buffer: GpuBuffer; bindGroup: GpuBindGroup; bytes: number };
type AtlasBinding = {
  texture: unknown;
  bindGroup: GpuBindGroup;
  paramsGen: number;
  minmaxGen: number;
};
type StagingBuffer = { buffer: GpuBuffer; size: number; free: boolean };

class GpuRepackerImpl<Token> implements GpuRepacker<Token> {
  private pipeline: GpuComputePipeline | null = null;
  private pipelineR8: GpuComputePipeline | null = null;
  private pipelineR16: GpuComputePipeline | null = null;
  /** r16f over RAW uint16 chunks (`orkestrator.raw16` fidelity). */
  private pipelineR16U16: GpuComputePipeline | null = null;
  private pipelineRgba8: GpuComputePipeline | null = null;
  private broken = false;
  /** r8 / r16 / rgba8 module compile failures only — must not take the f32 path down. */
  private r8Broken = false;
  private r16Broken = false;
  private rgba8Broken = false;
  private disposed = false;

  private readonly group0Layout: GpuBindGroupLayout;
  private readonly group0R8Layout: GpuBindGroupLayout;
  private readonly group1Layout: GpuBindGroupLayout;

  private pending: GpuRepackJob<Token>[] = [];

  /** LRU by Map insertion order (same convention as BrickPoolState). */
  private readonly chunkCache = new Map<string, ChunkCacheEntry>();
  private chunkCacheBytes = 0;

  private paramsBuffer: GpuBuffer | null = null;
  private paramsCapacity = 0;
  private paramsGen = 0;
  private minmaxBuffer: GpuBuffer | null = null;
  private minmaxCapacity = 0;
  private minmaxGen = 0;
  /** r8 output arena (grow-only, cleared per batch). */
  private arenaBuffer: GpuBuffer | null = null;
  private arenaCapacity = 0;
  private arenaGen = 0;
  private readonly staging: StagingBuffer[] = [];
  private readonly atlasBindings = new WeakMap<BrickAtlas, AtlasBinding>();
  /** The r8 group0 binds no atlas — one cached bind group serves every job,
   * rebuilt when any of the three shared buffers was re-allocated. */
  private r8Binding: {
    bindGroup: GpuBindGroup;
    paramsGen: number;
    minmaxGen: number;
    arenaGen: number;
  } | null = null;

  /** Whether writeBuffer accepts SAB-backed views (probed on first use). */
  private sabWriteSupported: boolean | null = null;

  constructor(
    private readonly renderer: SceneRenderer,
    private readonly device: ComputeDevice,
  ) {
    this.group0Layout = device.createBindGroupLayout({
      label: "brick-repack group0",
      entries: [
        {
          binding: 0,
          visibility: SHADER_STAGE_COMPUTE,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: REPACK_PARAMS_BYTES,
          },
        },
        { binding: 1, visibility: SHADER_STAGE_COMPUTE, buffer: { type: "storage" } },
        {
          binding: 2,
          visibility: SHADER_STAGE_COMPUTE,
          storageTexture: { access: "write-only", format: "r32float", viewDimension: "3d" },
        },
      ],
    });
    this.group0R8Layout = device.createBindGroupLayout({
      label: "brick-repack group0 r8",
      entries: [
        {
          binding: 0,
          visibility: SHADER_STAGE_COMPUTE,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: REPACK_PARAMS_BYTES,
          },
        },
        { binding: 1, visibility: SHADER_STAGE_COMPUTE, buffer: { type: "storage" } },
        { binding: 2, visibility: SHADER_STAGE_COMPUTE, buffer: { type: "storage" } },
      ],
    });
    this.group1Layout = device.createBindGroupLayout({
      label: "brick-repack group1",
      entries: [
        { binding: 0, visibility: SHADER_STAGE_COMPUTE, buffer: { type: "read-only-storage" } },
      ],
    });

    // Async pipeline creation doubles as the validation probe: a rejection
    // (bad WGSL, unsupported storage format) permanently reverts to the CPU
    // path instead of surfacing per-frame uncaptured errors. The two variants
    // fail independently — supports() gates jobs per atlas kind.
    const module = device.createShaderModule({ label: "brick-repack", code: REPACK_KERNEL_WGSL });
    device
      .createComputePipelineAsync({
        label: "brick-repack",
        layout: device.createPipelineLayout({
          bindGroupLayouts: [this.group0Layout, this.group1Layout],
        }),
        compute: { module, entryPoint: "main" },
      })
      .then((pipeline) => {
        this.pipeline = pipeline;
      })
      .catch((error) => {
        this.broken = true;
        console.warn("[bricks] gpu repack pipeline failed to build; using CPU repack", error);
      });
    const moduleR8 = device.createShaderModule({
      label: "brick-repack-r8",
      code: REPACK_KERNEL_R8_WGSL,
    });
    device
      .createComputePipelineAsync({
        label: "brick-repack-r8",
        layout: device.createPipelineLayout({
          bindGroupLayouts: [this.group0R8Layout, this.group1Layout],
        }),
        compute: { module: moduleR8, entryPoint: "main" },
      })
      .then((pipeline) => {
        this.pipelineR8 = pipeline;
      })
      .catch((error) => {
        this.r8Broken = true;
        console.warn("[bricks] r8 gpu repack pipeline failed to build; using CPU repack", error);
      });
    {
      // rgba8 shares r8's group0 layout and chunk dtype (Uint8Array); only the
      // texel packing differs.
      const moduleRgba8 = device.createShaderModule({
        label: "brick-repack-rgba8",
        code: REPACK_KERNEL_RGBA8_WGSL,
      });
      device
        .createComputePipelineAsync({
          label: "brick-repack-rgba8",
          layout: device.createPipelineLayout({
            bindGroupLayouts: [this.group0R8Layout, this.group1Layout],
          }),
          compute: { module: moduleRgba8, entryPoint: "main" },
        })
        .then((pipeline) => {
          this.pipelineRgba8 = pipeline;
        })
        .catch((error) => {
          this.rgba8Broken = true;
          console.warn("[bricks] rgba8 gpu repack pipeline failed to build; using CPU repack", error);
        });
    }
    {
      // Same group0 layout as r8 (params + minmax + arena) — the kernels
      // differ only in texel packing.
      const moduleR16 = device.createShaderModule({
        label: "brick-repack-r16",
        code: REPACK_KERNEL_R16_WGSL,
      });
      device
        .createComputePipelineAsync({
          label: "brick-repack-r16",
          layout: device.createPipelineLayout({
            bindGroupLayouts: [this.group0R8Layout, this.group1Layout],
          }),
          compute: { module: moduleR16, entryPoint: "main" },
        })
        .then((pipeline) => {
          this.pipelineR16 = pipeline;
        })
        .catch((error) => {
          this.r16Broken = true;
          console.warn("[bricks] r16 gpu repack pipeline failed to build; using CPU repack", error);
        });
      // Raw-uint16-source variant (orkestrator.raw16 chunks). Shares the r16
      // broken flag: both serve the same atlas kind and fail for the same
      // reasons (arena/copy support), so one failure reverts both.
      const moduleR16U16 = device.createShaderModule({
        label: "brick-repack-r16-u16",
        code: REPACK_KERNEL_R16_U16_WGSL,
      });
      device
        .createComputePipelineAsync({
          label: "brick-repack-r16-u16",
          layout: device.createPipelineLayout({
            bindGroupLayouts: [this.group0R8Layout, this.group1Layout],
          }),
          compute: { module: moduleR16U16, entryPoint: "main" },
        })
        .then((pipeline) => {
          this.pipelineR16U16 = pipeline;
        })
        .catch((error) => {
          this.r16Broken = true;
          console.warn(
            "[bricks] r16-u16 gpu repack pipeline failed to build; using CPU repack",
            error,
          );
        });
    }
  }

  ready(): boolean {
    return (
      (this.pipeline !== null || this.pipelineR8 !== null || this.pipelineR16 !== null) &&
      !this.broken &&
      !this.disposed
    );
  }

  status(): "pending" | "ready" | "broken" {
    if (this.broken || this.disposed) return "broken";
    return this.pipeline === null && this.pipelineR8 === null && this.pipelineR16 === null
      ? "pending"
      : "ready";
  }

  supports(atlas: BrickAtlas, chunks: readonly RepackChunk[]): boolean {
    if (chunks.length === 0) return false;
    const maxBinding = this.device.limits.maxStorageBufferBindingSize ?? DEFAULT_MAX_STORAGE_BINDING;
    if (atlas.kind === "r32f") {
      return (
        this.pipeline !== null &&
        chunks.every(
          (chunk) => chunk.data instanceof Float32Array && chunk.data.byteLength <= maxBinding,
        )
      );
    }
    if (atlas.kind === "r8") {
      return (
        this.pipelineR8 !== null &&
        !this.r8Broken &&
        chunks.every(
          (chunk) => chunk.data instanceof Uint8Array && chunk.data.byteLength <= maxBinding,
        )
      );
    }
    if (atlas.kind === "rgba8") {
      return (
        this.pipelineRgba8 !== null &&
        !this.rgba8Broken &&
        chunks.every(
          (chunk) => chunk.data instanceof Uint8Array && chunk.data.byteLength <= maxBinding,
        )
      );
    }
    if (atlas.kind === "r16f") {
      // uint16 chunks arrive either promoted to Float32Array (default codec
      // fidelity) or as raw Uint16Array (orkestrator.raw16) — each has its own
      // kernel, and one brick's chunks are homogeneous (the representation is
      // an array-level decision; a mixed set falls back to the CPU repack).
      if (this.r16Broken) return false;
      return (
        (this.pipelineR16 !== null &&
          chunks.every(
            (chunk) => chunk.data instanceof Float32Array && chunk.data.byteLength <= maxBinding,
          )) ||
        (this.pipelineR16U16 !== null &&
          chunks.every(
            (chunk) => chunk.data instanceof Uint16Array && chunk.data.byteLength <= maxBinding,
          ))
      );
    }
    return false;
  }

  hasChunk(cacheKey: string): boolean {
    return this.chunkCache.has(cacheKey);
  }

  dispatch(job: GpuRepackJob<Token>): void {
    this.pending.push(job);
  }

  flush(): Promise<GpuFlushOutcome<Token>> | null {
    if (this.pending.length === 0) return null;
    const jobs = this.pending;
    this.pending = [];
    if (!this.ready()) {
      return Promise.resolve({ results: [], failed: jobs.map((job) => job.token), unsupported: [] });
    }
    // async fn: sync throws become rejections, so one catch covers both.
    return this.submitAndRead(jobs).catch((error) => {
      if (!this.disposed) {
        this.broken = true;
        console.warn("[bricks] gpu repack batch failed; reverting to CPU repack", error);
      }
      return { results: [], failed: jobs.map((job) => job.token), unsupported: [] };
    });
  }

  private async submitAndRead(jobs: GpuRepackJob<Token>[]): Promise<GpuFlushOutcome<Token>> {
    const device = this.device;
    const maxBinding = this.device.limits.maxStorageBufferBindingSize ?? DEFAULT_MAX_STORAGE_BINDING;

    const failed: Token[] = [];
    const unsupported: Token[] = [];
    const live: {
      job: GpuRepackJob<Token>;
      dispatches: ReturnType<typeof buildKernelDispatches>;
      /** r8 jobs: 256-aligned byte offset of this brick in the output arena. */
      arenaBase: number | null;
      /** First min/max entry of this brick; one entry PER SLAB follows. */
      minmaxBase: number;
      slabCount: number;
    }[] = [];
    let arenaBytes = 0;
    // Batches mix pools with different channel counts, so entries are laid
    // out by running sum, not brick × slabs.
    let minmaxEntries = 0;
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const slotOrigin: Vec3 = [
        job.slotCoords[0] * job.atlas.slotSize[0],
        job.slotCoords[1] * job.atlas.slotSize[1],
        job.slotCoords[2] * job.atlas.slotSize[2],
      ];
      const slabCount = job.input.spec.channelCount;
      const dispatches = buildKernelDispatches(job.input, slotOrigin, live.length, minmaxEntries);
      if (dispatches.length === 0) {
        // No chunk overlaps the brick: nothing was written, and nothing WOULD
        // be written on a retry — this is deterministic for a given brick
        // geometry. Not `failed`: that bucket means "retry elsewhere", and the
        // caller's requeue would send it straight back here (see the type).
        unsupported.push(job.token);
        continue;
      }
      let arenaBase: number | null = null;
      if (usesArena(job.atlas.kind)) {
        const layout = arenaJobLayoutForKind(
          job.atlas.kind,
          job.input.spec.stored,
          job.input.spec.channelCount,
        );
        arenaBase = arenaBytes;
        arenaBytes += layout.jobBytes;
      }
      live.push({ job, dispatches, arenaBase, minmaxBase: minmaxEntries, slabCount });
      minmaxEntries += slabCount;
    }
    if (live.length === 0) return { results: [], failed, unsupported };

    // Defensive: an r8 batch whose combined arena would exceed the storage
    // binding limit is split and processed sequentially (unreachable under the
    // per-frame drain budget — ~1 MB per brick vs a ≥128 MB limit).
    if (arenaBytes > maxBinding && jobs.length > 1) {
      const mid = Math.ceil(jobs.length / 2);
      const first = await this.submitAndRead(jobs.slice(0, mid));
      const second = await this.submitAndRead(jobs.slice(mid));
      return {
        results: [...first.results, ...second.results],
        failed: [...first.failed, ...second.failed],
        unsupported: [...first.unsupported, ...second.unsupported],
      };
    }

    // Chunk buffers: ensure every referenced chunk first (pinning the whole
    // batch), evict LRU extras after — evicting a buffer this batch still
    // needs would unbind it mid-flight.
    const pinned = new Set<string>();
    for (const { job, dispatches } of live) {
      for (const d of dispatches) {
        const key = job.chunkKeys[d.chunkIndex];
        this.ensureChunkEntry(
          key,
          job.input.chunks[d.chunkIndex].data as Float32Array | Uint16Array | Uint8Array,
        );
        pinned.add(key);
      }
    }
    this.evictChunks(pinned);

    // Params arena: one 256-aligned uniform slice per dispatch, one write.
    const totalDispatches = live.reduce((sum, entry) => sum + entry.dispatches.length, 0);
    this.ensureParamsCapacity(totalDispatches * REPACK_PARAMS_STRIDE);
    const paramsWords = new Uint32Array((totalDispatches * REPACK_PARAMS_STRIDE) / 4);
    let slice = 0;
    for (const { job, dispatches, arenaBase } of live) {
      const r8Out =
        arenaBase !== null
          ? {
              outBaseWord: arenaBase / 4,
              rowWords:
                arenaJobLayoutForKind(
                  job.atlas.kind as ArenaKind,
                  job.input.spec.stored,
                  job.input.spec.channelCount,
                ).rowBytes / 4,
            }
          : undefined;
      for (const d of dispatches) {
        packKernelParams(d, paramsWords, (slice * REPACK_PARAMS_STRIDE) / 4, r8Out);
        slice++;
      }
    }
    device.queue.writeBuffer(this.paramsBuffer!, 0, paramsWords);

    // Min/max slots, initialized to the sentinels the kernel reduces into.
    this.ensureMinmaxCapacity(minmaxEntries * MINMAX_ENTRY_BYTES);
    const minmaxInit = new Uint32Array(minmaxEntries * 2);
    for (let i = 0; i < minmaxEntries; i++) {
      minmaxInit[i * 2] = MINMAX_INIT_MIN;
      minmaxInit[i * 2 + 1] = MINMAX_INIT_MAX;
    }
    device.queue.writeBuffer(this.minmaxBuffer!, 0, minmaxInit);

    if (arenaBytes > 0) this.ensureArenaCapacity(arenaBytes);

    const staging = this.acquireStaging(minmaxEntries * MINMAX_ENTRY_BYTES);

    const encoder = device.createCommandEncoder();
    // The arena kernels OR lanes into the arena — it must start zeroed.
    if (arenaBytes > 0) encoder.clearBuffer(this.arenaBuffer!, 0, arenaBytes);
    const pass = encoder.beginComputePass();
    slice = 0;
    for (const { job, dispatches, arenaBase } of live) {
      const r8 = arenaBase !== null;
      pass.setPipeline(
        r8
          ? job.atlas.kind === "r16f"
            ? job.input.chunks[0]?.data instanceof Uint16Array
              ? this.pipelineR16U16!
              : this.pipelineR16!
            : job.atlas.kind === "rgba8"
              ? this.pipelineRgba8!
              : this.pipelineR8!
          : this.pipeline!,
      );
      for (const d of dispatches) {
        pass.setBindGroup(
          0,
          r8 ? this.r8BindGroup() : this.atlasBindGroup(job.atlas),
          [slice * REPACK_PARAMS_STRIDE],
        );
        pass.setBindGroup(1, this.chunkCache.get(job.chunkKeys[d.chunkIndex])!.bindGroup);
        const workgroups = dispatchWorkgroups(d);
        pass.dispatchWorkgroups(workgroups[0], workgroups[1], workgroups[2]);
        slice++;
      }
    }
    pass.end();
    // Arena bricks (r8 / r16f): arena → atlas slot, in the same submit as
    // the dispatches.
    for (const { job, arenaBase } of live) {
      if (arenaBase === null) continue;
      const layout = arenaJobLayoutForKind(
        job.atlas.kind as ArenaKind,
        job.input.spec.stored,
        job.input.spec.channelCount,
      );
      encoder.copyBufferToTexture(
        {
          buffer: this.arenaBuffer!,
          offset: arenaBase,
          bytesPerRow: layout.rowBytes,
          rowsPerImage: layout.imageRows,
        },
        {
          texture: this.atlasTexture(job.atlas),
          origin: [
            job.slotCoords[0] * job.atlas.slotSize[0],
            job.slotCoords[1] * job.atlas.slotSize[1],
            job.slotCoords[2] * job.atlas.slotSize[2],
          ],
        },
        [job.input.spec.stored[0], job.input.spec.stored[1], layout.images],
      );
    }
    encoder.copyBufferToBuffer(
      this.minmaxBuffer!,
      0,
      staging.buffer,
      0,
      minmaxEntries * MINMAX_ENTRY_BYTES,
    );
    device.queue.submit([encoder.finish()]);

    await staging.buffer.mapAsync(MAP_MODE_READ);
    const words = new Uint32Array(
      staging.buffer.getMappedRange().slice(0, minmaxEntries * MINMAX_ENTRY_BYTES),
    );
    staging.buffer.unmap();
    staging.free = true;

    const results: GpuRepackResult<Token>[] = live.map(
      ({ job, minmaxBase, slabCount }) => ({
        token: job.token,
        ...decodeSlabRanges(
          words,
          minmaxBase,
          slabCount,
          // The byte kernels (r8, rgba8) reduce raw bytes; f32 and r16
          // reduce the ordered-encoded raw float.
          job.atlas.kind === "r8" || job.atlas.kind === "rgba8" ? decodeMinMaxU8 : decodeMinMax,
        ),
      }),
    );
    return { results, failed, unsupported };
  }

  private ensureChunkEntry(key: string, data: Float32Array | Uint16Array | Uint8Array): void {
    const existing = this.chunkCache.get(key);
    if (existing) {
      // LRU touch (Map insertion order).
      this.chunkCache.delete(key);
      this.chunkCache.set(key, existing);
      return;
    }
    // Uint8 chunks may have an odd byte length; the buffer (bound as
    // array<u32>) and every write are padded to the next word.
    const paddedBytes = Math.ceil(data.byteLength / 4) * 4;
    const buffer = this.device.createBuffer({
      label: `brick-chunk ${key}`,
      size: paddedBytes,
      usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
    });
    this.writeChunkData(buffer, data);
    const bindGroup = this.device.createBindGroup({
      label: `brick-chunk ${key}`,
      layout: this.group1Layout,
      entries: [{ binding: 0, resource: { buffer } }],
    });
    this.chunkCache.set(key, { buffer, bindGroup, bytes: paddedBytes });
    this.chunkCacheBytes += paddedBytes;
  }

  /**
   * writeBuffer with a SAB-backed view where the implementation allows it
   * (AllowSharedBufferSource in the current spec); on the first rejection,
   * permanently switch to copying through a non-shared scratch.
   */
  private writeChunkData(buffer: GpuBuffer, data: Float32Array | Uint16Array | Uint8Array): void {
    if (data.byteLength % 4 !== 0) {
      // writeBuffer contents must be a whole number of words: copy through a
      // padded scratch (also sidesteps the SAB question for these chunks).
      const scratch = new Uint8Array(Math.ceil(data.byteLength / 4) * 4);
      scratch.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      this.device.queue.writeBuffer(buffer, 0, scratch);
      return;
    }
    const shared =
      typeof SharedArrayBuffer !== "undefined" && data.buffer instanceof SharedArrayBuffer;
    if (!shared || this.sabWriteSupported !== false) {
      try {
        this.device.queue.writeBuffer(buffer, 0, data);
        if (shared) this.sabWriteSupported = true;
        return;
      } catch (error) {
        if (!shared) throw error;
        this.sabWriteSupported = false;
        console.warn(
          "[bricks] writeBuffer rejected a SharedArrayBuffer view; copying chunks via scratch",
        );
      }
    }
    // Non-shared copy — of the BYTES, not the elements (an element-wise
    // Uint8Array(view) constructor call would truncate u16/f32 values).
    const copy = new Uint8Array(data.byteLength);
    copy.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    this.device.queue.writeBuffer(buffer, 0, copy);
  }

  private evictChunks(pinned: ReadonlySet<string>): void {
    for (const [key, entry] of this.chunkCache) {
      if (this.chunkCacheBytes <= CHUNK_CACHE_BYTES) break;
      if (pinned.has(key)) continue;
      this.chunkCache.delete(key);
      this.chunkCacheBytes -= entry.bytes;
      entry.buffer.destroy();
    }
  }

  private ensureParamsCapacity(bytes: number): void {
    if (this.paramsBuffer && this.paramsCapacity >= bytes) return;
    this.paramsBuffer?.destroy();
    this.paramsCapacity = Math.max(bytes, 16 * REPACK_PARAMS_STRIDE);
    this.paramsBuffer = this.device.createBuffer({
      label: "brick-repack params",
      size: this.paramsCapacity,
      usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
    });
    this.paramsGen++;
  }

  private ensureMinmaxCapacity(bytes: number): void {
    if (this.minmaxBuffer && this.minmaxCapacity >= bytes) return;
    this.minmaxBuffer?.destroy();
    this.minmaxCapacity = Math.max(bytes, 32 * MINMAX_ENTRY_BYTES);
    this.minmaxBuffer = this.device.createBuffer({
      label: "brick-repack minmax",
      size: this.minmaxCapacity,
      usage: BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST,
    });
    this.minmaxGen++;
  }

  private ensureArenaCapacity(bytes: number): void {
    if (this.arenaBuffer && this.arenaCapacity >= bytes) return;
    this.arenaBuffer?.destroy();
    this.arenaCapacity = bytes;
    this.arenaBuffer = this.device.createBuffer({
      label: "brick-repack r8 arena",
      size: this.arenaCapacity,
      usage: BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST,
    });
    this.arenaGen++;
  }

  /** group0 bind group for the r8 kernel: params + minmax + output arena —
   * no per-atlas resources, so one cached group serves every r8 job. */
  private r8BindGroup(): GpuBindGroup {
    const cached = this.r8Binding;
    if (
      cached &&
      cached.paramsGen === this.paramsGen &&
      cached.minmaxGen === this.minmaxGen &&
      cached.arenaGen === this.arenaGen
    ) {
      return cached.bindGroup;
    }
    const bindGroup = this.device.createBindGroup({
      label: "brick-repack r8",
      layout: this.group0R8Layout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.paramsBuffer!, offset: 0, size: REPACK_PARAMS_BYTES },
        },
        { binding: 1, resource: { buffer: this.minmaxBuffer! } },
        { binding: 2, resource: { buffer: this.arenaBuffer! } },
      ],
    });
    this.r8Binding = {
      bindGroup,
      paramsGen: this.paramsGen,
      minmaxGen: this.minmaxGen,
      arenaGen: this.arenaGen,
    };
    return bindGroup;
  }

  private acquireStaging(bytes: number): StagingBuffer {
    for (const entry of this.staging) {
      if (entry.free && entry.size >= bytes) {
        entry.free = false;
        return entry;
      }
    }
    const entry: StagingBuffer = {
      buffer: this.device.createBuffer({
        label: "brick-repack readback",
        size: Math.max(bytes, 32 * MINMAX_ENTRY_BYTES),
        usage: BufferUsage.MAP_READ | BufferUsage.COPY_DST,
      }),
      size: Math.max(bytes, 32 * MINMAX_ENTRY_BYTES),
      free: false,
    };
    this.staging.push(entry);
    return entry;
  }

  /**
   * group0 bind group for an atlas: its storage-texture view + the shared
   * params/minmax buffers. Cached per atlas; rebuilt when either shared
   * buffer was re-allocated (generation bump) or the backend re-created the
   * GPUTexture.
   */
  private atlasBindGroup(atlas: BrickAtlas): GpuBindGroup {
    const texture = this.atlasTexture(atlas);
    const cached = this.atlasBindings.get(atlas);
    if (
      cached &&
      cached.texture === texture &&
      cached.paramsGen === this.paramsGen &&
      cached.minmaxGen === this.minmaxGen
    ) {
      return cached.bindGroup;
    }
    const view = (texture as { createView(descriptor: object): GpuTextureView }).createView({
      dimension: "3d",
      baseMipLevel: 0,
      mipLevelCount: 1,
    });
    const bindGroup = this.device.createBindGroup({
      label: "brick-repack atlas",
      layout: this.group0Layout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.paramsBuffer!, offset: 0, size: REPACK_PARAMS_BYTES },
        },
        { binding: 1, resource: { buffer: this.minmaxBuffer! } },
        { binding: 2, resource: view },
      ],
    });
    this.atlasBindings.set(atlas, {
      texture,
      bindGroup,
      paramsGen: this.paramsGen,
      minmaxGen: this.minmaxGen,
    });
    return bindGroup;
  }

  private atlasTexture(atlas: BrickAtlas): unknown {
    let texture = getBackendTexture(this.renderer, atlas.texture);
    if (!texture) {
      // Force backend-side creation before the first draw samples the atlas.
      // The manager warms this up at pool creation; this is the safety net.
      (this.renderer as unknown as { initTexture?: (t: THREE.Texture) => void }).initTexture?.(
        atlas.texture,
      );
      texture = getBackendTexture(this.renderer, atlas.texture);
    }
    if (!texture) throw new Error("atlas GPUTexture unavailable for compute repack");
    return texture;
  }

  dispose(): void {
    this.disposed = true;
    this.pending = [];
    for (const entry of this.chunkCache.values()) entry.buffer.destroy();
    this.chunkCache.clear();
    this.chunkCacheBytes = 0;
    this.paramsBuffer?.destroy();
    this.paramsBuffer = null;
    this.minmaxBuffer?.destroy();
    this.minmaxBuffer = null;
    this.arenaBuffer?.destroy();
    this.arenaBuffer = null;
    this.r8Binding = null;
    for (const entry of this.staging) entry.buffer.destroy();
    this.staging.length = 0;
  }
}

/**
 * Null when there is no device to compute on (the renderer failed to
 * initialize) — callers then keep the worker repack path unconditionally.
 */
export function createGpuRepacker<Token = unknown>(
  renderer: SceneRenderer,
): GpuRepacker<Token> | null {
  const device = getWebGPUDevice(renderer);
  if (!device) return null;
  try {
    return new GpuRepackerImpl<Token>(renderer, device as unknown as ComputeDevice);
  } catch (error) {
    console.warn("[bricks] gpu repacker unavailable; using CPU repack", error);
    return null;
  }
}
