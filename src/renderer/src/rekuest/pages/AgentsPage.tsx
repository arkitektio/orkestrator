import { RekuestAgent } from "@/core/linkers";
import AgentList from "@/rekuest/components/lists/AgentList";
const Page = () => {
  return (
    <RekuestAgent.ListPage title={"Agents"}>
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-3">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your Agents
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Agents are apps that have executable actions. When you assign directly to
              an agent, you are using exactly that implementation of the action.
            </p>
          </div>
        </div>

        <AgentList />
      </div>
    </RekuestAgent.ListPage>
  );
};

export default Page;
