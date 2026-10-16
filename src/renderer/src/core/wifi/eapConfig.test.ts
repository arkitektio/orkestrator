// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { derToPem, parseEapConfig } from "./eapConfig";

const DER = "MIIB" + "A".repeat(120);

const CAT = `<?xml version="1.0" encoding="utf-8"?>
<EAPIdentityProviderList xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <EAPIdentityProvider ID="uni.example" namespace="urn:RFC4282:realm">
    <AuthenticationMethods>
      <AuthenticationMethod>
        <EAPMethod><Type>25</Type></EAPMethod>
        <ServerSideCredential>
          <CA format="X.509" encoding="base64">${DER}</CA>
          <CA format="X.509" encoding="base64">MIIC</CA>
          <ServerID>radius.uni.example</ServerID>
        </ServerSideCredential>
        <ClientSideCredential><OuterIdentity>anonymous@uni.example</OuterIdentity></ClientSideCredential>
      </AuthenticationMethod>
      <AuthenticationMethod><EAPMethod><Type>21</Type></EAPMethod></AuthenticationMethod>
    </AuthenticationMethods>
    <ProviderInfo><DisplayName lang="en">University of Example</DisplayName></ProviderInfo>
  </EAPIdentityProvider>
</EAPIdentityProviderList>`;

describe("parseEapConfig", () => {
  it("reads the CAs, the outer identity and the methods", () => {
    const config = parseEapConfig(CAT);
    expect(config.displayName).toBe("University of Example");
    expect(config.anonymousIdentity).toBe("anonymous@uni.example");
    expect(config.eapTypes).toEqual([25, 21]);
    expect(config.caPems).toHaveLength(2);
    expect(config.caPems[0].split("\n")).toEqual([
      "-----BEGIN CERTIFICATE-----",
      DER.slice(0, 64),
      DER.slice(64),
      "-----END CERTIFICATE-----",
    ]);
  });

  it("rejects what is not an eap-config", () => {
    expect(() => parseEapConfig("<html>")).toThrow("not valid XML");
    expect(() => parseEapConfig("<Other/>")).toThrow("no identity provider");
  });

  it("keeps a PEM as it is", () => {
    const pem = "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----";
    expect(derToPem(`  ${pem}\n`)).toBe(pem);
  });
});
