import { formatDistanceStrict } from "date-fns";
import type { NetworkProbeResult, ProbeTarget } from "../../../../../main/doctor/protocol";
import { classifyHost, isMeshClass } from "./classify";
import { coveringMesh, deploymentMeshes, peerFor } from "./diagnose";
import type { DoctorReport, Finding } from "./findings";
import { CLIENT_SIDE_LABEL, HUB_SIDE_LABEL, compareService } from "./hubHealth";
import { failureLine } from "./stages";
import { isUpstream } from "./targets";

/**
 * The connection as the hops it actually takes:
 *
 *   this computer → coordination server → mesh → hub → each service
 *
 * The verdict says WHY; this says WHERE. Somebody reading it can see the
 * first hop that broke, and that everything before it worked — which is the
 * part a ranked list of findings cannot show.
 *
 * Pure: the report in, hops out. `now` is passed in so "last report 20
 * minutes ago" is testable.
 */

export type HopState = "ok" | "warning" | "failed" | "unknown";

export type PathHop = {
  id: string;
  label: string;
  state: HopState;
  /** Muted, one line: what we saw at this hop. */
  summary: string;
  /** The findings that are about this hop. */
  findings: Finding[];
  children?: PathHop[];
};

const hostOf = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).host;
  } catch {
    return url;
  }
};

const join = (parts: (string | false | undefined | null)[]): string => parts.filter(Boolean).join(" · ");

const fromFindings = (state: HopState, findings: Finding[]): HopState => {
  if (findings.some((finding) => finding.severity === "blocker")) return "failed";
  if (state === "ok" && findings.some((finding) => finding.severity === "warning")) return "warning";
  return state;
};

/* ────────────────────── which hop a finding is about ───────────────────── */

const serviceKeyOf = (target: ProbeTarget): string => target.serviceKey ?? target.label ?? target.host;

const hopIdForTarget = (report: DoctorReport, target: ProbeTarget): string => {
  if (report.context.kind === "discovery" || target.role === "coordination") return "coordination";
  if (target.role === "mesh-control") return "mesh";
  return `service:${serviceKeyOf(target)}`;
};

export const hopIdForFinding = (report: DoctorReport, finding: Finding): string | undefined => {
  const { id, targetLabel } = finding;
  if (id === "net.all-clear") return undefined;
  if (id === "doctor.unavailable" || id === "net.ok.renderer-failed") return "computer";
  if (id.startsWith("upstream.coordination") || id.startsWith("discovery.")) return "coordination";
  if (id.startsWith("upstream.mesh-control") || id.startsWith("mesh.") || id.startsWith("tailscale.")) return "mesh";
  if (id.startsWith("hub.")) return targetLabel ? `service:${targetLabel}` : "hub";

  if (targetLabel) {
    const target = report.targets.find((candidate) => (candidate.label || candidate.host) === targetLabel);
    if (target) return hopIdForTarget(report, target);
  }
  return report.context.kind === "discovery" ? "coordination" : undefined;
};

/* ───────────────────────────────── hops ───────────────────────────────── */

const computerHop = (report: DoctorReport): PathHop => {
  const noProbes = report.findings.some((finding) => finding.id === "doctor.unavailable");
  return {
    id: "computer",
    label: "This computer",
    state: noProbes ? "unknown" : "ok",
    summary: noProbes ? "detailed checks need the desktop app" : "",
    findings: [],
  };
};

const LOK_SUMMARY: Record<NonNullable<DoctorReport["lok"]>["status"], string> = {
  ok: "lok answered",
  "no-hub": "lok answered",
  failed: "lok did not answer",
  timeout: "lok did not answer in time",
  "not-available": "",
};

const coordinationHop = (report: DoctorReport, probes: NetworkProbeResult[]): PathHop => {
  const host = hostOf(report.context.endpointUrl) ?? probes[0]?.target.host;
  const answered = probes.some((probe) => probe.http.ok);
  const lok = report.lok?.status;
  const lokOk = lok === "ok" || lok === "no-hub";
  const lokFailed = lok === "failed" || lok === "timeout";

  let state: HopState = "unknown";
  if (probes.length > 0) state = answered ? "ok" : "failed";
  else if (lokOk) state = "ok";
  if (state === "ok" && lokFailed) state = "warning";

  const probeLine =
    probes.length === 0
      ? undefined
      : answered
        ? "answered"
        : failureLine(probes[0]) ?? "did not answer";

  return {
    id: "coordination",
    label: host ? `Coordination server ${host}` : "Coordination server",
    state,
    summary: join([probeLine, lok && LOK_SUMMARY[lok]]) || "not checked",
    findings: [],
  };
};

const meshInPlay = (report: DoctorReport, serviceTargets: ProbeTarget[]): boolean =>
  serviceTargets.some((target) => isMeshClass(classifyHost(target.host))) ||
  !!report.context.profileMesh ||
  typeof report.context.meshCoordUrl === "string";

const meshHop = (report: DoctorReport, control: NetworkProbeResult[]): PathHop => {
  const ours = report.sidecar
    ? deploymentMeshes({ context: report.context, targets: report.targets, network: report.network }, report.sidecar)
    : [];
  const running = ours.find((mesh) => mesh.status.state === "running");
  const system = report.mesh?.available ? report.mesh : undefined;

  let state: HopState = "unknown";
  let status: string | undefined;
  if (report.context.profileMesh?.enabled === false) {
    state = "failed";
    status = "switched off for this profile";
  } else if (running) {
    state = "ok";
    const peers = running.status.peers ?? [];
    status = `built-in mesh running · ${peers.filter((peer) => peer.online).length} of ${peers.length} machines online`;
  } else if (ours[0]) {
    state = "failed";
    status = `built-in mesh ${ours[0].status.state}`;
  } else if (system) {
    state = system.backendState === "Running" ? "ok" : "failed";
    status = `Tailscale ${system.backendState}`;
  } else if (report.sidecar) {
    status = "not joined";
  }

  const controlLine =
    control.length === 0
      ? undefined
      : control.some((probe) => probe.http.status !== undefined)
        ? "control server answered"
        : `control server: ${failureLine(control[0]) ?? "no answer"}`;

  return {
    id: "mesh",
    label: "Mesh",
    state,
    summary: join([status, controlLine]) || "not checked",
    findings: [],
  };
};

const hubHop = (report: DoctorReport, now: number): PathHop => {
  const hub = report.hub;
  if (!hub) {
    const why: Record<NonNullable<DoctorReport["lok"]>["status"], string> = {
      ok: "",
      "no-hub": "this sign-in is not tied to a hub",
      failed: "could not ask the coordination server for its report",
      timeout: "the coordination server did not answer in time",
      "not-available": "sign in to see what the hub reports about itself",
    };
    return {
      id: "hub",
      label: "Hub",
      state: "unknown",
      summary: why[report.lok?.status ?? "not-available"],
      findings: [],
    };
  }

  const peerMesh = hub.meshHost ? coveringMesh(report.sidecar, hub.meshHost) : undefined;
  const peer = peerMesh && hub.meshHost ? peerFor(peerMesh, hub.meshHost) : undefined;
  const route = peer?.relay ? `relayed via ${peer.relay}` : peer?.curAddr ? "direct" : undefined;

  const state: HopState = !hub.lastSeenAt ? "unknown" : !hub.online ? "failed" : hub.lastHealthy === false ? "warning" : "ok";
  const lastSeen = hub.lastSeenAt
    ? `last report ${formatDistanceStrict(new Date(hub.lastSeenAt), now, { addSuffix: true })}`
    : "never reported";

  return {
    id: "hub",
    label: `Hub ${hub.name}`,
    state,
    summary: join([
      hub.lastSeenAt && (hub.online ? "reporting" : "not reporting"),
      lastSeen,
      hub.meshConnected === true && (hub.meshHost ? `on the mesh as ${hub.meshHost}` : "on the mesh"),
      hub.meshConnected === false && "says it is off the mesh",
      peer && (peer.online ? "peer online" : "peer offline"),
      route,
      hub.version && `v${hub.version.replace(/^v/, "")}`,
    ]),
    findings: [],
  };
};

const serviceHops = (report: DoctorReport, serviceTargets: ProbeTarget[], probes: NetworkProbeResult[]): PathHop[] => {
  const keys = [...new Set(serviceTargets.map(serviceKeyOf))];
  return keys.map((key) => {
    const own = probes.filter((probe) => serviceKeyOf(probe.target) === key);
    const reached = own.find((probe) => probe.http.ok);
    const probed = own.length > 0;
    const client = reached ? "ok" : "failing";
    const comparison = report.hub && probed ? compareService(report.hub, key, client) : undefined;

    const here = !probed
      ? "not checked from here"
      : reached
        ? `here: ${CLIENT_SIDE_LABEL.ok}${reached.viaMeshProxy ? " via mesh" : ""}`
        : `here: ${failureLine(own[0]) ?? CLIENT_SIDE_LABEL.failing}`;
    const hubSays =
      comparison && comparison.hub !== "unreported"
        ? `hub: ${HUB_SIDE_LABEL[comparison.hub]}${comparison.reason ? ` (${comparison.reason})` : ""}`
        : undefined;

    return {
      id: `service:${key}`,
      label: key,
      state: !probed ? "unknown" : reached ? "ok" : "failed",
      summary: join([hubSays, here]),
      findings: [],
    };
  });
};

export const buildConnectionPath = (report: DoctorReport, now: number = Date.now()): PathHop[] => {
  const discovery = report.context.kind === "discovery";
  const upstream = report.network.filter((probe) => isUpstream(probe.target));
  const coordinationProbes = discovery ? report.network : upstream.filter((probe) => probe.target.role === "coordination");
  const controlProbes = upstream.filter((probe) => probe.target.role === "mesh-control");
  const serviceTargets = discovery ? [] : report.targets.filter((target) => !isUpstream(target));
  const serviceProbes = discovery ? [] : report.network.filter((probe) => !isUpstream(probe.target));

  const hops: PathHop[] = [computerHop(report), coordinationHop(report, coordinationProbes)];
  if (!discovery && meshInPlay(report, serviceTargets)) hops.push(meshHop(report, controlProbes));
  if (!discovery) {
    const hub = hubHop(report, now);
    hub.children = serviceHops(report, serviceTargets, serviceProbes);
    hops.push(hub);
  }

  // Hang every finding on its hop; a finding can only make a hop look worse.
  const byId = new Map<string, PathHop>();
  for (const hop of hops) {
    byId.set(hop.id, hop);
    for (const child of hop.children ?? []) byId.set(child.id, child);
  }
  for (const finding of report.findings) {
    const hopId = hopIdForFinding(report, finding);
    const hop = hopId ? byId.get(hopId) : undefined;
    if (hop) hop.findings.push(finding);
  }
  for (const hop of byId.values()) hop.state = fromFindings(hop.state, hop.findings);

  // The hub says it is fine, yet none of its services answer from here:
  // not a failure of the hub, but not "ok" to look at either.
  const hub = byId.get("hub");
  if (hub?.state === "ok" && hub.children?.length && hub.children.every((child) => child.state === "failed")) {
    hub.state = "warning";
  }

  return hops;
};

/** The first hop that failed, in the order the connection takes them. */
export const breakingHop = (hops: PathHop[]): PathHop | undefined => {
  for (const hop of hops) {
    if (hop.state === "failed") return hop;
    const child = hop.children?.find((candidate) => candidate.state === "failed");
    if (child) return child;
  }
  return undefined;
};
