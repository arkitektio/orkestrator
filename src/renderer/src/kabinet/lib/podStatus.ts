import { PodStatus } from "../api/graphql";

/** A pod's or deployment's status as a dot colour (theme tokens only). */
export const POD_STATUS_DOT: Record<PodStatus, string> = {
  [PodStatus.Running]: "bg-success",
  [PodStatus.Pending]: "bg-warning animate-pulse",
  [PodStatus.Stopping]: "bg-warning animate-pulse",
  [PodStatus.Failed]: "bg-destructive",
  [PodStatus.Stopped]: "bg-muted-foreground/40",
  [PodStatus.Unkown]: "bg-muted-foreground/40",
};

/** Running first, then the ones on their way up or down, then the rest. */
export const POD_STATUS_RANK: Record<PodStatus, number> = {
  [PodStatus.Running]: 0,
  [PodStatus.Pending]: 1,
  [PodStatus.Stopping]: 1,
  [PodStatus.Failed]: 2,
  [PodStatus.Unkown]: 3,
  [PodStatus.Stopped]: 4,
};

/** `RUNNING` → "Running". */
export const podStatusLabel = (status: PodStatus): string =>
  status === PodStatus.Unkown ? "Unknown" : status.charAt(0) + status.slice(1).toLowerCase();
