import { RekuestGuard } from "@/rekuest/api/hooks";
import { ProfileSectionFrame } from "@/core/connection/profile/ProfileSections";
import { ProfileRow, ProfileRows } from "@/core/connection/profile/rows";
import type { ProfileContext, ProfileSection } from "@/core/connection/profile/section";
import { cn } from "@/core/util/utils";
import { RekuestAgent } from "@/core/linkers";
import { formatDistanceToNow } from "date-fns";
import { Bot } from "lucide-react";
import { AgentOrder, Ordering, useAgentsQuery } from "../api/graphql";

const LAST_SEEN: AgentOrder[] = [{ lastSeen: Ordering.Desc }];

/** The agents they run, most recently seen first — the runnable ones lit. */
const Agents = ({ sub }: ProfileContext) => {
  const { data } = useAgentsQuery({
    variables: {
      filters: { user: sub },
      ordering: LAST_SEEN,
      pagination: { limit: 6 },
    },
    fetchPolicy: "cache-and-network",
  });

  const agents = data?.agents ?? [];
  if (agents.length === 0) return null;

  return (
    <ProfileSectionFrame>
      <ProfileRows>
        {agents.map((agent) => (
          <RekuestAgent.Smart key={agent.id} object={agent}>
            <RekuestAgent.DetailLink object={agent} className="block hover:text-primary">
              <ProfileRow
                icon={
                  <span
                    className={cn(
                      "!h-2 !w-2 rounded-full",
                      agent.connected ? "bg-emerald-500" : "bg-muted-foreground/40",
                    )}
                  />
                }
                title={agent.name}
                meta={
                  agent.connected
                    ? "connected"
                    : agent.lastSeen
                      ? `seen ${formatDistanceToNow(new Date(agent.lastSeen), { addSuffix: true })}`
                      : undefined
                }
              />
            </RekuestAgent.DetailLink>
          </RekuestAgent.Smart>
        ))}
      </ProfileRows>
    </ProfileSectionFrame>
  );
};

export const REKUEST_PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: "rekuest.agents",
    module: "rekuest",
    title: "Agents",
    icon: Bot,
    priority: 30,
    Guard: RekuestGuard,
    Component: Agents,
  },
];
