import { describe, expect, it } from "vitest";

import { certificateKey, parsePins, pinnedVerdict } from "./pins";

// Self-signed, for lab.local and 10.0.0.4, valid 2026–2046 (`openssl req -x509`).
const HUB = `-----BEGIN CERTIFICATE-----
MIIBjTCCATOgAwIBAgIUKZiSTULYyfCrctDURDQeGhPGlrAwCgYIKoZIzj0EAwIw
DjEMMAoGA1UEAwwDaHViMB4XDTI2MTAyMzE1MDc1OFoXDTQ2MTAxODE1MDc1OFow
DjEMMAoGA1UEAwwDaHViMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAETDDzAQgX
ZNp54iLLN+pQK6MG3gi1VpXF/wJrCsgk2Vl6iHRtKpDL8PZy29BnUQoV4kZ6yJfS
jF/3K9l/1Y+en6NvMG0wHQYDVR0OBBYEFBFrjEsvKGy1V2UbBCn6AU16cyRvMB8G
A1UdIwQYMBaAFBFrjEsvKGy1V2UbBCn6AU16cyRvMA8GA1UdEwEB/wQFMAMBAf8w
GgYDVR0RBBMwEYIJbGFiLmxvY2FshwQKAAAEMAoGCCqGSM49BAMCA0gAMEUCIC0F
UBlFp6Z2X6erIR8pwU8iMyKbCaM2LeQx/zipuduSAiEAy2OwyrScJ0/98grvt0lf
Qz9mIWPdALmd5U2b+byaqro=
-----END CERTIFICATE-----`;
// Another certificate for the same names: what an attacker would present.
const OTHER = `-----BEGIN CERTIFICATE-----
MIIBjDCCATOgAwIBAgIUWJYBsj3eO5v5wrlBVmqiDn+bH+wwCgYIKoZIzj0EAwIw
DjEMMAoGA1UEAwwDaHViMB4XDTI2MTAyMzE1MDc1OFoXDTQ2MTAxODE1MDc1OFow
DjEMMAoGA1UEAwwDaHViMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEkcNm7hF0
HbRXOYv7H1Q3c5hcWhRa798flC1qyhRfxMgbQ1zpuli9qWgvnyZ/LS3DvXUY/vbm
OOnQzj45lDmvu6NvMG0wHQYDVR0OBBYEFB/z9RFbXfnJYnAENwyUsXwwEqQbMB8G
A1UdIwQYMBaAFB/z9RFbXfnJYnAENwyUsXwwEqQbMA8GA1UdEwEB/wQFMAMBAf8w
GgYDVR0RBBMwEYIJbGFiLmxvY2FshwQKAAAEMAoGCCqGSM49BAMCA0cAMEQCIA8u
3tRYJCqzqGzqP9cpsArJa4JU4cEYKvsTe/rzT+j5AiAYFpTsAP9rckKeW5oURSfe
uqgm+iO5QbE0PDrZrvJViQ==
-----END CERTIFICATE-----`;
// For lab.local, expired in 2021.
const EXPIRED = `-----BEGIN CERTIFICATE-----
MIIBhzCCAS2gAwIBAgIUd4J22XGy0sm4yCEBegeo98s2PDUwCgYIKoZIzj0EAwIw
DjEMMAoGA1UEAwwDaHViMB4XDTIwMDEwMTAwMDAwMFoXDTIxMDEwMTAwMDAwMFow
DjEMMAoGA1UEAwwDaHViMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEGpMQC6bf
EL6Zz/o4yJe7tJubj0C+8Z2mQcWsIlNuPiYKa6NtTPwIQRV7Q2LhlDwAkblqjENi
8u/s9UKzwEuWtaNpMGcwHQYDVR0OBBYEFDIt3w+QVv4Undn7oN1qEqbNC2P2MB8G
A1UdIwQYMBaAFDIt3w+QVv4Undn7oN1qEqbNC2P2MA8GA1UdEwEB/wQFMAMBAf8w
FAYDVR0RBA0wC4IJbGFiLmxvY2FsMAoGCCqGSM49BAMCA0gAMEUCIHvszoTLgVIH
Nuj0CNudFIa/puyy3IAUaoYafFK7OJo7AiEAuwudDbFY8MvMiKMB9ia+40WvTw+i
kIxrmEPDWMNusb4=
-----END CERTIFICATE-----`;

const pins = new Map([
  ["lab.local", [HUB]],
  ["10.0.0.4", [HUB]],
  ["old.local", [EXPIRED]],
]);

describe("pinned hosts", () => {
  it("accept exactly the registered certificate, by name and by address", () => {
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: HUB } }, pins)).toBe(0);
    expect(pinnedVerdict({ hostname: "LAB.local.", certificate: { data: HUB } }, pins)).toBe(0);
    expect(pinnedVerdict({ hostname: "10.0.0.4", certificate: { data: HUB } }, pins)).toBe(0);
  });

  it("refuse any other certificate, whatever Chromium thought of it", () => {
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: OTHER } }, pins)).toBe(-2);
    expect(pinnedVerdict({ hostname: "lab.local" }, pins)).toBe(-2);
  });

  it("refuse the registered certificate for a name it does not carry, or once it expired", () => {
    const misnamed = new Map([["other.local", [HUB]]]);
    expect(pinnedVerdict({ hostname: "other.local", certificate: { data: HUB } }, misnamed)).toBe(-2);
    expect(pinnedVerdict({ hostname: "old.local", certificate: { data: EXPIRED } }, pins)).toBe(-2);
  });

  it("say nothing about a host that is not pinned", () => {
    expect(pinnedVerdict({ hostname: "elsewhere.local", certificate: { data: OTHER } }, pins)).toBeUndefined();
  });

  it("compare certificates by their bytes, not their line breaks", () => {
    const rewrapped = HUB.replace(/\n/g, "\r\n") + "\n";
    expect(certificateKey(rewrapped)).toBe(certificateKey(HUB));
  });

  it("read only well-formed pins", () => {
    const parsed = parsePins({ "Lab.Local": [HUB, 4, "nope"], "": [HUB], bad: "x" }, 10);
    expect([...parsed.keys()]).toEqual(["lab.local"]);
    expect(parsed.get("lab.local")).toEqual([HUB]);
    expect(parsePins([HUB], 10).size).toBe(0);
  });
});
