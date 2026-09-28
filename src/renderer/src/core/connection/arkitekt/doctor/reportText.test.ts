import { describe, expect, it } from "vitest";
import type { NetworkProbeResult, ProbeTarget } from "../../../../../../main/doctor/protocol";
import { diagnose } from "./diagnose";
import type { DoctorContext, DoctorReport } from "./findings";
import type { HubHealthFacts } from "./hubHealth";
import { formatReport } from "./reportText";

const NOW = Date.parse("2026-09-23T10:20:00Z");
const coord: ProbeTarget = { host: "go.arkitekt.live", ssl: true, probePath: ".well-known/fakts", label: "https://go.arkitekt.live", role: "coordination" };
const mikro: ProbeTarget = { host: "mikro.example.org", ssl: true, label: "mikro", serviceKey: "mikro", role: "service" };

const probe = (target: ProbeTarget, answered: boolean): NetworkProbeResult => ({
  target,
  url: `https://${target.host}/`,
  dns: { ok: true, lookupAddresses: ["10.0.0.2"], resolveAddresses: ["10.0.0.2"] },
  tcp: answered ? { attempted: true, ok: true, ms: 10 } : { attempted: true, ok: false, code: "ECONNREFUSED", ms: 3 },
  tls: answered ? { attempted: true, ok: true } : { attempted: false, ok: false },
  http: answered ? { attempted: true, ok: true, status: 200 } : { attempted: false, ok: false },
  totalMs: 20,
});

const hub: HubHealthFacts = {
  name: "lab-hub",
  online: true,
  lastSeenAt: "2026-09-23T10:00:00Z",
  version: "1.4.0",
  services: { mikro: { healthy: false, reason: "database unreachable" } },
};

const context: DoctorContext = { kind: "service", serviceKey: "mikro", endpointUrl: "https://go.arkitekt.live" };
const targets = [coord, mikro];
const network = [probe(coord, true), probe(mikro, false)];

const report: DoctorReport = {
  startedAt: NOW,
  durationMs: 1500,
  context,
  targets,
  network,
  hub,
  lok: { status: "ok", hub },
  findings: diagnose({ context, targets, network, hub }),
};

describe("formatReport", () => {
  const text = formatReport(report, { now: NOW, appVersion: "2.3.0" });

  it("heads with when, which app and what was diagnosed", () => {
    expect(text).toContain("checked: 2026-09-23T10:20:00.000Z (1.5s)");
    expect(text).toContain("app: 2.3.0");
    expect(text).toContain("coordination server: https://go.arkitekt.live");
    expect(text).toContain("service: mikro");
  });

  it("states the verdict with its id", () => {
    expect(text).toContain("Verdict: lab-hub reports mikro as down [hub.instance-unhealthy]");
  });

  it("draws the path with the break marked", () => {
    expect(text).toMatch(/\[FAIL\] mikro — hub: unhealthy \(database unreachable\) · here: TCP: ECONNREFUSED 3ms {3}<- breaks here/);
    expect(text).toContain("[ok  ] Coordination server go.arkitekt.live — answered · lok answered");
  });

  it("lists every address stage by stage", () => {
    expect(text).toContain("mikro [direct] https://mikro.example.org/");
    expect(text).toContain("DNS ok (10.0.0.2) | TCP FAIL (ECONNREFUSED 3ms) | TLS - | HTTP -");
  });

  it("includes the hub's own report", () => {
    expect(text).toContain("Hub report (lab-hub):");
    expect(text).toContain("mikro: unhealthy — database unreachable");
  });

  it("says why there is no hub report when there is none", () => {
    expect(formatReport({ ...report, hub: undefined, lok: { status: "timeout" } }, { now: NOW })).toContain(
      "Hub report: none (timeout)",
    );
  });
});
