import { describe, expect, it } from "vitest";
import { toHardwareInfo } from "./HardwareService";

const NOW = new Date("2026-10-07T10:00:00.000Z");

describe("toHardwareInfo", () => {
  it("maps a machine as systeminformation reports it on Linux", () => {
    // Captured from `si.graphics()` / `cpu()` / `osInfo()` on an RTX 4070
    // desktop (trimmed, but with the identifying fields LEFT IN on purpose).
    const info = toHardwareInfo(
      {
        controllers: [
          {
            vendor: "NVIDIA Corporation",
            model: "AD104 [GeForce RTX 4070]",
            name: "NVIDIA GeForce RTX 4070",
            vram: 12282,
            vramDynamic: false,
            memoryTotal: 12282,
            driverVersion: "595.91.07",
          },
        ],
        displays: [
          { currentResX: 2560, currentResY: 1440, currentRefreshRate: 59, main: false },
          { currentResX: 2560, currentResY: 1440, currentRefreshRate: 59, main: true },
          { currentResX: null, currentResY: null },
        ],
        totalRamBytes: 32935550976,
        cpu: {
          manufacturer: "Intel",
          brand: "Gen Intel® Core™ i7-13700F",
          cores: 24,
          physicalCores: 16,
          speed: 4.05,
        },
        os: {
          platform: "linux",
          distro: "Ubuntu",
          release: "26.04.1 LTS",
          kernel: "7.0.0-38-generic",
          arch: "x64",
          hostname: "someones-machine",
          fqdn: "someones-machine.lab.example",
          serial: "47de8b7327024c68820ea042d1bdb37b",
        } as never,
      },
      NOW,
    );
    expect(info).toEqual({
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
      cpu: { brand: "Intel Gen Intel® Core™ i7-13700F", cores: 24, physicalCores: 16, speedGHz: 4.05 },
      os: {
        platform: "linux",
        distro: "Ubuntu",
        release: "26.04.1 LTS",
        kernel: "7.0.0-38-generic",
        arch: "x64",
      },
      displays: [
        { width: 2560, height: 1440, refreshRate: 59, main: false },
        { width: 2560, height: 1440, refreshRate: 59, main: true },
      ],
    });
    // Nothing that names the machine survives the mapping.
    const text = JSON.stringify(info);
    expect(text).not.toContain("someones-machine");
    expect(text).not.toContain("47de8b73");
  });

  it("prefers the vendor tool's total over the bus figure", () => {
    const [gpu] = toHardwareInfo(
      { controllers: [{ vram: 4095, memoryTotal: 24564 }], totalRamBytes: 0 },
      NOW,
    ).gpus;
    expect(gpu.vramMB).toBe(24564);
  });

  it("keeps an integrated GPU's memory marked as shared", () => {
    const [gpu] = toHardwareInfo(
      {
        controllers: [
          { vendor: "Intel Corporation", model: "Iris Xe Graphics", vram: 1024, vramDynamic: true },
        ],
        totalRamBytes: 16 * 1024 ** 3,
      },
      NOW,
    ).gpus;
    expect(gpu).toMatchObject({ model: "Iris Xe Graphics", vramMB: 1024, vramDynamic: true });
  });

  it("reports no memory rather than zero, and survives missing tools", () => {
    const info = toHardwareInfo(
      { controllers: [{ vendor: "", model: "", vram: 0 }], totalRamBytes: 0, cpu: null, os: null },
      NOW,
    );
    expect(info.gpus[0].vramMB).toBeNull();
    expect(info.gpus[0].model).toBe("Unknown GPU");
    expect(info.cpu).toBeNull();
    expect(info.os).toBeNull();
    expect(info.displays).toEqual([]);
  });
});
