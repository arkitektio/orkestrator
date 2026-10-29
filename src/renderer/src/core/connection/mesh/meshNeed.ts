import type { ActiveFakts } from "@/core/connection/arkitekt/fakts/faktsSchema";
import type { ProfileMesh } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { classifyHost } from "@/core/connection/arkitekt/doctor/classify";
import { controlDomain } from "../../../../../main/mesh/protocol";

/**
 * Does this hub need the mesh at all?
 *
 * Only if one of its addresses lives on it. Otherwise starting a node on
 * every launch, in every window, buys nothing: every service is reached
 * directly anyway. The answer is read from the hub's own fakts, so the moment
 * a refresh brings an address on the mesh, the mesh starts by itself.
 *
 * A host counts when it is pinned to the mesh, sits under the control
 * server's domain or the node's cached MagicDNS suffix, or is a tailnet IP
 * literal (100.64/10 or tailnet IPv6). A bare single label does NOT: in
 * practice that is a docker or LAN hostname, and counting it would start the
 * mesh for every compose deployment. Nor does a `*.ts.net` name: that domain
 * is Tailscale Inc's, so the host is on the system Tailscale's tailnet, never
 * on this mesh (ionscale names machines under its control domain).
 */

const norm = (host: string): string => host.trim().toLowerCase().replace(/\.$/, "");

const onMesh = (rawHost: string, mesh: ProfileMesh): boolean => {
  const host = norm(rawHost);
  if (mesh.hosts.map(norm).includes(host)) return true;
  const domain = controlDomain(mesh.controlUrl);
  if (domain && host.endsWith(`.${domain}`)) return true;
  const suffix = mesh.magicDnsSuffix ? norm(mesh.magicDnsSuffix) : undefined;
  if (suffix && (host === suffix || host.endsWith(`.${suffix}`))) return true;
  return classifyHost(host).class === "mesh-ip";
};

/** The hub's addresses that go through this mesh, deduplicated, in fakts order. */
export const meshAliases = (fakts: ActiveFakts | undefined, mesh: ProfileMesh | undefined): string[] => {
  if (!fakts || !mesh) return [];
  const hosts = [
    ...Object.values(fakts.instances).flatMap((instance) => instance.aliases.map((alias) => alias.host)),
    fakts.self.alias.host,
  ];
  return [...new Set(hosts.map(norm).filter((host) => onMesh(host, mesh)))];
};

export const meshNeeded = (fakts: ActiveFakts | undefined, mesh: ProfileMesh | undefined): boolean =>
  meshAliases(fakts, mesh).length > 0;
