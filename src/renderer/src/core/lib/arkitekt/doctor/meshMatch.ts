import type { MeshNode, MeshProbeResult } from "../../../../../../main/doctor/protocol";

/**
 * Find the tailnet machine an alias host refers to.
 *
 * The same machine appears under four spellings — `mikro.tailnet.ts.net.`
 * (note the trailing dot the CLI emits), the short label `mikro`, the
 * OS hostname, and its 100.x address — and an alias may use any of them. A
 * miss here turns "that machine is offline" into a useless "unknown host",
 * so all four are compared.
 */

const normalize = (value: string | undefined): string => {
  const lowered = (value || "").trim().toLowerCase();
  return lowered.endsWith(".") ? lowered.slice(0, -1) : lowered;
};

const shortLabel = (value: string): string => normalize(value).split(".")[0] || "";

const candidates = (node: MeshNode): string[] => {
  const names = [normalize(node.dnsName), normalize(node.hostName)];
  const shorts = names.filter(Boolean).map(shortLabel);
  return [...names, ...shorts, ...node.ips.map(normalize)].filter(Boolean);
};

export const matchPeer = (
  host: string,
  mesh: MeshProbeResult | undefined,
): MeshNode | undefined => {
  if (!mesh || !mesh.available) return undefined;

  const wanted = normalize(host);
  if (!wanted) return undefined;
  const wantedShort = shortLabel(wanted);

  const nodes = [...(mesh.self ? [mesh.self] : []), ...mesh.peers];

  // An exact spelling wins over a short-label collision.
  const exact = nodes.find((node) =>
    candidates(node).some((candidate) => candidate === wanted),
  );
  if (exact) return exact;

  if (!wantedShort || wantedShort === wanted) {
    return nodes.find((node) =>
      candidates(node).some((candidate) => shortLabel(candidate) === wanted),
    );
  }

  return undefined;
};

/** Is this node the machine we are running on? */
export const isSelf = (node: MeshNode | undefined, mesh: MeshProbeResult | undefined): boolean =>
  !!node && !!mesh && mesh.available && !!mesh.self && node === mesh.self;

/**
 * Does the host sit in the tailnet we are actually signed into?
 *
 * Only answerable for a fully-qualified MagicDNS name — a bare label or a
 * 100.x address carries no tailnet in it, so those return `undefined` rather
 * than guessing "wrong tailnet" and sending the user down a false trail.
 */
export const tailnetMismatch = (
  host: string,
  mesh: MeshProbeResult | undefined,
): { host: string; expected: string } | undefined => {
  if (!mesh || !mesh.available) return undefined;

  const suffix = normalize(mesh.magicDnsSuffix);
  const wanted = normalize(host);
  if (!suffix || !wanted.endsWith(".ts.net")) return undefined;
  if (wanted.endsWith(`.${suffix}`)) return undefined;

  // Everything after the first label is the tailnet this alias belongs to.
  const theirs = wanted.split(".").slice(1).join(".");
  return { host: theirs, expected: suffix };
};
