import { LovekitAgent } from "@/core/linkers";
import AgentList from "../components/lists/AgentList";
import { LOVEKIT_HELP } from "../help";

const Page = () => (
  <LovekitAgent.ListPage title="Agents" help={LOVEKIT_HELP.agents}>
    <div className="p-3">
      <AgentList defaultLimit={30} />
    </div>
  </LovekitAgent.ListPage>
);

export default Page;
