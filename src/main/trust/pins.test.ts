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

// A private CA (`CA:TRUE`), an intermediate it issued, and leaves for lab.local and 10.0.0.4.
const CA = `-----BEGIN CERTIFICATE-----
MIIBeDCCAR2gAwIBAgIUF7dzlB++KYYX6ptBARuDXzE461swCgYIKoZIzj0EAwIw
ETEPMA0GA1UEAwwGaHViIGNhMB4XDTI2MTExMzEyMTU0OFoXDTQ2MTEwODEyMTU0
OFowETEPMA0GA1UEAwwGaHViIGNhMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE
W7fyyoTx6QLhY7hbLdLdD+Y0JZxrQ0CgRGGs3PZkzIwwmvozfqveX9S27Ryf+4fQ
RcCKJiM7ZR8wxXRQuGgYUqNTMFEwHQYDVR0OBBYEFClDnlLrWVcnK2HZR4JAc/D3
AUOtMB8GA1UdIwQYMBaAFClDnlLrWVcnK2HZR4JAc/D3AUOtMA8GA1UdEwEB/wQF
MAMBAf8wCgYIKoZIzj0EAwIDSQAwRgIhAJpMrTgsY/C0PJ10Eh0n25U1Rj1zy1/W
PGy0FvvovsSLAiEAmQv1masxEsrd+9IBR5PzcHqjlrH7IE4ffaxWxgmH+3U=
-----END CERTIFICATE-----`;
const INTERMEDIATE = `-----BEGIN CERTIFICATE-----
MIIBgDCCASegAwIBAgIUJTYLaIfUImQczcXILGWATr7P/pMwCgYIKoZIzj0EAwIw
ETEPMA0GA1UEAwwGaHViIGNhMB4XDTI2MTExMzEyMTU0OFoXDTQ2MTEwODEyMTU0
OFowGzEZMBcGA1UEAwwQaHViIGludGVybWVkaWF0ZTBZMBMGByqGSM49AgEGCCqG
SM49AwEHA0IABAb4u/55wGHUxU4Ns/HQis+bwdf9aIIfbjSmyDJv6juo/PxW+2T4
kVLY801RMA/15MYslKdMAxHXyFV5oK/zQWCjUzBRMA8GA1UdEwEB/wQFMAMBAf8w
HQYDVR0OBBYEFFAxGmPTp2dgoMgUToTjy8magHeUMB8GA1UdIwQYMBaAFClDnlLr
WVcnK2HZR4JAc/D3AUOtMAoGCCqGSM49BAMCA0cAMEQCICefRvpZ8tlStGzH3cXg
spAQhyFQIxf3flNzRJxaK0tBAiBTN6fsbl718aiaIJPWAko9XzbgOFqvbXLu9caa
Mi68sg==
-----END CERTIFICATE-----`;
// Issued by CA.
const LEAF = `-----BEGIN CERTIFICATE-----
MIIBkDCCATagAwIBAgIUJTYLaIfUImQczcXILGWATr7P/pQwCgYIKoZIzj0EAwIw
ETEPMA0GA1UEAwwGaHViIGNhMB4XDTI2MTExMzEyMTU0OFoXDTQ2MTEwODEyMTU0
OFowFDESMBAGA1UEAwwJbGFiLmxvY2FsMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcD
QgAE03RCuH3Yzp2iEq7U5xHAD0wZ9hJa/z0IwrhDZOeQ5G4Ba+YHShNUH3q5mwBz
h/zgTk0rhoVKJbUsktQRplTPhqNpMGcwCQYDVR0TBAIwADAaBgNVHREEEzARggls
YWIubG9jYWyHBAoAAAQwHQYDVR0OBBYEFM/aoxdXWZeWA//M2c/hhiEhnXzFMB8G
A1UdIwQYMBaAFClDnlLrWVcnK2HZR4JAc/D3AUOtMAoGCCqGSM49BAMCA0gAMEUC
IQCnlA4hgA7b8mKUtVdnGWgMOQJLh7EZZOCTerq6buyVsQIgNa//xdbTTOFpAeHQ
scG8WB9mKyYrVL1jcvK9DOmLi7k=
-----END CERTIFICATE-----`;
// Issued by INTERMEDIATE.
const LEAF_BELOW_INTERMEDIATE = `-----BEGIN CERTIFICATE-----
MIIBmjCCAUCgAwIBAgIUZHlKReGYokIGAyFAGcNgkwGpeyAwCgYIKoZIzj0EAwIw
GzEZMBcGA1UEAwwQaHViIGludGVybWVkaWF0ZTAeFw0yNjExMTMxMjE1NDhaFw00
NjExMDgxMjE1NDhaMBQxEjAQBgNVBAMMCWxhYi5sb2NhbDBZMBMGByqGSM49AgEG
CCqGSM49AwEHA0IABNN0Qrh92M6dohKu1OcRwA9MGfYSWv89CMK4Q2TnkORuAWvm
B0oTVB96uZsAc4f84E5NK4aFSiW1LJLUEaZUz4ajaTBnMAkGA1UdEwQCMAAwGgYD
VR0RBBMwEYIJbGFiLmxvY2FshwQKAAAEMB0GA1UdDgQWBBTP2qMXV1mXlgP/zNnP
4YYhIZ18xTAfBgNVHSMEGDAWgBRQMRpj06dnYKDIFE6E48vJmoB3lDAKBggqhkjO
PQQDAgNIADBFAiBr7eNwDTS+oFjhQqeOkDSaiYgaeO3yW6BDIdFf77go+AIhAOid
kByoMCyGLYDsbU2VzOaccv1KZ6wh8O0+TDhi7NBe
-----END CERTIFICATE-----`;
// Issued by another CA with the same subject name as CA: what an attacker would present.
const LEAF_OF_ROGUE_CA = `-----BEGIN CERTIFICATE-----
MIIBkTCCATagAwIBAgIUWgLLaazPsEFkQQlf/x1VpcUq5NEwCgYIKoZIzj0EAwIw
ETEPMA0GA1UEAwwGaHViIGNhMB4XDTI2MTExMzEyMTU0OFoXDTQ2MTEwODEyMTU0
OFowFDESMBAGA1UEAwwJbGFiLmxvY2FsMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcD
QgAE03RCuH3Yzp2iEq7U5xHAD0wZ9hJa/z0IwrhDZOeQ5G4Ba+YHShNUH3q5mwBz
h/zgTk0rhoVKJbUsktQRplTPhqNpMGcwCQYDVR0TBAIwADAaBgNVHREEEzARggls
YWIubG9jYWyHBAoAAAQwHQYDVR0OBBYEFM/aoxdXWZeWA//M2c/hhiEhnXzFMB8G
A1UdIwQYMBaAFAahXiuWj3bApnxOsE3Gl/3J5pGhMAoGCCqGSM49BAMCA0kAMEYC
IQDnL1HevYsxxXSOIuf0vUe2E15pTGD+HGknvoFrunF31QIhAN+eIUi/ZFQu5A6N
PtUcPhSTQjgBM143egNNmuL1i2gQ
-----END CERTIFICATE-----`;
// Signed with LEAF's key, which is not a CA.
const LEAF_OF_LEAF = `-----BEGIN CERTIFICATE-----
MIIBcTCCARigAwIBAgIUCzpMAKy1XgtX/zjrL7MWaMpOc/EwCgYIKoZIzj0EAwIw
FDESMBAGA1UEAwwJbGFiLmxvY2FsMB4XDTI2MTExMzEyMTU0OFoXDTQ2MTEwODEy
MTU0OFowFDESMBAGA1UEAwwJbGFiLmxvY2FsMFkwEwYHKoZIzj0CAQYIKoZIzj0D
AQcDQgAE03RCuH3Yzp2iEq7U5xHAD0wZ9hJa/z0IwrhDZOeQ5G4Ba+YHShNUH3q5
mwBzh/zgTk0rhoVKJbUsktQRplTPhqNIMEYwCQYDVR0TBAIwADAaBgNVHREEEzAR
gglsYWIubG9jYWyHBAoAAAQwHQYDVR0OBBYEFM/aoxdXWZeWA//M2c/hhiEhnXzF
MAoGCCqGSM49BAMCA0cAMEQCIHknoRX/FdEgv0MU4iecJTw6Aer0CUfHd3waqBrW
1BS4AiATjvtdnN0izoMcy9FkkOa+xJvNyRwqtfD1U8YBKTttcA==
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

describe("a host pinned to a CA", () => {
  const ca = new Map([
    ["lab.local", [CA]],
    ["10.0.0.4", [CA]],
    ["other.local", [CA]],
  ]);

  it("accepts a certificate the CA issued, by name and by address", () => {
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: LEAF } }, ca)).toBe(0);
    expect(pinnedVerdict({ hostname: "10.0.0.4", certificate: { data: LEAF } }, ca)).toBe(0);
  });

  it("follows the intermediates the server sends, and refuses a chain with a gap", () => {
    const chain = { data: LEAF_BELOW_INTERMEDIATE, issuerCert: { data: INTERMEDIATE, issuerCert: { data: CA } } };
    expect(pinnedVerdict({ hostname: "lab.local", certificate: chain }, ca)).toBe(0);
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: LEAF_BELOW_INTERMEDIATE } }, ca)).toBe(-2);
  });

  it("accepts a registered intermediate as the anchor", () => {
    const intermediate = new Map([["lab.local", [INTERMEDIATE]]]);
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: LEAF_BELOW_INTERMEDIATE } }, intermediate)).toBe(0);
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: LEAF } }, intermediate)).toBe(-2);
  });

  it("reads a bundle registered as one entry", () => {
    const bundle = new Map([["lab.local", [`${OTHER}\n${CA}\n`]]]);
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: LEAF } }, bundle)).toBe(0);
  });

  it("refuses a certificate another CA of the same name issued", () => {
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: LEAF_OF_ROGUE_CA } }, ca)).toBe(-2);
  });

  it("refuses a certificate signed by a registered certificate that is not a CA", () => {
    const leaf = new Map([["lab.local", [LEAF]]]);
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: LEAF } }, leaf)).toBe(0);
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: LEAF_OF_LEAF } }, leaf)).toBe(-2);
  });

  it("refuses an issued certificate for a name it does not carry, or outside its validity", () => {
    expect(pinnedVerdict({ hostname: "other.local", certificate: { data: LEAF } }, ca)).toBe(-2);
    expect(pinnedVerdict({ hostname: "lab.local", certificate: { data: LEAF } }, ca, Date.parse("2050-01-01"))).toBe(-2);
  });
});
