/**
 * Release approvals: a user's standing "this release may run as me", backed
 * by a lok mandate a deployer provisions under. These helpers are the rules
 * the install dialog and the approval surfaces share.
 */

export type ApprovalLike = {
  agent: string;
  isActive: boolean;
  isStale: boolean;
  revokedAt?: string | null;
  approver: { sub: string };
};

export type ApprovalStatus = "active" | "stale" | "revoked";

/**
 * Revoked wins; a stale approval (the release was re-published differently
 * since) still names running pods but nothing new deploys from it.
 */
export const approvalStatus = (approval: Pick<ApprovalLike, "isActive" | "isStale" | "revokedAt">): ApprovalStatus =>
  approval.revokedAt ? "revoked" : approval.isStale || !approval.isActive ? "stale" : "active";

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  active: "Active",
  stale: "Release changed",
  revoked: "Revoked",
};

/**
 * An approval the dialog can install with instead of approving again: still
 * active, for this deployer app, and the signed-in user's own (the pod acts as
 * its approver, so someone else's is not ours to use).
 */
export const reusableApproval = <T extends ApprovalLike>(
  approvals: readonly T[],
  agent: string,
  approverSub: string | null,
): T | undefined =>
  approverSub
    ? approvals.find(
        (approval) =>
          approval.isActive && !approval.revokedAt && approval.agent === agent && approval.approver.sub === approverSub,
      )
    : undefined;

export type RequirementLike = {
  key: string;
  service: string;
  optional: boolean;
  description?: string | null;
};

/**
 * The services a release may reach, over all its flavours, by key. A
 * requirement is optional only if every flavour that names it says so.
 */
export const releaseRequirements = (
  flavours: readonly { requirements: readonly RequirementLike[] }[],
): RequirementLike[] => {
  const byKey = new Map<string, RequirementLike>();
  for (const requirement of flavours.flatMap((flavour) => flavour.requirements)) {
    const seen = byKey.get(requirement.key);
    byKey.set(
      requirement.key,
      seen
        ? { ...seen, optional: seen.optional && requirement.optional, description: seen.description ?? requirement.description }
        : { ...requirement },
    );
  }
  return [...byKey.values()].sort((a, b) => Number(a.optional) - Number(b.optional) || a.key.localeCompare(b.key));
};

/** How long new instances may be started. Null: until revoked. */
export const EXPIRY_CHOICES: { label: string; days: number | null }[] = [
  { label: "Until revoked", days: null },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
];
