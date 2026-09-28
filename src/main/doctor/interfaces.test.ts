import type { NetworkInterfaceInfo } from "node:os";
import { describe, expect, it } from "vitest";

import { findVpnInterfaces } from "./interfaces";

const v4 = (address: string, internal = false): NetworkInterfaceInfo => ({
  address,
  family: "IPv4",
  internal,
  netmask: "255.255.255.0",
  mac: "00:00:00:00:00:00",
  cidr: `${address}/24`,
});
const v6 = (address: string): NetworkInterfaceInfo => ({
  address,
  family: "IPv6",
  internal: false,
  netmask: "ffff:ffff:ffff:ffff::",
  mac: "00:00:00:00:00:00",
  cidr: `${address}/64`,
  scopeid: 0,
});

describe("findVpnInterfaces", () => {
  it("ignores macOS's own utun interfaces, which carry only link-local IPv6", () => {
    expect(findVpnInterfaces({ utun0: [v6("fe80::1")], utun1: [v6("fe80::2")], en0: [v4("192.168.1.4")] })).toEqual([]);
  });

  it("recognises a system Tailscale by its 100.64/10 address", () => {
    expect(findVpnInterfaces({ utun4: [v4("100.101.7.3"), v6("fd7a:115c:a1e0::1")] })).toEqual([
      { name: "utun4", addresses: ["100.101.7.3"], kind: "tailscale" },
    ]);
  });

  it("recognises WireGuard by name", () => {
    expect(findVpnInterfaces({ wg0: [v4("10.8.0.2")] })).toEqual([
      { name: "wg0", addresses: ["10.8.0.2"], kind: "wireguard" },
    ]);
  });

  it("recognises a Windows adapter named after its VPN", () => {
    expect(findVpnInterfaces({ "OpenVPN TAP-Windows6": [v4("10.9.0.6")] })).toEqual([
      { name: "OpenVPN TAP-Windows6", addresses: ["10.9.0.6"], kind: "vpn" },
    ]);
  });

  it("drops link-local and loopback addresses", () => {
    expect(findVpnInterfaces({ tun0: [v4("169.254.3.3")], lo0: [v4("127.0.0.1", true)] })).toEqual([]);
  });
});
