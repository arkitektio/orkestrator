import { formatDistanceStrict } from "date-fns";
import type { MeshProbeResult, NetworkProbeResult } from "../../../../../../main/doctor/protocol";
import type { MeshStatusPayload } from "../../../../../../main/mesh/protocol";
import { serviceRoute, type ServiceRoute } from "@/core/connection/mesh/route";
import { aliasToHttpPath } from "../alias/helpers";
import type { Alias } from "../fakts/faktsSchema";
import type { ServiceHealthStatus, ServiceRuntimeState } from "../types";
import type { DoctorReport, Finding } from "./findings";
import { classifyHost, isMeshClass } from "./classify";
import { compareService, type HubHealthFacts } from "./hubHealth";
import { matchPeer } from "./meshMatch";
import { buildConnectionPath, serviceKeyOf, type PathHop } from "./path";
import { failureLine, stageOf, STAGES } from "./stages";
import { isUpstream } from "./targets";
import type { DoctorStatus } from "./useConnectionDoctor";

/**
 * The connection as the picture a person would draw of it: three parties and
 * the three lines between them.
 *
 *              coordination server
 *               /               \
 *        this computer ———————— hub (and the one service this page needs)
 *
 * This computer signs in THROUGH the coordination server, talks to the hub's
 * services DIRECTLY, and the hub reports its own health to the coordination
 * server. `path.ts` says where along a chain it broke; this says which party
 * or which line is at fault, so the page can colour exactly that and leave
 * the rest green.
 *
 * Two sources, merged by one rule: the live service state paints at once, and
 * a doctor report only ever SHARPENS it. A report never makes something the
 * live state knows is fine look unknown, and it only applies while the
 * service is still failing.
 *
 * Pure: facts in, parts out. `now` is passed in so "last report 20 minutes
 * ago" is testable.
 */

export type PartState = "ok" | "warning" | "failed" | "unknown" | "checking" | "absent";

export type DiagramPart = {
  state: PartState;
  /** What the part IS (a node) or what it is doing (a line): "signed in". */
  label: string;
  /** Muted, one line: its name or what we saw there. */
  detail?: string;
  /** Why it is broken, in a few words. Only on a part that is. */
  reason?: string;
  /** The doctor's findings about this part. */
  findings: Finding[];
  /**
   * Everything known about this part, a line each, for whoever hovers it: what
   * was checked there and what came back. The picture stays quiet; this is
   * where it explains itself.
   */
  report?: string[];
};

type Address = { host: string; port?: number | null; path?: string | null };

/**
 * One address the service can be reached at. A service usually advertises
 * several (a LAN address, a mesh name, a public one), the app tries each, and
 * "not reachable" means every one of them failed — each for its own reason.
 */
export type AliasPath = {
  id: string;
  /** `host[:port]`, short enough to sit on a line. */
  label: string;
  url: string;
  /** The address itself, to tie a probe back to the alias it tried. */
  address: Address;
  state: PartState;
  /**
   * Which kind of road it is: straight over a network this computer is on, or
   * through a mesh (the built-in one, or a Tailscale the system runs). Two
   * different things to go wrong, so they are drawn apart.
   */
  lane: "direct" | "mesh";
  /** The mesh that carries it: "Lab", "Tailscale". Mesh lane only. */
  network?: string;
  /**
   * The DERP region the tunnel is relayed through. Set only when the mesh
   * could NOT reach the machine directly — a relay is a real extra hop, slower
   * and somebody else's server, so it is drawn as one.
   */
  relay?: string;
  /** How the tunnel runs when it is not relayed: "direct tunnel", "idle". */
  tunnel?: string;
  /**
   * The mesh says the machine at the other end is offline. Not a property of
   * the road but of the hub, so the diagram paints it there.
   */
  peerOffline?: boolean;
  /** How a request to it travels, in words: "through the mesh Lab · relayed via fra". */
  travel?: string;
  /**
   * Once something gets through, the picture is about THAT: the road in use
   * is `inUse`, and one nobody has had to try is `standby` — a spare. A road
   * known to be broken is neither: it stays red. Nothing is marked while
   * nothing connects; then every road's own failure is the point.
   */
  inUse?: boolean;
  standby?: boolean;
  /**
   * A mesh-looking address nothing here can vouch for: no built-in mesh
   * routes it and the system Tailscale has not been asked.
   */
  unrouted?: boolean;
  /** What this one attempt ran into: "TCP: ETIMEDOUT 4000ms". */
  error?: string;
};

export type ConnectionDiagram = {
  client: DiagramPart;
  coordination: DiagramPart;
  hub: DiagramPart;
  /** The one service this page needs, drawn inside the hub. */
  service: DiagramPart;
  /** This computer → coordination server. */
  signInLink: DiagramPart;
  /**
   * This computer → hub: one path per alias the service advertises. `via`
   * names the tunnel that carries them, if any.
   */
  serviceLink: DiagramPart & {
    via?: string;
    aliases: AliasPath[];
    /**
     * Some address sits on a Tailscale network the app does not run, and the
     * user has not yet said whether `tailscale status` may be asked about it.
     */
    askTailscale?: boolean;
  };
  /** Hub → coordination server: the hub's own health report. */
  reportLink: DiagramPart;
};

export type DiagramPartId = keyof ConnectionDiagram;

export type ConnectionDiagramInput = {
  serviceKey: string;
  serviceName: string;
  status: ServiceHealthStatus | undefined;
  errors?: string[];
  /** Every address the service advertises, in the order the app tries them. */
  aliases?: Alias[];
  /** The one the app settled on, when it has. */
  chosenAlias?: Alias;
  coordination?: { name?: string; host?: string };
  hubName?: string;
  /** "Arkitekt mesh · lab": the tunnel the services are reached through. */
  tunnel?: string;
  /** The live mesh status, to say how each address is reached through it. */
  mesh?: MeshStatusPayload;
  /** The system Tailscale's status, once the user has allowed asking it. */
  tailscale?: MeshProbeResult;
  /** Whether asking the system Tailscale is still an open question. */
  tailscaleConsent?: "ask" | "allowed" | "denied";
  doctor?: { status: DoctorStatus; report?: DoctorReport };
  now?: number;
};

/** Turn the browser's terse network errors into a sentence. */
export const describeError = (error: string): string => {
  if (/failed to fetch|networkerror|network request failed|ERR_CONNECTION|ECONNREFUSED/i.test(error)) {
    return "No response from the server: the connection was refused or there is no network route to it.";
  }
  if (/timed? ?out|aborted/i.test(error)) {
    return "The server did not answer within the health-check timeout.";
  }
  return error;
};

const part = (state: PartState, label: string, extra: Partial<DiagramPart> = {}): DiagramPart => ({
  state,
  label,
  findings: [],
  ...extra,
});

/* ─────────────────────────── live state only ──────────────────────────── */

/**
 * Two addresses are the same ROAD when they share a host and a port. The
 * path under it (`/mikro`, `/rekuest`) picks a service at the far end, not a
 * different way of getting there, so it does not make a second line.
 */
const sameAddress = (a: Address, b: Address): boolean => a.host === b.host && (a.port ?? null) === (b.port ?? null);

const STATE_RANK: Record<PartState, number> = { ok: 4, checking: 3, failed: 2, warning: 2, unknown: 1, absent: 0 };

/** One line per host and port; where several addresses share one, the best news wins. */
const distinct = (paths: AliasPath[]): AliasPath[] => {
  const roads = new Map<string, AliasPath>();
  for (const path of paths) {
    const known = roads.get(path.label);
    if (!known) roads.set(path.label, path);
    else if (STATE_RANK[path.state] > STATE_RANK[known.state]) roads.set(path.label, { ...path, id: known.id });
  }
  return [...roads.values()];
};

const NETWORK_WORDS: Record<Extract<ServiceRoute, { kind: "direct" }>["network"], string> = {
  public: "over the internet",
  local: "on the local network",
  "this-computer": "on this computer",
  "mesh-looking": "a mesh address, but no running mesh routes it",
};

type Travel = Pick<AliasPath, "lane" | "network" | "relay" | "tunnel" | "travel" | "unrouted" | "peerOffline">;

/** A built-in route (`serviceRoute`) as what a line can say about it. */
export const describeRoute = (route: ServiceRoute): Travel => {
  if (route.kind === "direct") {
    return { lane: "direct", travel: `straight from this computer, ${NETWORK_WORDS[route.network]}` };
  }
  const { peer } = route;
  const name = `through the mesh ${route.meshLabel}`;
  if (!peer) return { lane: "mesh", network: route.meshLabel, travel: name };
  if (!peer.online) {
    return { lane: "mesh", network: route.meshLabel, peerOffline: true, travel: `${name} · its machine is offline` };
  }
  if (peer.path?.kind === "relay") {
    return { lane: "mesh", network: route.meshLabel, relay: peer.path.region, travel: `${name} · relayed via ${peer.path.region}` };
  }
  if (peer.path?.kind === "direct") {
    return { lane: "mesh", network: route.meshLabel, tunnel: "direct tunnel", travel: `${name} · direct tunnel` };
  }
  return { lane: "mesh", network: route.meshLabel, travel: name };
};

/**
 * How a request to this host travels. Three answers, in the order they can
 * be trusted: the built-in mesh routes it (the app's own table says so); the
 * system Tailscale knows the machine (only when it was asked); or the address
 * merely LOOKS like a mesh's and nothing here can say more.
 */
const routeOf = (
  host: string,
  mesh: MeshStatusPayload | undefined,
  tailscale: MeshProbeResult | undefined,
): Partial<Travel> => {
  const builtIn = mesh ? serviceRoute(host, mesh) : undefined;
  if (builtIn?.kind === "mesh") return describeRoute(builtIn);

  const peer = matchPeer(host, tailscale);
  const meshShaped = isMeshClass(classifyHost(host));
  if (tailscale?.available && (peer || meshShaped)) {
    const name = `through Tailscale${tailscale.tailnetName ? ` ${tailscale.tailnetName}` : ""}`;
    const base = { lane: "mesh" as const, network: "Tailscale" };
    if (tailscale.backendState !== "Running") {
      return { ...base, tunnel: "Tailscale off", travel: `${name} · Tailscale is ${tailscale.backendState}` };
    }
    if (!peer) return { ...base, tunnel: "unknown peer", travel: `${name} · no machine by that name in the tailnet` };
    if (peer.online === false) return { ...base, peerOffline: true, travel: `${name} · its machine is offline` };
    if (peer.curAddr) return { ...base, tunnel: "direct tunnel", travel: `${name} · direct tunnel` };
    // No session yet means no path yet: `tailscale status` says "idle" here
    // too, and only names a relay once traffic is actually going through one.
    if (peer.active === false) return { ...base, tunnel: "idle", travel: `${name} · no tunnel open yet` };
    if (peer.relay) return { ...base, relay: peer.relay, travel: `${name} · relayed via ${peer.relay}` };
    return { ...base, travel: name };
  }
  if (meshShaped) {
    return {
      lane: "mesh",
      unrouted: true,
      travel: "a mesh address; nothing here can say how it is routed",
    };
  }
  return builtIn ? describeRoute(builtIn) : {};
};

/** Direct roads first, then the mesh ones: the two lanes, in the order they are drawn. */
const byLane = (paths: AliasPath[]): AliasPath[] => [
  ...paths.filter((path) => path.lane === "direct"),
  ...paths.filter((path) => path.lane === "mesh"),
];

const livePaths = (input: ConnectionDiagramInput): AliasPath[] => {
  const { status, chosenAlias } = input;
  const aliases = input.aliases?.length ? input.aliases : chosenAlias ? [chosenAlias] : [];
  return byLane(distinct(aliases.map((alias, index) => {
    const chosen = !!chosenAlias && sameAddress(alias, chosenAlias);
    const travel = routeOf(alias.host, input.mesh, input.tailscale);
    // A machine the mesh reports offline is a road that leads nowhere, whatever
    // the service's own state: red, unless this very address is the one in use.
    const offline = !!travel.peerOffline && !(status === "ready" && chosen);
    const state: PartState = offline
      ? "failed"
      : status === "invalid"
        ? "failed"
        : status === "ready"
          ? chosen
            ? "ok"
            : "unknown"
          : "checking";
    return {
      id: alias.id || String(index),
      label: alias.port ? `${alias.host}:${alias.port}` : alias.host,
      url: aliasToHttpPath(alias, ""),
      address: { host: alias.host, port: alias.port, path: alias.path },
      lane: "direct",
      ...travel,
      state,
      // The health check keeps no reason per address; the doctor's probe does.
      error: offline
        ? "its machine is offline on the mesh"
        : state === "failed"
          ? "did not pass the health check"
          : undefined,
    };
  })));
};

/** Is there something `tailscale status` could tell us that we have not been allowed to ask? */
const shouldAsk = (aliases: AliasPath[], consent: ConnectionDiagramInput["tailscaleConsent"]): boolean =>
  consent === "ask" && aliases.some((path) => path.unrouted);

const liveDiagram = (input: ConnectionDiagramInput): ConnectionDiagram => {
  const { status, serviceName, errors, coordination, hubName, tunnel } = input;
  const aliases = livePaths(input);
  const base = {
    client: part("ok", "This computer"),
    // Signed in, which is all the store knows: nobody has probed it.
    coordination: part("ok", "Coordination server", { detail: coordination?.host ?? coordination?.name }),
    signInLink: part("ok", "signed in"),
    reportLink: part("unknown", "health report"),
  };

  if (!status || status === "unconfigured") {
    return {
      ...base,
      hub: part("unknown", "Hub", { detail: hubName }),
      service: part("absent", serviceName, { detail: "not offered" }),
      serviceLink: { ...part("absent", "no service"), aliases: [] },
    };
  }

  if (status === "invalid") {
    return {
      ...base,
      // The health check got no answer. Whether the hub is down or the way to
      // it is broken is exactly what the store cannot tell, so the line is
      // red and the far end is merely unknown.
      hub: part("unknown", "Hub", { detail: hubName }),
      service: part("unknown", serviceName),
      serviceLink: {
        ...part("failed", "no answer", { reason: errors?.[0] ? describeError(errors[0]) : undefined }),
        via: tunnel,
        aliases,
        askTailscale: shouldAsk(aliases, input.tailscaleConsent),
      },
    };
  }

  const state: PartState = status === "ready" ? "ok" : "checking";
  return {
    ...base,
    hub: part(state === "ok" ? "ok" : "unknown", "Hub", { detail: hubName }),
    service: part(state, serviceName),
    serviceLink: { ...part(state, state === "ok" ? "connected" : "checking"), via: tunnel, aliases, askTailscale: shouldAsk(aliases, input.tailscaleConsent) },
  };
};

/* ───────────────────────────── with a report ──────────────────────────── */

const hopById = (hops: PathHop[], id: string): PathHop | undefined =>
  hops.flatMap((hop) => [hop, ...(hop.children ?? [])]).find((hop) => hop.id === id);

/**
 * Did the far end answer at all? A refused connection or anything past the
 * socket (TLS, HTTP) means a machine was there and said no, so the fault is
 * the node's. A name that does not resolve or a socket that times out means
 * nothing was reached: that is the line.
 */
const answered = (probe: NetworkProbeResult): boolean => {
  const failure = stageOf(probe).firstFailure;
  if (!failure) return true;
  if (failure === "tls" || failure === "http") return true;
  return failure === "tcp" && probe.tcp.code === "ECONNREFUSED";
};

/** The probe that got furthest: it says the most about where the fault is. */
const furthest = (probes: NetworkProbeResult[]): NetworkProbeResult | undefined =>
  [...probes].sort((a, b) => {
    const depth = (probe: NetworkProbeResult) => {
      const failure = stageOf(probe).firstFailure;
      return failure ? STAGES.indexOf(failure) : STAGES.length;
    };
    return depth(b) - depth(a);
  })[0];

const applyCoordination = (diagram: ConnectionDiagram, report: DoctorReport, hop: PathHop | undefined) => {
  if (!hop || (hop.state !== "failed" && hop.state !== "warning")) return;
  if (hop.state === "warning") {
    diagram.coordination = { ...diagram.coordination, state: "warning", reason: hop.summary, findings: hop.findings };
    return;
  }
  const probe = furthest(report.network.filter((candidate) => candidate.target.role === "coordination"));
  if (probe && answered(probe)) {
    diagram.coordination = { ...diagram.coordination, state: "failed", reason: hop.summary, findings: hop.findings };
    return;
  }
  diagram.signInLink = { ...diagram.signInLink, state: "failed", label: "no answer", reason: hop.summary, findings: hop.findings };
  diagram.coordination = { ...diagram.coordination, state: "unknown" };
};

const applyHubReport = (diagram: ConnectionDiagram, facts: HubHealthFacts | undefined, why: string | undefined, now: number) => {
  if (!facts) {
    // Nobody to ask, or lok did not say: `why` is the reason.
    diagram.reportLink = { ...diagram.reportLink, detail: why || undefined };
    return;
  }
  diagram.hub = { ...diagram.hub, detail: facts.name || diagram.hub.detail };
  if (!facts.lastSeenAt) {
    diagram.reportLink = part("unknown", "never reported");
    return;
  }
  const lastSeen = `last report ${formatDistanceStrict(new Date(facts.lastSeenAt), now, { addSuffix: true })}`;
  if (!facts.online) {
    // A quiet hub may be down, or merely cut off from the coordination
    // server; the line is what is known to be broken.
    diagram.reportLink = part("failed", "not reporting", { reason: lastSeen });
    return;
  }
  diagram.reportLink = part("ok", "reporting", { detail: lastSeen });
  diagram.hub = { ...diagram.hub, state: facts.lastHealthy === false ? "warning" : "ok" };
};

/**
 * Each alias with what ITS probe ran into. An attempt that reached a machine
 * which then said no (refused, a 502) got there: the line is fine and the
 * fault is the node's, unless the hub says the service is healthy — then
 * whatever answered was not the service, and the line is the break after all.
 */
const PROBE_TRAVEL = { mesh: "through the mesh", direct: "straight from this computer" } as const;

const probedPaths = (live: AliasPath[], probes: NetworkProbeResult[], pathBroken: boolean): AliasPath[] => {
  const used = new Set<NetworkProbeResult>();
  const got = (probe: NetworkProbeResult) => probe.http.ok || (answered(probe) && !pathBroken);
  const paths = live.map((path): AliasPath => {
    // Every probe down this road: several addresses can share a host and port.
    const own = probes.filter((candidate) => sameAddress(candidate.target, path.address));
    if (own.length === 0) return path;
    own.forEach((probe) => used.add(probe));
    const through = own.find(got);
    const told = through ?? furthest(own) ?? own[0];
    return {
      ...path,
      state: through ? "ok" : "failed",
      travel: path.travel ?? PROBE_TRAVEL[stageOf(told).route],
      error: told.http.ok ? undefined : failureLine(told),
    };
  });
  // A probe for an address the live state did not list still happened.
  const extra = probes
    .filter((probe) => !used.has(probe))
    .map((probe, index): AliasPath => {
      const { host, port, path } = probe.target;
      return {
        id: `probe-${index}`,
        label: port ? `${host}:${port}` : host,
        url: probe.url,
        address: { host, port, path },
        lane: stageOf(probe).route === "mesh" ? "mesh" : "direct",
        state: got(probe) ? "ok" : "failed",
        travel: PROBE_TRAVEL[stageOf(probe).route],
        error: probe.http.ok ? undefined : failureLine(probe),
      };
    });
  return [...paths, ...distinct(extra)];
};

const applyService = (diagram: ConnectionDiagram, report: DoctorReport, serviceKey: string, hop: PathHop | undefined) => {
  const probes = report.network.filter(
    (probe) => !isUpstream(probe.target) && serviceKeyOf(probe.target) === serviceKey,
  );
  const hubVerdict = report.hub ? compareService(report.hub, serviceKey, "failing").verdict : undefined;
  if (probes.length > 0) {
    diagram.serviceLink = {
      ...diagram.serviceLink,
      aliases: probedPaths(diagram.serviceLink.aliases, probes, hubVerdict === "path-broken"),
    };
  }
  const reached = probes.find((probe) => probe.http.ok);
  const findings = hop?.findings ?? [];

  if (reached) {
    // It answers now: the page is a moment behind, and a retry will clear it.
    diagram.serviceLink = { ...diagram.serviceLink, state: "ok", label: "answers now", reason: undefined };
    diagram.service = { ...diagram.service, state: "ok", findings };
    if (diagram.hub.state === "unknown") diagram.hub = { ...diagram.hub, state: "ok" };
    return;
  }

  const probe = furthest(probes);
  const line = probe ? failureLine(probe) : undefined;
  const nodeAnswered = !!probe && answered(probe);

  if (probe && nodeAnswered) {
    diagram.serviceLink = { ...diagram.serviceLink, state: "ok", label: "connected", reason: undefined };
    diagram.service = { ...diagram.service, state: "failed", reason: line, findings };
    if (diagram.hub.state === "unknown") diagram.hub = { ...diagram.hub, state: "ok" };
  } else if (probe) {
    diagram.serviceLink = { ...diagram.serviceLink, state: "failed", reason: line ?? diagram.serviceLink.reason, findings };
  }

  // The hub's own word is the one witness that can split "it is down" from
  // "the way to it is broken", so it overrules what the stages suggest.
  const comparison = report.hub ? compareService(report.hub, serviceKey, "failing") : undefined;
  switch (comparison?.verdict) {
    case "path-broken":
      diagram.serviceLink = {
        ...diagram.serviceLink,
        state: "failed",
        label: "no answer",
        reason: line ?? diagram.serviceLink.reason,
        findings,
      };
      diagram.service = { ...diagram.service, state: "ok", detail: "the hub says it is healthy", reason: undefined, findings: [] };
      break;
    case "agree-down":
      diagram.service = {
        ...diagram.service,
        state: "failed",
        reason: comparison.reason || "the hub reports it down too",
        findings,
      };
      break;
    case "hub-offline":
      // Silent towards the coordination server AND towards this computer:
      // both of its lines are red, and so is the hub they have in common.
      if (!nodeAnswered) diagram.hub = { ...diagram.hub, state: "failed", reason: "not reporting and not answering" };
      break;
    default:
      break;
  }
};

const applyMesh = (diagram: ConnectionDiagram, report: DoctorReport, hop: PathHop | undefined) => {
  if (hop?.state === "failed") {
    // No tunnel, no way through: whatever the far end is doing, this is the break.
    diagram.serviceLink = {
      ...diagram.serviceLink,
      state: "failed",
      label: "no answer",
      reason: hop.summary,
      findings: [...hop.findings, ...diagram.serviceLink.findings],
    };
  } else if (hop?.state === "warning" && diagram.serviceLink.state === "ok") {
    diagram.serviceLink = { ...diagram.serviceLink, state: "warning", reason: hop.summary, findings: hop.findings };
  } else if (report.hub?.meshConnected === false && diagram.serviceLink.state === "failed") {
    diagram.serviceLink = { ...diagram.serviceLink, reason: "the hub says it is off the mesh" };
  }
};

const applyReport = (live: ConnectionDiagram, report: DoctorReport, serviceKey: string, now: number): ConnectionDiagram => {
  const diagram = { ...live };
  const hops = buildConnectionPath(report, now);

  // Live `ok` is the floor for this computer and the sign-in line: a hop that
  // could not be checked (no desktop bridge) must not turn them dashed.
  const computer = hopById(hops, "computer");
  if (computer && (computer.state === "failed" || computer.state === "warning")) {
    diagram.client = { ...diagram.client, state: computer.state, reason: computer.summary || undefined, findings: computer.findings };
  }

  applyCoordination(diagram, report, hopById(hops, "coordination"));
  const hub = hopById(hops, "hub");
  applyHubReport(diagram, report.hub, hub?.summary, now);
  applyService(diagram, report, serviceKey, hopById(hops, `service:${serviceKey}`));
  applyMesh(diagram, report, hopById(hops, "mesh"));

  // The hub hop's own findings go on whichever hub part is the broken one.
  if (hub && hub.findings.length > 0) {
    if (diagram.reportLink.state === "failed" && diagram.hub.state !== "failed") {
      diagram.reportLink = { ...diagram.reportLink, findings: hub.findings };
    } else {
      diagram.hub = { ...diagram.hub, findings: hub.findings };
    }
  }

  return diagram;
};

/**
 * The mesh reports the hub's machine offline. That is the hub's state, not a
 * tag on a road, so the hub is red — also when something else still reaches
 * it. What is not working is shown as not working; that another address gets
 * through is what the green line next to it says.
 */
const applyPeerOffline = (diagram: ConnectionDiagram): void => {
  const offline = diagram.serviceLink.aliases.find((path) => path.peerOffline);
  if (!offline) return;
  const mesh = offline.network === "Tailscale" ? "Tailscale" : `the mesh ${offline.network ?? ""}`.trim();
  diagram.hub = { ...diagram.hub, state: "failed", reason: `offline on ${mesh}` };
};

/**
 * Connected: the road in use stands out and the spares step back. A road
 * that is known to be broken is not a spare — it stays red.
 */
const markInUse = (aliases: AliasPath[]): AliasPath[] =>
  aliases.some((path) => path.state === "ok")
    ? aliases.map((path) =>
        path.state === "ok" ? { ...path, inUse: true } : path.state === "failed" ? path : { ...path, standby: true },
      )
    : aliases;

const lines = (...parts: (string | false | undefined | null)[]): string[] =>
  parts.flatMap((part) => (part ? part.split(" · ") : [])).filter(Boolean);

/** What each part says when hovered: what was looked at there, and the findings about it. */
const withReports = (diagram: ConnectionDiagram, hops: PathHop[] = []): ConnectionDiagram => {
  const hop = (id: string) => hopById(hops, id);
  // The findings in full — what it is, why, and what to do about it — since
  // the picture is the only place they are shown.
  const found = (part: DiagramPart) =>
    part.findings.flatMap((finding) => [
      finding.title,
      finding.detail,
      ...(finding.remedy?.kind === "manual" ? [finding.remedy.instructions] : []),
    ]);
  const report = <P extends DiagramPart>(part: P, ...said: (string | false | undefined | null)[]): P => ({
    ...part,
    report: [...new Set([...lines(...said), ...(part.reason ? [part.reason] : []), ...found(part)])],
  });
  const aliases = diagram.serviceLink.aliases;
  const serviceHop = hops.flatMap((entry) => entry.children ?? [])[0];
  return {
    client: report(diagram.client, "This app, on this computer", hop("computer")?.summary),
    coordination: report(
      diagram.coordination,
      diagram.coordination.detail,
      "where this session signed in",
      hop("coordination")?.summary,
    ),
    signInLink: report(diagram.signInLink, "This computer to the coordination server", diagram.signInLink.label),
    hub: report(diagram.hub, diagram.hub.detail, hop("hub")?.summary),
    service: report(diagram.service, diagram.service.detail, serviceHop?.summary),
    reportLink: report(
      diagram.reportLink,
      "The hub's own health report to the coordination server",
      diagram.reportLink.label,
      diagram.reportLink.detail,
    ),
    serviceLink: report(
      { ...diagram.serviceLink, aliases: markInUse(aliases) },
      "This computer to the hub",
      aliases.length > 0 && `${aliases.filter((path) => path.state === "ok").length} of ${aliases.length} addresses get through`,
      diagram.serviceLink.via,
      hop("mesh")?.summary,
    ),
  };
};

export const buildConnectionDiagram = (input: ConnectionDiagramInput): ConnectionDiagram => {
  const live = liveDiagram(input);
  const report = input.doctor?.report;
  // A retry in flight still holds the last run's report; the old break must
  // not outlive the state it described.
  const now = input.now ?? Date.now();
  const sharpened = !!report && input.status === "invalid";
  const diagram = sharpened ? applyReport(live, report, input.serviceKey, now) : live;
  applyPeerOffline(diagram);

  if (input.doctor?.status === "running" && input.status === "invalid") {
    for (const id of ["hub", "service", "reportLink"] as const) {
      if (diagram[id].state === "unknown") diagram[id] = { ...diagram[id], state: "checking" };
    }
  }
  return withReports(diagram, sharpened ? buildConnectionPath(report, now) : []);
};

/* ───────────────────────── the whole deployment ───────────────────────── */

/** How a request to this host travels: for a surface that only has a line of text for it. */
export const travelOf = routeOf;

export type DeploymentDiagramInput = {
  /** Every service the deployment offers, as the store has them. */
  services: ServiceRuntimeState[];
  /** The hub's own report, when there is a lok client and the hub reports. */
  hub?: HubHealthFacts;
  coordination?: { name?: string; host?: string };
  hubName?: string;
  tunnel?: string;
  mesh?: MeshStatusPayload;
  tailscale?: MeshProbeResult;
  tailscaleConsent?: "ask" | "allowed" | "denied";
  now?: number;
};

const listed = (names: string[]): string =>
  names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;

/**
 * The same picture for every service at once: what Settings shows. There is
 * no doctor run behind it, only live state — which here includes the hub's
 * polled report and the mesh's live status, so the line to the hub can say
 * how each address is travelling right now (relayed, or a direct tunnel).
 *
 * One path per distinct address: several services usually share a host, and
 * the path is what is being drawn, not the service.
 */
export const buildDeploymentDiagram = (input: DeploymentDiagramInput): ConnectionDiagram => {
  const { services, hub, coordination, tunnel, mesh } = input;
  const now = input.now ?? Date.now();
  const offered = services.filter((service) => service.status !== "unconfigured");
  const down = offered.filter((service) => service.status === "invalid");
  const checking = offered.filter((service) => service.status === "checking" || service.status === "configured");
  const allDown = offered.length > 0 && down.length === offered.length;

  // A ready service vouches for the address it uses; an unreachable one
  // condemns every address it could have used. Reachable wins: the path
  // works if anything gets through it.
  const paths = new Map<string, AliasPath>();
  const rank = STATE_RANK;
  for (const service of offered) {
    const single = buildConnectionDiagram({
      serviceKey: service.key,
      serviceName: service.definition.name ?? service.key,
      status: service.status,
      aliases: service.instance?.aliases,
      chosenAlias: service.alias,
      mesh,
      tailscale: input.tailscale,
    });
    for (const path of single.serviceLink.aliases) {
      const known = paths.get(path.label);
      if (!known || rank[path.state] > rank[known.state]) paths.set(path.label, { ...path, id: path.label });
    }
  }

  const names = (list: ServiceRuntimeState[]) => listed(list.map((service) => service.definition.name ?? service.key));
  const diagram: ConnectionDiagram = {
    client: part("ok", "This computer"),
    coordination: part("ok", "Coordination server", { detail: coordination?.host ?? coordination?.name }),
    signInLink: part("ok", "signed in"),
    reportLink: part("unknown", "health report"),
    hub: part(allDown || offered.length === 0 ? "unknown" : "ok", "Hub", { detail: input.hubName }),
    service:
      offered.length === 0
        ? part("absent", "No services", { detail: "none offered" })
        : down.length > 0
          ? part(allDown ? "unknown" : "failed", `${offered.length - down.length} of ${offered.length} services answer`, {
              reason: allDown ? undefined : `${names(down)} unreachable`,
            })
          : checking.length > 0
            ? part("checking", `Checking ${names(checking)}`)
            : part("ok", `All ${offered.length} services answer`),
    serviceLink: {
      ...(offered.length === 0
        ? part("absent", "no service")
        : allDown
          ? part("failed", "no answer", { reason: "none of the services answered their health check" })
          : checking.length === offered.length
            ? part("checking", "checking")
            : part("ok", "connected")),
      via: tunnel,
      aliases: byLane([...paths.values()]),
      askTailscale: shouldAsk([...paths.values()], input.tailscaleConsent),
    },
  };

  applyHubReport(diagram, hub, undefined, now);
  // The hub is silent towards the coordination server and towards this
  // computer: the same verdict the doctor reaches, without a probe.
  if (hub?.lastSeenAt && !hub.online && allDown) {
    diagram.hub = { ...diagram.hub, state: "failed", reason: "not reporting and not answering" };
  }
  // It reports itself healthy and nothing gets through: the hub is fine.
  if (hub?.online && allDown) diagram.hub = { ...diagram.hub, state: hub.lastHealthy === false ? "warning" : "ok" };
  applyPeerOffline(diagram);
  const reported = withReports(diagram);
  // No doctor run here; the hub's polled report is the evidence.
  return hub
    ? {
        ...reported,
        hub: {
          ...reported.hub,
          report: [
            ...(reported.hub.report ?? []),
            ...lines(
              hub.version && `version ${hub.version.replace(/^v/, "")}`,
              hub.meshConnected === true && (hub.meshHost ? `on the mesh as ${hub.meshHost}` : "on the mesh"),
              hub.meshConnected === false && "says it is off the mesh",
            ),
          ],
        },
      }
    : reported;
};
