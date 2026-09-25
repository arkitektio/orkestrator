/**
 * The minimal structural typing of WebGPU this renderer's compute paths need.
 *
 * `@webgpu/types` is deliberately NOT a dependency: three's `WebGPURenderer`
 * hands these objects out as `unknown`, so every call site would cast anyway,
 * and the full ambient declaration would put `GPUDevice` and friends in global
 * scope for code that must not reach for them directly. Describing only what
 * is called keeps the surface honest and the cast at one boundary.
 *
 * This existed twice, byte-identical, in `features/bricks/gpu/computeRepack.ts`
 * and `features/annotations/enhancers/shared/gpu/computeSkeleton.ts` — the two
 * compute kernels — each carrying the two or three extra members it happened
 * to use. The members are unioned here rather than split into a base plus two
 * extensions, because both files are describing the SAME object: a real
 * `GPUCommandEncoder` has `clearBuffer` and `copyBufferToTexture` whether or
 * not the skeletonizer calls them, and a real device has the error-scope pair.
 * The error-scope methods stay OPTIONAL, as they were, so a device that
 * predates them still satisfies the type.
 */

export type GpuBuffer = {
  destroy(): void;
  mapAsync(mode: number): Promise<void>;
  getMappedRange(): ArrayBuffer;
  unmap(): void;
};

export type GpuBindGroup = { readonly __brand?: "bindGroup" };
export type GpuBindGroupLayout = { readonly __brand?: "bindGroupLayout" };
export type GpuComputePipeline = { readonly __brand?: "computePipeline" };
export type GpuTextureView = { readonly __brand?: "textureView" };

export type GpuComputePass = {
  setPipeline(pipeline: GpuComputePipeline): void;
  setBindGroup(index: number, group: GpuBindGroup, dynamicOffsets?: number[]): void;
  dispatchWorkgroups(x: number, y: number, z: number): void;
  end(): void;
};

export type GpuCommandEncoder = {
  beginComputePass(): GpuComputePass;
  copyBufferToBuffer(
    source: GpuBuffer,
    sourceOffset: number,
    destination: GpuBuffer,
    destinationOffset: number,
    size: number,
  ): void;
  clearBuffer(buffer: GpuBuffer, offset: number, size: number): void;
  copyBufferToTexture(
    source: { buffer: GpuBuffer; offset: number; bytesPerRow: number; rowsPerImage: number },
    destination: { texture: unknown; origin: [number, number, number] },
    copySize: [number, number, number],
  ): void;
  finish(): unknown;
};

export type ComputeDevice = {
  limits: { maxStorageBufferBindingSize?: number };
  queue: {
    submit(commandBuffers: unknown[]): void;
    writeBuffer(
      buffer: GpuBuffer,
      bufferOffset: number,
      data: ArrayBufferView | ArrayBuffer,
      dataOffset?: number,
      size?: number,
    ): void;
  };
  createShaderModule(descriptor: { label?: string; code: string }): unknown;
  createBindGroupLayout(descriptor: object): GpuBindGroupLayout;
  createPipelineLayout(descriptor: object): unknown;
  createComputePipelineAsync(descriptor: object): Promise<GpuComputePipeline>;
  createBindGroup(descriptor: object): GpuBindGroup;
  createBuffer(descriptor: { label?: string; size: number; usage: number }): GpuBuffer;
  createCommandEncoder(): GpuCommandEncoder;
  /** Present on every current implementation; optional so a device without
   *  them still satisfies the type. Guarded at both call sites. */
  pushErrorScope?(filter: "validation"): void;
  popErrorScope?(): Promise<{ message: string } | null>;
};

/** `GPUBufferUsage`, as flags — the subset the compute paths set. */
export const BufferUsage = {
  MAP_READ: 0x0001,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
} as const;

/** `GPUShaderStage.COMPUTE`. */
export const SHADER_STAGE_COMPUTE = 0x4;
/** `GPUMapMode.READ`. */
export const MAP_MODE_READ = 0x1;
