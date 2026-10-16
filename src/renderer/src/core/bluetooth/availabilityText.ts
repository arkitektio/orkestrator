import type { BluetoothUnavailableReason } from "../../../../main/bluetooth/protocol";

/** What to tell a person whose computer cannot do BLE right now. */
export const BLUETOOTH_UNAVAILABLE_TEXT: Record<BluetoothUnavailableReason, { title: string; hint: string }> = {
  unsupported: {
    title: "Bluetooth is not supported here",
    hint: "Bluetooth works in the desktop app on Windows, macOS and Linux (x64 and arm64).",
  },
  "no-adapter": {
    title: "No Bluetooth adapter found",
    hint: "Plug in or enable a Bluetooth adapter. On Linux, the bluetooth service (BlueZ) must be running.",
  },
  "powered-off": {
    title: "Bluetooth is switched off",
    hint: "Switch Bluetooth on in your system settings, then check again.",
  },
  error: {
    title: "Bluetooth could not be checked",
    hint: "Check again; if it keeps failing, restart the app.",
  },
};
