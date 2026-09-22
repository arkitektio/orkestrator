import { describe, expect, it } from "vitest";
import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeTarget,
} from "../../../../../main/doctor/protocol";
import { diagnose } from "./diagnose";
import type { DiagnoseInput, Finding } from "./findings";

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

const runningMesh = (overrides: Partial<Extract<MeshProbeResult, { available: true }>> = {}): MeshProbeResult => ({
  vendor: "tailscale",
  available: true,
  backendState: "Running",
  magicDnsSuffix: "tailnet-cafe.ts.net",
  tailnetName: "tailnet-cafe.ts.net",
  self: { dnsName: "laptop.tailnet-cafe.ts.net.", hostName: "laptop", ips: ["100.64.0.1"], online: true },
  peers: [
    {
      dnsName: "mikro.tailnet-cafe.ts.net.",
      hostName: "mikro",
      ips: ["100.64.0.2"],
      online: true,
      expired: false,
    },
  ],
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

/* ────────────────────────────── mesh rules ────────────────────────────── */

describe("mesh findings", () => {
  it("signed out of Tailscale is a blocker with a runnable remedy", () => {
    const findings = run({
      mesh: runningMesh({ backendState: "NeedsLogin" }),
      network: [probe({ tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 }, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } })],
    });

    const finding = byId(findings, "mesh.needs-login");
    expect(finding?.severity).toBe("blocker");
    expect(finding?.remedy).toEqual({
      kind: "run",
      label: "Sign in to Tailscale",
      id: "tailscale.up",
      confirm: "tailscale up",
    });
    // and it comes first, above its own symptom
    expect(findings[0].id).toBe("mesh.needs-login");
  });

  it("a stopped daemon reports not-running, not needs-login", () => {
    expect(ids(run({ mesh: runningMesh({ backendState: "Stopped" }) }))).toContain(
      "mesh.not-running",
    );
  });

  it("a missing CLI is only reported when an address is actually mesh-like", () => {
    const missing: MeshProbeResult = { vendor: "tailscale", available: false, reason: "cli-not-found" };

    expect(ids(run({ mesh: missing }))).toContain("mesh.cli-missing");

    const publicTarget = target({ host: "go.arkitekt.live", label: "lok" });
    expect(
      ids(run({ mesh: missing, targets: [publicTarget], network: [probe({ target: publicTarget })] })),
    ).not.toContain("mesh.cli-missing");
  });

  it("points at the download page when the CLI is missing", () => {
    const findings = run({
      mesh: { vendor: "tailscale", available: false, reason: "cli-not-found" },
    });
    expect(byId(findings, "mesh.cli-missing")?.remedy).toMatchObject({ kind: "open-url" });
  });

  it("a CLI that fails to answer is a warning, not a blocker", () => {
    const findings = run({
      mesh: { vendor: "tailscale", available: false, reason: "cli-failed", detail: "exit 1" },
    });
    expect(byId(findings, "mesh.cli-failed")?.severity).toBe("warning");
  });

  it("detects the wrong tailnet and does not also claim the peer is unknown", () => {
    const other = target({ host: "mikro.other-net.ts.net" });
    const findings = run({
      mesh: runningMesh(),
      targets: [other],
      network: [probe({ target: other })],
    });
    expect(ids(findings)).toContain("mesh.wrong-tailnet");
    expect(ids(findings)).not.toContain("mesh.peer-unknown");
    expect(byId(findings, "mesh.wrong-tailnet")?.detail).toContain("other-net.ts.net");
  });

  it("reports an offline machine", () => {
    const mesh = runningMesh({
      peers: [{ dnsName: "mikro.tailnet-cafe.ts.net.", hostName: "mikro", ips: ["100.64.0.2"], online: false, lastSeen: "2026-09-21T10:00:00Z" }],
    });
    const finding = byId(run({ mesh }), "mesh.peer-offline");
    expect(finding?.severity).toBe("blocker");
    expect(finding?.evidence?.[0]).toContain("2026-09-21");
  });

  it("reports an expired key ahead of offline", () => {
    const mesh = runningMesh({
      peers: [{ dnsName: "mikro.tailnet-cafe.ts.net.", hostName: "mikro", ips: ["100.64.0.2"], online: false, expired: true, keyExpiry: "2026-09-01" }],
    });
    const findings = run({ mesh });
    expect(ids(findings)).toContain("mesh.peer-key-expired");
    expect(ids(findings)).not.toContain("mesh.peer-offline");
  });

  it("reports an unknown machine when signed in to a tailnet that lacks it", () => {
    const ghost = target({ host: "ghost" });
    expect(
      ids(run({ mesh: runningMesh(), targets: [ghost], network: [probe({ target: ghost })] })),
    ).toContain("mesh.peer-unknown");
  });

  it("says the mesh is healthy when it is, so the report is never empty-handed", () => {
    const findings = run({
      mesh: runningMesh(),
      network: [probe({ tcp: { attempted: true, ok: false, code: "ECONNREFUSED", ms: 3 }, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } })],
    });
    expect(ids(findings)).toContain("mesh.healthy");
    expect(byId(findings, "mesh.healthy")?.severity).toBe("info");
  });

  it("does not claim health when a mesh problem was already found", () => {
    expect(ids(run({ mesh: runningMesh({ backendState: "NeedsLogin" }) }))).not.toContain(
      "mesh.healthy",
    );
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

  it("public DNS resolves but the OS does not, with Tailscale up: a blocker with a copyable fix", () => {
    const findings = run({
      mesh: runningMesh(),
      network: [dnsProbe({ ok: false, lookupAddresses: [], resolveAddresses: ["1.2.3.4"], lookupError: "ENOTFOUND" })],
    });
    const finding = byId(findings, "net.dns.os-resolver-bypassed");
    expect(finding?.severity).toBe("blocker");
    expect(finding?.remedy).toMatchObject({ kind: "copy", value: "tailscale up --accept-dns" });
  });

  it("the same asymmetry without Tailscale is only a warning", () => {
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
    const finding = byId(run({ network: [tcpProbe({ attempted: true, ok: false, code: "ECONNREFUSED", ms: 4 })] }), "net.tcp.refused");
    expect(finding?.severity).toBe("blocker");
    expect(finding?.title).toContain("nothing is listening on port 443");
    expect(finding?.remedy).toMatchObject({ kind: "copy" });
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
    const findings = run({
      mesh: runningMesh({ backendState: "NeedsLogin" }),
      network: [
        probe({ tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 }, tls: { attempted: false, ok: false }, http: { attempted: false, ok: false } }),
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
      mesh: runningMesh(),
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
    const findings = run({ probesAvailable: false, network: [] });
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
