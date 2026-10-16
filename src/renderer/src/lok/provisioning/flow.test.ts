import { describe, expect, it, vi } from "vitest";
import { runProvisioning, type ProvisionProgress } from "./flow";
import type { DeviceConfig, DeviceInfo, DeviceStatus, ProvisioningDevice } from "./protocol";

const INFO = {
  protocol: 2,
  manifest: { identifier: "live.arkitekt.esp32", version: "2.0.0", device_id: "a1b2", scopes: [], requirements: [] },
  has_key: false,
  has_wifi: false,
} as DeviceInfo;

const status = (state: string, outcome: DeviceStatus["outcome"] = "pending"): DeviceStatus => ({
  state,
  reason: null,
  detail: null,
  outcome,
});

const harness = (opts: { writeFails?: boolean; statusFails?: boolean } = {}) => {
  let statusCb: ((s: DeviceStatus) => void) | undefined;
  let dropCb: (() => void) | undefined;
  const written: DeviceConfig[] = [];
  const device: ProvisioningDevice = {
    readInfo: async () => INFO,
    readStatus: async () => status("idle"),
    writeConfig: async (config, onProgress) => {
      if (opts.writeFails) throw new Error("GATT write failed");
      written.push(config);
      onProgress?.(1);
    },
    onStatus: async (cb) => {
      if (opts.statusFails) throw new Error("no status characteristic");
      statusCb = cb;
      return () => (statusCb = undefined);
    },
  };
  const revokeKey = vi.fn(async () => undefined);
  const issueKey = vi.fn(async () => ({ key: "K".repeat(43), mandateId: "m1" }));
  const progress: ProvisionProgress[] = [];
  const run = (timeoutMs?: number, extra: { existing?: { mandateId: string }; caPem?: string } = {}) =>
    runProvisioning({
      device,
      info: INFO,
      existing: extra.existing,
      wifi: extra.caPem
        ? { id: "w", type: "eduroam", ssid: "eduroam", password: "x", identity: "j", caPem: extra.caPem }
        : { id: "w", type: "standard", ssid: "Lab", password: "longenough" },
      origin: "https://go.arkitekt.live",
      issueKey,
      revokeKey,
      onDropped: (cb) => {
        dropCb = cb;
        return () => (dropCb = undefined);
      },
      onProgress: (p) => progress.push(p),
      timeoutMs,
    });
  return { run, written, issueKey, revokeKey, progress, say: (s: DeviceStatus) => statusCb?.(s), drop: () => dropCb?.() };
};

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("runProvisioning", () => {
  it("sends Wi-Fi, origin and the issued key, then waits for registered", async () => {
    const h = harness();
    const done = h.run();
    await tick();
    h.say(status("wifi_ok"));
    h.say(status("registered", "success"));
    h.drop(); // the firmware switches BLE off after registering
    await expect(done).resolves.toMatchObject({ mandateId: "m1", status: { state: "registered" } });
    expect(h.written).toEqual([
      { wifi: { ssid: "Lab", password: "longenough" }, origin: "https://go.arkitekt.live", key: "K".repeat(43) },
    ]);
    expect(h.revokeKey).not.toHaveBeenCalled();
    expect(h.progress.map((p) => p.phase)).toEqual(["issuing", "sending", "sending", "waiting", "waiting", "waiting", "done"]);
    expect(h.progress.at(-1)).toMatchObject({ mandateId: "m1" });
  });

  it("revokes the key when it never reached the device", async () => {
    const h = harness({ writeFails: true });
    await expect(h.run()).rejects.toThrow("GATT write failed");
    expect(h.revokeKey).toHaveBeenCalledWith("m1");
    expect(h.progress.at(-1)).toMatchObject({ phase: "failed" });
  });

  it("keeps the key when the device saved it and then failed", async () => {
    const h = harness();
    const done = h.run();
    await tick();
    h.say({ ...status("wifi_failed", "failure"), detail: "no AP" });
    await expect(done).rejects.toMatchObject({ message: "no AP", mandateId: "m1" });
    expect(h.revokeKey).not.toHaveBeenCalled();
  });

  it("explains a device that went away after saving", async () => {
    const h = harness();
    const done = h.run();
    await tick();
    h.say(status("wifi_connecting"));
    h.drop();
    await expect(done).rejects.toThrow("keeps its configuration");
  });

  it("gives up waiting without taking the key back", async () => {
    const h = harness();
    await expect(h.run(5)).rejects.toThrow("has not registered yet");
    expect(h.revokeKey).not.toHaveBeenCalled();
  });

  it("issues no key when the device cannot report its status", async () => {
    const h = harness({ statusFails: true });
    await expect(h.run()).rejects.toThrow("no status characteristic");
    expect(h.issueKey).not.toHaveBeenCalled();
  });

  it("issues no key for a document a device cannot take", async () => {
    const h = harness();
    await expect(h.run(undefined, { caPem: "A".repeat(17_000) })).rejects.toThrow("at most");
    expect(h.issueKey).not.toHaveBeenCalled();
  });

  it("retries with the key the device already holds", async () => {
    const h = harness();
    const done = h.run(undefined, { existing: { mandateId: "m0" } });
    await tick();
    h.say(status("registered", "success"));
    await expect(done).resolves.toMatchObject({ mandateId: "m0" });
    expect(h.issueKey).not.toHaveBeenCalled();
    expect(h.written[0]).not.toHaveProperty("key");
  });

  it("ignores a verdict left over from before the upload", async () => {
    const h = harness();
    // The device repeats its previous verdict while lok issues the key.
    h.issueKey.mockImplementationOnce(async () => {
      h.say(status("wifi_failed", "failure"));
      return { key: "K".repeat(43), mandateId: "m1" };
    });
    const done = h.run();
    await tick();
    h.say(status("registered", "success"));
    await expect(done).resolves.toMatchObject({ status: { state: "registered" } });
  });
});
