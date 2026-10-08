import type { RendererAdapter, RendererHardware } from "./rendererBudget";

type AdapterLike = {
  info?: { vendor?: string; architecture?: string; device?: string; description?: string };
  limits?: { maxTextureDimension3D?: number; maxBufferSize?: number };
};
type NavigatorGPU = { gpu?: { requestAdapter: () => Promise<AdapterLike | null> } };

/** The adapter WebGPU renders on — the tie-breaker on a machine with several
 * GPUs. Null when WebGPU is unavailable. */
async function describeAdapter(): Promise<RendererAdapter | null> {
  try {
    const adapter = await (navigator as unknown as NavigatorGPU).gpu?.requestAdapter();
    if (!adapter) return null;
    return {
      vendor: adapter.info?.vendor ?? "",
      architecture: adapter.info?.architecture ?? "",
      device: adapter.info?.device ?? "",
      description: adapter.info?.description ?? "",
      maxTextureDimension3D: adapter.limits?.maxTextureDimension3D ?? null,
      maxBufferSize: adapter.limits?.maxBufferSize ?? null,
    };
  } catch {
    return null;
  }
}

/** Can this window ask main about the hardware at all? (Not in the web build.) */
export const canProbeRendererHardware = (): boolean =>
  typeof window !== "undefined" && !!window.api?.hardware?.probe;

/**
 * Ask main what this computer has (`HardwareService`) and note which GPU
 * WebGPU uses. Null when there is no main process to ask or the probe failed;
 * the renderer budget then stays on its fallback rule.
 *
 * Callers check the user's permission first (`telemetryDetectHardware`); this
 * only does the asking.
 */
export async function probeRendererHardware(): Promise<RendererHardware | null> {
  if (!canProbeRendererHardware()) return null;
  try {
    const [hardware, adapter] = await Promise.all([window.api.hardware.probe(), describeAdapter()]);
    return { ...hardware, adapterVendor: adapter?.vendor || null, adapter };
  } catch (error) {
    console.warn("[renderer] hardware probe failed", error);
    return null;
  }
}
