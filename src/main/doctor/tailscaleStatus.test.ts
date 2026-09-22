import { describe, expect, it } from "vitest";
import { parseTailscaleStatus } from "./tailscaleStatus";

/** Trimmed to the fields we read, in the shape the real CLI emits. */
const RUNNING = JSON.stringify({
  Version: "1.72.0",
  BackendState: "Running",
  MagicDNSSuffix: "tailnet-cafe.ts.net",
  CurrentTailnet: { Name: "tailnet-cafe.ts.net", MagicDNSSuffix: "tailnet-cafe.ts.net" },
  Self: {
    ID: "n1",
    DNSName: "laptop.tailnet-cafe.ts.net.",
    HostName: "laptop",
    TailscaleIPs: ["100.64.0.1", "fd7a:115c:a1e0::1"],
    Online: true,
    OS: "macOS",
  },
  Peer: {
    "pk:abc": {
      ID: "n2",
      DNSName: "mikro.tailnet-cafe.ts.net.",
      HostName: "mikro-server",
      TailscaleIPs: ["100.64.0.2"],
      Online: false,
      Expired: false,
      LastSeen: "2026-09-21T10:00:00Z",
      KeyExpiry: "2026-12-01T00:00:00Z",
    },
    "pk:def": {
      ID: "n3",
      DNSName: "rekuest.tailnet-cafe.ts.net.",
      HostName: "rekuest",
      TailscaleIPs: ["100.64.0.3"],
      Online: true,
      Expired: true,
    },
  },
});

describe("parseTailscaleStatus", () => {
  it("reads a healthy running tailnet", () => {
    const result = parseTailscaleStatus(RUNNING);
    if (!result.available) throw new Error("expected available");

    expect(result.backendState).toBe("Running");
    expect(result.magicDnsSuffix).toBe("tailnet-cafe.ts.net");
    expect(result.tailnetName).toBe("tailnet-cafe.ts.net");
    expect(result.self?.hostName).toBe("laptop");
    expect(result.self?.ips).toEqual(["100.64.0.1", "fd7a:115c:a1e0::1"]);
    expect(result.peers).toHaveLength(2);
  });

  it("keeps each peer's online and expiry state apart", () => {
    const result = parseTailscaleStatus(RUNNING);
    if (!result.available) throw new Error("expected available");

    const mikro = result.peers.find((peer) => peer.hostName === "mikro-server");
    expect(mikro?.online).toBe(false);
    expect(mikro?.expired).toBe(false);
    expect(mikro?.lastSeen).toBe("2026-09-21T10:00:00Z");

    const rekuest = result.peers.find((peer) => peer.hostName === "rekuest");
    expect(rekuest?.expired).toBe(true);
  });

  it("reads a signed-out daemon", () => {
    const result = parseTailscaleStatus(
      JSON.stringify({ BackendState: "NeedsLogin", Peer: null, Self: null }),
    );
    if (!result.available) throw new Error("expected available");
    expect(result.backendState).toBe("NeedsLogin");
    expect(result.peers).toEqual([]);
    expect(result.self).toBeUndefined();
  });

  it("reads a stopped daemon", () => {
    const result = parseTailscaleStatus(JSON.stringify({ BackendState: "Stopped" }));
    if (!result.available) throw new Error("expected available");
    expect(result.backendState).toBe("Stopped");
  });

  it("falls back to the older tailnet spelling", () => {
    const result = parseTailscaleStatus(
      JSON.stringify({
        BackendState: "Running",
        CurrentTailnet: { MagicDNSSuffix: "old-style.ts.net" },
      }),
    );
    if (!result.available) throw new Error("expected available");
    expect(result.tailnetName).toBe("old-style.ts.net");
  });

  it("never invents an outage when BackendState is missing", () => {
    const result = parseTailscaleStatus(JSON.stringify({ MagicDNSSuffix: "x.ts.net" }));
    if (!result.available) throw new Error("expected available");
    expect(result.backendState).toBe("NoState");
  });

  it("survives truncated or garbage output rather than throwing", () => {
    for (const raw of ['{"BackendState": "Run', "", "not json at all", "null", "[1,2,3]"]) {
      const result = parseTailscaleStatus(raw);
      expect(result.available).toBe(false);
      if (result.available) throw new Error("unreachable");
      expect(result.reason).toBe("cli-failed");
    }
  });

  it("ignores peers that are not objects instead of failing the whole parse", () => {
    const result = parseTailscaleStatus(
      JSON.stringify({
        BackendState: "Running",
        Peer: { a: null, b: "nonsense", c: { HostName: "real", TailscaleIPs: ["100.64.0.9"] } },
      }),
    );
    if (!result.available) throw new Error("expected available");
    expect(result.peers).toHaveLength(1);
    expect(result.peers[0].hostName).toBe("real");
  });

  it("tolerates unexpected field types", () => {
    const result = parseTailscaleStatus(
      JSON.stringify({
        BackendState: 42,
        MagicDNSSuffix: null,
        Self: { HostName: 7, TailscaleIPs: "not-an-array", Online: "yes" },
      }),
    );
    if (!result.available) throw new Error("expected available");
    expect(result.backendState).toBe("NoState");
    expect(result.magicDnsSuffix).toBeUndefined();
    expect(result.self?.hostName).toBeUndefined();
    expect(result.self?.ips).toEqual([]);
    expect(result.self?.online).toBeUndefined();
  });
});
