import type * as THREE from "three";
import {
  getBackend,
  getWebGPUDevice,
  type SceneRenderer,
} from "../../../platform/gpu/sceneRenderer";

/**
 * Partial 3D-texture upload via `device.queue.writeTexture` on the backend's
 * GPUTexture (P19 / WebGPU migration) — the native path, with no row-alignment
 * constraints and no global unpack state. The ANGLE `texSubImage3D` path this
 * replaced cost ~17.5 ms/brick on an M2.
 *
 * When the texture is not yet initialized (first frames, before a draw has
 * bound it) this falls back to `texture.needsUpdate = true` — the CPU backing
 * array mirrors every write, so a full re-spec is correct, just not
 * incremental.
 *
 * All brick and page-level buffers are contiguous exactly at their upload
 * extents (tightly packed rows/images).
 */

export type TexelKind = "r8" | "rg8" | "r16f" | "r32f" | "rgba8";

const BYTES_PER_TEXEL: Record<TexelKind, number> = {
  r8: 1,
  rg8: 2,
  r16f: 2,
  r32f: 4,
  rgba8: 4,
};

export function uploadTexSubImage3D(
  renderer: SceneRenderer,
  texture: THREE.Data3DTexture,
  kind: TexelKind,
  dest: readonly [number, number, number],
  size: readonly [number, number, number],
  data: ArrayBufferView,
  /**
   * Source layout when `data` is NOT tightly packed at `size` — lets a caller
   * upload a sub-box straight out of a larger mirror without a staging copy
   * (`writeTexture` reads strided source data natively; no alignment
   * constraints apply on this path, unlike buffer→texture copies).
   */
  layout?: { offsetBytes: number; bytesPerRow: number; rowsPerImage: number },
): boolean {
  const backend = getBackend(renderer);
  if (!backend) return false;

  const device = getWebGPUDevice(renderer);
  if (!device) return false;

  const gpuTexture = (backend.get(texture) as { texture?: unknown } | undefined)
    ?.texture;
  if (!gpuTexture) {
    // Not yet created by the backend (no draw has sampled it): a full
    // needsUpdate upload from the backing mirror is correct and rare.
    texture.needsUpdate = true;
    return true;
  }

  device.queue.writeTexture(
    { texture: gpuTexture, origin: [dest[0], dest[1], dest[2]] },
    data,
    {
      offset: layout?.offsetBytes ?? 0,
      bytesPerRow: layout?.bytesPerRow ?? size[0] * BYTES_PER_TEXEL[kind],
      rowsPerImage: layout?.rowsPerImage ?? size[1],
    },
    [size[0], size[1], size[2]],
  );
  return true;
}
