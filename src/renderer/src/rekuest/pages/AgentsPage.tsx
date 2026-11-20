import { RekuestAgent } from "@/core/linkers";
import AgentList from "@/rekuest/components/lists/AgentList";
import { REKUEST_HELP } from "../help";
const Page = () => {
  return (
    <RekuestAgent.ListPage help={REKUEST_HELP.agents} title={"Agents"}>
      <div className="p-3">
        <AgentList />
      </div>
    </RekuestAgent.ListPage>
  );
};

export default Page;
