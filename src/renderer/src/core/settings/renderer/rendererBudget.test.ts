import { afterEach, describe, expect, it } from "vitest";
import {
  applyRendererBudgetSettings,
  getRendererBudget,
  gpuMemoryKind,
  registerRendererSettingsWriter,
  resetRendererBudgetForTests,
  resolveAutoDecodeCacheBytes,
  resolveAutoGpuBudget,
  resolveRendererBudget,
  selectRenderGpu,
  sharedAtlasFraction,
  writeRendererSettings,
  type RendererGpu,
  type RendererHardware,
} from "./rendererBudget";

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

const RTX: RendererGpu = {
  vendor: "NVIDIA Corporation",
  model: "NVIDIA GeForce RTX 4070",
  vramMB: 12282,
  vramDynamic: false,
};
const IRIS: RendererGpu = {
  vendor: "Intel Corporation",
  model: "Iris Xe Graphics",
  vramMB: 1024,
  vramDynamic: true,
};
const hardware = (gpus: RendererGpu[], totalRamMB = 31410, adapterVendor?: string): RendererHardware => ({
  probedAt: "2026-10-07T10:00:00.000Z",
  totalRamMB,
  gpus,
  adapterVendor,
});

afterEach(() => resetRendererBudgetForTests());

describe("resolveAutoGpuBudget", () => {
  it("without a snapshot is the old deviceMemory rule, byte for byte", () => {
    expect(resolveAutoGpuBudget(null, null).bytes).toBe(512 * MiB);
    expect(resolveAutoGpuBudget(null, 8).bytes).toBe(8 * GiB * 0.18);
    expect(resolveAutoGpuBudget(null, 1).bytes).toBe(256 * MiB);
    expect(resolveAutoGpuBudget(null, 64).bytes).toBe(2 * GiB);
    expect(resolveAutoGpuBudget(null, 8).source).toEqual({ kind: "legacy" });
  });

  it("takes half of a card's own memory", () => {
    const { bytes, source } = resolveAutoGpuBudget(hardware([RTX]), 8);
    expect(bytes).toBe(6141 * MiB);
    expect(source).toEqual({ kind: "vram", gpu: RTX, vramMB: 12282 });
  });

  it("takes a share of RAM when the GPU has no memory of its own", () => {
    const { bytes, source } = resolveAutoGpuBudget(hardware([IRIS], 16384), 8);
    // A third of RAM for atlas and cache together; the atlas gets two thirds of that.
    expect(bytes).toBe(3640 * MiB);
    expect(source).toMatchObject({ kind: "ram", unified: false });
  });

  it("stays inside its bounds", () => {
    const tiny = { ...RTX, vramMB: 256 };
    const huge = { ...RTX, vramMB: 48 * 1024 };
    expect(resolveAutoGpuBudget(hardware([tiny]), 8).bytes).toBe(256 * MiB);
    expect(resolveAutoGpuBudget(hardware([huge]), 8).bytes).toBe(8 * GiB);
  });

  it("falls back to RAM when no GPU was found at all", () => {
    expect(resolveAutoGpuBudget(hardware([], 8192), 8).bytes).toBe(1365 * MiB);
  });
});

describe("unified and shared memory", () => {
  const M = (model: string): RendererGpu => ({ vendor: "Apple", model, vramMB: null, vramDynamic: true });
  const mac = (gpus: RendererGpu[], totalRamMB: number, arch = "arm64"): RendererHardware => ({
    ...hardware(gpus, totalRamMB),
    os: { platform: "darwin", distro: "macOS", release: "15.1", kernel: "24.1.0", arch },
  });
  const MB = (h: RendererHardware) => resolveAutoGpuBudget(h, 8).bytes / MiB;

  it("recognises Apple silicon as one pool, with or without a GPU entry", () => {
    expect(gpuMemoryKind(M("Apple M2"), mac([M("Apple M2")], 16384))).toBe("unified");
    expect(gpuMemoryKind(null, mac([], 16384))).toBe("unified");
    expect(resolveAutoGpuBudget(mac([M("Apple M2")], 16384), 8).source).toMatchObject({
      kind: "ram",
      unified: true,
    });
  });

  it("is careful on small machines and generous on large ones", () => {
    expect(MB(mac([M("Apple M1")], 8192))).toBe(1365); // 1/6 of RAM
    expect(MB(mac([M("Apple M2")], 16384))).toBe(3640); // 2/9
    expect(MB(mac([M("Apple M3 Max")], 36864))).toBe(8192); // 1/4, at the cap
    expect(MB(mac([M("Apple M2 Pro")], 24576))).toBe(6144); // 1/4
  });

  it("treats a nominal 8 or 16 GB machine as one, whatever the OS rounds off", () => {
    expect(sharedAtlasFraction(7821)).toBeCloseTo(1 / 6);
    expect(sharedAtlasFraction(15906)).toBeCloseTo(2 / 9);
    expect(sharedAtlasFraction(31410)).toBeCloseTo(1 / 4);
  });

  it("leaves room for the cache inside the same share", () => {
    for (const ramMB of [8192, 16384, 32768]) {
      const budget = resolveRendererBudget({ rendererHardware: mac([M("Apple M2")], ramMB) }, 8);
      const combinedMB = (budget.gpuBudgetBytes + budget.decodeCacheBytes) / MiB;
      // Never more than the combined share of RAM the rule set aside (3/8 at most).
      expect(combinedMB).toBeLessThanOrEqual(ramMB * (3 / 8));
      expect(budget.decodeCacheBytes).toBeLessThanOrEqual(budget.gpuBudgetBytes / 2 + 1);
    }
  });

  it("gives an Intel Mac's built-in discrete card its own memory back", () => {
    // macOS flags every built-in GPU as dynamic, a real AMD card included.
    const radeon: RendererGpu = {
      vendor: "AMD",
      model: "Radeon Pro 5500M",
      vramMB: 8192,
      vramDynamic: true,
    };
    const intel: RendererGpu = {
      vendor: "Intel",
      model: "Intel UHD Graphics 630",
      vramMB: 1536,
      vramDynamic: true,
    };
    const macbook = mac([intel, radeon], 32768, "x64");
    expect(gpuMemoryKind(radeon, macbook)).toBe("dedicated");
    expect(gpuMemoryKind(intel, macbook)).toBe("shared");
    expect(selectRenderGpu(macbook)).toBe(radeon);
    expect(resolveAutoGpuBudget(macbook, 8).source).toMatchObject({ kind: "vram", vramMB: 8192 });
    expect(MB(macbook)).toBe(4096);
  });

  it("still trusts the shared flag off macOS", () => {
    // A Windows APU: the figure is a slice of RAM, not memory of its own.
    const apu: RendererGpu = { vendor: "AMD", model: "Radeon 780M", vramMB: 512, vramDynamic: true };
    const laptop = hardware([apu], 16384);
    expect(gpuMemoryKind(apu, laptop)).toBe("shared");
    expect(MB(laptop)).toBe(3640);
  });
});

describe("selectRenderGpu", () => {
  it("picks the GPU the WebGPU adapter names", () => {
    expect(selectRenderGpu(hardware([RTX, IRIS], 31410, "intel"))).toBe(IRIS);
    expect(selectRenderGpu(hardware([IRIS, RTX], 31410, "nvidia"))).toBe(RTX);
  });

  it("reads AMD's long vendor name", () => {
    const amd = { ...RTX, vendor: "Advanced Micro Devices, Inc. [AMD/ATI]", model: "RX 7800" };
    expect(selectRenderGpu(hardware([IRIS, amd], 31410, "amd"))).toBe(amd);
  });

  it("without a matching adapter prefers dedicated memory", () => {
    expect(selectRenderGpu(hardware([IRIS, RTX]))).toBe(RTX);
    expect(selectRenderGpu(hardware([IRIS, RTX], 31410, "mystery"))).toBe(RTX);
    expect(selectRenderGpu(hardware([]))).toBeNull();
  });
});

describe("resolveAutoDecodeCacheBytes", () => {
  it("without a snapshot is the old rule", () => {
    expect(resolveAutoDecodeCacheBytes(null, 512 * MiB, null)).toBe(512 * MiB);
    expect(resolveAutoDecodeCacheBytes(null, 512 * MiB, 8)).toBe(256 * MiB);
    expect(resolveAutoDecodeCacheBytes(null, 2 * GiB, 16)).toBe(1 * GiB);
  });

  it("follows the GPU ceiling but not past an eighth of real RAM", () => {
    expect(resolveAutoDecodeCacheBytes(hardware([RTX], 32768), 6 * GiB, 8)).toBe(3 * GiB);
    expect(resolveAutoDecodeCacheBytes(hardware([RTX], 16384), 6 * GiB, 8)).toBe(2 * GiB);
    // Never below the base, however little RAM there is.
    expect(resolveAutoDecodeCacheBytes(hardware([RTX], 2048), 6 * GiB, 2)).toBe(256 * MiB);
  });

  it("uses the real RAM, not the capped deviceMemory, for the low-memory guard", () => {
    expect(resolveAutoDecodeCacheBytes(hardware([IRIS], 16384), 512 * MiB, 8)).toBe(512 * MiB);
  });
});

describe("resolveRendererBudget", () => {
  it("lets the user's numbers win, within bounds", () => {
    const budget = resolveRendererBudget(
      { rendererHardware: hardware([RTX]), rendererGpuBudgetMB: 1024, rendererDecodeCacheMB: 64 },
      8,
    );
    expect(budget.gpuBudgetBytes).toBe(1024 * MiB);
    expect(budget.gpuSource).toEqual({ kind: "custom" });
    expect(budget.autoGpuBudgetBytes).toBe(6141 * MiB);
    expect(budget.autoGpuSource.kind).toBe("vram");
    expect(budget.decodeCacheBytes).toBe(128 * MiB);
    expect(budget.decodeCacheCustom).toBe(true);
  });

  it("derives the automatic cache from the ceiling actually in force", () => {
    const budget = resolveRendererBudget(
      { rendererHardware: hardware([RTX], 32768), rendererGpuBudgetMB: 2048 },
      8,
    );
    expect(budget.decodeCacheBytes).toBe(1 * GiB);
    expect(budget.decodeCacheCustom).toBe(false);
  });

  it("treats null, zero and nonsense as automatic", () => {
    for (const value of [null, undefined, 0, -5, Number.NaN]) {
      const budget = resolveRendererBudget({ rendererGpuBudgetMB: value }, null);
      expect(budget.gpuBudgetBytes).toBe(512 * MiB);
      expect(budget.gpuSource.kind).toBe("legacy");
    }
  });
});

describe("the budget in force", () => {
  it("is the legacy default before anything was applied or stored", () => {
    expect(getRendererBudget().gpuBudgetBytes).toBe(512 * MiB);
  });

  it("follows what the settings store applies", () => {
    applyRendererBudgetSettings({ rendererHardware: hardware([RTX]) });
    expect(getRendererBudget().gpuBudgetBytes).toBe(6141 * MiB);
  });

  it("writes through the registered store, and stands alone without one", () => {
    const patches: unknown[] = [];
    registerRendererSettingsWriter((patch) => patches.push(patch));
    writeRendererSettings({ rendererGpuBudgetMB: 2048 });
    expect(patches).toEqual([{ rendererGpuBudgetMB: 2048 }]);

    // A size that is not one is "automatic", never an invalid setting.
    writeRendererSettings({ rendererGpuBudgetMB: 0, rendererDecodeCacheMB: Number.NaN });
    expect(patches[1]).toEqual({ rendererGpuBudgetMB: null, rendererDecodeCacheMB: null });

    registerRendererSettingsWriter(null);
    applyRendererBudgetSettings({ rendererHardware: hardware([RTX]), rendererDecodeCacheMB: 300 });
    writeRendererSettings({ rendererGpuBudgetMB: 2048 });
    const budget = getRendererBudget();
    expect(budget.gpuBudgetBytes).toBe(2048 * MiB);
    // The other settings survive a single-field write.
    expect(budget.decodeCacheBytes).toBe(300 * MiB);
    expect(budget.hardware?.gpus).toEqual([RTX]);
  });
});
