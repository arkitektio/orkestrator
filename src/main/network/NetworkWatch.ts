import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";
import type { AppModule } from "../modules/AppModule";
import type { IpcTransport } from "../modules/IpcTransport";
import type { WindowManager } from "../modules/WindowManager";
import { NETWORK_CHANGED_CHANNEL, type NetworkChange } from "./protocol";

/**
 * Notices when this computer's network changes and tells every window.
 *
 * The renderer only has `online` / `offline`, which says nothing when a
 * laptop moves from one network to another or a VPN comes up: it stays
 * "online" throughout, while every address it was using stopped working.
 * Main can see it: the set of addresses on the machine's interfaces changes,
 * and the OS says when it wakes from sleep.
 *
 * It only reports that something MAY have changed. What to do about it — which
 * services to check again — is the connection's call.
 *
 * Everything Electron- and OS-specific is injected so the class runs under
 * vitest; `index.ts` wires `powerMonitor` in.
 */

export type NetworkWatchDeps = {
  interfaces?: () => NodeJS.Dict<NetworkInterfaceInfo[]>;
  /** Subscribe to the OS waking up; returns nothing, lives as long as the app. */
  onResume?: (listener: () => void) => void;
  /** How often the interfaces are compared. Reading them is a syscall, no subprocess. */
  intervalMs?: number;
};

/**
 * The machine's routable addresses, as one comparable string. Loopback and
 * link-local addresses are left out: they say nothing about where the machine
 * can reach, and IPv6 link-locals come and go by themselves.
 */
export const networkSignature = (nets: NodeJS.Dict<NetworkInterfaceInfo[]>): string =>
  Object.entries(nets)
    .flatMap(([name, infos]) =>
      (infos ?? [])
        .filter(
          (info) =>
            !info.internal &&
            !info.address.startsWith("169.254.") &&
            !info.address.toLowerCase().startsWith("fe80:"),
        )
        .map((info) => `${name}|${info.address}`),
    )
    .sort()
    .join(",");

export class NetworkWatch implements AppModule {
  private timer: ReturnType<typeof setInterval> | undefined;
  private signature: string | undefined;

  constructor(
    private readonly transport: IpcTransport,
    private readonly windowManager: WindowManager,
    private readonly deps: NetworkWatchDeps = {},
  ) {}

  setup() {
    const read = () => networkSignature((this.deps.interfaces ?? networkInterfaces)());
    this.signature = read();
    this.timer = setInterval(() => {
      const next = read();
      if (next === this.signature) return;
      this.signature = next;
      this.broadcast({ reason: "interfaces" });
    }, this.deps.intervalMs ?? 5_000);
    // Not kept alive for this alone.
    this.timer.unref?.();
    this.deps.onResume?.(() => {
      // The addresses may read the same and still be dead after a sleep.
      this.signature = read();
      this.broadcast({ reason: "resume" });
    });
  }

  onBeforeQuit() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private broadcast(change: NetworkChange) {
    for (const win of this.windowManager.getAllWindows()) {
      if (win.isDestroyed()) continue;
      this.transport.sendTo(win.webContents, NETWORK_CHANGED_CHANNEL, change);
    }
  }
}
