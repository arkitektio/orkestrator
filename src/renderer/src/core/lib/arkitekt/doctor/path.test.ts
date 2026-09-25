import { describe, expect, it } from "vitest";
import type { MeshProbeResult, NetworkProbeResult, ProbeTarget } from "../../../../../../main/doctor/protocol";
import type { MeshStatusPayload } from "../../../../../../main/mesh/protocol";
import { diagnose } from "./diagnose";
import type { DoctorContext, DoctorReport } from "./findings";
import type { HubHealthFacts } from "./hubHealth";
import { breakingHop, buildConnectionPath, type PathHop } from "./path";

const NOW = Date.parse("2026-09-23T10:20:00Z");

const coord: ProbeTarget = { host: "go.arkitekt.live", ssl: true, probePath: ".well-known/fakts", label: "https://go.arkitekt.live", role: "coordination" };
const mikro: ProbeTarget = { host: "mikro.tailnet-cafe.ts.net", ssl: true, label: "mikro", serviceKey: "mikro", role: "service" };
const rekuest: ProbeTarget = { host: "rekuest.tailnet-cafe.ts.net", ssl: true, label: "rekuest", serviceKey: "rekuest", role: "service" };

const ok = (target: ProbeTarget): NetworkProbeResult => ({
  target,
  url: `https://${target.host}/`,
  dns: { ok: true, lookupAddresses: ["100.64.0.2"], resolveAddresses: ["100.64.0.2"] },
  tcp: { attempted: true, ok: true, ms: 10 },
  tls: { attempted: true, ok: true },
  http: { attempted: true, ok: true, status: 200 },
  totalMs: 30,
});

const dead = (target: ProbeTarget): NetworkProbeResult => ({
  ...ok(target),
  tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 },
  tls: { attempted: false, ok: false },
  http: { attempted: false, ok: false },
});

const tailscale = (backendState = "Running"): MeshProbeResult => ({
  vendor: "tailscale",
  available: true,
  backendState,
  magicDnsSuffix: "tailnet-cafe.ts.net",
  tailnetName: "tailnet-cafe.ts.net",
  self: { dnsName: "laptop.tailnet-cafe.ts.net.", hostName: "laptop", ips: ["100.64.0.1"], online: true },
  peers: [
    { dnsName: "mikro.tailnet-cafe.ts.net.", hostName: "mikro", ips: ["100.64.0.2"], online: true, expired: false },
    { dnsName: "rekuest.tailnet-cafe.ts.net.", hostName: "rekuest", ips: ["100.64.0.3"], online: true, expired: false },
  ],
});

const hub = (overrides: Partial<HubHealthFacts> = {}): HubHealthFacts => ({
  name: "lab-hub",
  online: true,
  lastSeenAt: "2026-09-23T10:00:00Z",
  version: "1.4.0",
  meshConnected: true,
  meshHost: "lab-hub.tailnet-cafe.ts.net",
  services: { mikro: { healthy: true }, rekuest: { healthy: true } },
  ...overrides,
});

const context: DoctorContext = { kind: "service", serviceKey: "all", endpointUrl: "https://go.arkitekt.live" };

/** A report exactly as the hook builds it: the findings come from `diagnose`. */
const reportFor = ({
  targets = [coord, mikro, rekuest],
  network,
  mesh = tailscale(),
  sidecar,
  facts,
  ctx = context,
}: {
  targets?: ProbeTarget[];
  network: NetworkProbeResult[];
  mesh?: MeshProbeResult;
  sidecar?: MeshStatusPayload;
  facts?: HubHealthFacts;
  ctx?: DoctorContext;
}): DoctorReport => ({
  startedAt: NOW,
  durationMs: 1200,
  context: ctx,
  targets,
  network,
  mesh,
  sidecar,
  hub: facts,
  lok: facts ? { status: "ok", hub: facts } : { status: "not-available" },
  findings: diagnose({ context: ctx, targets, network, mesh, sidecar, hub: facts }),
});

const hopById = (hops: PathHop[], id: string): PathHop | undefined =>
  hops.flatMap((hop) => [hop, ...(hop.children ?? [])]).find((hop) => hop.id === id);

describe("buildConnectionPath", () => {
  it("everything works: every hop ok, nothing breaks", () => {
    const hops = buildConnectionPath(reportFor({ network: [ok(coord), ok(mikro), ok(rekuest)], facts: hub() }), NOW);
    expect(hops.map((hop) => hop.id)).toEqual(["computer", "coordination", "mesh", "hub"]);
    expect(hops.map((hop) => hop.state)).toEqual(["ok", "ok", "ok", "ok"]);
    expect(hops[3].children?.map((child) => child.id)).toEqual(["service:mikro", "service:rekuest"]);
    expect(hops[3].summary).toContain("last report 20 minutes ago");
    expect(hops[3].summary).toContain("on the mesh as lab-hub.tailnet-cafe.ts.net");
    expect(breakingHop(hops)).toBeUndefined();
  });

  it("the coordination server does not answer: it breaks there, before the hub", () => {
    const hops = buildConnectionPath(reportFor({ network: [dead(coord), dead(mikro), dead(rekuest)], facts: hub() }), NOW);
    expect(breakingHop(hops)?.id).toBe("coordination");
    expect(hopById(hops, "coordination")?.summary).toContain("TCP: ETIMEDOUT 4000ms");
    expect(hopById(hops, "coordination")?.findings.map((finding) => finding.id)).toContain("upstream.coordination.unreachable");
  });

  it("signed out of Tailscale: the mesh breaks, and carries the finding", () => {
    const hops = buildConnectionPath(
      reportFor({ network: [ok(coord), dead(mikro), dead(rekuest)], mesh: tailscale("NeedsLogin"), facts: hub() }),
      NOW,
    );
    expect(breakingHop(hops)?.id).toBe("mesh");
    expect(hopById(hops, "mesh")?.findings.map((finding) => finding.id)).toContain("mesh.needs-login");
  });

  it("the hub has gone quiet: it breaks at the hub", () => {
    const hops = buildConnectionPath(
      reportFor({ network: [ok(coord), dead(mikro), dead(rekuest)], facts: hub({ online: false }) }),
      NOW,
    );
    expect(breakingHop(hops)?.id).toBe("hub");
    expect(hopById(hops, "hub")?.summary).toContain("not reporting");
  });

  it("one service the hub sees running does not answer: it breaks at that service", () => {
    const hops = buildConnectionPath(reportFor({ network: [ok(coord), dead(mikro), ok(rekuest)], facts: hub() }), NOW);
    const broken = breakingHop(hops);
    expect(broken?.id).toBe("service:mikro");
    expect(broken?.summary).toBe("hub: healthy · here: TCP: ETIMEDOUT 4000ms");
    expect(broken?.findings.map((finding) => finding.id)).toContain("hub.healthy-client-fails");
    expect(hopById(hops, "service:rekuest")?.state).toBe("ok");
  });

  it("no hub report: the hub hop says why it cannot tell", () => {
    const hops = buildConnectionPath(reportFor({ network: [ok(coord), ok(mikro), ok(rekuest)] }), NOW);
    expect(hopById(hops, "hub")).toMatchObject({ state: "unknown", summary: "sign in to see what the hub reports about itself" });
  });

  it("a public deployment with no mesh has no mesh hop", () => {
    const api: ProbeTarget = { host: "mikro.example.org", ssl: true, label: "mikro", serviceKey: "mikro", role: "service" };
    const hops = buildConnectionPath(reportFor({ targets: [coord, api], network: [ok(coord), ok(api)], mesh: undefined }), NOW);
    expect(hops.map((hop) => hop.id)).toEqual(["computer", "coordination", "hub"]);
  });

  it("the built-in mesh: running with its machine count", () => {
    const sidecar: MeshStatusPayload = {
      sidecar: { state: "ready", version: "t" },
      meshes: [
        {
          config: { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: [], hasNodeState: true },
          status: {
            id: "lab",
            state: "running",
            magicDnsSuffix: "tailnet-cafe.ts.net",
            peers: [
              { dnsName: "lab-hub.tailnet-cafe.ts.net", ips: ["100.64.0.9"], online: true, relay: "fra" },
              { dnsName: "old.tailnet-cafe.ts.net", ips: ["100.64.0.8"], online: false },
            ],
          },
        },
      ],
    };
    const hops = buildConnectionPath(
      reportFor({
        network: [ok(coord), ok(mikro), ok(rekuest)],
        mesh: undefined,
        sidecar,
        facts: hub(),
        ctx: { ...context, profileMesh: { id: "lab", enabled: true } },
      }),
      NOW,
    );
    expect(hopById(hops, "mesh")?.summary).toBe("built-in mesh running · 1 of 2 machines online");
    expect(hopById(hops, "hub")?.summary).toContain("peer online");
    expect(hopById(hops, "hub")?.summary).toContain("relayed via fra");
  });

  it("discovery mode: just this computer and the coordination server", () => {
    const target: ProbeTarget = { host: "go.arkitekt.live", ssl: true, probePath: ".well-known/fakts", label: "https" };
    const hops = buildConnectionPath(
      reportFor({ targets: [target], network: [dead(target)], ctx: { kind: "discovery", endpointUrl: "go.arkitekt.live" } }),
      NOW,
    );
    expect(hops.map((hop) => hop.id)).toEqual(["computer", "coordination"]);
    expect(breakingHop(hops)?.id).toBe("coordination");
    expect(hopById(hops, "coordination")?.findings.length).toBeGreaterThan(0);
  });
});
