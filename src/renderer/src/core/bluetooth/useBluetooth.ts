import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BluetoothAvailability,
  BluetoothDeviceInfo,
  BluetoothScanRequest,
} from "../../../../main/bluetooth/protocol";
import { bluetoothApi, bluetoothAvailability } from "./gatt";

/** Whether this computer can do BLE; `null` while main is asked. `recheck` asks again. */
export const useBluetoothAvailability = () => {
  const [availability, setAvailability] = useState<BluetoothAvailability | null>(null);

  const recheck = useCallback(() => {
    setAvailability(null);
    bluetoothAvailability()
      .then(setAvailability)
      .catch((error) =>
        setAvailability({ available: false, reason: "error", detail: error instanceof Error ? error.message : String(error) }),
      );
  }, []);

  useEffect(recheck, [recheck]);
  return { availability, recheck };
};

/**
 * A scan through main. The device list grows while it runs; it stops by
 * itself (after `timeoutMs`), on `stop()`, on connecting, and on unmount.
 */
export const useBluetoothScan = () => {
  const [devices, setDevices] = useState<BluetoothDeviceInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);

  useEffect(() => {
    const api = bluetoothApi();
    if (!api) return;
    const dispose = api.onDevices((event) => {
      setDevices(event.devices);
      setScanning(event.scanning);
      active.current = event.scanning;
      if (event.error) setError(event.error);
    });
    return () => {
      dispose();
      if (active.current) void api.stopScan().catch(() => undefined);
    };
  }, []);

  const start = useCallback(async (request: BluetoothScanRequest) => {
    const api = bluetoothApi();
    if (!api) {
      setError("Bluetooth needs the desktop app.");
      return;
    }
    setError(null);
    setDevices([]);
    try {
      active.current = true;
      await api.startScan(request);
    } catch (e) {
      active.current = false;
      setScanning(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const stop = useCallback(async () => {
    await bluetoothApi()?.stopScan();
  }, []);

  return { devices, scanning, error, start, stop };
};
