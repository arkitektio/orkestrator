/**
 * Bluetooth Low Energy, as main offers it to the renderer: plain GATT
 * primitives (scan, connect, read, write, notify). Main knows no device
 * protocol; what a characteristic means is the renderer's business (device
 * provisioning lives in `renderer/src/lok/provisioning`).
 *
 *   renderer ──ipc invoke──► main (BluetoothService) : "bluetooth:*"
 *   main     ──ipc send────► the window that asked  : devices, notifications, disconnects
 *
 * Events go only to the window that started the scan or opened the
 * connection; when that window goes away, its scan stops and its devices are
 * disconnected. UUIDs are lower-case 128-bit strings. Values cross IPC as
 * `Uint8Array`.
 *
 * SECRET: a write may carry Wi-Fi passwords and a mandate key. Nothing here
 * is logged or attached to `src/main/issue-reporter.ts`.
 *
 * No runtime dependencies, so the preload and the renderer can import it.
 */

export const BLUETOOTH_AVAILABILITY_CHANNEL = "bluetooth:availability";
export const BLUETOOTH_SCAN_START_CHANNEL = "bluetooth:scan-start";
export const BLUETOOTH_SCAN_STOP_CHANNEL = "bluetooth:scan-stop";
export const BLUETOOTH_CONNECT_CHANNEL = "bluetooth:connect";
export const BLUETOOTH_DISCONNECT_CHANNEL = "bluetooth:disconnect";
export const BLUETOOTH_READ_CHANNEL = "bluetooth:read";
export const BLUETOOTH_WRITE_CHANNEL = "bluetooth:write";
export const BLUETOOTH_NOTIFY_START_CHANNEL = "bluetooth:notify-start";
export const BLUETOOTH_NOTIFY_STOP_CHANNEL = "bluetooth:notify-stop";

/** main → the scanning window: the devices seen so far in this scan. */
export const BLUETOOTH_DEVICES_CHANNEL = "bluetooth:devices";
/** main → the connecting window: a characteristic's notified value. */
export const BLUETOOTH_NOTIFICATION_CHANNEL = "bluetooth:notification";
/** main → the connecting window: a device dropped the connection. */
export const BLUETOOTH_DISCONNECTED_CHANNEL = "bluetooth:disconnected";

export type BluetoothUnavailableReason =
  /** The native addon could not be loaded on this platform. */
  | "unsupported"
  /** No Bluetooth adapter (or, on Linux, no BlueZ answering). */
  | "no-adapter"
  /** The adapter is there but switched off. */
  | "powered-off"
  | "error";

export type BluetoothAvailability =
  | { available: true }
  | { available: false; reason: BluetoothUnavailableReason; detail?: string };

export type BluetoothScanRequest = {
  /** Only devices advertising at least one of these services. Empty: every device. */
  services: string[];
  namePrefix?: string;
  /** The scan stops by itself after this long. Default 30 s. */
  timeoutMs?: number;
};

export type BluetoothDeviceInfo = {
  /** The platform's peripheral id: opaque, not a hardware address on every OS. */
  id: string;
  name: string | null;
  services: string[];
};

export type BluetoothScanEvent = {
  devices: BluetoothDeviceInfo[];
  scanning: boolean;
  error?: string;
};

export type BluetoothCharacteristicInfo = {
  uuid: string;
  read: boolean;
  write: boolean;
  writeWithoutResponse: boolean;
  notify: boolean;
  indicate: boolean;
};

export type BluetoothServiceInfo = {
  uuid: string;
  characteristics: BluetoothCharacteristicInfo[];
};

export type BluetoothConnectRequest = { deviceId: string };
export type BluetoothConnectResult = { services: BluetoothServiceInfo[] };

export type BluetoothCharacteristicRef = {
  deviceId: string;
  service: string;
  characteristic: string;
};

export type BluetoothWriteRequest = BluetoothCharacteristicRef & {
  value: Uint8Array;
  /** Default true: the device acknowledges every write. */
  withResponse?: boolean;
};

export type BluetoothNotification = BluetoothCharacteristicRef & { value: Uint8Array };

export type BluetoothDisconnected = { deviceId: string };

/** The canonical form every UUID is compared in. */
export const normalizeUuid = (uuid: string): string => uuid.trim().toLowerCase();
