import { LovekitSoloBroadcast } from "@/core/linkers";
import SoloBroadcastList from "../components/lists/SoloBroadcastList";
import { LOVEKIT_HELP } from "../help";

const Page = () => {
  return (
    <LovekitSoloBroadcast.ListPage help={LOVEKIT_HELP.soloBroadcasts} title="Solo Broadcasts">
      <div className="p-3">
        <SoloBroadcastList defaultLimit={30} />
      </div>
    </LovekitSoloBroadcast.ListPage>
  );
};

export default Page;
