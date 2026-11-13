import type { Alias, Instance } from "../fakts/faktsSchema";

/**
 * Which of an instance's aliases an app may use at all. The choice between
 * them is a race, `controller/probe.ts`.
 *
 * An instance whose hub registered its certificate (`instance.tls`) is strict:
 * its plain-HTTP aliases are not used unless they go through the mesh, which is
 * encrypted itself — they are there for the apps that predate the certificate.
 */

/** Whether `instance`'s hub registered the certificate its TLS aliases present. */
export const isStrictInstance = (instance: Instance): boolean =>
  (instance.tls?.certificates.length ?? 0) > 0;

/** The aliases of `instance` an app may use: all of them, or for a strict instance its TLS and mesh ones. */
export const usableAliases = (instance: Instance, routed: (alias: Alias) => boolean): Alias[] =>
  isStrictInstance(instance) ? instance.aliases.filter((alias) => alias.ssl || routed(alias)) : instance.aliases;
