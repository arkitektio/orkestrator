import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EDUROAM_DISCOVERY_URL, WifiService, type SecretBox } from "./WifiService";
import type { WifiProfile } from "./protocol";

/** Reversible "encryption" that is visibly not plain text. */
const box = (available = true): SecretBox => ({
  isEncryptionAvailable: () => available,
  encryptString: (plain) => Buffer.from(`sealed:${Buffer.from(plain).toString("base64")}`),
  decryptString: (sealed) => Buffer.from(sealed.toString().replace(/^sealed:/, ""), "base64").toString(),
});

const DISCOVERY = {
  instances: [
    {
      id: "cat_1",
      name: "University of Example",
      country: "DE",
      profiles: [{ id: "p1", name: "Staff", eapconfig_endpoint: "https://cat.example/p1.eap-config" }],
    },
    { id: "cat_2", name: "Example Hospital", profiles: [{ id: "p2", eapconfig_endpoint: "https://cat.example/p2" }] },
    { id: "cat_3", name: "No Profiles College", profiles: [] },
  ],
};

const harness = (secrets = box()) => {
  const dir = mkdtempSync(join(tmpdir(), "orkestrator-wifi-"));
  const fetch = vi.fn(async (url: string) =>
    url === EDUROAM_DISCOVERY_URL
      ? new Response(JSON.stringify(DISCOVERY))
      : new Response("<EAPIdentityProviderList/>"),
  );
  const service = new WifiService(
    { handleChannel: () => undefined },
    { userData: () => dir, secrets, fetch: fetch as unknown as typeof globalThis.fetch },
  );
  return { service, dir, fetch };
};

const EDUROAM: WifiProfile = {
  id: "w1",
  ssid: "eduroam",
  type: "eduroam",
  password: "hunter22",
  identity: "jdoe@uni.example",
  caPem: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----",
};

describe("WifiService profiles", () => {
  it("keeps the password and CA sealed on disk and opens them on list", () => {
    const h = harness();
    h.service.save(EDUROAM);
    const disk = readFileSync(join(h.dir, "wifi-profiles.json"), "utf8");
    expect(disk).not.toContain("hunter22");
    expect(disk).not.toContain("BEGIN CERTIFICATE");
    expect(disk).toContain("jdoe@uni.example");
    expect(h.service.list()).toEqual({ profiles: [EDUROAM], secretsPersisted: true });
  });

  it("replaces by id and deletes", () => {
    const h = harness();
    h.service.save(EDUROAM);
    h.service.save({ ...EDUROAM, ssid: "eduroam-5g" });
    h.service.save({ id: "w2", ssid: "Lab", type: "standard", password: "labpassword" });
    expect(h.service.list().profiles.map((p) => p.ssid)).toEqual(["eduroam-5g", "Lab"]);
    expect(h.service.remove("w1").profiles.map((p) => p.id)).toEqual(["w2"]);
  });

  it("saves no secrets without a keychain, and says so", () => {
    const h = harness(box(false));
    const list = h.service.save(EDUROAM);
    expect(list.secretsPersisted).toBe(false);
    expect(list.profiles[0].password).toBeUndefined();
    expect(list.profiles[0].identity).toBe("jdoe@uni.example");
    expect(readFileSync(join(h.dir, "wifi-profiles.json"), "utf8")).not.toContain("hunter22");
  });
});

describe("WifiService eduroam", () => {
  it("searches the directory once, prefix matches first, skipping institutions without profiles", async () => {
    const h = harness();
    expect((await h.service.search({ query: "example" })).map((i) => i.id)).toEqual(["cat_2", "cat_1"]);
    expect((await h.service.search({ query: "univ" }))[0]).toMatchObject({
      name: "University of Example",
      country: "DE",
      profiles: [{ id: "p1", name: "Staff", eapconfigEndpoint: "https://cat.example/p1.eap-config" }],
    });
    expect(await h.service.search({ query: "college" })).toEqual([]);
    expect(await h.service.search({ query: "e" })).toEqual([]);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("fetches only eap-configs the directory lists", async () => {
    const h = harness();
    expect(await h.service.eapConfig({ eapconfigEndpoint: "https://cat.example/p2" })).toBe("<EAPIdentityProviderList/>");
    await expect(h.service.eapConfig({ eapconfigEndpoint: "http://169.254.169.254/" })).rejects.toThrow(
      "Not an eduroam profile",
    );
  });
});
