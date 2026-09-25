import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import Timestamp from "@/core/components/ui/timestamp";
import { RekuestAgent, RekuestImplementation } from "@/core/linkers";
import { ProvidingImplementationFragment } from "@/rekuest/api/graphql";
import {
  AgentStatus,
  AgentStatusDot,
  agentStatus,
  agentStatusLabel,
} from "../displays/AgentStatusDot";

type Agent = ProvidingImplementationFragment["agent"];

// Agents that can take work now first, then the recently seen, then the rest.
const STATUS_RANK: Record<AgentStatus, number> = {
  online: 0,
  recent: 1,
  offline: 2,
  blocked: 3,
};

const groupByAgent = (implementations: ProvidingImplementationFragment[]) => {
  const groups = new Map<
    string,
    { agent: Agent; implementations: ProvidingImplementationFragment[] }
  >();
  for (const implementation of implementations) {
    const group = groups.get(implementation.agent.id);
    if (group) group.implementations.push(implementation);
    else {
      groups.set(implementation.agent.id, {
        agent: implementation.agent,
        implementations: [implementation],
      });
    }
  }
  return [...groups.values()].sort((a, b) => {
    const rank =
      STATUS_RANK[agentStatus(a.agent)] - STATUS_RANK[agentStatus(b.agent)];
    if (rank !== 0) return rank;
    return a.agent.name.localeCompare(b.agent.name);
  });
};

/** Who can run this action, and whether they can right now. */
export const ProvidedByPanel = ({
  implementations,
}: {
  implementations: ProvidingImplementationFragment[];
}) => {
  const groups = groupByAgent(implementations);
  const online = groups.filter((g) => agentStatus(g.agent) === "online").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-row items-baseline justify-between gap-2">
          Provided by
          <span className="text-xs font-normal text-muted-foreground">
            {groups.length === 0
              ? "nobody"
              : `${online} of ${groups.length} app${groups.length === 1 ? "" : "s"} online`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No app implements this action anymore, so it cannot be run.
          </p>
        )}
        {groups.map(({ agent, implementations }) => {
          const status = agentStatus(agent);
          return (
            <div key={agent.id} className="flex flex-col gap-1">
              <div className="flex flex-row items-center gap-2 text-sm">
                <AgentStatusDot status={status} className="h-2 w-2" />
                <RekuestAgent.DetailLink
                  object={agent}
                  className="font-medium hover:underline"
                >
                  {agent.name}
                </RekuestAgent.DetailLink>
                <span className="ml-auto inline-flex gap-1 text-xs text-muted-foreground">
                  {status === "online" || !agent.lastSeen ? (
                    agentStatusLabel(status)
                  ) : (
                    <>
                      seen <Timestamp date={agent.lastSeen} relative />
                    </>
                  )}
                </span>
              </div>
              <div className="ml-4 flex flex-row flex-wrap gap-x-3 gap-y-0.5">
                {implementations.map((implementation) => (
                  <RekuestImplementation.DetailLink
                    key={implementation.id}
                    object={implementation}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {implementation.interface}
                  </RekuestImplementation.DetailLink>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
