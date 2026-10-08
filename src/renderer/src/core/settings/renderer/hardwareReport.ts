import {
  gpuMemoryKind,
  selectRenderGpu,
  type RendererGpu,
  type RendererHardware,
} from "./rendererBudget";

/** 12282 → "12 GB", 512 → "512 MB". Sizes here are estimates; no false precision. */
export const formatMB = (mb: number): string =>
  mb >= 1024 ? `${Number((mb / 1024).toFixed(1))} GB` : `${Math.round(mb)} MB`;

/** A GPU's memory in a few words: its own, borrowed, or Apple's single pool. */
export function describeGpuMemory(gpu: RendererGpu, hardware: RendererHardware): string {
  const kind = gpuMemoryKind(gpu, hardware);
  if (kind === "unified") return "unified memory";
  if (gpu.vramMB === null) return "memory unknown";
  return kind === "shared" ? `${formatMB(gpu.vramMB)} shared with system memory` : formatMB(gpu.vramMB);
}

/**
 * The detected hardware as the lines a bug report carries — and, word for
 * word, what Settings → Telemetry shows the user it will carry. One function
 * for both, so the preview cannot promise less than the report sends.
 */
export function hardwareReportLines(hardware: RendererHardware): string[] {
  const lines: string[] = [];
  const renderGpu = selectRenderGpu(hardware);

  for (const gpu of hardware.gpus) {
    const memory = describeGpuMemory(gpu, hardware);
    const driver = gpu.driverVersion ? `, driver ${gpu.driverVersion}` : "";
    const used = hardware.gpus.length > 1 && gpu === renderGpu ? " (renders scenes)" : "";
    lines.push(`GPU: ${gpu.model}, ${memory}${driver}${used}`);
  }
  if (hardware.adapter) {
    const { vendor, architecture, device, description, maxTextureDimension3D } = hardware.adapter;
    const identity = [vendor, architecture, device, description].filter(Boolean).join(" ");
    const limit = maxTextureDimension3D ? `, max 3D texture ${maxTextureDimension3D}` : "";
    if (identity || limit) lines.push(`WebGPU adapter: ${identity || "unnamed"}${limit}`);
  }
  if (hardware.cpu) {
    const { brand, cores, physicalCores, speedGHz } = hardware.cpu;
    const speed = speedGHz ? `, ${speedGHz} GHz` : "";
    lines.push(`CPU: ${brand}, ${physicalCores} cores / ${cores} threads${speed}`);
  }
  lines.push(`Memory: ${formatMB(hardware.totalRamMB)}`);
  if (hardware.os) {
    const { distro, release, kernel, arch, platform } = hardware.os;
    const name = [distro || platform, release].filter(Boolean).join(" ");
    lines.push(`System: ${name}${kernel ? `, kernel ${kernel}` : ""}${arch ? `, ${arch}` : ""}`);
  }
  if (hardware.displays && hardware.displays.length > 0) {
    const displays = hardware.displays
      .map((d) => `${d.width}×${d.height}${d.refreshRate ? ` @ ${Math.round(d.refreshRate)} Hz` : ""}`)
      .join(", ");
    lines.push(`Displays: ${displays}`);
  }
  return lines;
}
