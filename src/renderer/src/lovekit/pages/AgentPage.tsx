import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LovekitAgent } from "@/core/linkers";
import { useGetAgentQuery } from "../api/graphql";
import { AgentApp, AgentUser } from "../components/agent";
import { AgentStreams } from "../components/AgentStreams";
import { LOVEKIT_HELP } from "../help";

export default asDetailQueryRoute(
  (options: Parameters<typeof useGetAgentQuery>[0]) => useGetAgentQuery({ ...options, pollInterval: 15_000 }),
  ({ data }) => {
    const agent = data.agent;
    return (
      <LovekitAgent.ModelPage
        help={LOVEKIT_HELP.agent}
        title={agent.name}
        object={agent}
        pageActions={<LovekitAgent.ObjectButton alwaysShow object={agent} />}
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <AgentApp agent={agent} />
            <AgentUser agent={agent} />
          </div>
          <AgentStreams streams={agent.streams} />
        </div>
      </LovekitAgent.ModelPage>
    );
  },
);
