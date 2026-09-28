import { Badge } from "@/core/ui/badge";
import { LinkStep, ConnectionStatus as Status } from "../api/graphql";

const TONE: Record<Status, string> = {
  [Status.Active]: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  [Status.Pending]: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  [Status.Expired]: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  [Status.Revoked]: "bg-muted text-muted-foreground",
  [Status.Failed]: "bg-destructive/15 text-destructive",
};

/** A pending Scalable login says which step it is stuck at. */
const pendingLabel = (linkStep?: LinkStep | null) =>
  linkStep === LinkStep.Device ? "awaiting code" : linkStep === LinkStep.Mfa ? "awaiting phone" : "pending";

export const ConnectionStatusBadge = ({
  status,
  needsReauth,
  linkStep,
  isAbandoned,
}: {
  status: Status;
  needsReauth?: boolean;
  linkStep?: LinkStep | null;
  isAbandoned?: boolean;
}) => (
  <Badge variant="secondary" className={"rounded-full px-2 py-0.5 text-[10px] " + TONE[status]}>
    {needsReauth && status !== Status.Revoked
      ? "Needs relink"
      : status === Status.Pending
        ? isAbandoned
          ? "abandoned"
          : pendingLabel(linkStep)
        : status.toLowerCase()}
  </Badge>
);
