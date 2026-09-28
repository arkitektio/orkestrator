/**
 * Naming a mandate and saying where it stands.
 *
 * `subjectManifest` is lok's JSON copy of the manifest the grantor approved;
 * its identifier and version are what the mandate is FOR, so they are the
 * mandate's name everywhere it is shown.
 */

export type MandateLike = {
  subjectManifest: unknown;
  isLive: boolean;
  revokedAt?: string | null;
  expiresAt?: string | null;
};

export type MandateSubject = { identifier: string; version: string | null };

export const mandateSubject = (mandate: Pick<MandateLike, "subjectManifest">): MandateSubject => {
  const manifest =
    mandate.subjectManifest && typeof mandate.subjectManifest === "object"
      ? (mandate.subjectManifest as Record<string, unknown>)
      : {};
  return {
    identifier: typeof manifest.identifier === "string" ? manifest.identifier : "Unknown app",
    version: typeof manifest.version === "string" ? manifest.version : null,
  };
};

/** `identifier:version`, the way lok names clients. */
export const mandateLabel = (mandate: Pick<MandateLike, "subjectManifest">): string => {
  const { identifier, version } = mandateSubject(mandate);
  return version ? `${identifier}:${version}` : identifier;
};

/** The scopes the grantor approved: the ceiling for every provisioned client. */
export const mandateScopes = (mandate: Pick<MandateLike, "subjectManifest">): string[] => {
  const manifest = mandate.subjectManifest as { scopes?: unknown } | null;
  return Array.isArray(manifest?.scopes)
    ? manifest.scopes.filter((scope): scope is string => typeof scope === "string")
    : [];
};

export type MandateStatus = "live" | "revoked" | "expired" | "paused";

/**
 * Revoked beats everything (its clients are gone); an expiry in the past
 * only stops new provisioning, so running clients may still exist. `paused`
 * covers lok saying not-live for a reason the fields do not show.
 */
export const mandateStatus = (mandate: MandateLike, now: Date = new Date()): MandateStatus => {
  if (mandate.revokedAt) return "revoked";
  if (mandate.expiresAt && new Date(mandate.expiresAt) <= now) return "expired";
  return mandate.isLive ? "live" : "paused";
};

export const MANDATE_STATUS_LABEL: Record<MandateStatus, string> = {
  live: "Live",
  revoked: "Revoked",
  expired: "Expired",
  paused: "Not live",
};
