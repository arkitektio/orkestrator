import type { MeshNode, MeshProbeResult } from "./protocol";

/**
 * Read `tailscale status --json` into our own shape.
 *
 * Deliberately hand-written and tolerant rather than zod-validated: the CLI's
 * JSON is a moving target across versions, and a schema failure here would
 * turn the diagnostic into a second outage precisely when the user needs it.
 * Anything missing or unexpected degrades to `undefined`; nothing throws.
 */

type Unknown = Record<string, unknown>;

const asRecord = (value: unknown): Unknown | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Unknown) : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const toNode = (raw: unknown): MeshNode | undefined => {
  const node = asRecord(raw);
  if (!node) return undefined;

  return {
    id: asString(node.ID),
    dnsName: asString(node.DNSName),
    hostName: asString(node.HostName),
    ips: asStringArray(node.TailscaleIPs),
    online: asBoolean(node.Online),
    expired: asBoolean(node.Expired) ?? false,
    keyExpiry: asString(node.KeyExpiry),
    os: asString(node.OS),
    lastSeen: asString(node.LastSeen),
  };
};

/**
 * The tailnet's name. Newer CLIs put it under `CurrentTailnet.Name`; older ones
 * only have `MagicDNSSuffix`, which is the same thing for our purposes.
 */
const readTailnetName = (root: Unknown): string | undefined => {
  const tailnet = asRecord(root.CurrentTailnet);
  return asString(tailnet?.Name) ?? asString(tailnet?.MagicDNSSuffix);
};

export const parseTailscaleStatus = (raw: string): MeshProbeResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      vendor: "tailscale",
      available: false,
      reason: "cli-failed",
      detail: "Tailscale returned something that was not valid JSON.",
    };
  }

  const root = asRecord(parsed);
  if (!root) {
    return {
      vendor: "tailscale",
      available: false,
      reason: "cli-failed",
      detail: "Tailscale returned an unexpected shape.",
    };
  }

  const peerMap = asRecord(root.Peer) ?? {};
  const peers = Object.values(peerMap)
    .map(toNode)
    .filter((node): node is MeshNode => !!node);

  return {
    vendor: "tailscale",
    available: true,
    // A CLI new enough to have no BackendState at all is treated as unknown
    // rather than as "stopped" — we never invent an outage.
    backendState: asString(root.BackendState) ?? "NoState",
    magicDnsSuffix: asString(root.MagicDNSSuffix),
    tailnetName: readTailnetName(root),
    self: toNode(root.Self),
    peers,
  };
};
