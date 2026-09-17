import { cn } from "@/lib/utils";

export type AgentStatus = "online" | "recent" | "offline" | "blocked";

/**
 * `connected` is the live socket, `active` is derived from last-seen — so
 * "recent" is an agent that was just here but cannot take work right now.
 */
export const agentStatus = (agent: {
  connected?: boolean | null;
  active?: boolean | null;
  blocked?: boolean | null;
}): AgentStatus =>
  agent.blocked
    ? "blocked"
    : agent.connected
      ? "online"
      : agent.active
        ? "recent"
        : "offline";

const STATUS_LABEL: Record<AgentStatus, string> = {
  online: "Online",
  recent: "Recently active",
  offline: "Offline",
  blocked: "Blocked",
};

const STATUS_CLASS: Record<AgentStatus, string> = {
  online: "bg-green-500",
  recent: "bg-amber-500",
  offline: "bg-muted-foreground/40",
  blocked: "bg-destructive",
};

export const agentStatusLabel = (status: AgentStatus) => STATUS_LABEL[status];

export const AgentStatusDot = ({
  status,
  className,
}: {
  status: AgentStatus;
  className?: string;
}) => (
  <span
    role="img"
    aria-label={STATUS_LABEL[status]}
    title={STATUS_LABEL[status]}
    className={cn(
      "h-1.5 w-1.5 shrink-0 rounded-full",
      STATUS_CLASS[status],
      className,
    )}
  />
);
