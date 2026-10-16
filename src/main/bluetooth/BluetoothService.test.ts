import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import {
  BluetoothService,
  type NativeAdapterEmitter,
  type NativeBluetooth,
  type NativeCharacteristic,
  type NativeDevice,
} from "./BluetoothService";
import {
  BLUETOOTH_DEVICES_CHANNEL,
  BLUETOOTH_DISCONNECTED_CHANNEL,
  BLUETOOTH_NOTIFICATION_CHANNEL,
  type BluetoothScanEvent,
} from "./protocol";

const SVC = "4FAFC201-1FB5-459E-8FCC-C5C9C331914B";
const CHR = "beb5483e-36e1-4688-b7f5-ea07361b26ad";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A characteristic that records writes and answers reads one at a time, slowly. */
class FakeCharacteristic implements NativeCharacteristic {
  read = true;
  write = true;
  writeWithoutResponse = false;
  notify = true;
  indicate = false;
  log: string[] = [];
  notifier?: (value: number[]) => void;
  constructor(public uuid: string) {}
  async nativeReadValue() {
    this.log.push("read");
    return new TextEncoder().encode("{}");
  }
  async nativeWriteValueWithResponse(value: Uint8Array) {
    this.log.push(`write-start ${new TextDecoder().decode(value)}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
    this.log.push(`write-end ${new TextDecoder().decode(value)}`);
  }
  async nativeWriteValueWithoutResponse() {}
  async nativeStartNotifications(callback: (value: number[]) => void) {
    this.notifier = callback;
  }
  async nativeStopNotifications() {
    this.notifier = undefined;
  }
}

const harness = (opts: { adapters?: number; powered?: boolean; load?: () => NativeBluetooth } = {}) => {
  const characteristic = new FakeCharacteristic(CHR);
  let connected = false;
  const device: NativeDevice = {
    id: "dev-1",
    name: "ARKITEKT-1a2b",
    serviceUuids: [SVC],
    gatt: () => ({
      get connected() {
        return connected;
      },
      nativeConnect: async () => {
        connected = true;
      },
      nativeDisconnect: async () => {
        connected = false;
      },
      nativeGetPrimaryServices: async () => [{ uuid: SVC, getCharacteristics: async () => [characteristic] }],
    }),
  };
  const other: NativeDevice = { id: "dev-2", name: "Headphones", serviceUuids: [], gatt: device.gatt };

  let scanCallback: ((d: NativeDevice) => void) | undefined;
  let disconnectCallback: ((id: string) => void) | undefined;
  const emitter: NativeAdapterEmitter = {
    startScan: async (_i, cb) => {
      scanCallback = cb;
    },
    stopScan: async () => {
      scanCallback = undefined;
    },
    addDisconnect: async (_i, cb) => {
      disconnectCallback = cb;
    },
  };
  const native: NativeBluetooth = {
    getAdapters: async () =>
      Array.from({ length: opts.adapters ?? 1 }, (_, index) => ({ index, address: "", active: true })),
    getAvailability: async () => opts.powered ?? true,
    AdapterEmitter: class {
      constructor() {
        return emitter;
      }
    } as unknown as NativeBluetooth["AdapterEmitter"],
  };

  const sent: { channel: string; payload: any }[] = [];
  const transport = {
    handleChannel: () => undefined,
    sendTo: (_wc: unknown, channel: string, payload: unknown) => sent.push({ channel, payload }),
  };
  const owner = new EventEmitter() as unknown as Electron.WebContents;
  const service = new BluetoothService(transport, { load: opts.load ?? (() => native) });
  return {
    service,
    owner,
    sent,
    characteristic,
    advertise: (d: NativeDevice = device) => scanCallback?.(d),
    other,
    isScanning: () => scanCallback !== undefined,
    dropConnection: (id: string) => disconnectCallback?.(id),
    ref: { deviceId: "dev-1", service: SVC, characteristic: CHR },
  };
};

const lastScan = (sent: { channel: string; payload: any }[]): BluetoothScanEvent =>
  sent.filter((s) => s.channel === BLUETOOTH_DEVICES_CHANNEL).at(-1)!.payload;

describe("BluetoothService", () => {
  it("says why Bluetooth is unavailable", async () => {
    expect(await harness().service.availability()).toEqual({ available: true });
    expect(await harness({ adapters: 0 }).service.availability()).toMatchObject({ reason: "no-adapter" });
    expect(await harness({ powered: false }).service.availability()).toMatchObject({ reason: "powered-off" });
    const broken = harness({
      load: () => {
        throw new Error("no binary for this platform");
      },
    });
    expect(await broken.service.availability()).toMatchObject({ available: false, reason: "unsupported" });
  });

  it("streams only devices advertising a requested service", async () => {
    const h = harness();
    await h.service.startScan(h.owner, { services: [SVC.toLowerCase()] });
    h.advertise(h.other);
    h.advertise();
    h.advertise();
    const scan = lastScan(h.sent);
    expect(scan.devices.map((d) => d.id)).toEqual(["dev-1"]);
    expect(scan.devices[0].services).toEqual([SVC.toLowerCase()]);
    expect(h.sent.filter((s) => s.channel === BLUETOOTH_DEVICES_CHANNEL)).toHaveLength(2);
  });

  it("stops scanning to connect, and runs one GATT operation at a time", async () => {
    const h = harness();
    await h.service.startScan(h.owner, { services: [SVC] });
    h.advertise();
    const result = await h.service.connect(h.owner, { deviceId: "dev-1" });
    expect(h.isScanning()).toBe(false);
    expect(lastScan(h.sent).scanning).toBe(false);
    expect(result.services[0].characteristics[0].uuid).toBe(CHR);

    const encode = (s: string) => new TextEncoder().encode(s);
    await Promise.all([
      h.service.write({ ...h.ref, value: encode("a") }),
      h.service.write({ ...h.ref, value: encode("b") }),
      h.service.read(h.ref),
    ]);
    expect(h.characteristic.log).toEqual(["write-start a", "write-end a", "write-start b", "write-end b", "read"]);
  });

  it("forwards notifications and drops to the owner", async () => {
    const h = harness();
    await h.service.startScan(h.owner, { services: [] });
    h.advertise();
    await h.service.connect(h.owner, { deviceId: "dev-1" });
    await h.service.startNotifications(h.ref);
    h.characteristic.notifier?.([104, 105]);
    const note = h.sent.find((s) => s.channel === BLUETOOTH_NOTIFICATION_CHANNEL)!.payload;
    expect(new TextDecoder().decode(note.value)).toBe("hi");
    expect(note.service).toBe(SVC.toLowerCase());

    h.dropConnection("dev-1");
    expect(h.sent.at(-1)).toEqual({ channel: BLUETOOTH_DISCONNECTED_CHANNEL, payload: { deviceId: "dev-1" } });
    await expect(h.service.read(h.ref)).rejects.toThrow("not connected");
  });

  it("cleans up after the window that owned the scan and the connection", async () => {
    const h = harness();
    await h.service.startScan(h.owner, { services: [] });
    h.advertise();
    await h.service.connect(h.owner, { deviceId: "dev-1" });
    await h.service.startScan(h.owner, { services: [] });
    (h.owner as unknown as EventEmitter).emit("destroyed");
    await flush();
    expect(h.isScanning()).toBe(false);
    await expect(h.service.read(h.ref)).rejects.toThrow("not connected");
  });

  it("refuses a device no scan has seen", async () => {
    const h = harness();
    await expect(h.service.connect(h.owner, { deviceId: "nope" })).rejects.toThrow("Scan again");
  });
});
