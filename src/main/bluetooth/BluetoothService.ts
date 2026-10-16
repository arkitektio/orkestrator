import { createRequire } from "node:module";
import type { IpcMainInvokeEvent, WebContents } from "electron";
import type { AppModule } from "../modules/AppModule";
import type { IpcTransport } from "../modules/IpcTransport";
import {
  BLUETOOTH_AVAILABILITY_CHANNEL,
  BLUETOOTH_CONNECT_CHANNEL,
  BLUETOOTH_DEVICES_CHANNEL,
  BLUETOOTH_DISCONNECT_CHANNEL,
  BLUETOOTH_DISCONNECTED_CHANNEL,
  BLUETOOTH_NOTIFICATION_CHANNEL,
  BLUETOOTH_NOTIFY_START_CHANNEL,
  BLUETOOTH_NOTIFY_STOP_CHANNEL,
  BLUETOOTH_READ_CHANNEL,
  BLUETOOTH_SCAN_START_CHANNEL,
  BLUETOOTH_SCAN_STOP_CHANNEL,
  BLUETOOTH_WRITE_CHANNEL,
  normalizeUuid,
  type BluetoothAvailability,
  type BluetoothCharacteristicRef,
  type BluetoothConnectRequest,
  type BluetoothConnectResult,
  type BluetoothDeviceInfo,
  type BluetoothScanEvent,
  type BluetoothScanRequest,
  type BluetoothWriteRequest,
} from "./protocol";

/*
 * The slice of `webbluetooth`'s NATIVE layer (napi-rs over btleplug) used
 * here. Its Web Bluetooth wrapper (`webbluetooth/dist`) is not: 7.0.0 and
 * 7.1.0 both ship it without the `./uuid` module it requires, so it cannot
 * load. The native layer is complete and is what the wrapper drives anyway.
 * On Linux it talks to BlueZ over D-Bus: no root, no setcap.
 */
export type NativeCharacteristic = {
  uuid: string;
  read: boolean;
  write: boolean;
  writeWithoutResponse: boolean;
  notify: boolean;
  indicate: boolean;
  nativeReadValue(): Promise<Uint8Array>;
  nativeWriteValueWithResponse(value: Uint8Array): Promise<void>;
  nativeWriteValueWithoutResponse(value: Uint8Array): Promise<void>;
  nativeStartNotifications(callback: (value: number[]) => void): Promise<void>;
  nativeStopNotifications(): Promise<void>;
};

export type NativeService = {
  uuid: string;
  getCharacteristics(): Promise<NativeCharacteristic[]>;
};

export type NativeGattServer = {
  connected: boolean;
  nativeConnect(): Promise<void>;
  nativeDisconnect(): Promise<void>;
  nativeGetPrimaryServices(): Promise<NativeService[]>;
};

export type NativeDevice = {
  id: string;
  name?: string | null;
  serviceUuids: string[];
  gatt(): NativeGattServer;
};

export type NativeAdapterEmitter = {
  startScan(adapterIndex: number, callback: (device: NativeDevice) => void): Promise<void>;
  stopScan(): Promise<void>;
  addDisconnect(adapterIndex: number, callback: (deviceId: string) => void): Promise<void>;
};

export type NativeBluetooth = {
  getAdapters(): Promise<{ index: number; address: string; active: boolean }[]>;
  getAvailability(adapterIndex: number): Promise<boolean>;
  AdapterEmitter: new () => NativeAdapterEmitter;
};

export type BluetoothServiceDeps = {
  /** Loads the native addon; throws where no binary exists for this platform. */
  load: () => NativeBluetooth;
  /** How long a single GATT operation may take before it fails. */
  opTimeoutMs?: number;
  /** How long the adapter probe may take (BlueZ that is not running hangs for 25 s). */
  probeTimeoutMs?: number;
};

const defaultLoad = (): NativeBluetooth =>
  // A runtime require: the .node binary cannot be bundled (see
  // electron.vite.config.ts `external`, electron-builder.yml `asarUnpack`).
  createRequire(import.meta.url)("webbluetooth/index.js") as NativeBluetooth;

const DEFAULT_SCAN_TIMEOUT_MS = 30_000;
const ADAPTER = 0;

const withTimeout = <T>(promise: Promise<T>, ms: number, what: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out after ${Math.round(ms / 1000)} s`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

type Scan = {
  owner: WebContents;
  request: BluetoothScanRequest;
  seen: Map<string, BluetoothDeviceInfo>;
  timer: ReturnType<typeof setTimeout>;
};

type Connection = {
  owner: WebContents;
  gatt: NativeGattServer;
  characteristics: Map<string, NativeCharacteristic>;
  notifying: Set<string>;
  /** GATT operations run one at a time per device: neither btleplug nor an ESP32 likes overlap. */
  queue: Promise<unknown>;
};

const charKey = (service: string, characteristic: string) =>
  `${normalizeUuid(service)}/${normalizeUuid(characteristic)}`;

export class BluetoothService implements AppModule {
  private native: NativeBluetooth | null = null;
  private emitter: NativeAdapterEmitter | null = null;
  private disconnectWatch: Promise<void> | null = null;
  private scan: Scan | null = null;
  /** Every device seen by any scan; connecting needs the native handle. */
  private readonly known = new Map<string, NativeDevice>();
  private readonly connections = new Map<string, Connection>();
  private readonly watchedOwners = new WeakSet<WebContents>();
  private readonly opTimeoutMs: number;
  private readonly probeTimeoutMs: number;

  constructor(
    private readonly transport: Pick<IpcTransport, "handleChannel" | "sendTo">,
    private readonly deps: BluetoothServiceDeps = { load: defaultLoad },
  ) {
    this.opTimeoutMs = deps.opTimeoutMs ?? 15_000;
    this.probeTimeoutMs = deps.probeTimeoutMs ?? 4_000;
  }

  setup() {
    const handle = <A, R>(channel: string, fn: (sender: WebContents, arg: A) => Promise<R>) =>
      this.transport.handleChannel(channel, (event: IpcMainInvokeEvent, arg: A) => fn(event.sender, arg));

    handle(BLUETOOTH_AVAILABILITY_CHANNEL, () => this.availability());
    handle(BLUETOOTH_SCAN_START_CHANNEL, (sender, request: BluetoothScanRequest) => this.startScan(sender, request));
    handle(BLUETOOTH_SCAN_STOP_CHANNEL, () => this.stopScan());
    handle(BLUETOOTH_CONNECT_CHANNEL, (sender, request: BluetoothConnectRequest) => this.connect(sender, request));
    handle(BLUETOOTH_DISCONNECT_CHANNEL, (_sender, request: BluetoothConnectRequest) =>
      this.disconnect(request.deviceId),
    );
    handle(BLUETOOTH_READ_CHANNEL, (_sender, ref: BluetoothCharacteristicRef) => this.read(ref));
    handle(BLUETOOTH_WRITE_CHANNEL, (_sender, request: BluetoothWriteRequest) => this.write(request));
    handle(BLUETOOTH_NOTIFY_START_CHANNEL, (_sender, ref: BluetoothCharacteristicRef) => this.startNotifications(ref));
    handle(BLUETOOTH_NOTIFY_STOP_CHANNEL, (_sender, ref: BluetoothCharacteristicRef) => this.stopNotifications(ref));
  }

  async onBeforeQuit() {
    await this.shutdown();
  }

  async shutdown() {
    await this.stopScan();
    await Promise.all([...this.connections.keys()].map((id) => this.disconnect(id)));
  }

  private loadNative(): NativeBluetooth {
    if (!this.native) this.native = this.deps.load();
    return this.native;
  }

  private adapterEmitter(): NativeAdapterEmitter {
    if (!this.emitter) this.emitter = new (this.loadNative().AdapterEmitter)();
    return this.emitter;
  }

  async availability(): Promise<BluetoothAvailability> {
    let native: NativeBluetooth;
    try {
      native = this.loadNative();
    } catch (error) {
      return { available: false, reason: "unsupported", detail: errorText(error) };
    }
    try {
      const adapters = await withTimeout(native.getAdapters(), this.probeTimeoutMs, "Looking for a Bluetooth adapter");
      if (adapters.length === 0) return { available: false, reason: "no-adapter" };
      const powered = await withTimeout(native.getAvailability(ADAPTER), this.probeTimeoutMs, "Asking the adapter");
      return powered ? { available: true } : { available: false, reason: "powered-off" };
    } catch (error) {
      return { available: false, reason: "no-adapter", detail: errorText(error) };
    }
  }

  private watchOwner(owner: WebContents) {
    if (this.watchedOwners.has(owner)) return;
    this.watchedOwners.add(owner);
    owner.once("destroyed", () => {
      if (this.scan?.owner === owner) void this.stopScan();
      for (const [id, connection] of this.connections) {
        if (connection.owner === owner) void this.disconnect(id);
      }
    });
  }

  private matches(device: NativeDevice, request: BluetoothScanRequest): boolean {
    if (request.namePrefix && !(device.name ?? "").startsWith(request.namePrefix)) return false;
    if (request.services.length === 0) return true;
    const advertised = new Set(device.serviceUuids.map(normalizeUuid));
    return request.services.some((service) => advertised.has(normalizeUuid(service)));
  }

  private publishScan(error?: string) {
    const scan = this.scan;
    if (!scan) return;
    const event: BluetoothScanEvent = { devices: [...scan.seen.values()], scanning: true, error };
    this.transport.sendTo(scan.owner, BLUETOOTH_DEVICES_CHANNEL, event);
  }

  async startScan(owner: WebContents, request: BluetoothScanRequest): Promise<void> {
    await this.stopScan();
    const emitter = this.adapterEmitter();
    this.watchOwner(owner);

    const scan: Scan = {
      owner,
      request,
      seen: new Map(),
      timer: setTimeout(() => void this.stopScan(), request.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS),
    };
    this.scan = scan;
    this.publishScan();

    // The scan runs until stopScan; its promise is not awaited for the
    // duration, only watched for a failure to start.
    emitter
      .startScan(ADAPTER, (device) => {
        if (this.scan !== scan) return;
        this.known.set(device.id, device);
        if (!this.matches(device, request)) return;
        const info: BluetoothDeviceInfo = {
          id: device.id,
          name: device.name ?? null,
          services: device.serviceUuids.map(normalizeUuid),
        };
        const previous = scan.seen.get(device.id);
        if (previous && previous.name === info.name && previous.services.length === info.services.length) return;
        scan.seen.set(device.id, info);
        this.publishScan();
      })
      .catch((error) => {
        if (this.scan !== scan) return;
        this.publishScan(errorText(error));
        void this.stopScan();
      });
  }

  async stopScan(): Promise<void> {
    const scan = this.scan;
    if (!scan) return;
    this.scan = null;
    clearTimeout(scan.timer);
    const event: BluetoothScanEvent = { devices: [...scan.seen.values()], scanning: false };
    this.transport.sendTo(scan.owner, BLUETOOTH_DEVICES_CHANNEL, event);
    await withTimeout(this.adapterEmitter().stopScan(), 1_000, "Stopping the scan").catch(() => undefined);
  }

  private watchDisconnects() {
    if (this.disconnectWatch) return;
    this.disconnectWatch = this.adapterEmitter()
      .addDisconnect(ADAPTER, (deviceId) => this.dropped(deviceId))
      .catch(() => {
        this.disconnectWatch = null;
      });
  }

  private dropped(deviceId: string) {
    const connection = this.connections.get(deviceId);
    if (!connection) return;
    this.connections.delete(deviceId);
    this.transport.sendTo(connection.owner, BLUETOOTH_DISCONNECTED_CHANNEL, { deviceId });
  }

  async connect(owner: WebContents, { deviceId }: BluetoothConnectRequest): Promise<BluetoothConnectResult> {
    const device = this.known.get(deviceId);
    if (!device) throw new Error("This device is no longer in range. Scan again.");
    // Connecting while scanning is unreliable on several stacks.
    await this.stopScan();
    this.watchOwner(owner);
    this.watchDisconnects();

    const existing = this.connections.get(deviceId);
    if (existing?.gatt.connected) return this.describe(existing);

    const gatt = device.gatt();
    await withTimeout(gatt.nativeConnect(), this.opTimeoutMs, "Connecting");
    const characteristics = new Map<string, NativeCharacteristic>();
    const services = await withTimeout(gatt.nativeGetPrimaryServices(), this.opTimeoutMs, "Discovering services");
    for (const service of services) {
      for (const characteristic of await service.getCharacteristics()) {
        characteristics.set(charKey(service.uuid, characteristic.uuid), characteristic);
      }
    }
    const connection: Connection = { owner, gatt, characteristics, notifying: new Set(), queue: Promise.resolve() };
    this.connections.set(deviceId, connection);
    return this.describe(connection);
  }

  private describe(connection: Connection): BluetoothConnectResult {
    const services = new Map<string, BluetoothConnectResult["services"][number]>();
    for (const [key, c] of connection.characteristics) {
      const service = key.split("/")[0];
      if (!services.has(service)) services.set(service, { uuid: service, characteristics: [] });
      services.get(service)!.characteristics.push({
        uuid: normalizeUuid(c.uuid),
        read: c.read,
        write: c.write,
        writeWithoutResponse: c.writeWithoutResponse,
        notify: c.notify,
        indicate: c.indicate,
      });
    }
    return { services: [...services.values()] };
  }

  async disconnect(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (!connection) return;
    this.connections.delete(deviceId);
    await withTimeout(connection.gatt.nativeDisconnect(), this.opTimeoutMs, "Disconnecting").catch(() => undefined);
  }

  /** Runs `op` on the characteristic once every earlier operation on the device finished. */
  private enqueue<T>(ref: BluetoothCharacteristicRef, what: string, op: (c: NativeCharacteristic) => Promise<T>) {
    const connection = this.connections.get(ref.deviceId);
    if (!connection) return Promise.reject(new Error("The device is not connected."));
    const characteristic = connection.characteristics.get(charKey(ref.service, ref.characteristic));
    if (!characteristic) {
      return Promise.reject(new Error(`The device has no characteristic ${ref.characteristic}.`));
    }
    const attempt = () =>
      withTimeout(op(characteristic), this.opTimeoutMs, what).catch((error) => {
        // A failed operation is often the first sign of a drop; say so even if
        // the adapter's disconnect event is late or never comes.
        if (!connection.gatt.connected) this.dropped(ref.deviceId);
        throw error;
      });
    const run = connection.queue.then(attempt, attempt);
    connection.queue = run.catch(() => undefined);
    return run;
  }

  read(ref: BluetoothCharacteristicRef): Promise<Uint8Array> {
    return this.enqueue(ref, "Reading", async (c) => Uint8Array.from(await c.nativeReadValue()));
  }

  write({ value, withResponse = true, ...ref }: BluetoothWriteRequest): Promise<void> {
    const bytes = Uint8Array.from(value);
    return this.enqueue(ref, "Writing", (c) =>
      withResponse ? c.nativeWriteValueWithResponse(bytes) : c.nativeWriteValueWithoutResponse(bytes),
    );
  }

  startNotifications(ref: BluetoothCharacteristicRef): Promise<void> {
    const connection = this.connections.get(ref.deviceId);
    const key = charKey(ref.service, ref.characteristic);
    if (connection?.notifying.has(key)) return Promise.resolve();
    return this.enqueue(ref, "Subscribing", async (c) => {
      await c.nativeStartNotifications((value) => {
        const current = this.connections.get(ref.deviceId);
        if (!current) return;
        this.transport.sendTo(current.owner, BLUETOOTH_NOTIFICATION_CHANNEL, {
          deviceId: ref.deviceId,
          service: normalizeUuid(ref.service),
          characteristic: normalizeUuid(ref.characteristic),
          value: Uint8Array.from(value),
        });
      });
      connection?.notifying.add(key);
    });
  }

  stopNotifications(ref: BluetoothCharacteristicRef): Promise<void> {
    const connection = this.connections.get(ref.deviceId);
    const key = charKey(ref.service, ref.characteristic);
    if (!connection?.notifying.has(key)) return Promise.resolve();
    return this.enqueue(ref, "Unsubscribing", async (c) => {
      connection.notifying.delete(key);
      await c.nativeStopNotifications();
    });
  }
}
