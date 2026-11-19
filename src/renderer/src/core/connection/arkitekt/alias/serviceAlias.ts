import type { Alias, Instance } from "../fakts/faktsSchema";

/**
 * Which of an instance's aliases an app may use at all, and in which order it
 * prefers them. The choice between them is a race, `controller/probe.ts`.
 *
 * An instance whose hub registered its certificate (`instance.tls`) is strict:
 * its plain-HTTP aliases are not used where plain HTTP is readable by the
 * network in between (`isInsecureTransport`) — they are there for the apps
 * that predate the certificate. Mirrors fakts' `strict_view` and
 * `ranked_view` (`fakts/aliases.py`).
 */

/** Whether `instance`'s hub registered the certificate its TLS aliases present. */
export const isStrictInstance = (instance: Instance): boolean =>
  (instance.tls?.certificates.length ?? 0) > 0;

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Whether `host` never leaves this machine: `localhost`, `*.localhost`, or a loopback IP. */
const isLoopbackHost = (raw: string): boolean => {
  const host = raw.trim().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  const ipv4 = IPV4.exec(host);
  if (ipv4) return ipv4.slice(1).every((octet) => Number(octet) <= 255) && ipv4[1] === "127";
  // IPv6 loopback, written out or compressed.
  return /^(0{0,4}:){2,7}0{0,3}1$/.test(host) && host.replace(/[0:]/g, "") === "1";
};

/**
 * Whether `alias` is plain HTTP over the local network or the internet, where
 * anyone in between can read and change it, tokens included. Loopback never
 * leaves the machine, the mesh is encrypted itself, and an internal alias stays
 * on the deployment's own network. fakts' `is_insecure_transport`.
 */
export const isInsecureTransport = (alias: Alias): boolean => {
  if (alias.ssl || alias.kind === "mesh" || alias.reach === "mesh") return false;
  const internal = alias.reach === "internal" || alias.kind === "docker";
  const loopback = alias.reach === "loopback" || isLoopbackHost(alias.host);
  return !(internal || loopback);
};

/**
 * The aliases of `instance` an app may use: all of them, or for a strict
 * instance those that are not an insecure transport — plus any plain one this
 * profile routes through its mesh (`routed`), which lok may not call a mesh
 * address (a pinned host, a MagicDNS name).
 */
export const usableAliases = (instance: Instance, routed: (alias: Alias) => boolean): Alias[] =>
  isStrictInstance(instance)
    ? instance.aliases.filter((alias) => !isInsecureTransport(alias) || routed(alias))
    : instance.aliases;

/** The part of the ranking the server decides: aliases without a priority after those with one. */
const serverRank = (alias: Alias): [number, number] => [alias.priority == null ? 1 : 0, alias.priority ?? 0];

const compare = (a: number[], b: number[]): number => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

/**
 * `aliases` in the order this client tries them: lok's `priority` (lower
 * first; none after any) decides; among aliases ranked alike, `preferred` (the
 * one that answered last time) goes first, then the order given. With no
 * priorities at all that is `preferred` first, then the order given. Stable.
 */
export const rankAliases = (aliases: Alias[], preferred?: Alias): Alias[] =>
  aliases
    .map((alias, index) => ({ alias, key: [...serverRank(alias), alias === preferred ? 0 : 1, index] }))
    .sort((a, b) => compare(a.key, b.key))
    .map(({ alias }) => alias);

/** Whether no alias in `aliases` is ranked strictly before `alias` by lok's priority. */
export const rankedFirst = (alias: Alias, aliases: Alias[]): boolean =>
  aliases.every((other) => compare(serverRank(other), serverRank(alias)) >= 0);
