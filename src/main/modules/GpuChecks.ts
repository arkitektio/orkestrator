import { app } from "electron";
import Store from "electron-store";
import { AppModule } from "./AppModule";
import { IpcTransport } from "./IpcTransport";

/**
 * Which of Chromium's WebGPU safety checks stay on:
 *
 *  - `all`: Chromium's defaults. Every shader memory access is clamped to its
 *    buffer or texture, every API call is validated.
 *  - `no-bounds`: Dawn's `disable_robustness`. Shaders read out of range
 *    instead of being clamped: a bug shows as garbage or a lost device.
 *  - `none`: also `skip_validation`. A wrong API call is no longer reported
 *    (no `uncapturederror`), it can crash the GPU process.
 *
 * A Chromium switch, so it applies to the whole app — every page it shows,
 * the sandboxed mail iframe included — and only from the next launch on.
 */
export type GpuChecks = "all" | "no-bounds" | "none";

/** The electron-store key, read before `ready` (switches are fixed then). */
export const GPU_CHECKS_KEY = "gpu.checks";
export const GPU_CHECKS_GET_CHANNEL = "gpu-checks:get";
export const GPU_CHECKS_SET_CHANNEL = "gpu-checks:set";
export const GPU_CHECKS_RELAUNCH_CHANNEL = "gpu-checks:relaunch";

export type GpuChecksState = {
  /** What this run started with. */
  active: GpuChecks;
  /** What the next launch will start with. */
  next: GpuChecks;
  /** The app can restart itself (not under `pnpm dev`, whose server dies with it). */
  canRelaunch: boolean;
};

export const parseGpuChecks = (value: unknown): GpuChecks =>
  value === "no-bounds" || value === "none" ? value : "all";

/** The Dawn toggles for `--enable-dawn-features`; empty = no switch. */
export const dawnTogglesFor = (checks: GpuChecks): string[] =>
  checks === "none"
    ? ["disable_robustness", "skip_validation"]
    : checks === "no-bounds"
      ? ["disable_robustness"]
      : [];

type CommandLine = { appendSwitch: (name: string, value?: string) => void };

/**
 * Startup half; call at the top of main, before `ready`. Reads the stored
 * choice, appends the switch, and returns what this run started with.
 */
export function applyGpuChecks(store: Pick<Store, "get">, commandLine: CommandLine): GpuChecks {
  const checks = parseGpuChecks(store.get(GPU_CHECKS_KEY));
  const toggles = dawnTogglesFor(checks);
  if (toggles.length > 0) {
    commandLine.appendSwitch("enable-dawn-features", toggles.join(","));
    console.warn(`[gpu] WebGPU safety checks reduced (${checks}): ${toggles.join(", ")}`);
  }
  return checks;
}

export class GpuChecksService implements AppModule {
  private readonly store = new Store();

  constructor(
    private readonly ipcTransport: IpcTransport,
    private readonly active: GpuChecks,
  ) {}

  private state(): GpuChecksState {
    return {
      active: this.active,
      next: parseGpuChecks(this.store.get(GPU_CHECKS_KEY)),
      canRelaunch: app.isPackaged,
    };
  }

  setup() {
    this.ipcTransport.handleChannel(GPU_CHECKS_GET_CHANNEL, () => this.state());
    this.ipcTransport.handleChannel(GPU_CHECKS_SET_CHANNEL, (_event, value: unknown) => {
      const checks = parseGpuChecks(value);
      if (checks === "all") this.store.delete(GPU_CHECKS_KEY);
      else this.store.set(GPU_CHECKS_KEY, checks);
      return this.state();
    });
    this.ipcTransport.handleChannel(GPU_CHECKS_RELAUNCH_CHANNEL, () => {
      if (!app.isPackaged) return;
      app.relaunch();
      app.quit();
    });
  }
}
