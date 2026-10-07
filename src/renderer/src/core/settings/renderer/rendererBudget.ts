/**
 * How much memory 3D scenes may use on this computer, and where that number
 * comes from.
 *
 * The scene used to guess: `navigator.deviceMemory × 0.18`. That is system RAM,
 * not GPU memory, and Chromium caps it at 8, so every machine with 8 GiB or
 * more planned for the same 1.44 GiB whatever card it had. Main can ask the OS
 * (`HardwareService`), so the app does that once, keeps the answer in the
 * settings, and derives the ceiling from it here. The user may overrule it in
 * Settings → Renderer.
 *
 * Lives in core, not in the scene: the settings store applies it and the
 * settings page explains it, and neither may import a module.
 *
 * ONE synchronous source (`getRendererBudget`). The brick planner and the
 * atlas allocator both read the GPU ceiling and must see the same number, or a
 * plan is sized for an atlas that does not exist; a getter over one resolved
 * value makes disagreement impossible. A change reaches plans at the next
 * replan and atlases at the next pool creation — live atlases are never
 * resized.
 */

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

/** The settings key (`settingsStore`). Read here for the lazy first load. */
const SETTINGS_KEY = "wasser-settings";

export type RendererGpu = {
  vendor: string;
  model: string;
  /** Megabytes; null when the OS reports none. */
  vramMB: number | null;
  /** Borrowed from system RAM (integrated graphics), not the card's own. */
  vramDynamic: boolean;
  driverVersion?: string | null;
};

/** The adapter WebGPU hands out, as the renderer itself sees it. */
export type RendererAdapter = {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
  maxTextureDimension3D: number | null;
  maxBufferSize: number | null;
};

/**
 * What was detected, kept in the settings (`rendererHardware`). Describes the
 * machine without naming it — see main's `HardwareInfo`. Everything past the
 * GPUs and the RAM is there to be read (Settings → Renderer) and, if the user
 * leaves that on, attached to a bug report; none of it feeds the budget.
 */
export type RendererHardware = {
  probedAt: string;
  totalRamMB: number;
  gpus: RendererGpu[];
  cpu?: { brand: string; cores: number; physicalCores: number; speedGHz: number | null } | null;
  os?: { platform: string; distro: string; release: string; kernel: string; arch: string } | null;
  displays?: { width: number; height: number; refreshRate: number | null; main: boolean }[];
  /** `GPUAdapterInfo.vendor` of the adapter WebGPU hands out: which of
   * several GPUs actually renders. */
  adapterVendor?: string | null;
  adapter?: RendererAdapter | null;
};

/** The settings this module reads. */
export type RendererBudgetSettings = {
  /** Add the snapshot to bug reports (Settings → Telemetry). On unless switched off. */
  telemetryAttachHardware?: boolean;
  rendererHardware?: RendererHardware | null;
  /** Megabytes; null = automatic. */
  rendererGpuBudgetMB?: number | null;
  /** Megabytes; null = automatic. */
  rendererDecodeCacheMB?: number | null;
};

/** Half of a card's own memory: atlases are allocated up front, the desktop
 * and every other application share the card, and nothing tells us when they
 * grow. */
export const DEDICATED_VRAM_FRACTION = 0.5;

/**
 * Where the GPU has no memory of its own — Apple silicon's unified memory,
 * integrated graphics — the atlas and the decoded-chunk cache are the SAME
 * bytes as everything else on the machine, so they are budgeted together: one
 * combined share of RAM, of which the atlas takes `SHARED_ATLAS_SPLIT` and the
 * cache (half the atlas, see `resolveAutoDecodeCacheBytes`) the rest.
 *
 * The share grows with the machine because what the OS and the app need does
 * not: on 8 GiB a quarter is already where macOS starts compressing and
 * swapping, which shows as stutter rather than as an error.
 */
export const SHARED_COMBINED_FRACTIONS: readonly { upToRamMB: number; fraction: number }[] = [
  { upToRamMB: 8.5 * 1024, fraction: 1 / 4 },
  { upToRamMB: 17 * 1024, fraction: 1 / 3 },
  { upToRamMB: Number.POSITIVE_INFINITY, fraction: 3 / 8 },
];
/** The atlas's part of the combined share; the cache follows at half the atlas. */
export const SHARED_ATLAS_SPLIT = 2 / 3;

/** Share of RAM the atlas may take on a machine whose GPU shares it. */
export const sharedAtlasFraction = (totalRamMB: number): number =>
  SHARED_COMBINED_FRACTIONS.find((step) => totalRamMB <= step.upToRamMB)!.fraction *
  SHARED_ATLAS_SPLIT;

export const MIN_GPU_BUDGET_MB = 256;
/** Ceiling of the AUTOMATIC choice. A user who knows the machine may go past it. */
export const MAX_AUTO_GPU_BUDGET_MB = 8 * 1024;
export const MAX_GPU_BUDGET_MB = 16 * 1024;

export const MIN_DECODE_CACHE_MB = 128;
export const MAX_DECODE_CACHE_MB = 4 * 1024;
/** Share of the GPU ceiling the decoded-chunk cache follows: heap, not VRAM,
 * but a machine that affords a large atlas needs the chunks to feed it. */
export const DECODE_CACHE_BUDGET_FRACTION = 0.5;
/** …but never more than this share of real RAM. */
const DECODE_CACHE_RAM_FRACTION = 1 / 8;

// The rule that applied before detection existed, kept byte for byte: it is
// what a machine without a snapshot gets (the web build, the very first
// launch, a failed probe).
const LEGACY_DEFAULT_BYTES = 512 * MiB;
const LEGACY_MIN_BYTES = 256 * MiB;
const LEGACY_MAX_BYTES = 2 * GiB;
const LEGACY_DEVICE_MEMORY_FRACTION = 0.18;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Does an OS vendor string ("Advanced Micro Devices, Inc.") name the adapter's
 * vendor ("amd")? */
const VENDOR_ALIASES: Record<string, RegExp> = {
  nvidia: /nvidia/i,
  amd: /amd|advanced micro|ati\b/i,
  intel: /intel/i,
  apple: /apple/i,
  qualcomm: /qualcomm/i,
};
const vendorMatches = (osVendor: string, adapterVendor: string): boolean => {
  const alias = VENDOR_ALIASES[adapterVendor.toLowerCase()];
  return alias ? alias.test(osVendor) : osVendor.toLowerCase().includes(adapterVendor.toLowerCase());
};

/**
 * The GPU scenes render on. With several, the one WebGPU's adapter names;
 * failing that, the one with the most memory of its own.
 */
export function selectRenderGpu(hardware: RendererHardware): RendererGpu | null {
  if (hardware.gpus.length === 0) return null;
  const vendor = hardware.adapterVendor;
  const matching = vendor ? hardware.gpus.filter((gpu) => vendorMatches(gpu.vendor, vendor)) : [];
  const candidates = matching.length > 0 ? matching : hardware.gpus;
  const dedicated = (gpu: RendererGpu) =>
    gpuMemoryKind(gpu, hardware) === "dedicated" ? (gpu.vramMB ?? 0) : 0;
  return candidates.reduce((best, gpu) => (dedicated(gpu) > dedicated(best) ? gpu : best));
}

/**
 * Whose memory a GPU draws on:
 *  - `dedicated`: its own (a discrete card) — VRAM is the budget's basis;
 *  - `unified`: Apple silicon, where there is one pool and no VRAM figure;
 *  - `shared`: integrated graphics borrowing system RAM, or nothing known.
 *
 * `vramDynamic` alone does not decide it. On macOS the flag means "built in",
 * and an Intel Mac's built-in AMD or NVIDIA card has real memory of its own —
 * read as shared it would be budgeted from RAM and its VRAM ignored.
 */
export type GpuMemoryKind = "dedicated" | "unified" | "shared";

export function gpuMemoryKind(gpu: RendererGpu | null, hardware: RendererHardware): GpuMemoryKind {
  const isMac = hardware.os?.platform === "darwin";
  if (gpu && /apple/i.test(`${gpu.vendor} ${gpu.model}`)) return "unified";
  if (!gpu && isMac && hardware.os?.arch === "arm64") return "unified";
  if (!gpu || gpu.vramMB === null) return "shared";
  if (!gpu.vramDynamic) return "dedicated";
  return isMac && !/intel/i.test(gpu.vendor) ? "dedicated" : "shared";
}

export type GpuBudgetSource =
  /** The user's own number. */
  | { kind: "custom" }
  /** A share of the card's own memory. */
  | { kind: "vram"; gpu: RendererGpu; vramMB: number }
  /** A share of system RAM: the GPU has none of its own (`unified` = Apple
   * silicon's single pool, otherwise integrated graphics). */
  | { kind: "ram"; gpu: RendererGpu | null; totalRamMB: number; unified: boolean; fraction: number }
  /** Nothing detected: the `deviceMemory` guess. */
  | { kind: "legacy" };

/** The ceiling the app picks by itself, and what it was derived from. */
export function resolveAutoGpuBudget(
  hardware: RendererHardware | null | undefined,
  deviceMemoryGiB: number | null,
): { bytes: number; source: GpuBudgetSource } {
  if (hardware) {
    const gpu = selectRenderGpu(hardware);
    const memory = gpuMemoryKind(gpu, hardware);
    if (gpu && gpu.vramMB !== null && memory === "dedicated") {
      const mb = clamp(gpu.vramMB * DEDICATED_VRAM_FRACTION, MIN_GPU_BUDGET_MB, MAX_AUTO_GPU_BUDGET_MB);
      return { bytes: Math.floor(mb) * MiB, source: { kind: "vram", gpu, vramMB: gpu.vramMB } };
    }
    if (hardware.totalRamMB > 0) {
      const fraction = sharedAtlasFraction(hardware.totalRamMB);
      const mb = clamp(hardware.totalRamMB * fraction, MIN_GPU_BUDGET_MB, MAX_AUTO_GPU_BUDGET_MB);
      return {
        bytes: Math.floor(mb) * MiB,
        source: {
          kind: "ram",
          gpu,
          totalRamMB: hardware.totalRamMB,
          unified: memory === "unified",
          fraction,
        },
      };
    }
  }
  if (deviceMemoryGiB === null) return { bytes: LEGACY_DEFAULT_BYTES, source: { kind: "legacy" } };
  return {
    bytes: clamp(deviceMemoryGiB * GiB * LEGACY_DEVICE_MEMORY_FRACTION, LEGACY_MIN_BYTES, LEGACY_MAX_BYTES),
    source: { kind: "legacy" },
  };
}

/**
 * The decoded-chunk cache the app picks by itself: half the GPU ceiling, at
 * least 512 MiB (256 on machines with 8 GiB or less, which hit GC pauses with
 * the full size alongside the atlases), at most 4 GiB and — where the real RAM
 * is known — an eighth of it.
 */
export function resolveAutoDecodeCacheBytes(
  hardware: RendererHardware | null | undefined,
  gpuBudgetBytes: number,
  deviceMemoryGiB: number | null,
): number {
  const memoryGiB = hardware && hardware.totalRamMB > 0 ? hardware.totalRamMB / 1024 : deviceMemoryGiB;
  const base = memoryGiB !== null && memoryGiB <= 8 ? 256 * MiB : 512 * MiB;
  const scaled = Math.max(base, DECODE_CACHE_BUDGET_FRACTION * gpuBudgetBytes);
  const ramCap =
    hardware && hardware.totalRamMB > 0
      ? Math.max(base, hardware.totalRamMB * MiB * DECODE_CACHE_RAM_FRACTION)
      : Number.POSITIVE_INFINITY;
  return Math.floor(Math.min(scaled, ramCap, MAX_DECODE_CACHE_MB * MiB));
}

export type RendererBudget = {
  /** GPU memory brick atlases may take, all scenes together. */
  gpuBudgetBytes: number;
  /** What the app would pick by itself (shown beside a custom value). */
  autoGpuBudgetBytes: number;
  gpuSource: GpuBudgetSource;
  /** What `gpuSource` would be without the user's number. */
  autoGpuSource: GpuBudgetSource;
  /** JS-heap bytes for decoded chunks. */
  decodeCacheBytes: number;
  autoDecodeCacheBytes: number;
  decodeCacheCustom: boolean;
  hardware: RendererHardware | null;
};

const validMB = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** Settings → the numbers the scene runs on. Pure. */
export function resolveRendererBudget(
  settings: RendererBudgetSettings,
  deviceMemoryGiB: number | null,
): RendererBudget {
  const hardware = settings.rendererHardware ?? null;
  const auto = resolveAutoGpuBudget(hardware, deviceMemoryGiB);
  const customGpu = validMB(settings.rendererGpuBudgetMB)
    ? clamp(settings.rendererGpuBudgetMB, MIN_GPU_BUDGET_MB, MAX_GPU_BUDGET_MB) * MiB
    : null;
  const gpuBudgetBytes = customGpu ?? auto.bytes;
  const autoDecodeCacheBytes = resolveAutoDecodeCacheBytes(hardware, gpuBudgetBytes, deviceMemoryGiB);
  const customDecode = validMB(settings.rendererDecodeCacheMB)
    ? clamp(settings.rendererDecodeCacheMB, MIN_DECODE_CACHE_MB, MAX_DECODE_CACHE_MB) * MiB
    : null;
  return {
    gpuBudgetBytes,
    autoGpuBudgetBytes: auto.bytes,
    gpuSource: customGpu !== null ? { kind: "custom" } : auto.source,
    autoGpuSource: auto.source,
    decodeCacheBytes: customDecode ?? autoDecodeCacheBytes,
    autoDecodeCacheBytes,
    decodeCacheCustom: customDecode !== null,
    hardware,
  };
}

/** `navigator.deviceMemory` (coarse, capped at 8), or null where absent. */
export function reportedDeviceMemoryGiB(): number | null {
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { deviceMemory?: number })
      : undefined;
  const memoryGiB = nav?.deviceMemory;
  return typeof memoryGiB === "number" && Number.isFinite(memoryGiB) && memoryGiB > 0
    ? memoryGiB
    : null;
}

let current: RendererBudget | undefined;
let attachToReports = true;

/** Called by the settings store on hydrate and on every change. */
export function applyRendererBudgetSettings(settings: RendererBudgetSettings): void {
  current = resolveRendererBudget(settings, reportedDeviceMemoryGiB());
  attachToReports = settings.telemetryAttachHardware !== false;
}

/**
 * The snapshot a bug report may carry: what was detected, unless the user
 * switched "Attach to bug reports" off (or detection itself, which leaves
 * nothing to attach). Not a hook — the report button also lives on error pages
 * that render outside the settings provider.
 */
export function getReportableHardware(): RendererHardware | null {
  const { hardware } = getRendererBudget();
  return attachToReports ? hardware : null;
}

/**
 * The budget in force. Before the settings store has hydrated — scene modules
 * read this while they are being IMPORTED — it is resolved straight from the
 * stored settings, so an early reader sees the same number as a late one.
 */
export function getRendererBudget(): RendererBudget {
  if (current) return current;
  let stored: RendererBudgetSettings = {};
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SETTINGS_KEY) : null;
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") stored = parsed as RendererBudgetSettings;
  } catch {
    // Unreadable settings: the automatic choice without a snapshot.
  }
  current = resolveRendererBudget(stored, reportedDeviceMemoryGiB());
  attachToReports = stored.telemetryAttachHardware !== false;
  return current;
}

type RendererSettingsWriter = (patch: RendererBudgetSettings) => void;
let writer: RendererSettingsWriter | null = null;

/** The settings store registers itself as the way to change these settings. */
export function registerRendererSettingsWriter(next: RendererSettingsWriter | null): void {
  writer = next;
}

/**
 * Change a renderer setting from outside React (the scene's debug panel).
 * Goes through the settings store, so the value is saved, applied and shown in
 * Settings → Renderer like any other change. Without a store (a unit test, a
 * window that never mounted one) it only moves the in-memory budget.
 */
export function writeRendererSettings(input: RendererBudgetSettings): void {
  // Anything that is not a usable size means "automatic". The settings
  // validator refuses such a number outright, and a refused write leaves the
  // app without settings — so it must never get that far.
  const patch = { ...input };
  for (const field of ["rendererGpuBudgetMB", "rendererDecodeCacheMB"] as const) {
    if (field in patch && !validMB(patch[field])) patch[field] = null;
  }
  if (writer) {
    writer(patch);
    return;
  }
  const base = getRendererBudget();
  applyRendererBudgetSettings({
    telemetryAttachHardware: attachToReports,
    rendererHardware: base.hardware,
    rendererGpuBudgetMB: base.gpuSource.kind === "custom" ? base.gpuBudgetBytes / MiB : null,
    rendererDecodeCacheMB: base.decodeCacheCustom ? base.decodeCacheBytes / MiB : null,
    ...patch,
  });
}

/** Test seam: forget the resolved budget and the registered writer. */
export function resetRendererBudgetForTests(): void {
  current = undefined;
  attachToReports = true;
  writer = null;
}
