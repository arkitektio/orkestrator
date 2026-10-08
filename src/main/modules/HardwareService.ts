import si from "systeminformation";
import { AppModule } from "./AppModule";
import { IpcTransport } from "./IpcTransport";

/** Invoked by the renderer's settings to learn what this computer has. */
export const HARDWARE_PROBE_CHANNEL = "hardware:probe";

export type HardwareGpu = {
  vendor: string;
  model: string;
  /** Megabytes; null when the OS reports none. */
  vramMB: number | null;
  /** The memory is borrowed from system RAM (integrated graphics), not the card's own. */
  vramDynamic: boolean;
  driverVersion?: string | null;
};

export type HardwareCpu = {
  brand: string;
  /** Logical cores. */
  cores: number;
  physicalCores: number;
  speedGHz: number | null;
};

export type HardwareOs = {
  platform: string;
  distro: string;
  release: string;
  kernel: string;
  arch: string;
};

export type HardwareDisplay = {
  width: number;
  height: number;
  refreshRate: number | null;
  main: boolean;
};

/**
 * What the renderer settings are derived from. A plain snapshot: it is stored
 * in the settings as-is and read again at the next boot, so it must stay
 * serialisable and small.
 *
 * It can also be attached to a bug report (Settings → Telemetry), so it holds
 * what DESCRIBES the machine and nothing that NAMES it: no hostname, serial
 * number, user name, MAC address or disk contents. `systeminformation` offers
 * all of those; `toHardwareInfo` copies fields one by one so none can ride
 * along by accident.
 */
export type HardwareInfo = {
  /** ISO timestamp of the probe. */
  probedAt: string;
  totalRamMB: number;
  gpus: HardwareGpu[];
  cpu?: HardwareCpu | null;
  os?: HardwareOs | null;
  displays?: HardwareDisplay[];
};

/** The `systeminformation` answers this needs, as loosely as it gives them. */
export type RawGraphicsController = {
  vendor?: string;
  model?: string;
  name?: string;
  vram?: number | null;
  vramDynamic?: boolean;
  memoryTotal?: number;
  driverVersion?: string;
};
export type RawDisplay = {
  currentResX?: number | null;
  currentResY?: number | null;
  currentRefreshRate?: number | null;
  main?: boolean;
};
export type RawCpu = {
  manufacturer?: string;
  brand?: string;
  cores?: number;
  physicalCores?: number;
  speed?: number;
};
export type RawOs = {
  platform?: string;
  distro?: string;
  release?: string;
  kernel?: string;
  arch?: string;
};
export type RawHardware = {
  controllers: readonly RawGraphicsController[];
  totalRamBytes: number;
  displays?: readonly RawDisplay[];
  cpu?: RawCpu | null;
  os?: RawOs | null;
};

const MB = 1024 * 1024;

/**
 * `systeminformation` → `HardwareInfo`. Pure, so the mapping is tested against
 * captured output rather than against whichever machine runs the suite.
 *
 * `memoryTotal` (the vendor tool's own figure, e.g. nvidia-smi) wins over
 * `vram` when both exist: `vram` comes from a PCI or registry read that some
 * platforms cap or round.
 */
export function toHardwareInfo(raw: RawHardware, now: Date = new Date()): HardwareInfo {
  const { cpu, os } = raw;
  return {
    probedAt: now.toISOString(),
    totalRamMB: Math.round(raw.totalRamBytes / MB),
    gpus: raw.controllers.map((controller) => {
      const reported = controller.memoryTotal ?? controller.vram ?? null;
      return {
        vendor: controller.vendor ?? "",
        model: controller.name || controller.model || "Unknown GPU",
        vramMB: typeof reported === "number" && reported > 0 ? Math.round(reported) : null,
        vramDynamic: controller.vramDynamic === true,
        driverVersion: controller.driverVersion || null,
      };
    }),
    cpu: cpu
      ? {
          brand: [cpu.manufacturer, cpu.brand].filter(Boolean).join(" ") || "Unknown CPU",
          cores: cpu.cores ?? 0,
          physicalCores: cpu.physicalCores ?? 0,
          speedGHz: typeof cpu.speed === "number" && cpu.speed > 0 ? cpu.speed : null,
        }
      : null,
    os: os
      ? {
          platform: os.platform ?? "",
          distro: os.distro ?? "",
          release: os.release ?? "",
          kernel: os.kernel ?? "",
          arch: os.arch ?? "",
        }
      : null,
    displays: (raw.displays ?? [])
      .filter((display) => !!display.currentResX && !!display.currentResY)
      .map((display) => ({
        width: display.currentResX as number,
        height: display.currentResY as number,
        refreshRate: display.currentRefreshRate ?? null,
        main: display.main === true,
      })),
  };
}

/**
 * Answers "what GPU and how much memory does this computer have", which the
 * renderer cannot find out by itself: WebGPU reports no memory size and
 * `navigator.deviceMemory` is system RAM capped at 8. Asked on demand (first
 * start, and "Detect again" in Settings → Renderer); the renderer keeps the
 * answer in its settings.
 */
export class HardwareService implements AppModule {
  constructor(private readonly ipcTransport: IpcTransport) {}

  setup() {
    this.ipcTransport.handleChannel(HARDWARE_PROBE_CHANNEL, async (): Promise<HardwareInfo> => {
      // The GPU and memory are what the renderer budget needs; the rest only
      // describes the machine, so a tool that fails there costs nothing.
      const [graphics, memory, cpu, os] = await Promise.all([
        si.graphics(),
        si.mem(),
        si.cpu().catch(() => null),
        si.osInfo().catch(() => null),
      ]);
      return toHardwareInfo({
        controllers: graphics.controllers,
        displays: graphics.displays,
        totalRamBytes: memory.total,
        cpu,
        os,
      });
    });
  }
}
