import { z } from "zod";
import type { GattConnection } from "@/core/bluetooth";
import type { WifiProfile } from "../../../../main/wifi/protocol";

/**
 * Arkitekt device provisioning over BLE, GATT v2: everything a device and
 * this app agree on, in this one file. The firmware side is
 * `~/Code/embedded/arkitekt-esp32` (owned by the firmware rewrite; spec
 * `docs/REWRITE_PLAN.md` §2), pokket speaks the same protocol from
 * `lib/ble`. Nothing outside this file knows a UUID or a byte layout.
 *
 * - `info` (read): JSON {protocol: 2, manifest, build, state, has_key, has_wifi, pubkey?}
 * - `config` (write): one JSON document {wifi?, origin?, key?}, framed as
 *   `BEGIN <bytes>`, chunks, `COMMIT <sha256 hex>` (or `ABORT`); the device
 *   saves it atomically on COMMIT. A missing field keeps what the device has.
 * - `status` (read + notify): JSON {state, detail}
 *
 * The firmware takes chunks of 1–512 bytes between BEGIN and COMMIT and a
 * document of at most 16 KiB. v2 is specified but not released yet.
 */

/** Advertised by a device in pairing mode; scans filter on it. */
export const PROVISIONING_SERVICE = "8f9e0000-aa5e-4c71-8e86-e14a970e3b0b";
export const INFO_CHARACTERISTIC = "8f9e0001-aa5e-4c71-8e86-e14a970e3b0b";
export const CONFIG_CHARACTERISTIC = "8f9e0002-aa5e-4c71-8e86-e14a970e3b0b";
export const STATUS_CHARACTERISTIC = "8f9e0003-aa5e-4c71-8e86-e14a970e3b0b";

/** The largest document a device takes. */
export const MAX_CONFIG_BYTES = 16 * 1024;

/** The name prefix the firmware advertises (`ARKITEKT-<last 4 hex of device id>`). */
export const DEVICE_NAME_PREFIX = "ARKITEKT-";

/**
 * Bytes per config write. btleplug can neither ask for nor tell the MTU, so
 * this stays under the smallest MTU in practice (iOS/macOS 185); the stacks
 * turn a larger write into a long write anyway.
 */
export const CONFIG_CHUNK_BYTES = 180;

export const DeviceRequirementSchema = z.object({
  key: z.string().min(1),
  service: z.string().min(1),
  description: z.string().nullish(),
  optional: z.boolean().default(false),
});

export const DeviceManifestSchema = z.object({
  identifier: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9._-]+$/, "identifier: letters, digits, dots, hyphens and underscores only"),
  version: z.string().min(1),
  device_id: z.string().min(1, "device_id must not be empty"),
  scopes: z.array(z.string()).default([]),
  requirements: z.array(DeviceRequirementSchema).default([]),
});

export const DeviceInfoSchema = z.object({
  protocol: z.literal(2),
  manifest: DeviceManifestSchema,
  build: z.string().nullish(),
  state: z.string().nullish(),
  has_key: z.boolean().default(false),
  has_wifi: z.boolean().default(false),
  pubkey: z.string().nullish(),
});

export type DeviceManifest = z.infer<typeof DeviceManifestSchema>;
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

export class DeviceProtocolError extends Error {
  name = "DeviceProtocolError";
}

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const encode = (text: string) => new TextEncoder().encode(text);

export const parseInfo = (bytes: Uint8Array): DeviceInfo => {
  let raw: unknown;
  try {
    raw = JSON.parse(decode(bytes));
  } catch {
    throw new DeviceProtocolError("The device's info is not JSON. Is its firmware current?");
  }
  if (raw && typeof raw === "object" && (raw as { protocol?: unknown }).protocol !== 2) {
    throw new DeviceProtocolError(
      `The device speaks provisioning protocol ${String((raw as { protocol?: unknown }).protocol ?? "1")}; this app needs 2. Update its firmware.`,
    );
  }
  const result = DeviceInfoSchema.safeParse(raw);
  if (!result.success) {
    throw new DeviceProtocolError(
      `The device's info is invalid: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  }
  return result.data;
};

/** The device's progress, in the order it moves through it. */
export type DeviceState =
  | "idle"
  | "receiving"
  | "saved"
  | "wifi_connecting"
  | "wifi_failed"
  | "wifi_ok"
  | "logging_in"
  | "login_failed"
  | "registering"
  | "registered";

export type DeviceStatus = {
  state: DeviceState | string;
  /** `login_failed:<invalid_grant|network|server>` carries its reason here. */
  reason: string | null;
  detail: string | null;
  outcome: "pending" | "success" | "failure";
};

export const parseStatus = (bytes: Uint8Array): DeviceStatus => {
  let state = "";
  let detail: string | null = null;
  try {
    const raw = JSON.parse(decode(bytes)) as { state?: unknown; detail?: unknown };
    state = typeof raw.state === "string" ? raw.state : "";
    detail = typeof raw.detail === "string" && raw.detail ? raw.detail : null;
  } catch {
    state = decode(bytes).trim();
  }
  const [base, reason = null] = state.split(":", 2) as [string, string?];
  const outcome = base === "registered" ? "success" : base === "wifi_failed" || base === "login_failed" ? "failure" : "pending";
  return { state: base, reason, detail, outcome };
};

export const STATUS_TEXT: Record<DeviceState, string> = {
  idle: "Waiting for a configuration",
  receiving: "Receiving the configuration",
  saved: "Configuration saved",
  wifi_connecting: "Joining the Wi-Fi",
  wifi_failed: "Could not join the Wi-Fi",
  wifi_ok: "On the Wi-Fi",
  logging_in: "Signing in",
  login_failed: "Could not sign in",
  registering: "Registering as an agent",
  registered: "Registered",
};

export const statusText = (status: DeviceStatus): string => {
  const base = STATUS_TEXT[status.state as DeviceState] ?? status.state;
  if (status.state === "login_failed" && status.reason === "invalid_grant") {
    return `${base}: the server refused the key (revoked, expired, or the device does not match it)`;
  }
  if (status.state === "login_failed" && status.reason) return `${base} (${status.reason})`;
  return base;
};

/** The config document v2 carries. Every field is optional: a missing one keeps the device's own. */
export type DeviceConfig = {
  wifi?: {
    ssid: string;
    password?: string;
    eap?: { identity: string; anonymous_identity?: string; ca_pem?: string };
  };
  /** The deployment ORIGIN (`https://host`); the device discovers lok through `/.well-known/fakts`. */
  origin?: string;
  /** The mandate key the device signs in with. */
  key?: string;
};

export const wifiConfig = (profile: WifiProfile): NonNullable<DeviceConfig["wifi"]> =>
  profile.type === "eduroam"
    ? {
        ssid: profile.ssid,
        password: profile.password,
        eap: {
          identity: profile.identity ?? "",
          ...(profile.anonymousIdentity ? { anonymous_identity: profile.anonymousIdentity } : {}),
          // No CA: the device skips the server check (the profile says so).
          ...(!profile.skipCertValidation && profile.caPem ? { ca_pem: profile.caPem } : {}),
        },
      }
    : { ssid: profile.ssid, password: profile.password };

/** `https://go.arkitekt.live/lok/` → `https://go.arkitekt.live`. */
export const deploymentOrigin = (baseUrl: string): string => new URL(baseUrl).origin;

const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
};

/** The document as the device receives it; throws when it is larger than a device takes. */
export const encodeConfig = (config: DeviceConfig): Uint8Array => {
  const document = encode(JSON.stringify(config));
  if (document.length > MAX_CONFIG_BYTES) {
    throw new DeviceProtocolError(`The configuration is ${document.length} bytes; a device takes at most ${MAX_CONFIG_BYTES}.`);
  }
  return document;
};

/** The writes that carry one config document: BEGIN, the chunks, COMMIT. */
export const frameConfig = async (config: DeviceConfig, chunkBytes = CONFIG_CHUNK_BYTES): Promise<Uint8Array[]> => {
  const document = encodeConfig(config);
  const frames: Uint8Array[] = [encode(`BEGIN ${document.length}`)];
  for (let offset = 0; offset < document.length; offset += chunkBytes) {
    frames.push(document.subarray(offset, offset + chunkBytes));
  }
  frames.push(encode(`COMMIT ${await sha256Hex(document)}`));
  return frames;
};

export const ABORT_FRAME = encode("ABORT");

/** One connected device that speaks provisioning v2. */
export type ProvisioningDevice = {
  readInfo: () => Promise<DeviceInfo>;
  readStatus: () => Promise<DeviceStatus>;
  /** Sends the document; `onProgress` gets the fraction of writes done. Aborts the upload on failure. */
  writeConfig: (config: DeviceConfig, onProgress?: (fraction: number) => void) => Promise<void>;
  onStatus: (cb: (status: DeviceStatus) => void) => Promise<() => void>;
};

export const openProvisioningDevice = (gatt: GattConnection): ProvisioningDevice => {
  if (![INFO_CHARACTERISTIC, CONFIG_CHARACTERISTIC, STATUS_CHARACTERISTIC].every((c) => gatt.has(PROVISIONING_SERVICE, c))) {
    throw new DeviceProtocolError(
      "This device does not offer Arkitekt provisioning v2. It may run older firmware, or be another device.",
    );
  }
  return {
    readInfo: async () => parseInfo(await gatt.read(PROVISIONING_SERVICE, INFO_CHARACTERISTIC)),
    readStatus: async () => parseStatus(await gatt.read(PROVISIONING_SERVICE, STATUS_CHARACTERISTIC)),
    writeConfig: async (config, onProgress) => {
      const frames = await frameConfig(config);
      try {
        for (const [index, frame] of frames.entries()) {
          await gatt.write(PROVISIONING_SERVICE, CONFIG_CHARACTERISTIC, frame);
          onProgress?.((index + 1) / frames.length);
        }
      } catch (error) {
        if (gatt.connected) {
          await gatt.write(PROVISIONING_SERVICE, CONFIG_CHARACTERISTIC, ABORT_FRAME).catch(() => undefined);
        }
        throw error;
      }
    },
    onStatus: (cb) => gatt.notify(PROVISIONING_SERVICE, STATUS_CHARACTERISTIC, (value) => cb(parseStatus(value))),
  };
};
