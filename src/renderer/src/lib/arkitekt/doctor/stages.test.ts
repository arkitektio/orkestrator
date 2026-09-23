import { describe, expect, it } from "vitest";
import type { NetworkProbeResult } from "../../../../../main/doctor/protocol";
import { failureLine, stageOf } from "./stages";

const probe = (overrides: Partial<NetworkProbeResult> = {}): NetworkProbeResult => ({
  target: { host: "mikro.example", ssl: true, label: "mikro" },
  url: "https://mikro.example/ht",
  dns: { ok: true, lookupAddresses: ["10.0.0.2"], resolveAddresses: ["10.0.0.2"] },
  tcp: { attempted: true, ok: true, ms: 12 },
  tls: { attempted: true, ok: true },
  http: { attempted: true, ok: true, status: 200 },
  totalMs: 40,
  ...overrides,
});

describe("stageOf", () => {
  it("reads a request that got through", () => {
    const result = stageOf(probe());
    expect(result.route).toBe("direct");
    expect(result.firstFailure).toBeUndefined();
    expect(result.stages).toEqual({
      dns: { state: "ok", detail: "10.0.0.2" },
      tcp: { state: "ok", detail: "12ms" },
      tls: { state: "ok", detail: "valid" },
      http: { state: "ok", detail: "HTTP 200" },
    });
  });

  it("names the first stage that stopped, and skips the rest", () => {
    const result = stageOf(
      probe({
        tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 },
        tls: { attempted: false, ok: false },
        http: { attempted: false, ok: false },
      }),
    );
    expect(result.firstFailure).toBe("tcp");
    expect(result.stages.tcp.detail).toBe("ETIMEDOUT 4000ms");
    expect(result.stages.tls.state).toBe("skipped");
    expect(result.stages.http.state).toBe("skipped");
  });

  it("marks a name only the OS resolver knows", () => {
    expect(stageOf(probe({ dns: { ok: true, lookupAddresses: ["100.64.0.2"], resolveAddresses: [] } })).stages.dns.detail).toBe(
      "100.64.0.2 (OS only)",
    );
  });

  it("fails DNS with its code", () => {
    const result = stageOf(probe({ dns: { ok: false, lookupAddresses: [], resolveAddresses: [], code: "ENOTFOUND" } }));
    expect(result.firstFailure).toBe("dns");
    expect(result.stages.dns.detail).toBe("ENOTFOUND");
  });

  it("reads a probe that went through the mesh proxy", () => {
    const result = stageOf(probe({ viaMeshProxy: 1080, dns: { ok: true, skipped: true, lookupAddresses: [], resolveAddresses: [] } }));
    expect(result.route).toBe("mesh");
    expect(result.stages.dns).toEqual({ state: "skipped", detail: "via mesh" });
    expect(result.stages.tls).toEqual({ state: "skipped", detail: "mesh tunnel" });
  });

  it("passes a self-signed certificate but says so, and fails an expired one", () => {
    expect(stageOf(probe({ tls: { attempted: true, ok: false, selfSigned: true } })).stages.tls).toEqual({ state: "ok", detail: "self-signed" });
    expect(stageOf(probe({ tls: { attempted: true, ok: false, expired: true } })).firstFailure).toBe("tls");
  });

  it("fails HTTP on a bad status", () => {
    expect(failureLine(probe({ http: { attempted: true, ok: false, status: 404 } }))).toBe("HTTP 404");
    expect(failureLine(probe())).toBeUndefined();
  });
});
