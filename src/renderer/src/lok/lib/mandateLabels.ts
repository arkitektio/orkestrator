/**
 * Naming a mandate and saying where it stands.
 *
 * `subject` is the mandate's pin: the app it is FOR. Its identifier and
 * version are the mandate's name everywhere it is shown; a field lok leaves
 * null is unpinned (any app, any release).
 */

export type MandatePinLike = {
  identifier?: string | null;
  version?: string | null;
  deviceId?: string | null;
  scopes?: readonly string[] | null;
};

export type MandateLike = {
  subject: MandatePinLike;
  isLive: boolean;
  revokedAt?: string | null;
  expiresAt?: string | null;
};

export type MandateSubject = { identifier: string; version: string | null };

export const mandateSubject = (mandate: Pick<MandateLike, "subject">): MandateSubject => ({
  identifier: mandate.subject.identifier ?? "Any app",
  version: mandate.subject.version ?? null,
});

/** `identifier:version`, the way lok names clients. */
export const mandateLabel = (mandate: Pick<MandateLike, "subject">): string => {
  const { identifier, version } = mandateSubject(mandate);
  return version ? `${identifier}:${version}` : identifier;
};

/** The scopes the grantor approved: the ceiling for every client signed in under it. */
export const mandateScopes = (mandate: Pick<MandateLike, "subject">): string[] => [
  ...(mandate.subject.scopes ?? []),
];

/**
 * Who signs the app in: the agent app a deployer mandate names, or whoever
 * holds a keyed mandate's key (recognised by its first characters).
 */
export const mandateHolder = (mandate: {
  agentIdentifier?: string | null;
  keyPrefix: string;
}): string =>
  mandate.agentIdentifier ?? (mandate.keyPrefix ? `the holder of key ${mandate.keyPrefix}…` : "the key holder");

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
