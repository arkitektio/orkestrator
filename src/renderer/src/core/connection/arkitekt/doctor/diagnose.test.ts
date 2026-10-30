import { describe, expect, it } from "vitest";
import type {
  NetworkProbeResult,
  ProbeTarget,
} from "../../../../../../main/doctor/protocol";
import { diagnose } from "./diagnose";
import type { DiagnoseInput, Finding } from "./findings";
import type { HubHealthFacts } from "./hubHealth";

/* ───────────────────────────── fixtures ───────────────────────────────── */

const target = (overrides: Partial<ProbeTarget> = {}): ProbeTarget => ({
  host: "mikro.tailnet-cafe.ts.net",
  port: 443,
  ssl: true,
  path: null,
  probePath: ".well-known/fakts-challenge",
  label: "mikro",
  ...overrides,
});

/** A probe where every stage succeeded; override one stage per test. */
const probe = (overrides: Partial<NetworkProbeResult> = {}): NetworkProbeResult => ({
  target: overrides.target ?? target(),
  url: "https://mikro.tailnet-cafe.ts.net/.well-known/fakts-challenge",
  dns: { ok: true, lookupAddresses: ["100.64.0.2"], resolveAddresses: ["100.64.0.2"] },
  tcp: { attempted: true, ok: true, ms: 12 },
  tls: { attempted: true, ok: true },
  http: { attempted: true, ok: true, status: 200 },
  totalMs: 40,
  ...overrides,
});

const run = (overrides: Partial<DiagnoseInput> = {}): Finding[] =>
  diagnose({
    context: { kind: "service", serviceKey: "mikro" },
    targets: [target()],
    network: [probe()],
    ...overrides,
  });

const ids = (findings: Finding[]): string[] => findings.map((finding) => finding.id);
const byId = (findings: Finding[], id: string): Finding | undefined =>
  findings.find((finding) => finding.id === id);

/* ─────────────────────── a route the OS may carry ─────────────────────── */

describe("a *.ts.net address", () => {
  // Only the sidecar is a mesh. Such a name is one road among others: if a
  // system Tailscale carries it, fine, and if not, it simply did not answer.
  const timedOut = probe({ tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 }, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } });

  it("fails like any other address, with no word about Tailscale", () => {
    const findings = run({ network: [timedOut] });
    expect(ids(findings)).toContain("net.tcp.timeout");
    expect(ids(findings).filter((id) => id.startsWith("mesh."))).toEqual([]);
    expect(JSON.stringify(findings)).not.toMatch(/tailscale/i);
  });

  it("is not held against the built-in mesh when its node is down", () => {
    const findings = run({
      context: { kind: "service", serviceKey: "mikro", meshCoordUrl: "https://mesh.arkitekt.live" },
      sidecar: { sidecar: { state: "ready", version: "t" }, meshes: [] },
      network: [timedOut],
    });
    expect(ids(findings).filter((id) => id.startsWith("mesh."))).toEqual([]);
  });
});

/* ──────────────────────────── network rules ───────────────────────────── */

describe("dns findings", () => {
  const dnsProbe = (dns: NetworkProbeResult["dns"]) =>
    probe({ dns, tcp: { attempted: false, ok: false, ms: 0 }, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } });

  it("nothing resolves at all", () => {
    const findings = run({
      network: [dnsProbe({ ok: false, lookupAddresses: [], resolveAddresses: [], lookupError: "ENOTFOUND", resolveError: "ENOTFOUND" })],
    });
    expect(byId(findings, "net.dns.nxdomain")?.severity).toBe("blocker");
  });

  it("OS resolves but public DNS does not: that is MagicDNS working", () => {
    const findings = run({
      network: [dnsProbe({ ok: true, lookupAddresses: ["100.64.0.2"], resolveAddresses: [], resolveError: "ENOTFOUND" })],
    });
    expect(byId(findings, "net.dns.magicdns-only")?.severity).toBe("info");
  });

  it("public DNS resolves but the OS does not: only a warning", () => {
    const findings = run({
      network: [dnsProbe({ ok: false, lookupAddresses: [], resolveAddresses: ["1.2.3.4"], lookupError: "ENOTFOUND" })],
    });
    expect(byId(findings, "net.dns.os-resolver-bypassed")?.severity).toBe("warning");
  });

  it("says nothing about DNS for a literal IP", () => {
    const findings = run({
      network: [dnsProbe({ ok: true, skipped: true, lookupAddresses: [], resolveAddresses: [] })],
    });
    expect(ids(findings).some((id) => id.startsWith("net.dns."))).toBe(false);
  });
});

describe("tcp findings", () => {
  const tcpProbe = (tcp: NetworkProbeResult["tcp"]) =>
    probe({ tcp, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } });

  it("refused means the host is up and the service is not", () => {
    const findings = run({ network: [tcpProbe({ attempted: true, ok: false, code: "ECONNREFUSED", ms: 4 })] });
    expect(findings[0]).toMatchObject({ id: "service.not-running", severity: "blocker" });
    expect(findings[0].steps?.length).toBeGreaterThan(0);
    // the per-address refusal stays, as evidence under the verdict
    const finding = byId(findings, "net.tcp.refused");
    expect(finding?.severity).toBe("info");
    expect(finding?.title).toContain("nothing is listening on port 443");
  });

  it("a refusing localhost alone says nothing about the server", () => {
    const local = target({ host: "localhost", label: "mikro alias 2" });
    const findings = run({
      targets: [local],
      network: [{ ...tcpProbe({ attempted: true, ok: false, code: "ECONNREFUSED", ms: 1 }), target: local }],
    });
    expect(ids(findings)).not.toContain("service.not-running");
    expect(findings[0].id).toBe("net.tcp.refused");
  });

  it("timeout reads as a firewall, not as a missing service", () => {
    const finding = byId(run({ network: [tcpProbe({ attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 })] }), "net.tcp.timeout");
    expect(finding?.detail).toContain("firewall");
  });

  it("no route is its own finding", () => {
    expect(ids(run({ network: [tcpProbe({ attempted: true, ok: false, code: "EHOSTUNREACH", ms: 2 })] }))).toContain("net.tcp.unreachable");
  });

  it("an unrecognised errno still produces something", () => {
    expect(ids(run({ network: [tcpProbe({ attempted: true, ok: false, code: "EWEIRD", message: "odd", ms: 2 })] }))).toContain("net.tcp.failed");
  });
});

describe("tls findings", () => {
  const tlsProbe = (tls: NetworkProbeResult["tls"]) =>
    probe({ tls, http: { attempted: false, ok: false } });

  it("a self-signed certificate is a warning, because the OAuth browser will refuse it", () => {
    const finding = byId(run({ network: [tlsProbe({ attempted: true, ok: false, selfSigned: true, issuer: "Acme" })] }), "net.tls.self-signed");
    expect(finding?.severity).toBe("warning");
    expect(finding?.detail).toContain("browser");
  });

  it("a bad certificate on arkitekt.live blocks, because it is never accepted", () => {
    const strict = probe({
      target: { ...probe().target, host: "go.arkitekt.live" },
      tls: { attempted: true, ok: false, selfSigned: true },
      http: { attempted: false, ok: false },
    });
    const found = run({ network: [strict] });
    expect(byId(found, "net.tls.strict-invalid")?.severity).toBe("blocker");
    expect(ids(found)).not.toContain("net.tls.self-signed");
  });

  it("an expired certificate", () => {
    expect(ids(run({ network: [tlsProbe({ attempted: true, ok: false, expired: true, validTo: "2026-01-01" })] }))).toContain("net.tls.expired");
  });

  it("a hostname mismatch", () => {
    expect(ids(run({ network: [tlsProbe({ attempted: true, ok: false, hostnameMismatch: true, subject: "other.example" })] }))).toContain("net.tls.hostname-mismatch");
  });

  it("a port that is not TLS at all is a blocker about misconfiguration", () => {
    const finding = byId(run({ network: [tlsProbe({ attempted: true, ok: false, notTls: true })] }), "net.tls.not-tls");
    expect(finding?.severity).toBe("blocker");
  });

  it("says nothing when TLS was fine or never attempted", () => {
    expect(ids(run({ network: [tlsProbe({ attempted: true, ok: true })] })).some((id) => id.startsWith("net.tls."))).toBe(false);
    expect(ids(run({ network: [tlsProbe({ attempted: false, ok: false })] })).some((id) => id.startsWith("net.tls."))).toBe(false);
  });
});

describe("http findings", () => {
  const httpProbe = (http: NetworkProbeResult["http"]) => probe({ http });

  it("404 on a service reads as a proxy routing problem", () => {
    const finding = byId(run({ network: [httpProbe({ attempted: true, ok: false, status: 404 })] }), "net.http.404");
    expect(finding?.detail).toContain("proxy");
  });

  it("404 during discovery reads as 'not an Arkitekt server'", () => {
    const findings = diagnose({
      context: { kind: "discovery", endpointUrl: "https://example.com" },
      targets: [target({ host: "example.com" })],
      network: [httpProbe({ attempted: true, ok: false, status: 404 })],
    });
    expect(byId(findings, "net.http.404")?.detail).toContain("not an Arkitekt");
  });

  it("401 points at something in front of the server", () => {
    expect(ids(run({ network: [httpProbe({ attempted: true, ok: false, status: 403 })] }))).toContain("net.http.401");
  });

  it("5xx blames the server, not the network", () => {
    const finding = byId(run({ network: [httpProbe({ attempted: true, ok: false, status: 502 })] }), "net.http.5xx");
    expect(finding?.detail).toContain("on the server");
  });
});

/* ────────────────────────── discovery + assembly ──────────────────────── */

describe("discovery findings", () => {
  it("recognises a deployment that is too old from the error the app already showed", () => {
    const findings = diagnose({
      context: { kind: "discovery", endpointUrl: "https://old.example" },
      targets: [target({ host: "old.example" })],
      network: [probe({ target: target({ host: "old.example" }) })],
      originalError:
        'No valid Fakts endpoint discovered at "old.example": invalid_type, required at token_endpoint',
    });
    const finding = byId(findings, "discovery.schema-mismatch");
    expect(finding?.severity).toBe("blocker");
    expect(finding?.title).toContain("older protocol");
  });

  it("notices when only plain HTTP works", () => {
    const https = target({ host: "lab.example", ssl: true, label: "https" });
    const http = target({ host: "lab.example", ssl: false, port: 80, label: "http" });
    const findings = diagnose({
      context: { kind: "discovery", endpointUrl: "lab.example" },
      targets: [https, http],
      network: [
        probe({ target: https, url: "https://lab.example/.well-known/fakts", http: { attempted: true, ok: false, status: 502 } }),
        probe({ target: http, url: "http://lab.example/.well-known/fakts" }),
      ],
    });
    expect(byId(findings, "discovery.https-failed-http-worked")?.severity).toBe("warning");
  });
});

describe("assembly", () => {
  it("demotes symptoms that a mesh blocker already explains", () => {
    const onMesh = target({ host: "100.64.0.2" });
    const findings = run({
      targets: [onMesh],
      sidecar: { sidecar: { state: "unavailable", reason: "binary-missing" }, meshes: [] } as never,
      network: [
        probe({ target: onMesh, tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 }, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } }),
      ],
    });
    expect(byId(findings, "net.tcp.timeout")?.severity).toBe("info");
    expect(findings[0].severity).toBe("blocker");
  });

  it("leaves those symptoms alone when there is no mesh cause", () => {
    const findings = run({
      network: [probe({ tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 }, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } })],
    });
    expect(byId(findings, "net.tcp.timeout")?.severity).toBe("blocker");
  });

  it("sorts blockers before warnings before info", () => {
    const findings = run({
      network: [
        probe({ tls: { attempted: true, ok: false, selfSigned: true }, http: { attempted: true, ok: false, status: 502 } }),
      ],
    });
    const severities = findings.map((finding) => finding.severity);
    expect(severities).toEqual([...severities].sort((a, b) =>
      ["blocker", "warning", "info", "ok"].indexOf(a) - ["blocker", "warning", "info", "ok"].indexOf(b),
    ));
  });

  it("reports when the app fails where a direct request succeeds", () => {
    const findings = run({ rendererReachable: false });
    const finding = byId(findings, "net.ok.renderer-failed");
    expect(finding?.severity).toBe("blocker");
    expect(finding?.detail).toContain("inside the app");
  });

  it("never comes back empty: everything working is itself a finding", () => {
    const findings = run();
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe("net.all-clear");
    expect(findings[0].severity).toBe("ok");
  });

  it("degrades to address-only advice when the probes are unavailable", () => {
    const findings = run({ probesAvailable: false, network: [], targets: [target({ host: "100.64.0.2" })] });
    expect(ids(findings)).toEqual(["doctor.unavailable"]);
    expect(findings[0].detail).toContain("mesh address");
  });

  it("deduplicates identical findings raised for the same target", () => {
    const tcp = { attempted: true, ok: false, code: "ECONNREFUSED", ms: 1 } as const;
    const findings = run({
      network: [
        probe({ tcp, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } }),
        probe({ tcp, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } }),
      ],
    });
    expect(ids(findings).filter((id) => id === "net.tcp.refused")).toHaveLength(1);
  });

  it("keeps one finding per target when the targets differ", () => {
    const second = target({ host: "rekuest.tailnet-cafe.ts.net", label: "rekuest" });
    const tcp = { attempted: true, ok: false, code: "ECONNREFUSED", ms: 1 } as const;
    const findings = run({
      targets: [target(), second],
      network: [
        probe({ tcp, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } }),
        probe({ target: second, url: "https://rekuest.tailnet-cafe.ts.net/x", tcp, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } }),
      ],
    });
    expect(ids(findings).filter((id) => id === "net.tcp.refused")).toHaveLength(2);
  });
});

/* ───────────────────────── built-in mesh (sidecar) ────────────────────── */

describe("built-in mesh findings", () => {
  type Sidecar = import("../../../../../../main/mesh/protocol").MeshStatusPayload;
  type NodeStatus = import("../../../../../../main/mesh/protocol").MeshNodeStatus;

  const CONTROL = "https://mesh.example.org";
  const meshIp = target({ host: "100.64.0.9" });
  const meshWith = (state: NodeStatus["state"], extra: Partial<NodeStatus> = {}): Sidecar["meshes"][number] => ({
    config: { id: "lab", label: "Lab", controlUrl: CONTROL, hosts: [] },
    status: {
      id: "lab",
      state,
      magicDnsSuffix: "tailnet-cafe.ts.net",
      peers: [{ dnsName: "mikro.tailnet-cafe.ts.net", hostName: "mikro", ips: ["100.64.0.2"], online: true }],
      ...extra,
    },
  });
  const sidecarWith = (state: NodeStatus["state"], extra: Partial<NodeStatus> = {}): Sidecar => ({
    sidecar: { state: "ready", version: "test" },
    meshes: [meshWith(state, extra)],
  });
  const none: Sidecar = { sidecar: { state: "idle" }, meshes: [] };
  const ctx = (meshCoordUrl?: string | null) => ({
    kind: "service" as const,
    serviceKey: "mikro",
    endpointUrl: "https://go.test/lok/f/",
    meshCoordUrl,
  });

  const failingProbe = (overrides: Partial<NetworkProbeResult> = {}) =>
    probe({
      dns: { ok: false, lookupAddresses: [], resolveAddresses: [], code: "ENOTFOUND" },
      tcp: { attempted: false, ok: false, ms: 0 },
      tls: { attempted: false, ok: false },
      http: { attempted: false, ok: false },
      ...overrides,
    });
  /** A probe main ran through the mesh proxy. */
  const viaMesh = (http: NetworkProbeResult["http"], tcp: NetworkProbeResult["tcp"] = { attempted: true, ok: true, ms: 9 }) =>
    probe({
      viaMeshProxy: 5000,
      dns: { ok: true, skipped: true, lookupAddresses: [], resolveAddresses: [] },
      tcp,
      tls: { attempted: false, ok: false },
      http,
    });

  it("says so when this build has no mesh client at all", () => {
    const findings = run({
      context: ctx(CONTROL),
      targets: [meshIp],
      sidecar: { sidecar: { state: "unavailable", reason: "binary-missing" }, meshes: [] },
      network: [failingProbe({ target: meshIp })],
    });
    expect(findings[0].id).toBe("mesh.sidecar.unavailable");
  });

  it("the profile's mesh switched off: says so, and blames nothing else", () => {
    const findings = run({
      context: { ...ctx(CONTROL), profileMesh: { id: "lab", enabled: false } },
      targets: [meshIp],
      sidecar: none,
      network: [failingProbe({ target: meshIp })],
    });
    expect(findings[0].id).toBe("mesh.sidecar.disabled");
    expect(ids(findings)).not.toContain("mesh.sidecar.stopped");
  });

  it("routed + peer online + service answered: the HTTP verdict speaks, checked through the mesh", () => {
    const findings = run({
      context: ctx(CONTROL),
      sidecar: sidecarWith("running", { proxyPort: 5000 }),
      network: [viaMesh({ attempted: true, ok: false, status: 502, statusText: "Bad Gateway" })],
    });
    expect(ids(findings)).toContain("mesh.sidecar.routed");
    expect(findings[0].id).toMatch(/^net\.http\./);
    expect(ids(findings)).not.toContain("mesh.sidecar.not-granted");
    expect(ids(findings)).not.toContain("net.dns.nxdomain");
  });

  it("a host under the control server's domain counts as routed, with no pin and no peer", () => {
    const hub = target({ host: "hub.lab.mesh.example.org", label: "mikro" });
    const findings = run({
      context: ctx(CONTROL),
      targets: [hub],
      // No MagicDNS suffix and no peers reported yet: only the domain rule applies.
      sidecar: sidecarWith("running", { proxyPort: 5000, magicDnsSuffix: undefined, peers: [] }),
      network: [{ ...viaMesh({ attempted: true, ok: true, status: 200 }), target: hub }],
    });
    expect(ids(findings)).toContain("mesh.sidecar.routed");
    expect(ids(findings)).not.toContain("mesh.sidecar.host-not-routed");
  });

  it("routed but a direct probe (routing tables disagree) says nothing about the host", () => {
    const findings = run({
      context: ctx(CONTROL),
      sidecar: sidecarWith("running", { proxyPort: 5000 }),
      network: [failingProbe()],
    });
    expect(ids(findings)).toContain("mesh.sidecar.routed");
    expect(ids(findings)).not.toContain("net.dns.nxdomain");
  });

  it("routed but the peer is offline: that is the verdict, the dial timeout is a symptom", () => {
    const findings = run({
      context: ctx(CONTROL),
      sidecar: sidecarWith("running", {
        proxyPort: 5000,
        peers: [{ dnsName: "mikro.tailnet-cafe.ts.net", hostName: "mikro", ips: ["100.64.0.2"], online: false }],
      }),
      network: [viaMesh({ attempted: false, ok: false }, { attempted: true, ok: false, ms: 4000, code: "ETIMEDOUT" })],
    });
    expect(findings[0].id).toBe("mesh.sidecar.peer-offline");
    expect(byId(findings, "net.tcp.timeout")?.severity).toBe("info");
  });

  const refused = (code: string) => ({ attempted: true, ok: false, ms: 3, code, message: "Socks5 proxy rejected connection - Failure" });

  it("routed + the proxy turns the dial down at once: says so, with the proxy's words", () => {
    const findings = run({
      context: ctx(CONTROL),
      sidecar: sidecarWith("running", { proxyPort: 5000 }),
      network: [viaMesh({ attempted: false, ok: false }, refused("MESH_DIAL_FAILED"))],
    });
    expect(findings[0]).toMatchObject({
      id: "net.tcp.mesh-refused",
      severity: "blocker",
      evidence: expect.arrayContaining(["Socks5 proxy rejected connection - Failure"]),
    });
    expect(ids(findings)).not.toContain("net.tcp.failed");
  });

  it("routed + a MagicDNS name no peer carries: that is the verdict, the refusal a symptom", () => {
    const findings = run({
      context: ctx(CONTROL),
      sidecar: sidecarWith("running", {
        proxyPort: 5000,
        peers: [{ dnsName: "kraph.tailnet-cafe.ts.net", hostName: "kraph", ips: ["100.64.0.3"], online: true }],
      }),
      network: [viaMesh({ attempted: false, ok: false }, refused("MESH_DIAL_FAILED"))],
    });
    expect(findings[0].id).toBe("mesh.sidecar.peer-unknown");
    expect(byId(findings, "net.tcp.mesh-refused")?.severity).toBe("info");
  });

  it("routed + the local proxy refused: the mesh client is down, not the target's port", () => {
    const findings = run({
      context: ctx(CONTROL),
      sidecar: sidecarWith("running", { proxyPort: 5000 }),
      network: [viaMesh({ attempted: false, ok: false }, { ...refused("MESH_PROXY_DOWN"), message: "connect ECONNREFUSED 127.0.0.1:5000" })],
    });
    expect(findings[0]).toMatchObject({ id: "mesh.proxy.down", remedy: { kind: "navigate", path: "/settings/mesh" } });
    expect(ids(findings)).not.toContain("net.tcp.refused");
  });

  it("membership lapsed: sign in again", () => {
    const findings = run({ context: ctx(CONTROL), sidecar: sidecarWith("needs-login"), network: [failingProbe()] });
    expect(findings[0].id).toBe("mesh.sidecar.needs-login");
    expect(findings[0].remedy).toEqual({ kind: "manual", instructions: "Sign out of this deployment and sign in again." });
    expect(byId(findings, "net.dns.nxdomain")?.severity).toBe("info");
  });

  it("a refused key: says so, and carries the server's words as evidence", () => {
    const findings = run({
      context: ctx(CONTROL),
      sidecar: sidecarWith("needs-login", { lastError: "invalid auth key" }),
      network: [failingProbe()],
    });
    expect(findings[0]).toMatchObject({ id: "mesh.sidecar.needs-login", title: "The Lab mesh turned this computer away" });
    expect(findings[0].evidence?.[0]).toBe("mesh server: invalid auth key");
  });

  it("a sign-in that brought no key: signing in again is not the advice", () => {
    const findings = run({
      context: { ...ctx(CONTROL), profileMesh: { id: "lab", enabled: true, keyMissingAt: 1 } },
      sidecar: sidecarWith("needs-login"),
      network: [failingProbe()],
    });
    expect(findings[0].id).toBe("mesh.sidecar.key-missing");
    expect(findings[0].remedy).not.toEqual({ kind: "manual", instructions: "Sign out of this deployment and sign in again." });
    expect(ids(findings)).not.toContain("mesh.sidecar.needs-login");
  });

  it("lapsed membership, but the other addresses reach the machine and are refused: the server is down", () => {
    // The unreachable page's case: one address only the mesh could route, the
    // rest answered by the machine itself with a refusal, the hub silent.
    const meshHost = target({ host: "hub.mesh.example.org", label: "mikro alias 1", serviceKey: "mikro" });
    const server = target({ host: "lab-server", label: "mikro alias 2", serviceKey: "mikro" });
    const local = target({ host: "localhost", label: "mikro alias 3", serviceKey: "mikro" });
    const refusedProbe = (t: ProbeTarget) =>
      probe({
        target: t,
        url: `https://${t.host}/`,
        tcp: { attempted: true, ok: false, code: "ECONNREFUSED", ms: 3 },
        tls: { attempted: false, ok: false },
        http: { attempted: false, ok: false },
      });
    const hub: HubHealthFacts = { name: "lab-hub", online: false, version: "1.4.0", services: {} };
    const findings = run({
      context: ctx(CONTROL),
      targets: [meshHost, server, local],
      sidecar: sidecarWith("needs-login"),
      network: [failingProbe({ target: meshHost }), refusedProbe(server), refusedProbe(local)],
      hub,
    });
    expect(findings[0]).toMatchObject({ id: "service.not-running", title: "mikro isn't running on lab-server" });
    expect(byId(findings, "mesh.sidecar.needs-login")?.severity).toBe("info");
    expect(byId(findings, "hub.never-reported")?.severity).toBe("info");

    // A hub that stopped reporting does not take the headline from it either.
    const silent = run({
      context: ctx(CONTROL),
      targets: [meshHost, server],
      sidecar: sidecarWith("needs-login"),
      network: [failingProbe({ target: meshHost }), refusedProbe(server)],
      hub: { ...hub, lastSeenAt: "2026-09-23T10:00:00Z" },
    });
    expect(silent[0].id).toBe("service.not-running");
    expect(byId(silent, "hub.offline")?.severity).toBe("warning");
  });

  it("lapsed membership with only localhost refusing: still the mesh", () => {
    const meshHost = target({ host: "hub.mesh.example.org", label: "mikro alias 1" });
    const local = target({ host: "localhost", label: "mikro alias 2" });
    const findings = run({
      context: ctx(CONTROL),
      targets: [meshHost, local],
      sidecar: sidecarWith("needs-login"),
      network: [
        failingProbe({ target: meshHost }),
        probe({
          target: local,
          tcp: { attempted: true, ok: false, code: "ECONNREFUSED", ms: 1 },
          tls: { attempted: false, ok: false },
          http: { attempted: false, ok: false },
        }),
      ],
    });
    expect(findings[0].id).toBe("mesh.sidecar.needs-login");
  });

  it("names the other node states: awaiting approval, error, connecting, stopped", () => {
    expect(run({ context: ctx(CONTROL), sidecar: sidecarWith("needs-machine-auth"), network: [failingProbe()] })[0].id)
      .toBe("mesh.sidecar.needs-machine-auth");
    expect(run({ context: ctx(CONTROL), sidecar: sidecarWith("error", { error: "boom" }), network: [failingProbe()] })[0])
      .toMatchObject({ id: "mesh.sidecar.error", evidence: expect.arrayContaining(["boom"]) });
    expect(ids(run({ context: ctx(CONTROL), sidecar: sidecarWith("starting"), network: [failingProbe()] })))
      .toContain("mesh.sidecar.starting");
    const stopped = run({
      context: ctx(CONTROL),
      sidecar: { sidecar: { state: "crashed", detail: "exit code 1" }, meshes: [meshWith("stopped")] },
      network: [failingProbe()],
    });
    expect(stopped[0].id).toBe("mesh.sidecar.stopped");
    expect(stopped[0].detail).toContain("exit code 1");
  });

  it("mesh up but the address is not on it: says what the mesh does know, offers pinning", () => {
    const findings = run({
      context: ctx(CONTROL),
      targets: [meshIp],
      sidecar: sidecarWith("running", { proxyPort: 5000 }),
      network: [failingProbe({ target: meshIp })],
    });
    expect(findings[0].id).toBe("mesh.sidecar.host-not-routed");
    expect(findings[0].evidence).toEqual(expect.arrayContaining(["not routed: 100.64.0.9", "mesh machines: mikro.tailnet-cafe.ts.net"]));
    expect(findings[0].remedy).toEqual({ kind: "navigate", label: "Open mesh settings", path: "/settings/mesh" });
  });

  it("no mesh of ours: tells not-let-in, not-advertised and unknown apart", () => {
    const noMesh = (meshCoordUrl?: string | null) =>
      run({ context: ctx(meshCoordUrl), targets: [meshIp], sidecar: none, network: [failingProbe({ target: meshIp })] });
    expect(noMesh(CONTROL)[0]).toMatchObject({
      id: "mesh.sidecar.not-granted",
      evidence: expect.arrayContaining([`mesh: ${CONTROL}`]),
    });
    expect(noMesh(null)[0].id).toBe("mesh.sidecar.not-advertised");
    expect(noMesh(undefined)[0].id).toBe("mesh.sidecar.not-joined");
  });

  it("says nothing about the mesh for a public address", () => {
    const findings = run({
      context: ctx(CONTROL),
      targets: [target({ host: "go.arkitekt.live" })],
      network: [probe({ target: target({ host: "go.arkitekt.live" }) })],
      sidecar: sidecarWith("needs-login"),
    });
    expect(ids(findings).filter((id) => id.startsWith("mesh.sidecar."))).toEqual([]);
  });
});

/* ───────────────────────── the hub's own report ───────────────────────── */

describe("the hub's own report", () => {
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

  const mikro = target({ serviceKey: "mikro" });
  const up = probe({ target: mikro });
  const down = probe({
    target: mikro,
    tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 },
    tls: { attempted: false, ok: false },
    http: { attempted: false, ok: false },
  });
  const withHub = (network: NetworkProbeResult[], facts: HubHealthFacts) =>
    run({ targets: [mikro], network, hub: facts });

  it("changes nothing when there is no hub report", () => {
    expect(ids(run({ targets: [mikro], network: [up] }))).toEqual(["net.all-clear"]);
  });

  it("both sides up: one all-clear that says the hub agrees", () => {
    const findings = withHub([up], hub());
    expect(ids(findings)).toEqual(["net.all-clear"]);
    expect(findings[0].detail).toContain("lab-hub reports the same services healthy");
  });

  it("the hub says the service is down: that is the verdict, and timeouts are demoted", () => {
    const findings = withHub([down], hub({ services: { mikro: { healthy: false, reason: "db down" } } }));
    expect(findings[0]).toMatchObject({ id: "hub.instance-unhealthy", severity: "blocker", targetLabel: "mikro" });
    expect(findings[0].evidence).toContain("hub says: db down");
    expect(byId(findings, "net.tcp.timeout")?.severity).toBe("info");
  });

  it("the hub sees it running but it does not answer here: the path is the problem", () => {
    const findings = withHub([down], hub());
    const finding = byId(findings, "hub.healthy-client-fails");
    expect(finding?.severity).toBe("warning");
    // Not a cause: the network finding still leads.
    expect(findings[0].id).not.toBe("hub.healthy-client-fails");
    expect(byId(findings, "net.tcp.timeout")?.severity).not.toBe("info");
  });

  it("a quiet hub and nothing answers: the hub looks down", () => {
    const findings = withHub([down], hub({ online: false }));
    expect(findings[0]).toMatchObject({ id: "hub.offline", severity: "blocker" });
    expect(byId(findings, "net.tcp.timeout")?.severity).toBe("info");
  });

  it("a quiet hub whose services answer: a warning about the reporting, not the services", () => {
    expect(withHub([up], hub({ online: false }))[0]).toMatchObject({ id: "hub.offline", severity: "warning" });
  });

  it("the service answers although the hub says it is down: a note, still all clear", () => {
    const findings = withHub([up], hub({ services: { mikro: { healthy: false } } }));
    expect(ids(findings)).toEqual(["net.all-clear", "hub.stale-report"]);
  });

  it("the hub is off the mesh and the addresses are mesh addresses", () => {
    const onMesh = target({ host: "100.64.0.2", serviceKey: "mikro" });
    const findings = run({ targets: [onMesh], network: [{ ...down, target: onMesh }], hub: hub({ meshConnected: false }) });
    expect(findings[0]).toMatchObject({ id: "hub.mesh-disconnected", severity: "blocker" });
  });

  it("a hub that never reported is only a note", () => {
    const findings = withHub([up], hub({ lastSeenAt: null }));
    expect(ids(findings)).toEqual(["net.all-clear", "hub.never-reported"]);
  });

  it("without the desktop bridge the hub's word still gets through", () => {
    const findings = run({ targets: [mikro], network: [], probesAvailable: false, hub: hub({ online: false }) });
    expect(findings[0]).toMatchObject({ id: "hub.offline", severity: "blocker" });
    expect(ids(findings)).toContain("doctor.unavailable");
  });
});

/* ────────────────────────────── upstream hops ─────────────────────────── */

describe("upstream hops", () => {
  const coord = target({ host: "go.arkitekt.live", label: "https://go.arkitekt.live", probePath: ".well-known/fakts", role: "coordination" });
  const control = target({ host: "mesh.arkitekt.live", label: "mesh control https://mesh.arkitekt.live", probePath: null, role: "mesh-control" });
  const mikro = target({ serviceKey: "mikro", role: "service" });
  const dead = (t: ProbeTarget) =>
    probe({
      target: t,
      tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 },
      tls: { attempted: false, ok: false },
      http: { attempted: false, ok: false },
    });
  const answers = (t: ProbeTarget, status = 200) =>
    probe({ target: t, http: { attempted: true, ok: status < 400, status } });
  const ctx = { kind: "service" as const, serviceKey: "mikro", endpointUrl: "https://go.arkitekt.live", meshCoordUrl: "https://mesh.arkitekt.live" };
  const all = (network: NetworkProbeResult[], extra: Partial<DiagnoseInput> = {}) =>
    run({ context: ctx, targets: [coord, control, mikro], network, ...extra });

  it("everything answers: the all-clear still leads", () => {
    expect(ids(all([answers(coord), answers(control, 404), answers(mikro)]))).toEqual(["net.all-clear"]);
  });

  it("an HTTP 404 on the mesh control root is not a finding, and never a service one", () => {
    const findings = all([answers(coord), answers(control, 404), answers(mikro)]);
    expect(ids(findings)).not.toContain("net.http.404");
  });

  it("nothing answers, not even the coordination server: that is the verdict, everything else demoted", () => {
    const findings = all([dead(coord), dead(control), dead(mikro)]);
    expect(findings[0]).toMatchObject({ id: "upstream.coordination.unreachable", severity: "blocker" });
    expect(findings[0].evidence?.[0]).toContain("TCP: ETIMEDOUT 4000ms");
    expect(byId(findings, "net.tcp.timeout")?.severity).toBe("info");
    expect(ids(findings)).not.toContain("net.all-clear");
  });

  it("the services answer but the coordination server does not: a warning, not all clear", () => {
    const findings = all([dead(coord), answers(control), answers(mikro)]);
    expect(findings[0]).toMatchObject({ id: "upstream.coordination.unreachable", severity: "warning" });
    expect(ids(findings)).not.toContain("net.all-clear");
  });

  it("mesh control down while the mesh runs is only a note", () => {
    const findings = all([answers(coord), dead(control), answers(mikro)], {
      sidecar: {
        sidecar: { state: "ready", version: "t" },
        meshes: [{ config: { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: [] }, status: { id: "lab", state: "running", proxyPort: 1 } }],
      } as never,
    });
    expect(ids(findings)).toContain("upstream.mesh-control.unreachable");
    expect(byId(findings, "upstream.mesh-control.unreachable")?.severity).toBe("info");
  });

  it("mesh control down and no mesh up blocks joining", () => {
    const findings = all([answers(coord), dead(control), dead(mikro)]);
    expect(byId(findings, "upstream.mesh-control.unreachable")?.severity).toBe("blocker");
  });

  it("the upstream probes do not count as service addresses for the hub comparison", () => {
    const findings = all([dead(coord), answers(control), dead(mikro)], {
      hub: { name: "lab-hub", online: false, lastSeenAt: "2026-09-23T10:00:00Z", version: "1", services: {} },
    });
    expect(byId(findings, "hub.offline")?.severity).toBe("blocker");
  });
});
