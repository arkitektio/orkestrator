import { describe, expect, it } from "vitest";
import { normalizeWifiProfile, wifiProfileProblem } from "./schema";

const PEM = "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----";

describe("Wi-Fi profiles", () => {
  it("wants a WPA passphrase of 8 to 63 characters", () => {
    expect(wifiProfileProblem({ id: "1", type: "standard", ssid: "Lab", password: "short" })).toMatch("at least 8");
    expect(wifiProfileProblem({ id: "1", type: "standard", ssid: "Lab", password: "longenough" })).toBeNull();
  });

  it("wants an eduroam CA unless the check is skipped", () => {
    const base = { id: "1", type: "eduroam" as const, ssid: "eduroam", identity: "j@uni.example", password: "x" };
    expect(wifiProfileProblem(base)).toMatch("certificate");
    expect(wifiProfileProblem({ ...base, caPem: "nope" })).toMatch("Not a PEM");
    expect(wifiProfileProblem({ ...base, caPem: PEM })).toBeNull();
    expect(wifiProfileProblem({ ...base, skipCertValidation: true })).toBeNull();
  });

  it("drops the fields a type does not use", () => {
    expect(
      normalizeWifiProfile({ id: "1", type: "standard", ssid: "Lab", password: "longenough", identity: "left over", caPem: PEM }),
    ).toEqual({ id: "1", type: "standard", ssid: "Lab", password: "longenough" });
    expect(
      normalizeWifiProfile({ id: "1", type: "eduroam", ssid: "eduroam", password: "x", identity: "j", skipCertValidation: true, caPem: PEM }).caPem,
    ).toBeUndefined();
  });
});
