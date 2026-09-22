import { describe, expect, it } from "vitest";
import type { MeshProbeResult } from "../../../../../main/doctor/protocol";
import { matchPeer, tailnetMismatch } from "./meshMatch";

const mesh: MeshProbeResult = {
  vendor: "tailscale",
  available: true,
  backendState: "Running",
  magicDnsSuffix: "tailnet-cafe.ts.net",
  tailnetName: "tailnet-cafe.ts.net",
  self: {
    dnsName: "laptop.tailnet-cafe.ts.net.",
    hostName: "laptop",
    ips: ["100.64.0.1"],
    online: true,
  },
  peers: [
    {
      dnsName: "mikro.tailnet-cafe.ts.net.",
      hostName: "mikro-server",
      ips: ["100.64.0.2", "fd7a:115c:a1e0::2"],
      online: false,
      expired: false,
    },
    {
      dnsName: "rekuest.tailnet-cafe.ts.net.",
      hostName: "rekuest",
      ips: ["100.64.0.3"],
      online: true,
      expired: true,
    },
  ],
};

describe("matchPeer", () => {
  it("matches the full MagicDNS name despite the trailing dot", () => {
    expect(matchPeer("mikro.tailnet-cafe.ts.net", mesh)?.hostName).toBe("mikro-server");
  });

  it("matches the short label", () => {
    expect(matchPeer("mikro", mesh)?.hostName).toBe("mikro-server");
  });

  it("matches the OS hostname", () => {
    expect(matchPeer("mikro-server", mesh)?.hostName).toBe("mikro-server");
  });

  it("matches either IP family", () => {
    expect(matchPeer("100.64.0.2", mesh)?.hostName).toBe("mikro-server");
    expect(matchPeer("fd7a:115c:a1e0::2", mesh)?.hostName).toBe("mikro-server");
  });

  it("finds self as well as peers", () => {
    expect(matchPeer("laptop", mesh)?.hostName).toBe("laptop");
  });

  it("is case insensitive", () => {
    expect(matchPeer("MIKRO.Tailnet-Cafe.TS.NET.", mesh)?.hostName).toBe("mikro-server");
  });

  it("returns undefined for an unknown host, or no mesh", () => {
    expect(matchPeer("ghost.tailnet-cafe.ts.net", mesh)).toBeUndefined();
    expect(matchPeer("mikro", undefined)).toBeUndefined();
    expect(
      matchPeer("mikro", { vendor: "tailscale", available: false, reason: "cli-not-found" }),
    ).toBeUndefined();
  });
});

describe("tailnetMismatch", () => {
  it("reports a MagicDNS name from another tailnet", () => {
    expect(tailnetMismatch("mikro.other-net.ts.net", mesh)).toEqual({
      host: "other-net.ts.net",
      expected: "tailnet-cafe.ts.net",
    });
  });

  it("is silent when the suffix matches", () => {
    expect(tailnetMismatch("mikro.tailnet-cafe.ts.net.", mesh)).toBeUndefined();
  });

  it("refuses to guess from a bare label or a 100.x address", () => {
    expect(tailnetMismatch("mikro", mesh)).toBeUndefined();
    expect(tailnetMismatch("100.64.0.2", mesh)).toBeUndefined();
  });

  it("is silent when the mesh is unavailable", () => {
    expect(
      tailnetMismatch("mikro.other.ts.net", {
        vendor: "tailscale",
        available: false,
        reason: "cli-not-found",
      }),
    ).toBeUndefined();
  });
});
