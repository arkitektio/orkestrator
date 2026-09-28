import { describe, expect, it } from "vitest";
import { anyMeshHost, classifyHost, isMeshClass } from "./classify";

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
    ["100.64.0.1", "mesh-ip"],
    ["100.101.102.103", "mesh-ip"],
    ["100.127.255.255", "mesh-ip"],
    ["fd7a:115c:a1e0::1", "mesh-ip"],
  ])("%s is a tailnet IP", (host, expected) => {
    const result = classifyHost(host);
    expect(result.class).toBe(expected);
    expect(result.meshVendor).toBe("tailscale");
  });

  it("does not treat 100.63 or 100.128 as CGNAT", () => {
    expect(classifyHost("100.63.0.1").class).toBe("public-ip");
    expect(classifyHost("100.128.0.1").class).toBe("public-ip");
  });

  it("recognises MagicDNS names", () => {
    const result = classifyHost("mikro.tailnet-cafe.ts.net");
    expect(result.class).toBe("mesh-magicdns");
    expect(result.meshVendor).toBe("tailscale");
  });

  it("treats a single label as a bare mesh name", () => {
    const result = classifyHost("bigmachine");
    expect(result.class).toBe("mesh-bare");
    expect(result.meshVendor).toBe("tailscale");
  });

  it.each([
    ["go.arkitekt.live", "public-dns"],
    ["example.com", "public-dns"],
    ["8.8.8.8", "public-ip"],
    ["2606:4700::1111", "public-ip"],
  ])("%s is public", (host, expected) => {
    expect(classifyHost(host).class).toBe(expected);
    expect(classifyHost(host).meshVendor).toBeUndefined();
  });

  it("normalises case, trailing dots and brackets", () => {
    expect(classifyHost("MIKRO.Tailnet.TS.NET.").class).toBe("mesh-magicdns");
    expect(classifyHost("[::1]").class).toBe("loopback");
    expect(classifyHost("  localhost  ").class).toBe("loopback");
  });

  it("treats an empty host as public rather than throwing", () => {
    expect(classifyHost("").class).toBe("public-dns");
  });
});

describe("isMeshClass / anyMeshHost", () => {
  it("only the three mesh classes count", () => {
    expect(isMeshClass(classifyHost("100.64.0.1"))).toBe(true);
    expect(isMeshClass(classifyHost("host.ts.net"))).toBe(true);
    expect(isMeshClass(classifyHost("bare"))).toBe(true);
    expect(isMeshClass(classifyHost("10.0.0.1"))).toBe(false);
    expect(isMeshClass(classifyHost("localhost"))).toBe(false);
    expect(isMeshClass(classifyHost("go.arkitekt.live"))).toBe(false);
  });

  it("anyMeshHost finds one mesh address among many", () => {
    expect(anyMeshHost(["go.arkitekt.live", "10.0.0.1"])).toBe(false);
    expect(anyMeshHost(["go.arkitekt.live", "mikro.tailnet.ts.net"])).toBe(true);
  });
});
