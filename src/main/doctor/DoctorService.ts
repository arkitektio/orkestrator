import type { AppModule } from "../modules/AppModule";
import type { IpcTransport } from "../modules/IpcTransport";
import { probeTarget } from "./networkProbe";
import {
  DOCTOR_DEFAULT_TIMEOUT_MS,
  DOCTOR_INTERFACES_CHANNEL,
  DOCTOR_MAX_TARGETS,
  DOCTOR_MAX_TIMEOUT_MS,
  DOCTOR_MIN_TIMEOUT_MS,
  DOCTOR_NETWORK_CHANNEL,
  PROBE_ROLES,
} from "./protocol";
import type {
  NetworkProbeResult,
  ProbeNetworkRequest,
  ProbeRole,
  ProbeTarget,
  VpnInterface,
} from "./protocol";
import { findVpnInterfaces } from "./interfaces";

/**
 * The connection doctor's main-process half: two channels, no opinions.
 *
 * Everything it can do is bounded before it does it: how many addresses, and
 * for how long. It reads, and changes nothing on the machine.
 *
 * Dependencies are injected for the same reason `VoiceService` injects its
 * `fork`: so the wiring can be tested without sockets or subprocesses.
 */

export type DoctorServiceDeps = {
  probeNetwork: (target: ProbeTarget, timeoutMs: number, viaMeshProxy?: number) => Promise<NetworkProbeResult>;
  /** Tunnel interfaces that are up. Absent = read from the OS. */
  probeInterfaces?: () => VpnInterface[];
  /**
   * The built-in mesh's routing table (`MeshService.proxyPortForHost`): a
   * host it routes is probed through that proxy, as the app itself would
   * reach it. Absent = every probe is direct.
   */
  proxyPortForHost?: (host: string) => number | undefined;
};

/** Probes run in parallel, but not unboundedly — a deployment can list many aliases. */
const CONCURRENCY = 4;

export const defaultDoctorDeps = (): DoctorServiceDeps => ({
  probeNetwork: probeTarget,
});

const clampTimeout = (value: unknown): number => {
  const requested = typeof value === "number" && Number.isFinite(value)
    ? value
    : DOCTOR_DEFAULT_TIMEOUT_MS;
  return Math.min(DOCTOR_MAX_TIMEOUT_MS, Math.max(DOCTOR_MIN_TIMEOUT_MS, requested));
};

/** Only the fields of the protocol shape, coerced — never trust the sender. */
const sanitizeTarget = (raw: unknown): ProbeTarget | null => {
  if (!raw || typeof raw !== "object") return null;
  const target = raw as Partial<ProbeTarget>;
  if (typeof target.host !== "string" || !target.host.trim()) return null;

  const port =
    typeof target.port === "number" && target.port > 0 && target.port <= 65535
      ? Math.floor(target.port)
      : null;

  return {
    host: target.host.trim(),
    port,
    ssl: !!target.ssl,
    path: typeof target.path === "string" ? target.path : null,
    probePath: typeof target.probePath === "string" ? target.probePath : null,
    label: typeof target.label === "string" ? target.label.slice(0, 120) : undefined,
    serviceKey: typeof target.serviceKey === "string" ? target.serviceKey.slice(0, 120) : undefined,
    role: PROBE_ROLES.includes(target.role as ProbeRole) ? target.role : undefined,
  };
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await run(items[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

export class DoctorService implements AppModule {
  constructor(
    private readonly ipcTransport: IpcTransport,
    private readonly deps: DoctorServiceDeps = defaultDoctorDeps(),
  ) {}

  setup() {
    this.ipcTransport.handleChannel(
      DOCTOR_NETWORK_CHANNEL,
      async (_event, request: ProbeNetworkRequest): Promise<NetworkProbeResult[]> => {
        const targets = (Array.isArray(request?.targets) ? request.targets : [])
          .map(sanitizeTarget)
          .filter((target): target is ProbeTarget => target !== null)
          .slice(0, DOCTOR_MAX_TARGETS);

        if (targets.length === 0) return [];

        const timeoutMs = clampTimeout(request?.timeoutMs);
        return mapWithConcurrency(targets, CONCURRENCY, (target) => {
          const via = this.deps.proxyPortForHost?.(target.host);
          return via
            ? this.deps.probeNetwork(target, timeoutMs, via)
            : this.deps.probeNetwork(target, timeoutMs);
        });
      },
    );

    this.ipcTransport.handleChannel(
      DOCTOR_INTERFACES_CHANNEL,
      async (): Promise<VpnInterface[]> => (this.deps.probeInterfaces ?? findVpnInterfaces)(),
    );
  }
}
