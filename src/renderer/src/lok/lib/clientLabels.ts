/**
 * Naming a client when it has no release.
 *
 * `Client.release` became nullable: hub identities, relying parties and pending
 * registrations are not bound to an app release, so `release.app.identifier` is
 * no longer a label every client can produce. `Client.name` is — the backend
 * folds app, version, operator and device into it (e.g.
 * `com.example.app:v0.1.1 by Johannes on my-laptop`), which is exactly the
 * fallback these call sites want.
 */

export type ClientLike = {
  name: string;
  release?: {
    version: string;
    app: { identifier: string };
  } | null;
};

/** The app identifier, or the client's own folded label when unbound. */
export const clientAppIdentifier = (client: ClientLike): string =>
  client.release?.app.identifier ?? client.name;

/** `identifier:version`, or the folded label when unbound. */
export const clientAppVersion = (client: ClientLike): string =>
  client.release
    ? `${client.release.app.identifier}:${client.release.version}`
    : client.name;
