import { useOperation } from "@/core/modules/hooks/useOperation";
import { useEffect, useMemo, useState } from "react";

/**
 * A release approval is kabinet's record; what a deployer actually starts the
 * app under is the lok mandate behind it, and that can stop working without
 * kabinet hearing of it (it expired, or was withdrawn in lok). So before an
 * approval is offered to deploy under, lok is asked whether its mandate still
 * works (`lok.mandateStatus`).
 */
export type MandateStatus = { live: boolean; expiresAt: string | null; revokedAt: string | null };
export type MandateStatuses = Record<string, MandateStatus>;

type Mandated = { mandateId: string };

/**
 * Whether lok says the approval's mandate no longer works. A mandate lok did
 * not answer for is unknown, not dead: the deploy is then the check.
 */
export const mandateLapsed = (statuses: MandateStatuses | undefined, approval: Mandated): boolean =>
  statuses?.[approval.mandateId]?.live === false;

/** The approvals whose mandate still works (or is unknown), and those whose does not. */
export const splitByMandate = <T extends Mandated>(
  approvals: readonly T[],
  statuses: MandateStatuses | undefined,
): { live: T[]; lapsed: T[] } => ({
  live: approvals.filter((approval) => !mandateLapsed(statuses, approval)),
  lapsed: approvals.filter((approval) => mandateLapsed(statuses, approval)),
});

/** "expired" when its time ran out, "was withdrawn" otherwise: the two the user can tell apart. */
export const lapseReason = (status: MandateStatus | undefined, now = Date.now()): "expired" | "withdrawn" =>
  status && !status.revokedAt && status.expiresAt && new Date(status.expiresAt).getTime() <= now
    ? "expired"
    : "withdrawn";

/**
 * The mandates behind these approvals, as lok sees them now. `undefined`
 * while asking; `{}` when lok could not be asked, so nothing is held back on
 * a check that did not happen.
 */
export const useMandateStatuses = (approvals: readonly Mandated[]): MandateStatuses | undefined => {
  const ask = useOperation<MandateStatuses>("lok.mandateStatus");
  const key = useMemo(() => [...new Set(approvals.map((approval) => approval.mandateId))].sort().join(","), [approvals]);
  const [answer, setAnswer] = useState<{ key: string; statuses: MandateStatuses } | undefined>(undefined);

  useEffect(() => {
    if (key === "") return;
    let current = true;
    ask({ ids: key.split(",") })
      .catch(() => ({}) as MandateStatuses)
      .then((statuses) => {
        if (current) setAnswer({ key, statuses });
      });
    return () => {
      current = false;
    };
  }, [ask, key]);

  if (key === "") return {};
  return answer?.key === key ? answer.statuses : undefined;
};
