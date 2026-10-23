import { describe, expect, it } from "vitest";

import { allowsBadCertificate, normalizeHost, parseHosts, verifyResult } from "./policy";

const AUTHORITY_INVALID = -202;
const REVOKED = -206;

describe("certificate policy", () => {
  const trusted = new Set(["lab.local", "192.168.1.20", "go.arkitekt.live", "::1"]);

  it("accepts a self-signed certificate from a fakts host", () => {
    expect(verifyResult({ hostname: "lab.local", errorCode: AUTHORITY_INVALID }, trusted)).toBe(0);
    expect(verifyResult({ hostname: "192.168.1.20", errorCode: -200 }, trusted)).toBe(0);
    expect(verifyResult({ hostname: "[::1]", errorCode: -201 }, trusted)).toBe(0);
  });

  it("leaves every other host to Chromium", () => {
    expect(verifyResult({ hostname: "evil.example", errorCode: AUTHORITY_INVALID }, trusted)).toBe(-3);
    expect(verifyResult({ hostname: "sub.lab.local", errorCode: AUTHORITY_INVALID }, trusted)).toBe(-3);
  });

  it("never relaxes arkitekt.live, even when fakts name it", () => {
    expect(verifyResult({ hostname: "go.arkitekt.live", errorCode: AUTHORITY_INVALID }, trusted)).toBe(-3);
    expect(allowsBadCertificate("go.arkitekt.live", trusted)).toBe(false);
    expect(allowsBadCertificate("arkitekt.live", new Set(["arkitekt.live"]))).toBe(false);
  });

  it("never overrides a revoked or blocklisted certificate", () => {
    expect(verifyResult({ hostname: "lab.local", errorCode: REVOKED }, trusted)).toBe(-3);
  });

  it("leaves a certificate that verified alone", () => {
    expect(verifyResult({ hostname: "lab.local", errorCode: 0 }, trusted)).toBe(-3);
  });

  it("normalizes what the renderer sends", () => {
    expect(normalizeHost("Lab.Local.")).toBe("lab.local");
    expect(normalizeHost("a b")).toBeUndefined();
    expect(normalizeHost("https://x")).toBeUndefined();
    expect(parseHosts(["Lab.local", "lab.local", 4, ""], 10)).toEqual(["lab.local"]);
    expect(parseHosts("lab.local", 10)).toEqual([]);
    expect(parseHosts(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });
});
