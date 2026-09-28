import type { WebGPURenderer } from "three/webgpu";

/**
 * The scene's renderer is three's `WebGPURenderer` on a native WebGPU backend
 * (Metal on macOS: the fix for the ANGLE texSubImage3D upload stalls, P19).
 * WebGPU is a hard requirement — three's WebGL2 fallback is disabled in the
 * Canvas factory and gated ahead of it by `webgpuSupport.ts`, so a `GPUDevice`
 * is always present here. This module is the ONE place that touches backend
 * internals, so callers stay backend-agnostic.
 *
 * Minimal structural typings for the WebGPU objects we touch — the repo does
 * not depend on @webgpu/types, and we only use a handful of members.
 */

export type SceneRenderer = WebGPURenderer;

type MinimalGPUDevice = {
  queue: {
    writeTexture: (
      destination: { texture: unknown; origin: [number, number, number]; mipLevel?: number },
      data: ArrayBufferView,
      dataLayout: { offset?: number; bytesPerRow: number; rowsPerImage: number },
      size: [number, number, number],
    ) => void;
  };
  limits: { maxTextureDimension3D?: number };
  /** GPUAdapterInfo — on the device per the WebGPU spec. */
  adapterInfo?: { vendor?: string; architecture?: string; device?: string; description?: string };
};

type MinimalBackend = {
  isWebGPUBackend?: boolean;
  device?: MinimalGPUDevice;
  get: (object: object) => { texture?: unknown };
};

export function getBackend(renderer: SceneRenderer): MinimalBackend | null {
  return ((renderer as unknown as { backend?: MinimalBackend }).backend ?? null);
}

export function isWebGPUBackend(renderer: SceneRenderer): boolean {
  return getBackend(renderer)?.isWebGPUBackend === true;
}

/** The backend's GPUDevice. Null only if the renderer failed to initialize. */
export function getWebGPUDevice(renderer: SceneRenderer): MinimalGPUDevice | null {
  const backend = getBackend(renderer);
  return backend?.isWebGPUBackend ? (backend.device ?? null) : null;
}

/** Backend-side data record for a texture (the GPUTexture handle). */
export function getBackendTexture(renderer: SceneRenderer, texture: object): unknown {
  return getBackend(renderer)?.get(texture)?.texture ?? null;
}

/** 3D-texture extent limit, from the device. */
export function getMax3DTextureSize(renderer: SceneRenderer): number {
  return getWebGPUDevice(renderer)?.limits.maxTextureDimension3D ?? 2048;
}

/** Human-readable GPU identity for the quality governor's persistence key. */
export function getGpuKey(renderer: SceneRenderer): string {
  const info = getWebGPUDevice(renderer)?.adapterInfo;
  if (info) {
    const key = [info.vendor, info.architecture, info.device, info.description]
      .filter(Boolean)
      .join(" ");
    if (key) return `webgpu:${key}`;
  }
  return "unknown";
}
