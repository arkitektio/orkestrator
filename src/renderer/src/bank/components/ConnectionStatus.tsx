import { Badge } from "@/core/ui/badge";
import { LinkStep, ConnectionStatus as Status } from "../api/graphql";

const TONE: Record<Status, string> = {
  [Status.Active]: "bg-success/15 text-success",
  [Status.Pending]: "bg-warning/15 text-warning",
  [Status.Expired]: "bg-warning/15 text-warning",
  [Status.Revoked]: "bg-muted text-muted-foreground",
  [Status.Failed]: "bg-destructive/15 text-destructive",
  [Status.Cancelled]: "bg-muted text-muted-foreground",
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
    {needsReauth && status !== Status.Revoked && status !== Status.Cancelled
      ? "Needs relink"
      : status === Status.Pending
        ? isAbandoned
          ? "abandoned"
          : pendingLabel(linkStep)
        : status.toLowerCase()}
  </Badge>
);
