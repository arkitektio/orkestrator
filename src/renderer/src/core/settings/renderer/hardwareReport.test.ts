import { describe, expect, it } from "vitest";
import { hardwareReportLines } from "./hardwareReport";
import type { RendererHardware } from "./rendererBudget";

const DESKTOP: RendererHardware = {
  probedAt: "2026-10-07T10:00:00.000Z",
  totalRamMB: 31410,
  gpus: [
    {
      vendor: "NVIDIA Corporation",
      model: "NVIDIA GeForce RTX 4070",
      vramMB: 12282,
      vramDynamic: false,
      driverVersion: "595.91.07",
    },
  ],
  cpu: { brand: "Intel Core i7-13700F", cores: 24, physicalCores: 16, speedGHz: 4.05 },
  os: { platform: "linux", distro: "Ubuntu", release: "26.04.1 LTS", kernel: "7.0.0-38-generic", arch: "x64" },
  displays: [
    { width: 2560, height: 1440, refreshRate: 59, main: false },
    { width: 2560, height: 1440, refreshRate: 59.95, main: true },
  ],
  adapterVendor: "nvidia",
  adapter: {
    vendor: "nvidia",
    architecture: "lovelace",
    device: "",
    description: "",
    maxTextureDimension3D: 2048,
    maxBufferSize: 268435456,
  },
};

describe("hardwareReportLines", () => {
  it("describes a desktop in a handful of lines", () => {
    expect(hardwareReportLines(DESKTOP)).toEqual([
      "GPU: NVIDIA GeForce RTX 4070, 12 GB, driver 595.91.07",
      "WebGPU adapter: nvidia lovelace, max 3D texture 2048",
      "CPU: Intel Core i7-13700F, 16 cores / 24 threads, 4.05 GHz",
      "Memory: 30.7 GB",
      "System: Ubuntu 26.04.1 LTS, kernel 7.0.0-38-generic, x64",
      "Displays: 2560×1440 @ 59 Hz, 2560×1440 @ 60 Hz",
    ]);
  });

  it("says which of two GPUs renders, and when memory is shared", () => {
    const lines = hardwareReportLines({
      ...DESKTOP,
      gpus: [
        { vendor: "Intel Corporation", model: "Iris Xe", vramMB: 1024, vramDynamic: true },
        DESKTOP.gpus[0],
      ],
    });
    expect(lines[0]).toBe("GPU: Iris Xe, 1 GB shared with system memory");
    expect(lines[1]).toBe("GPU: NVIDIA GeForce RTX 4070, 12 GB, driver 595.91.07 (renders scenes)");
  });

  it("calls Apple silicon's memory what it is", () => {
    const lines = hardwareReportLines({
      probedAt: DESKTOP.probedAt,
      totalRamMB: 16384,
      gpus: [{ vendor: "Apple", model: "Apple M2", vramMB: null, vramDynamic: true }],
      os: { platform: "darwin", distro: "macOS", release: "15.1", kernel: "24.1.0", arch: "arm64" },
    });
    expect(lines[0]).toBe("GPU: Apple M2, unified memory");
  });

  it("copes with a snapshot from before more was detected", () => {
    expect(
      hardwareReportLines({ probedAt: DESKTOP.probedAt, totalRamMB: 8192, gpus: [] }),
    ).toEqual(["Memory: 8 GB"]);
  });
});
