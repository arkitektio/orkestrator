import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { GpuPicker, type PickRenderer } from "./gpuPick";

/**
 * One `GpuPicker` per renderer (so per canvas), shared by every collection
 * layer on it — sources render into one depth buffer, and two layers asking
 * about the same pointer event share one pass. Created on first use, never
 * disposed explicitly: it is a 5×5 target and a Set, and it dies with the
 * renderer it is keyed on.
 */
const pickers = new WeakMap<object, GpuPicker>();

const canPick = (renderer: unknown): renderer is PickRenderer => {
  const candidate = renderer as Partial<PickRenderer> & {
    backend?: { isWebGPUBackend?: boolean };
  };
  return (
    typeof candidate.readRenderTargetPixelsAsync === "function" &&
    typeof candidate.render === "function" &&
    // The RGBA32F target and the float readback are the WebGPU path's; a
    // WebGL fallback backend keeps the CPU raycast.
    candidate.backend?.isWebGPUBackend === true
  );
};

export const gpuPickerFor = (renderer: unknown): GpuPicker | null => {
  if (!canPick(renderer)) return null;
  let picker = pickers.get(renderer);
  if (!picker) {
    picker = new GpuPicker(renderer);
    pickers.set(renderer, picker);
  }
  return picker;
};

/**
 * This canvas' picker, or null when GPU picking is unavailable — unsupported
 * backend, or a pick already failed this session. Re-renders on that flip so
 * callers switch to their CPU fallback.
 */
export const useGpuPicker = (): GpuPicker | null => {
  const gl = useThree((state) => state.gl);
  const picker = gpuPickerFor(gl);
  const [available, setAvailable] = useState(() => picker?.available ?? false);
  useEffect(() => {
    if (!picker) return;
    setAvailable(picker.available);
    return picker.onAvailabilityChange(() => setAvailable(picker.available));
  }, [picker]);
  return picker && available ? picker : null;
};
