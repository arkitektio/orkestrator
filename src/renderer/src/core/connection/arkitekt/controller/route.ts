import type { ActiveFakts, Alias } from "../fakts/faktsSchema";
import type { ProfileMesh } from "../fakts/profileStorageSchema";
import { controlDomain } from "../../../../../../main/mesh/protocol";

/**
 * Which way an address is reached: directly, or through the profile's mesh.
 *
 * The ONE place that decides it. It used to be guessed from the host string
 * in three renderer files that disagreed (a bare label was a mesh address in
 * one and a docker name in another), while lok has said it on every alias all
 * along: `reach` (`mesh`, `lan`, `public`, …) and, before that, `kind`.
 *
 * In order:
 *  1. a host the user pinned to the mesh — their explicit choice;
 *  2. the server's word that it is a mesh address (`reach` / `kind`);
 *  3. a name main WILL route through the mesh once the node runs, whatever
 *     the server called it: under the control server's domain, or under the
 *     node's cached MagicDNS suffix. This mirrors main's `pac.ts` (rules 3
 *     and 5), so an address registered as a plain absolute alias but living
 *     on the mesh is still waited for.
 *
 * "The mesh" is one thing only: the tailnet the coordination server runs
 * through ionscale, joined by the app's own node. An address that merely
 * LOOKS like Tailscale is not it. A `100.64.0.0/10` literal or a `*.ts.net`
 * name is, unless lok says otherwise, an address on the system's own
 * Tailscale (or any other VPN): a network the computer already has, reached
 * directly like a LAN address, and never a reason to start the mesh. A mesh
 * address given as an IP (MagicDNS off) is known as one because lok says so
 * (`reach`), not because of its range.
 *
 * Nor is a bare single label a mesh address by itself: in practice it is a
 * docker or LAN hostname, and treating it as one made a compose deployment's
 * aliases wait on the mesh.
 */

export type Route = { kind: "direct" } | { kind: "mesh"; meshId: string };

export const DIRECT: Route = { kind: "direct" };

type Addressed = Pick<Alias, "host"> & Partial<Pick<Alias, "reach" | "kind">>;

const norm = (host: string): string => host.trim().toLowerCase().replace(/\.$/, "");

/** Rule 3: main routes this name through `mesh` once its node runs. */
const namedOnMesh = (host: string, mesh: ProfileMesh): boolean => {
  const domain = controlDomain(mesh.controlUrl);
  // Strict subdomains only: the control server itself is reached directly.
  if (domain && host.endsWith(`.${domain}`)) return true;
  const suffix = mesh.magicDnsSuffix ? norm(mesh.magicDnsSuffix) : undefined;
  return !!suffix && (host === suffix || host.endsWith(`.${suffix}`));
};

/**
 * Does this address live on `mesh`, switched on or not? What the Mesh page
 * lists and what decides whether the hub needs the mesh at all.
 */
export const onMesh = (alias: Addressed, mesh: ProfileMesh | undefined): boolean => {
  // lok's word stands even where this profile was given no mesh: the address
  // is on one all the same, which is exactly what the doctor has to say then.
  if (alias.reach === "mesh" || alias.kind === "mesh") return true;
  if (!mesh) return false;
  const host = norm(alias.host);
  return mesh.hosts.map(norm).includes(host) || namedOnMesh(host, mesh);
};

/** Is a request to this address sent through the profile's mesh? Never through one that is switched off. */
export const viaMesh = (alias: Addressed, mesh: ProfileMesh | undefined): boolean =>
  !!mesh?.enabled && onMesh(alias, mesh);

export const routeOf = (alias: Addressed, mesh: ProfileMesh | undefined): Route =>
  mesh && viaMesh(alias, mesh) ? { kind: "mesh", meshId: mesh.id } : DIRECT;

/**
 * Every address of the hub's services, in fakts order. Not lok's own
 * (`fakts.self`): the coordination server hands out the mesh's keys, so it is
 * by definition reached without the mesh — over a network the computer
 * already has (local, public, a system VPN). Only services live behind it.
 */
export const hubAliases = (fakts: ActiveFakts | undefined): Alias[] =>
  fakts ? Object.values(fakts.instances).flatMap((instance) => instance.aliases) : [];

/** The services' hosts that live on this mesh, deduplicated, in fakts order. */
export const meshHosts = (fakts: ActiveFakts | undefined, mesh: ProfileMesh | undefined): string[] => [
  ...new Set(
    hubAliases(fakts)
      .filter((alias) => onMesh(alias, mesh))
      .map((alias) => norm(alias.host)),
  ),
];
