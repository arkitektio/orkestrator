import type {
  BluetoothAvailability,
  BluetoothServiceInfo,
} from "../../../../main/bluetooth/protocol";
import { normalizeUuid } from "../../../../main/bluetooth/protocol";

/**
 * GATT over `window.api.bluetooth`, whose other end is `BluetoothService` in
 * the main process (a native btleplug addon). This file knows no device
 * protocol: it reads, writes and subscribes to characteristics by UUID.
 */

export type BluetoothApi = NonNullable<Window["api"]>["bluetooth"];

/** The bridge, or undefined outside the desktop app (a browser build, a test). */
export const bluetoothApi = (): BluetoothApi | undefined => window.api?.bluetooth;

export const bluetoothAvailability = async (): Promise<BluetoothAvailability> => {
  const api = bluetoothApi();
  if (!api) return { available: false, reason: "unsupported", detail: "Bluetooth needs the desktop app." };
  return api.availability();
};

export type GattConnection = {
  deviceId: string;
  services: BluetoothServiceInfo[];
  /** Whether the device offers this characteristic under this service. */
  has: (service: string, characteristic: string) => boolean;
  read: (service: string, characteristic: string) => Promise<Uint8Array>;
  write: (service: string, characteristic: string, value: Uint8Array, withResponse?: boolean) => Promise<void>;
  /** Subscribes to a characteristic; the returned function unsubscribes. */
  notify: (service: string, characteristic: string, onValue: (value: Uint8Array) => void) => Promise<() => void>;
  /** Called once when the device drops the connection (not on `disconnect()`). */
  onDisconnected: (cb: () => void) => () => void;
  disconnect: () => Promise<void>;
  readonly connected: boolean;
};

export const connectGatt = async (deviceId: string, api: BluetoothApi | undefined = bluetoothApi()): Promise<GattConnection> => {
  if (!api) throw new Error("Bluetooth needs the desktop app.");
  const { services } = await api.connect(deviceId);

  let connected = true;
  const dropListeners = new Set<() => void>();
  const disposers: (() => void)[] = [];
  disposers.push(
    api.onDisconnected((event) => {
      if (event.deviceId !== deviceId || !connected) return;
      connected = false;
      dropListeners.forEach((cb) => cb());
      disposers.forEach((dispose) => dispose());
    }),
  );

  const ref = (service: string, characteristic: string) => ({
    deviceId,
    service: normalizeUuid(service),
    characteristic: normalizeUuid(characteristic),
  });

  return {
    deviceId,
    services,
    has: (service, characteristic) =>
      services.some(
        (s) =>
          s.uuid === normalizeUuid(service) &&
          s.characteristics.some((c) => c.uuid === normalizeUuid(characteristic)),
      ),
    read: (service, characteristic) => api.read(ref(service, characteristic)),
    write: (service, characteristic, value, withResponse = true) =>
      api.write({ ...ref(service, characteristic), value, withResponse }),
    notify: async (service, characteristic, onValue) => {
      const target = ref(service, characteristic);
      const dispose = api.onNotification((event) => {
        if (
          event.deviceId === deviceId &&
          event.service === target.service &&
          event.characteristic === target.characteristic
        ) {
          onValue(event.value);
        }
      });
      disposers.push(dispose);
      await api.startNotifications(target);
      return () => {
        dispose();
        if (connected) void api.stopNotifications(target).catch(() => undefined);
      };
    },
    onDisconnected: (cb) => {
      dropListeners.add(cb);
      return () => dropListeners.delete(cb);
    },
    disconnect: async () => {
      if (!connected) return;
      connected = false;
      disposers.forEach((dispose) => dispose());
      await api.disconnect(deviceId);
    },
    get connected() {
      return connected;
    },
  };
};
