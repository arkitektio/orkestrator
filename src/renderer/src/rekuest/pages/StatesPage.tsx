import { RekuestState } from "@/core/linkers";
import { Ordering } from "@/rekuest/api/graphql";
import StateList from "../components/lists/StateList";
import { REKUEST_HELP } from "../help";

/** Every state of the organization's agents, the most recently changed first. */
const Page = () => (
  <RekuestState.ListPage title="States" help={REKUEST_HELP.states}>
    <div className="p-3">
      <StateList defaultLimit={40} ordering={[{ updatedAt: Ordering.Desc }]} />
    </div>
  </RekuestState.ListPage>
);

export default Page;
