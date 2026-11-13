import { createServer, type Server } from "node:https";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDispatchers, pinnedTls, tlsModeFor, trustedFetch, type NodeTrust } from "./nodeFetch";

// Self-signed, for localhost and 127.0.0.1, valid 2026–2046 (`openssl req -x509`). Test-only key.
const HUB_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgV2+4qkpbbdhD81CF
BTxiAQPQdYmVB9YVqBkN5sInPxyhRANCAAQ5o+gqoVixne9dkCpXWbA9Sl05Dtrs
iZTac9ogTFS2vdQwYzvX8kMU+tXchoqPnR0SiJahjrdAeDlLP8DVLHLC
-----END PRIVATE KEY-----`;
const HUB = `-----BEGIN CERTIFICATE-----
MIIBjjCCATOgAwIBAgIUQpDmGlOFQyE+cS2Clrm1MHVsrFAwCgYIKoZIzj0EAwIw
DjEMMAoGA1UEAwwDaHViMB4XDTI2MTExMzEyMTEzMloXDTQ2MTEwODEyMTEzMlow
DjEMMAoGA1UEAwwDaHViMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEOaPoKqFY
sZ3vXZAqV1mwPUpdOQ7a7ImU2nPaIExUtr3UMGM71/JDFPrV3IaKj50dEoiWoY63
QHg5Sz/A1SxywqNvMG0wHQYDVR0OBBYEFBnfk+uCvjI8xLgNutvhNBAYu8Q6MB8G
A1UdIwQYMBaAFBnfk+uCvjI8xLgNutvhNBAYu8Q6MA8GA1UdEwEB/wQFMAMBAf8w
GgYDVR0RBBMwEYIJbG9jYWxob3N0hwR/AAABMAoGCCqGSM49BAMCA0kAMEYCIQDK
vOL/uEK0qLkKcifdpQb9b1kBe/yFYeMXknOgKLPKMwIhAIBYU4IgrbZPbxffZxv3
hYOEYQTvdVqdmnr5slnaDiN2
-----END CERTIFICATE-----`;
// Another certificate for the same names: what an attacker would present.
const OTHER = `-----BEGIN CERTIFICATE-----
MIIBjTCCATOgAwIBAgIUeBf0eIDypIY5k/YXPP1+VB25MzwwCgYIKoZIzj0EAwIw
DjEMMAoGA1UEAwwDaHViMB4XDTI2MTExMzEyMTEzMloXDTQ2MTEwODEyMTEzMlow
DjEMMAoGA1UEAwwDaHViMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAExOg+/zn7
eGxNjzgNaCdApREHRy0ZFxLHJeehf7SIY4CqsaMQe3EUBiBSp0is49y8wc++LXmg
jNxjCvhD47s/ZqNvMG0wHQYDVR0OBBYEFNG3NPyuOSnQJK2uyovTRKTUdGv1MB8G
A1UdIwQYMBaAFNG3NPyuOSnQJK2uyovTRKTUdGv1MA8GA1UdEwEB/wQFMAMBAf8w
GgYDVR0RBBMwEYIJbG9jYWxob3N0hwR/AAABMAoGCCqGSM49BAMCA0gAMEUCIFDw
WPH9JDUBn/u0PCCZh3w9jAYxvnfiv86yRDk/u3IvAiEAl8Q4Zd4vfTAKCeG+3x09
/4KZH7719e6sa4XN3x9uPeA=
-----END CERTIFICATE-----`;

// Shaped like the certificate a hub registers: self-signed, NOT a CA (no basicConstraints,
// keyUsage digitalSignature only). Electron's Node refuses it as a trust root unless
// `allowPartialTrustChain` is set (see `pinnedTls`); plain Node accepts it either way.
const NON_CA_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgwJ4jOHF/ac32TaF6
+kJoGlLBWdB6zDc4uQAMomJTLwmhRANCAAT/eIpztHbNYxgIJYy5zxaju+D6nvCH
VpyYezqgMwkKT+TkejRAEFmzbNmSdsOH7PZflR9E6VMKQabw67PZt67X
-----END PRIVATE KEY-----`;
const NON_CA = `-----BEGIN CERTIFICATE-----
MIIBYTCCAQegAwIBAgIUDn3XE68jNU6QGHv7qmP+Ayv0c/8wCgYIKoZIzj0EAwIw
DjEMMAoGA1UEAwwDaHViMB4XDTI2MTExMzEyMTcyNFoXDTQ2MTEwODEyMTcyNFow
DjEMMAoGA1UEAwwDaHViMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE/3iKc7R2
zWMYCCWMuc8Wo7vg+p7wh1acmHs6oDMJCk/k5Ho0QBBZs2zZknbDh+z2X5UfROlT
CkGm8Ouz2beu16NDMEEwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsGAQUF
BwMBMBoGA1UdEQQTMBGCCWxvY2FsaG9zdIcEfwAAATAKBggqhkjOPQQDAgNIADBF
AiEAwLcffDzPy0uMNIIHRm8fy83UZcTJTXxL+vFQijoZeNUCIFAQ6R2u+u7eF72o
P5RzQluEUFDtPyuGnc6lq6e9alE4
-----END CERTIFICATE-----`;

const trustOf = (pins: Record<string, string[]>, allowed: string[] = []): NodeTrust => ({
  allows: (host) => allowed.includes(host),
  pinsFor: (host) => pins[host],
});

describe("tlsModeFor", () => {
  it("pins a host its hub registered a certificate for", () => {
    expect(tlsModeFor("lab.local", trustOf({ "lab.local": [HUB] }))).toEqual({ kind: "pinned", pins: [HUB] });
  });

  it("never treats a pinned host as lenient", () => {
    expect(tlsModeFor("lab.local", trustOf({ "lab.local": [HUB] }, ["lab.local"])).kind).toBe("pinned");
  });

  it("is lenient for a fakts host without pins and strict for anything else", () => {
    const trust = trustOf({}, ["lab.local"]);
    expect(tlsModeFor("lab.local", trust)).toEqual({ kind: "lenient" });
    expect(tlsModeFor("example.org", trust)).toEqual({ kind: "strict" });
  });
});

describe("createDispatchers", () => {
  it("reuses a dispatcher per port, mode and pin set, and replaces it when the pins change", () => {
    let built = 0;
    const dispatcherFor = createDispatchers(() => ({ id: ++built }) as never);
    const first = dispatcherFor({ kind: "pinned", pins: [HUB] });
    expect(dispatcherFor({ kind: "pinned", pins: [HUB] })).toBe(first);
    expect(dispatcherFor({ kind: "pinned", pins: [OTHER] })).not.toBe(first);
    expect(dispatcherFor({ kind: "pinned", pins: [HUB] }, 1080)).not.toBe(first);
    expect(dispatcherFor({ kind: "lenient" })).not.toBe(first);
    expect(built).toBe(4);
  });
});

describe("trustedFetch against a self-signed server", () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    server = createServer({ key: HUB_KEY, cert: HUB }, (_request, response) => response.end("ok"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `https://localhost:${(server.address() as AddressInfo).port}/`;
  });

  afterAll(() => {
    server.closeAllConnections();
    server.close();
  });

  it("reaches a host pinned to the certificate it presents", async () => {
    const response = await trustedFetch(trustOf({ localhost: [HUB] }))(url);
    expect(await response.text()).toBe("ok");
  });

  it("refuses a host pinned to another certificate", async () => {
    await expect(trustedFetch(trustOf({ localhost: [OTHER] }))(url)).rejects.toThrow();
  });

  it("reaches a fakts host that has no pins", async () => {
    const response = await trustedFetch(trustOf({}, ["localhost"]))(url);
    expect(await response.text()).toBe("ok");
  });

  it("refuses a host nothing vouches for", async () => {
    await expect(trustedFetch()(url)).rejects.toThrow();
  });
});

describe("a hub's own certificate, self-signed and not a CA", () => {
  it("anchors the chain by itself", () => {
    expect(pinnedTls([NON_CA])).toEqual({ ca: [NON_CA], allowPartialTrustChain: true, rejectUnauthorized: true });
  });

  it("is reached when the host is pinned to it", async () => {
    const server = createServer({ key: NON_CA_KEY, cert: NON_CA }, (_request, response) => response.end("ok"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const url = `https://localhost:${(server.address() as AddressInfo).port}/`;
      const response = await trustedFetch(trustOf({ localhost: [NON_CA] }))(url);
      expect(await response.text()).toBe("ok");
      await expect(trustedFetch(trustOf({ localhost: [HUB] }))(url)).rejects.toThrow();
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
});
