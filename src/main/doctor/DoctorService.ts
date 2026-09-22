import { shell } from "electron";
import type { AppModule } from "../modules/AppModule";
import type { IpcTransport } from "../modules/IpcTransport";
import { probeTarget } from "./networkProbe";
import {
  DOCTOR_DEFAULT_TIMEOUT_MS,
  DOCTOR_MAX_TARGETS,
  DOCTOR_MAX_TIMEOUT_MS,
  DOCTOR_MESH_CHANNEL,
  DOCTOR_MIN_TIMEOUT_MS,
  DOCTOR_NETWORK_CHANNEL,
  DOCTOR_REMEDY_CHANNEL,
  isRemedyId,
} from "./protocol";
import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeNetworkRequest,
  ProbeTarget,
  RemedyId,
  RemedyResult,
} from "./protocol";
import { defaultTailscaleDeps, probeTailscale, runTailscaleRemedy } from "./tailscale";

/**
 * The connection doctor's main-process half: three channels, no opinions.
 *
 * Everything it can do is bounded before it does it — how many addresses, for
 * how long, and (above all) which remedies exist at all. `runRemedy` is the
 * only path in this app by which the renderer can cause a process to be
 * spawned, so it takes an id from a closed enum and nothing else; an unknown
 * id is refused here, before any dependency is touched.
 *
 * Dependencies are injected for the same reason `VoiceService` injects its
 * `fork`: so the wiring can be tested without sockets or subprocesses.
 */

export type DoctorServiceDeps = {
  probeNetwork: (target: ProbeTarget, timeoutMs: number, viaMeshProxy?: number) => Promise<NetworkProbeResult>;
  probeMesh: () => Promise<MeshProbeResult>;
  runRemedy: (id: RemedyId) => Promise<RemedyResult>;
  /**
   * The built-in mesh's routing table (`MeshService.proxyPortForHost`): a
   * host it routes is probed through that proxy, as the app itself would
   * reach it. Absent = every probe is direct.
   */
  proxyPortForHost?: (host: string) => number | undefined;
};

/** Probes run in parallel, but not unboundedly — a deployment can list many aliases. */
const CONCURRENCY = 4;

export const defaultDoctorDeps = (): DoctorServiceDeps => {
  const tailscale = {
    ...defaultTailscaleDeps(),
    openPath: (path: string) => shell.openPath(path),
  };

  return {
    probeNetwork: probeTarget,
    probeMesh: () => probeTailscale(tailscale),
    runRemedy: (id) => runTailscaleRemedy(id, tailscale),
  };
};

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
      DOCTOR_MESH_CHANNEL,
      async (): Promise<MeshProbeResult> => this.deps.probeMesh(),
    );

    this.ipcTransport.handleChannel(
      DOCTOR_REMEDY_CHANNEL,
      async (_event, request: { id?: unknown }): Promise<RemedyResult> => {
        // The allowlist gate. Anything not in the enum stops here, before any
        // path is resolved and before any process is spawned.
        if (!isRemedyId(request?.id)) {
          return { ok: false, message: "Unknown fix — nothing was run." };
        }
        return this.deps.runRemedy(request.id);
      },
    );
  }
}
