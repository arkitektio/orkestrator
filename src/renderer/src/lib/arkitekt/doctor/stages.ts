import type { NetworkProbeResult } from "../../../../../main/doctor/protocol";

/**
 * One probe, read as the four stages a request goes through: name → address
 * → socket → encryption → answer. The findings say what a failure MEANS; this
 * only says which stage stopped and what it saw, in a few words, so the path
 * view, the address table and the copied report all read the same facts.
 */

export const STAGES = ["dns", "tcp", "tls", "http"] as const;
export type Stage = (typeof STAGES)[number];

export type StageState = "ok" | "failed" | "skipped";

export type StageResult = { state: StageState; detail: string };

export type ProbeStages = {
  /** Through the built-in mesh's proxy, or straight from this computer. */
  route: "direct" | "mesh";
  stages: Record<Stage, StageResult>;
  /** The first stage that failed; absent when the request got through. */
  firstFailure?: Stage;
};

export const STAGE_LABEL: Record<Stage, string> = {
  dns: "DNS",
  tcp: "TCP",
  tls: "TLS",
  http: "HTTP",
};

const skipped = (detail = ""): StageResult => ({ state: "skipped", detail });

const dnsStage = (probe: NetworkProbeResult): StageResult => {
  const { dns } = probe;
  if (dns.skipped) return skipped(probe.viaMeshProxy ? "via mesh" : "literal IP");
  const addresses = dns.lookupAddresses.length > 0 ? dns.lookupAddresses : dns.resolveAddresses;
  if (addresses.length > 0) {
    // Only the OS resolver knew it: worth saying, it is the MagicDNS tell.
    const osOnly = dns.lookupAddresses.length > 0 && dns.resolveAddresses.length === 0;
    return { state: "ok", detail: addresses.slice(0, 2).join(", ") + (osOnly ? " (OS only)" : "") };
  }
  return { state: "failed", detail: dns.code ?? dns.lookupError ?? "no address" };
};

const tcpStage = (probe: NetworkProbeResult): StageResult => {
  const { tcp } = probe;
  if (!tcp.attempted) return skipped();
  if (tcp.ok) return { state: "ok", detail: `${tcp.ms}ms` };
  return { state: "failed", detail: [tcp.code ?? tcp.message ?? "failed", `${tcp.ms}ms`].join(" ") };
};

const tlsStage = (probe: NetworkProbeResult): StageResult => {
  const { tls } = probe;
  if (!probe.target.ssl) return skipped("plain http");
  if (probe.viaMeshProxy) return skipped("mesh tunnel");
  if (!tls.attempted) return skipped();
  if (tls.notTls) return { state: "failed", detail: "not TLS" };
  if (tls.expired) return { state: "failed", detail: "expired" };
  if (tls.hostnameMismatch) return { state: "failed", detail: "wrong name" };
  // The app accepts a self-signed certificate, so the stage passed — but the
  // detail must still say so; the doctor raises it as a warning.
  if (tls.selfSigned) return { state: "ok", detail: "self-signed" };
  if (!tls.ok) return { state: "failed", detail: tls.authorizationError ?? tls.message ?? "failed" };
  return { state: "ok", detail: "valid" };
};

const httpStage = (probe: NetworkProbeResult): StageResult => {
  const { http } = probe;
  if (!http.attempted) return skipped();
  if (http.status !== undefined) {
    return { state: http.ok ? "ok" : "failed", detail: `HTTP ${http.status}` };
  }
  return { state: "failed", detail: http.code ?? http.message ?? "no answer" };
};

export const stageOf = (probe: NetworkProbeResult): ProbeStages => {
  const stages: Record<Stage, StageResult> = {
    dns: dnsStage(probe),
    tcp: tcpStage(probe),
    tls: tlsStage(probe),
    http: httpStage(probe),
  };
  return {
    route: probe.viaMeshProxy ? "mesh" : "direct",
    stages,
    firstFailure: STAGES.find((stage) => stages[stage].state === "failed"),
  };
};

/** "TCP: ETIMEDOUT 4000ms" — the one line a hop or a finding needs. */
export const failureLine = (probe: NetworkProbeResult): string | undefined => {
  const { stages, firstFailure } = stageOf(probe);
  if (!firstFailure) return undefined;
  const { detail } = stages[firstFailure];
  return detail.startsWith(STAGE_LABEL[firstFailure]) ? detail : `${STAGE_LABEL[firstFailure]}: ${detail}`;
};
