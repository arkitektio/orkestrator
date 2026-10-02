import { describe, expect, it } from "vitest";
import type { MeshProbeResult, NetworkProbeResult, ProbeTarget } from "../../../../../../main/doctor/protocol";
import type { MeshStatusPayload } from "../../../../../../main/mesh/protocol";
import type { Alias } from "../fakts/faktsSchema";
import type { ServiceRuntimeState } from "../types";
import {
  buildConnectionDiagram,
  buildDeploymentDiagram,
  type ConnectionDiagram,
  type ConnectionDiagramInput,
} from "./diagram";
import { diagnose } from "./diagnose";
import type { DoctorContext, DoctorReport } from "./findings";
import type { HubHealthFacts } from "./hubHealth";

const NOW = Date.parse("2026-09-23T10:20:00Z");

const coord: ProbeTarget = { host: "go.arkitekt.live", ssl: true, probePath: ".well-known/fakts", label: "https://go.arkitekt.live", role: "coordination" };
const mikro: ProbeTarget = { host: "mikro.tailnet-cafe.ts.net", ssl: true, label: "mikro", serviceKey: "mikro", role: "service" };

const ok = (target: ProbeTarget): NetworkProbeResult => ({
  target,
  url: `https://${target.host}/`,
  dns: { ok: true, lookupAddresses: ["100.64.0.2"], resolveAddresses: ["100.64.0.2"] },
  tcp: { attempted: true, ok: true, ms: 10 },
  tls: { attempted: true, ok: true },
  http: { attempted: true, ok: true, status: 200 },
  totalMs: 30,
});

/** Nothing there: the socket never opened. */
const dead = (target: ProbeTarget): NetworkProbeResult => ({
  ...ok(target),
  tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 },
  tls: { attempted: false, ok: false },
  http: { attempted: false, ok: false },
});

/** A machine is there, and nothing is listening on it. */
const refused = (target: ProbeTarget): NetworkProbeResult => ({
  ...dead(target),
  tcp: { attempted: true, ok: false, code: "ECONNREFUSED", ms: 3 },
});

/** It answered, with the wrong thing. */
const erroring = (target: ProbeTarget): NetworkProbeResult => ({
  ...ok(target),
  http: { attempted: true, ok: false, status: 502 },
});

const tailscale = (backendState = "Running"): MeshProbeResult => ({
  vendor: "tailscale",
  available: true,
  backendState,
  magicDnsSuffix: "tailnet-cafe.ts.net",
  tailnetName: "tailnet-cafe.ts.net",
  self: { dnsName: "laptop.tailnet-cafe.ts.net.", hostName: "laptop", ips: ["100.64.0.1"], online: true },
  peers: [{ dnsName: "mikro.tailnet-cafe.ts.net.", hostName: "mikro", ips: ["100.64.0.2"], online: true, expired: false }],
});

const hub = (overrides: Partial<HubHealthFacts> = {}): HubHealthFacts => ({
  name: "lab-hub",
  online: true,
  lastSeenAt: "2026-09-23T10:00:00Z",
  version: "1.4.0",
  meshConnected: true,
  meshHost: "lab-hub.tailnet-cafe.ts.net",
  services: { mikro: { healthy: true } },
  ...overrides,
});

const context: DoctorContext = { kind: "service", serviceKey: "mikro", endpointUrl: "https://go.arkitekt.live" };

/** A report exactly as the hook builds it: the findings come from `diagnose`. */
const reportFor = ({
  network,
  mesh = tailscale(),
  facts,
  probesAvailable,
}: {
  network: NetworkProbeResult[];
  mesh?: MeshProbeResult;
  facts?: HubHealthFacts;
  probesAvailable?: boolean;
}): DoctorReport => {
  const targets = [coord, mikro];
  return {
    startedAt: NOW,
    durationMs: 1200,
    context,
    targets,
    network,
    mesh,
    hub: facts,
    lok: facts ? { status: "ok", hub: facts } : { status: "not-available" },
    findings: diagnose({ context, targets, network, mesh, hub: facts, probesAvailable }),
  };
};

const build = (input: Partial<ConnectionDiagramInput> = {}): ConnectionDiagram =>
  buildConnectionDiagram({
    serviceKey: "mikro",
    serviceName: "Mikro",
    status: "invalid",
    errors: ["No working alias found for service: mikro"],
    now: NOW,
    ...input,
  });

const withReport = (report: DoctorReport, input: Partial<ConnectionDiagramInput> = {}) =>
  build({ doctor: { status: "done", report }, ...input });

const states = (diagram: ConnectionDiagram) =>
  Object.fromEntries(Object.entries(diagram).map(([id, part]) => [id, part.state]));

describe("buildConnectionDiagram, from live state alone", () => {
  it("an unreachable service: the line to the hub is red, the far end unknown, the rest green", () => {
    const diagram = build({ coordination: { host: "go.arkitekt.live" }, tunnel: "Arkitekt mesh · lab" });
    expect(states(diagram)).toEqual({
      client: "ok",
      coordination: "ok",
      signInLink: "ok",
      serviceLink: "failed",
      hub: "unknown",
      service: "unknown",
      reportLink: "unknown",
    });
    expect(diagram.serviceLink.reason).toBe("No working alias found for service: mikro");
    expect(diagram.serviceLink.via).toBe("Arkitekt mesh · lab");
    expect(diagram.coordination.detail).toBe("go.arkitekt.live");
  });

  it("a service still being checked is never red", () => {
    for (const status of ["checking", "configured"] as const) {
      const diagram = build({ status, errors: [] });
      expect(diagram.serviceLink.state).toBe("checking");
      expect(diagram.service.state).toBe("checking");
      expect(Object.values(states(diagram))).not.toContain("failed");
    }
  });

  it("a service the deployment does not offer is absent, not broken", () => {
    for (const status of ["unconfigured", undefined] as const) {
      const diagram = build({ status, errors: [] });
      expect(diagram.service).toMatchObject({ state: "absent", detail: "not offered" });
      expect(diagram.serviceLink.state).toBe("absent");
      expect(Object.values(states(diagram))).not.toContain("failed");
    }
  });

  it("while the doctor runs, what is not known yet reads as being checked", () => {
    const diagram = build({ doctor: { status: "running" } });
    expect(diagram.serviceLink.state).toBe("failed");
    expect(diagram.hub.state).toBe("checking");
    expect(diagram.service.state).toBe("checking");
    expect(diagram.reportLink.state).toBe("checking");
  });
});

describe("buildConnectionDiagram, sharpened by a report", () => {
  it("the hub reports the service healthy, nothing answers from here: the line is the break", () => {
    const diagram = withReport(reportFor({ network: [ok(coord), dead(mikro)], facts: hub() }));
    expect(states(diagram)).toEqual({
      client: "ok",
      coordination: "ok",
      signInLink: "ok",
      serviceLink: "failed",
      hub: "ok",
      service: "ok",
      reportLink: "ok",
    });
    expect(diagram.serviceLink.reason).toBe("TCP: ETIMEDOUT 4000ms");
    expect(diagram.serviceLink.findings.map((finding) => finding.id)).toContain("hub.healthy-client-fails");
    expect(diagram.reportLink).toMatchObject({ label: "reporting", detail: "last report 20 minutes ago" });
    expect(diagram.hub.detail).toBe("lab-hub");
  });

  it("the hub reports it down too: the service is the break, not the line", () => {
    const facts = hub({ services: { mikro: { healthy: false, reason: "container exited" } } });
    const diagram = withReport(reportFor({ network: [ok(coord), refused(mikro)], facts }));
    expect(diagram.service).toMatchObject({ state: "failed", reason: "container exited" });
    expect(diagram.serviceLink.state).toBe("ok");
    expect(diagram.hub.state).toBe("ok");
    expect(diagram.reportLink.state).toBe("ok");
  });

  it("the hub went quiet and does not answer: the hub and its report line are red", () => {
    const diagram = withReport(reportFor({ network: [ok(coord), dead(mikro)], facts: hub({ online: false }) }));
    expect(diagram.reportLink).toMatchObject({ state: "failed", label: "not reporting", reason: "last report 20 minutes ago" });
    expect(diagram.hub.state).toBe("failed");
    // Silent both ways: the line from here is red too.
    expect(diagram.serviceLink.state).toBe("failed");
    expect(diagram.signInLink.state).toBe("ok");
  });

  it("with no hub report, a refused connection blames the service and a timeout blames the line", () => {
    const answeredNo = withReport(reportFor({ network: [ok(coord), erroring(mikro)] }));
    expect(answeredNo.service).toMatchObject({ state: "failed", reason: "HTTP 502" });
    expect(answeredNo.serviceLink.state).toBe("ok");

    const nothingThere = withReport(reportFor({ network: [ok(coord), dead(mikro)] }));
    expect(nothingThere.serviceLink).toMatchObject({ state: "failed", reason: "TCP: ETIMEDOUT 4000ms" });
    expect(nothingThere.service.state).toBe("unknown");
    expect(nothingThere.reportLink.state).toBe("unknown");
  });

  it("signed out of the mesh: the line carries the mesh's reason and finding", () => {
    const diagram = withReport(reportFor({ network: [ok(coord), dead(mikro)], mesh: tailscale("NeedsLogin"), facts: hub() }));
    expect(diagram.serviceLink.state).toBe("failed");
    expect(diagram.serviceLink.reason).toContain("Tailscale NeedsLogin");
    expect(diagram.serviceLink.findings.map((finding) => finding.id)).toContain("mesh.needs-login");
  });

  it("the coordination server does not answer: its line breaks, not the node", () => {
    const diagram = withReport(reportFor({ network: [dead(coord), dead(mikro)] }));
    expect(diagram.signInLink).toMatchObject({ state: "failed", label: "no answer" });
    expect(diagram.signInLink.reason).toContain("TCP: ETIMEDOUT 4000ms");
    expect(diagram.coordination.state).toBe("unknown");
  });

  it("it answers by the time the doctor looks: everything goes green", () => {
    const diagram = withReport(reportFor({ network: [ok(coord), ok(mikro)], facts: hub() }));
    expect(new Set(Object.values(states(diagram)))).toEqual(new Set(["ok"]));
  });
});

describe("buildConnectionDiagram, the merge rule", () => {
  it("a report with no probes (browser build) leaves what live state knows is fine green", () => {
    const diagram = withReport(reportFor({ network: [], mesh: undefined, probesAvailable: false }));
    expect(diagram.client.state).toBe("ok");
    expect(diagram.signInLink.state).toBe("ok");
    expect(diagram.coordination.state).toBe("ok");
    // And the live break stays where it was.
    expect(diagram.serviceLink).toMatchObject({ state: "failed", reason: "No working alias found for service: mikro" });
  });

  it("a retry in flight ignores the last run's report", () => {
    const stale = reportFor({ network: [ok(coord), dead(mikro)], facts: hub({ online: false }) });
    const diagram = withReport(stale, { status: "checking", errors: [] });
    expect(Object.values(states(diagram))).not.toContain("failed");
    expect(diagram.serviceLink.state).toBe("checking");
  });
});

/* ─────────────────────────── one line per alias ───────────────────────── */

const lan: Alias = { id: "lan", host: "192.168.1.20", port: 8080, ssl: false, challenge: "ht" };
const meshName: Alias = { id: "mesh", host: "mikro.tailnet-cafe.ts.net", ssl: true, challenge: "ht" };
const lanTarget: ProbeTarget = { host: lan.host, port: lan.port, ssl: false, label: "mikro alias 1 of 2", serviceKey: "mikro", role: "service" };
const meshTarget: ProbeTarget = { ...mikro, label: "mikro alias 2 of 2" };

/** The built-in mesh, running, with the hub's machine reached through a relay. */
const builtInMesh = (peer: { relay?: string; curAddr?: string; online?: boolean } = { relay: "fra" }): MeshStatusPayload => ({
  sidecar: { state: "ready", version: "t" },
  meshes: [
    {
      config: { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: [], hasNodeState: true },
      status: {
        id: "lab",
        state: "running",
        magicDnsSuffix: "tailnet-cafe.ts.net",
        peers: [{ dnsName: "mikro.tailnet-cafe.ts.net", ips: ["100.64.0.2"], online: true, ...peer }],
      },
    },
  ],
});

describe("buildConnectionDiagram, the alias paths", () => {
  it("draws every address the service advertises, all failed while it is unreachable", () => {
    const { aliases } = build({ aliases: [lan, meshName] }).serviceLink;
    expect(aliases.map((path) => [path.label, path.state, path.url])).toEqual([
      ["192.168.1.20:8080", "failed", "http://192.168.1.20:8080"],
      ["mikro.tailnet-cafe.ts.net", "failed", "https://mikro.tailnet-cafe.ts.net"],
    ]);
    // The health check keeps no reason per address.
    expect(aliases.map((path) => path.error)).toEqual(["did not pass the health check", "did not pass the health check"]);
  });

  it("once connected, marks the road in use and steps the untried ones back", () => {
    const { aliases } = build({
      status: "ready",
      errors: [],
      aliases: [lan, meshName],
      chosenAlias: lan,
      mesh: builtInMesh(),
    }).serviceLink;
    expect(aliases.map((path) => [path.label, path.inUse ?? false, path.standby ?? false])).toEqual([
      ["192.168.1.20:8080", true, false],
      ["mikro.tailnet-cafe.ts.net", false, true],
    ]);
  });

  it("but a road known to be broken is no spare: it stays red while another one carries the traffic", () => {
    const { aliases } = build({
      status: "ready",
      errors: [],
      aliases: [lan, meshName],
      chosenAlias: lan,
      mesh: builtInMesh({ online: false }),
    }).serviceLink;
    expect(aliases[1]).toMatchObject({ state: "failed", error: "its machine is offline on the mesh" });
    expect(aliases[1].standby).toBeUndefined();
  });

  it("marks nothing while nothing connects: then each road's failure is the point", () => {
    const { aliases } = build({ aliases: [lan, meshName] }).serviceLink;
    expect(aliases.some((path) => path.inUse || path.standby)).toBe(false);
  });

  it("draws one line per host and port: a path under it is not another road", () => {
    const mikroPath: Alias = { ...meshName, id: "m1", path: "mikro" };
    const rekuestPath: Alias = { ...meshName, id: "m2", path: "rekuest" };
    const otherPort: Alias = { ...meshName, id: "m3", port: 8443 };
    const { aliases } = build({ aliases: [mikroPath, rekuestPath, otherPort] }).serviceLink;
    expect(aliases.map((path) => path.label)).toEqual(["mikro.tailnet-cafe.ts.net", "mikro.tailnet-cafe.ts.net:8443"]);
  });

  it("a shared road works if any address down it gets through", () => {
    const one: Alias = { ...lan, id: "l1", path: "a" };
    const two: Alias = { ...lan, id: "l2", path: "b" };
    const target = (path: string): ProbeTarget => ({ ...lanTarget, path });
    const report = reportFor({ network: [ok(coord), dead(target("a")), ok(target("b"))] });
    const { aliases } = withReport(report, { aliases: [one, two] }).serviceLink;
    expect(aliases).toHaveLength(1);
    expect(aliases[0]).toMatchObject({ label: "192.168.1.20:8080", state: "ok" });
  });

  it("gives each address the error ITS probe ran into", () => {
    const report = reportFor({ network: [ok(coord), refused(lanTarget), dead(meshTarget)] });
    const { aliases } = withReport(report, { aliases: [lan, meshName] }).serviceLink;
    expect(aliases.map((path) => [path.label, path.error])).toEqual([
      ["192.168.1.20:8080", "TCP: ECONNREFUSED 3ms"],
      ["mikro.tailnet-cafe.ts.net", "TCP: ETIMEDOUT 4000ms"],
    ]);
    // A machine that refused was reached; a timeout reached nothing.
    expect(aliases.map((path) => path.state)).toEqual(["ok", "failed"]);
    expect(aliases).toHaveLength(2);
  });

  it("blames every line when the hub says the service is healthy", () => {
    const report = reportFor({ network: [ok(coord), refused(lanTarget), dead(meshTarget)], facts: hub() });
    const { aliases } = withReport(report, { aliases: [lan, meshName] }).serviceLink;
    expect(aliases.map((path) => path.state)).toEqual(["failed", "failed"]);
  });

  it("marks the address in use on a working service and leaves the others unjudged", () => {
    const { aliases } = build({ status: "ready", errors: [], aliases: [lan, meshName], chosenAlias: meshName }).serviceLink;
    expect(aliases.map((path) => path.state)).toEqual(["unknown", "ok"]);
  });

  it("says how a built-in mesh address travels: relayed, direct, or to a machine that is off", () => {
    const meshPath = (mesh: MeshStatusPayload) =>
      build({ aliases: [lan, meshName], mesh }).serviceLink.aliases.find((path) => path.lane === "mesh");

    expect(build({ aliases: [lan, meshName], mesh: builtInMesh() }).serviceLink.aliases[0]).toMatchObject({
      lane: "direct",
      travel: "straight from this computer, on the local network",
    });
    // A relay is a hop of its own, so it is a fact of its own rather than a tag.
    expect(meshPath(builtInMesh())).toMatchObject({
      network: "Lab",
      relay: "fra",
      travel: "through the mesh Lab · relayed via fra",
    });
    expect(meshPath(builtInMesh())?.tunnel).toBeUndefined();
    // The node names its home relay region even on a direct tunnel; direct wins.
    const direct = meshPath(builtInMesh({ relay: "fra", curAddr: "203.0.113.7:41641" }));
    expect(direct).toMatchObject({ tunnel: "direct tunnel", travel: "through the mesh Lab · direct tunnel" });
    expect(direct?.relay).toBeUndefined();
    const off = meshPath(builtInMesh({ online: false }));
    expect(off).toMatchObject({ peerOffline: true });
    expect(off?.relay).toBeUndefined();
    // Offline is the hub's state, not a tag on the road.
    expect(off?.tunnel).toBeUndefined();
  });

  it("paints a machine the mesh reports offline on the hub, red, not on the line", () => {
    const diagram = build({ aliases: [lan, meshName], mesh: builtInMesh({ online: false }) });
    expect(diagram.hub).toMatchObject({ state: "failed", reason: "offline on the mesh Lab" });
  });

  it("draws the road to an offline machine red even while the service answers another way", () => {
    const { aliases } = build({
      status: "ready",
      errors: [],
      aliases: [lan, meshName],
      chosenAlias: lan,
      mesh: builtInMesh({ online: false }),
    }).serviceLink;
    expect(aliases.map((path) => [path.label, path.state])).toEqual([
      ["192.168.1.20:8080", "ok"],
      ["mikro.tailnet-cafe.ts.net", "failed"],
    ]);
    expect(aliases[1].error).toBe("its machine is offline on the mesh");
  });

  it("keeps the hub red for as long as the mesh reports it offline, whatever else reaches it", () => {
    const report = reportFor({ network: [ok(coord), dead(lanTarget), dead(meshTarget)], facts: hub() });
    const reporting = withReport(report, { aliases: [lan, meshName], mesh: builtInMesh({ online: false }) });
    expect(reporting.hub).toMatchObject({ state: "failed", reason: "offline on the mesh Lab" });

    const connected = build({
      status: "ready",
      errors: [],
      aliases: [lan, meshName],
      chosenAlias: lan,
      mesh: builtInMesh({ online: false }),
    });
    expect(connected.hub.state).toBe("failed");
  });

  it("draws the direct roads first and the mesh ones after, whatever order they came in", () => {
    const { aliases } = build({ aliases: [meshName, lan], mesh: builtInMesh() }).serviceLink;
    expect(aliases.map((path) => path.lane)).toEqual(["direct", "mesh"]);
  });
});

/** The Tailscale the system runs, with the hub's machine as one of its peers. */
const systemTailscale = (
  peer: { relay?: string; curAddr?: string; online?: boolean; active?: boolean } = { relay: "fra", active: true },
): MeshProbeResult => ({
  ...(tailscale() as Extract<MeshProbeResult, { available: true }>),
  peers: [{ dnsName: "mikro.tailnet-cafe.ts.net.", hostName: "mikro", ips: ["100.64.0.2"], online: true, expired: false, ...peer }],
});

describe("buildConnectionDiagram, a mesh the app does not run", () => {
  const meshPath = (input: Partial<ConnectionDiagramInput>) =>
    build({ aliases: [lan, meshName], ...input }).serviceLink.aliases.find((path) => path.lane === "mesh");

  it("a mesh-looking address nobody can vouch for is its own case, and worth one question", () => {
    const diagram = build({ aliases: [lan, meshName], tailscaleConsent: "ask" });
    expect(diagram.serviceLink.aliases.map((path) => [path.lane, path.unrouted ?? false])).toEqual([
      ["direct", false],
      ["mesh", true],
    ]);
    expect(diagram.serviceLink.askTailscale).toBe(true);
  });

  it("does not ask twice, and does not ask when there is nothing to learn", () => {
    expect(build({ aliases: [lan, meshName], tailscaleConsent: "denied" }).serviceLink.askTailscale).toBe(false);
    expect(build({ aliases: [lan, meshName], tailscaleConsent: "allowed" }).serviceLink.askTailscale).toBe(false);
    // No mesh-looking address at all.
    expect(build({ aliases: [lan], tailscaleConsent: "ask" }).serviceLink.askTailscale).toBe(false);
    // The built-in mesh already explains it.
    expect(
      build({ aliases: [lan, meshName], mesh: builtInMesh(), tailscaleConsent: "ask" }).serviceLink.askTailscale,
    ).toBe(false);
  });

  it("once asked, Tailscale says whether the tunnel is direct or goes through a DERP relay", () => {
    expect(meshPath({ tailscale: systemTailscale() })).toMatchObject({
      network: "Tailscale",
      relay: "fra",
      travel: "through Tailscale tailnet-cafe.ts.net · relayed via fra",
    });
    expect(meshPath({ tailscale: systemTailscale() })?.unrouted).toBeUndefined();
    // `Relay` names the home region even on a direct tunnel; direct wins.
    const direct = meshPath({ tailscale: systemTailscale({ relay: "fra", curAddr: "203.0.113.7:41641" }) });
    expect(direct).toMatchObject({ tunnel: "direct tunnel" });
    expect(direct?.relay).toBeUndefined();
    expect(meshPath({ tailscale: systemTailscale({ online: false }) })).toMatchObject({ peerOffline: true });
    expect(build({ aliases: [lan, meshName], tailscale: systemTailscale({ online: false }) }).hub).toMatchObject({
      state: "failed",
      reason: "offline on Tailscale",
    });
    // No session open: no path to claim, relay region or not.
    const idle = meshPath({ tailscale: systemTailscale({ relay: "fra", active: false }) });
    expect(idle).toMatchObject({ tunnel: "idle" });
    expect(idle?.relay).toBeUndefined();
  });

  it("says so when Tailscale is installed but not running", () => {
    expect(meshPath({ tailscale: tailscale("Stopped") })).toMatchObject({
      network: "Tailscale",
      tunnel: "Tailscale off",
      travel: "through Tailscale tailnet-cafe.ts.net · Tailscale is Stopped",
    });
  });

  it("the built-in mesh outranks the system Tailscale for an address it routes", () => {
    expect(meshPath({ mesh: builtInMesh(), tailscale: systemTailscale({ curAddr: "1.2.3.4:1" }) })).toMatchObject({
      network: "Lab",
      relay: "fra",
    });
  });
});

/* ───────────────────────── the whole deployment ───────────────────────── */

const service = (key: string, overrides: Partial<ServiceRuntimeState> = {}): ServiceRuntimeState =>
  ({
    key,
    configured: true,
    definition: { key, name: key },
    status: "ready",
    errors: [],
    alias: meshName,
    instance: { identifier: key, service: key, aliases: [lan, meshName] },
    ...overrides,
  }) as ServiceRuntimeState;

describe("buildDeploymentDiagram", () => {
  it("everything answers: one path per address, the one in use green, the hub reporting", () => {
    const diagram = buildDeploymentDiagram({
      services: [service("mikro"), service("rekuest")],
      hub: hub(),
      mesh: builtInMesh(),
      now: NOW,
    });
    expect(diagram.service).toMatchObject({ state: "ok", label: "All 2 services answer" });
    expect(diagram.serviceLink.state).toBe("ok");
    expect(diagram.reportLink).toMatchObject({ state: "ok", label: "reporting" });
    expect(diagram.serviceLink.aliases.map((path) => [path.label, path.state, path.relay])).toEqual([
      ["192.168.1.20:8080", "unknown", undefined],
      ["mikro.tailnet-cafe.ts.net", "ok", "fra"],
    ]);
  });

  it("one service down: the hub is reached, the service row names what is not", () => {
    const diagram = buildDeploymentDiagram({
      services: [service("mikro", { status: "invalid", alias: undefined }), service("rekuest")],
      hub: hub(),
      now: NOW,
    });
    expect(diagram.serviceLink.state).toBe("ok");
    expect(diagram.service).toMatchObject({ state: "failed", label: "1 of 2 services answer", reason: "mikro unreachable" });
    // rekuest gets through the mesh name, so that path works whatever mikro says.
    expect(diagram.serviceLink.aliases.map((path) => path.state)).toEqual(["failed", "ok"]);
  });

  it("nothing answers and the hub reports healthy: the lines are the break, not the hub", () => {
    const down = (key: string) => service(key, { status: "invalid", alias: undefined });
    const diagram = buildDeploymentDiagram({ services: [down("mikro"), down("rekuest")], hub: hub(), now: NOW });
    expect(diagram.serviceLink.state).toBe("failed");
    expect(diagram.hub.state).toBe("ok");
    expect(diagram.serviceLink.aliases.map((path) => path.state)).toEqual(["failed", "failed"]);
  });

  it("nothing answers and the hub went quiet: the hub is the break", () => {
    const down = (key: string) => service(key, { status: "invalid", alias: undefined });
    const diagram = buildDeploymentDiagram({
      services: [down("mikro"), down("rekuest")],
      hub: hub({ online: false }),
      now: NOW,
    });
    expect(diagram.hub.state).toBe("failed");
    expect(diagram.reportLink.state).toBe("failed");
  });
});

/* ───────────────────── this computer's own side, and reports ──────────── */

const internet: ProbeTarget = { host: "www.google.com", ssl: true, probePath: "generate_204", label: "internet check", role: "internet" };

describe("buildConnectionDiagram, the firewall check", () => {
  const withInternet = (network: NetworkProbeResult[]) => {
    const targets = [coord, internet, mikro];
    const report: DoctorReport = {
      startedAt: NOW,
      durationMs: 1200,
      context,
      targets,
      network,
      mesh: tailscale(),
      lok: { status: "not-available" },
      findings: diagnose({ context, targets, network, mesh: tailscale() }),
    };
    return withReport(report);
  };

  it("nothing gets out at all: this computer is the red part", () => {
    const diagram = withInternet([dead(coord), dead(internet), dead(mikro)]);
    expect(diagram.client.state).toBe("failed");
    expect(diagram.client.reason).toContain("does not reach the internet");
    expect(diagram.client.findings.map((finding) => finding.id)).toContain("net.internet.unreachable");
  });

  it("no internet but the deployment answers elsewhere: a note, not a failure", () => {
    const diagram = withInternet([ok(coord), dead(internet), dead(mikro)]);
    expect(diagram.client.state).toBe("ok");
    expect(diagram.client.report).toContain("does not reach the internet (TCP: ETIMEDOUT 4000ms)");
  });

  it("the internet answers: this computer says so on hover", () => {
    const diagram = withInternet([ok(coord), ok(internet), dead(mikro)]);
    expect(diagram.client.state).toBe("ok");
    expect(diagram.client.report).toContain("reaches the internet");
  });
});

describe("buildConnectionDiagram, the report on each part", () => {
  it("says what was seen at each part, a line each", () => {
    const diagram = withReport(reportFor({ network: [ok(coord), dead(mikro)], facts: hub() }), {
      coordination: { host: "go.arkitekt.live" },
      aliases: [meshName],
    });
    expect(diagram.coordination.report).toEqual(expect.arrayContaining(["go.arkitekt.live", "answered", "lok answered"]));
    expect(diagram.hub.report).toEqual(expect.arrayContaining(["reporting", "last report 20 minutes ago", "v1.4.0"]));
    expect(diagram.service.report).toEqual(expect.arrayContaining(["hub: healthy", "here: TCP: ETIMEDOUT 4000ms"]));
    expect(diagram.reportLink.report).toEqual(expect.arrayContaining(["reporting", "last report 20 minutes ago"]));
    expect(diagram.serviceLink.report).toEqual(expect.arrayContaining(["0 of 1 addresses get through", "TCP: ETIMEDOUT 4000ms"]));
  });

  it("has something to say before any check has run", () => {
    const diagram = build();
    expect(diagram.client.report).toEqual(["This app, on this computer"]);
    expect(diagram.serviceLink.report).toContain("No working alias found for service: mikro");
  });
});
