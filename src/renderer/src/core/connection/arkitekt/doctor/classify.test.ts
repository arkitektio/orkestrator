import { describe, expect, it } from "vitest";
import { classifyHost, looksLikeVpn } from "./classify";

describe("classifyHost", () => {
  it.each([
    ["localhost", "loopback"],
    ["app.localhost", "loopback"],
    ["127.0.0.1", "loopback"],
    ["127.1.2.3", "loopback"],
    ["::1", "loopback"],
  ])("%s is loopback", (host, expected) => {
    expect(classifyHost(host).class).toBe(expected);
  });

  it.each([
    ["10.0.0.4", "lan"],
    ["192.168.1.10", "lan"],
    ["172.16.0.1", "lan"],
    ["172.31.255.254", "lan"],
    ["169.254.10.10", "lan"],
    ["printer.local", "lan"],
    ["nas.lan", "lan"],
  ])("%s is lan", (host, expected) => {
    expect(classifyHost(host).class).toBe(expected);
  });

  it("does not mistake 172.32.x for a private range", () => {
    expect(classifyHost("172.32.0.1").class).toBe("public-ip");
  });

  it.each([
    ["100.64.0.1", "vpn-ip"],
    ["100.101.102.103", "vpn-ip"],
    ["100.127.255.255", "vpn-ip"],
    ["fd7a:115c:a1e0::1", "vpn-ip"],
  ])("%s is an address on some VPN, which the string cannot tell from the mesh", (host, expected) => {
    expect(classifyHost(host).class).toBe(expected);
  });

  it("does not treat 100.63 or 100.128 as CGNAT", () => {
    expect(classifyHost("100.63.0.1").class).toBe("public-ip");
    expect(classifyHost("100.128.0.1").class).toBe("public-ip");
  });

  it("takes a MagicDNS name for any other name", () => {
    const result = classifyHost("mikro.tailnet-cafe.ts.net");
    expect(result.class).toBe("public-dns");
  });

  it("treats a single label as a bare name: docker, the LAN, some short name", () => {
    expect(classifyHost("bigmachine").class).toBe("bare");
  });

  it.each([
    ["go.arkitekt.live", "public-dns"],
    ["example.com", "public-dns"],
    ["8.8.8.8", "public-ip"],
    ["2606:4700::1111", "public-ip"],
  ])("%s is public", (host, expected) => {
    expect(classifyHost(host).class).toBe(expected);
  });

  it("normalises case, trailing dots and brackets", () => {
    expect(classifyHost("MIKRO.Tailnet.TS.NET.").class).toBe("public-dns");
    expect(classifyHost("[::1]").class).toBe("loopback");
    expect(classifyHost("  localhost  ").class).toBe("loopback");
  });

  it("treats an empty host as public rather than throwing", () => {
    expect(classifyHost("").class).toBe("public-dns");
  });
});

describe("looksLikeVpn", () => {
  it("is a VPN-range address or a *.ts.net name: a network of the computer's own, never the mesh", () => {
    expect(looksLikeVpn("100.64.0.1")).toBe(true);
    expect(looksLikeVpn("fd7a:115c:a1e0::1")).toBe(true);
    expect(looksLikeVpn("Host.TS.net.")).toBe(true);
    expect(looksLikeVpn("bare")).toBe(false);
    expect(looksLikeVpn("10.0.0.1")).toBe(false);
    expect(looksLikeVpn("localhost")).toBe(false);
    expect(looksLikeVpn("go.arkitekt.live")).toBe(false);
  });

});
