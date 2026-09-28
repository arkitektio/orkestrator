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
 * server's domain or the node's cached MagicDNS suffix, or is a mesh literal
 * (a 100.64/10 or tailnet IPv6 address, a `*.ts.net` name). A bare single
 * label does NOT: in practice that is a docker or LAN hostname, and counting
 * it would start the mesh for every compose deployment.
 */

const norm = (host: string): string => host.trim().toLowerCase().replace(/\.$/, "");

const onMesh = (rawHost: string, mesh: ProfileMesh): boolean => {
  const host = norm(rawHost);
  if (mesh.hosts.map(norm).includes(host)) return true;
  const domain = controlDomain(mesh.controlUrl);
  if (domain && host.endsWith(`.${domain}`)) return true;
  const suffix = mesh.magicDnsSuffix ? norm(mesh.magicDnsSuffix) : undefined;
  if (suffix && (host === suffix || host.endsWith(`.${suffix}`))) return true;
  const shape = classifyHost(host).class;
  return shape === "mesh-ip" || shape === "mesh-magicdns";
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
