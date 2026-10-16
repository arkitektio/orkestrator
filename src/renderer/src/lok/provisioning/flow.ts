import type { WifiProfile } from "../../../../main/wifi/protocol";
import {
  encodeConfig,
  wifiConfig,
  type DeviceInfo,
  type DeviceStatus,
  type ProvisioningDevice,
} from "./protocol";

/**
 * One provisioning run, after the device was connected and its info read:
 * issue a mandate key pinned to the device, send Wi-Fi + origin + key in one
 * document, then follow the device's status until it registers or fails.
 *
 * The key is shown by lok exactly once. Everything that can fail without the
 * device (subscribing to its status, the document's size) happens BEFORE the
 * key is issued; if the upload then fails, the fresh mandate is revoked. Once
 * the device committed the key it keeps it, whatever it does next, and a
 * retry sends only Wi-Fi and origin (`existing`): a document without `key`
 * keeps the device's.
 */

export type IssuedKey = { key: string; mandateId: string };

export type ProvisionPhase = "issuing" | "sending" | "waiting" | "done" | "failed";

export type ProvisionProgress = {
  phase: ProvisionPhase;
  /** Fraction of the upload written, while sending. */
  sent?: number;
  status?: DeviceStatus;
  /** The mandate whose key the device holds (set once the upload succeeded, or reused). */
  mandateId?: string;
  error?: string;
};

export type ProvisionInput = {
  device: ProvisioningDevice;
  info: DeviceInfo;
  wifi: WifiProfile;
  origin: string;
  issueKey: (info: DeviceInfo) => Promise<IssuedKey>;
  revokeKey: (mandateId: string) => Promise<void>;
  /** The device already holds this mandate's key (an earlier run committed it): resend without a key. */
  existing?: { mandateId: string };
  /** Subscribes to the device dropping the connection; returns the unsubscribe. */
  onDropped: (cb: () => void) => () => void;
  onProgress: (progress: ProvisionProgress) => void;
  /** How long to wait for the device to register after the upload. */
  timeoutMs?: number;
};

export class ProvisionError extends Error {
  name = "ProvisionError";
  constructor(
    message: string,
    /** Set when the device holds this mandate's key despite the failure. */
    readonly mandateId?: string,
    readonly status?: DeviceStatus,
  ) {
    super(message);
  }
}

/** Room for any key lok issues (43 characters today), for the size check before issuing. */
const KEY_ALLOWANCE = "k".repeat(128);

export const runProvisioning = async ({
  device,
  info,
  wifi,
  origin,
  issueKey,
  revokeKey,
  existing,
  onDropped,
  onProgress,
  timeoutMs = 180_000,
}: ProvisionInput): Promise<{ mandateId: string; status: DeviceStatus }> => {
  let mandateId: string | undefined = existing?.mandateId;
  let committed = false;
  let uploading = false;
  let last: DeviceStatus | undefined;
  let settle: ((status: DeviceStatus) => void) | undefined;
  let fail: ((error: ProvisionError) => void) | undefined;
  const outcome = new Promise<DeviceStatus>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });
  // Nothing awaits it until the upload is done; keep an early rejection from going unhandled.
  outcome.catch(() => undefined);

  const failure = (error: unknown) => {
    if (error instanceof ProvisionError) return error;
    return new ProvisionError(error instanceof Error ? error.message : String(error), committed ? mandateId : undefined, last);
  };

  let unsubscribeStatus: (() => void) | undefined;
  const unsubscribeDrop = onDropped(() => {
    // After `registered` the firmware switches BLE off by design.
    if (last?.outcome === "success") return;
    fail?.(
      new ProvisionError(
        committed
          ? "The device went out of reach before it finished. It keeps its configuration; check it on the Devices page."
          : "The device dropped the connection.",
        committed ? mandateId : undefined,
        last,
      ),
    );
  });

  try {
    // A status left over from an earlier attempt must not decide this one: listen from the upload on.
    unsubscribeStatus = await device.onStatus((status) => {
      if (!uploading) return;
      last = status;
      onProgress({ phase: committed ? "waiting" : "sending", status, mandateId: committed ? mandateId : undefined });
      if (!committed) return;
      if (status.outcome === "success") settle?.(status);
      if (status.outcome === "failure") fail?.(new ProvisionError(status.detail ?? status.state, mandateId, status));
    });
    const config = { wifi: wifiConfig(wifi), origin };
    encodeConfig({ ...config, key: KEY_ALLOWANCE });

    let key: string | undefined;
    if (!existing) {
      onProgress({ phase: "issuing" });
      ({ key, mandateId } = await issueKey(info));
    }

    onProgress({ phase: "sending", sent: 0 });
    uploading = true;
    try {
      await device.writeConfig(key ? { ...config, key } : config, (sent) => onProgress({ phase: "sending", sent }));
    } catch (error) {
      // A fresh key that never arrived is taken back, so nobody can use it.
      if (!existing && mandateId) await revokeKey(mandateId).catch(() => undefined);
      throw new ProvisionError(
        `Sending the configuration failed: ${error instanceof Error ? error.message : String(error)}`,
        existing ? mandateId : undefined,
        last,
      );
    }
    committed = true;
    onProgress({ phase: "waiting", status: last, mandateId });
    // A verdict the device gave while the upload was finishing.
    if (last?.outcome === "success") settle?.(last);
    if (last?.outcome === "failure") fail?.(new ProvisionError(last.detail ?? last.state, mandateId, last));

    const timer = setTimeout(
      () =>
        fail?.(
          new ProvisionError(
            "The device saved the configuration but has not registered yet. It keeps trying; check it on the Devices page.",
            mandateId,
            last,
          ),
        ),
      timeoutMs,
    );
    try {
      const status = await outcome;
      onProgress({ phase: "done", status, mandateId });
      return { mandateId: mandateId!, status };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const error_ = failure(error);
    onProgress({ phase: "failed", status: error_.status, mandateId: error_.mandateId, error: error_.message });
    throw error_;
  } finally {
    unsubscribeStatus?.();
    unsubscribeDrop();
  }
};
