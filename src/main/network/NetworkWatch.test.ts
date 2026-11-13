import type { NetworkInterfaceInfo } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcTransport } from "../modules/IpcTransport";
import type { WindowManager } from "../modules/WindowManager";
import { NetworkWatch, networkSignature } from "./NetworkWatch";
import { NETWORK_CHANGED_CHANNEL } from "./protocol";

const v4 = (address: string, internal = false) => ({ address, family: "IPv4", internal }) as NetworkInterfaceInfo;
const v6 = (address: string) => ({ address, family: "IPv6", internal: false }) as NetworkInterfaceInfo;

describe("networkSignature", () => {
  it("is the routable addresses, whatever order the OS lists them in", () => {
    expect(networkSignature({ wlan0: [v4("192.168.1.5")], eth0: [v4("10.0.0.2")] })).toBe(
      networkSignature({ eth0: [v4("10.0.0.2")], wlan0: [v4("192.168.1.5")] }),
    );
  });

  it("ignores loopback and link-local addresses", () => {
    expect(networkSignature({ lo: [v4("127.0.0.1", true)], wlan0: [v6("fe80::1"), v4("169.254.3.4")] })).toBe("");
  });
});

describe("NetworkWatch", () => {
  let nets: NodeJS.Dict<NetworkInterfaceInfo[]>;
  let sent: unknown[];
  let resume: () => void;
  let watch: NetworkWatch;

  beforeEach(() => {
    vi.useFakeTimers();
    nets = { wlan0: [v4("192.168.1.5")] };
    sent = [];
    const win = { isDestroyed: () => false, webContents: {} };
    watch = new NetworkWatch(
      { sendTo: (_contents: unknown, channel: string, payload: unknown) => sent.push([channel, payload]) } as unknown as IpcTransport,
      { getAllWindows: () => [win] } as unknown as WindowManager,
      { interfaces: () => nets, onResume: (listener) => (resume = listener), intervalMs: 1000 },
    );
    watch.setup();
  });

  afterEach(() => {
    watch.onBeforeQuit();
    vi.useRealTimers();
  });

  it("says nothing while the addresses stay the same", () => {
    vi.advanceTimersByTime(5000);
    expect(sent).toEqual([]);
  });

  it("tells every window once when an address comes or goes", () => {
    nets = { wlan0: [v4("10.20.0.7")] };
    vi.advanceTimersByTime(3000);
    expect(sent).toEqual([[NETWORK_CHANGED_CHANNEL, { reason: "interfaces" }]]);
  });

  it("tells every window when the computer wakes up, even with the same addresses", () => {
    resume();
    expect(sent).toEqual([[NETWORK_CHANGED_CHANNEL, { reason: "resume" }]]);
  });

  it("stops watching on quit", () => {
    watch.onBeforeQuit();
    nets = {};
    vi.advanceTimersByTime(5000);
    expect(sent).toEqual([]);
  });
});
