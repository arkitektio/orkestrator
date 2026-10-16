/**
 * Devices are keyed under ONE standing agent mandate per firmware app: this
 * app is its agent, the firmware's app identifier its subject. Each device
 * then gets a child key pinned to its device_id (`issueChildMandateKey`),
 * which lives as long as the parent. pokket issues the same way, and lok
 * lets a device's new key take over the client it had under an older
 * mandate, so re-keying keeps its client and its rekuest agent.
 */

export type StandingCandidate = {
  id: string;
  agentIdentifier?: string | null;
  claimant: string;
  subject: { identifier?: string | null };
  parent?: { id: string } | null;
};

/** The live standing mandate this app (`agent`) holds for `subjectIdentifier`, if any. */
export const findStandingMandate = <T extends StandingCandidate>(
  mandates: readonly T[],
  agent: string,
  subjectIdentifier: string,
): T | undefined =>
  mandates.find(
    (m) =>
      m.claimant === "AGENT" && !m.parent && m.agentIdentifier === agent && m.subject.identifier === subjectIdentifier,
  );
