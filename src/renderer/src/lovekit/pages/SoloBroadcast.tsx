import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { LovekitSoloBroadcast } from "@/core/linkers";
import { useGetSoloBroadcastQuery } from "../api/graphql";

import { BroadcastInfo } from "../components/BroadcastInfo";
import { StreamJoiner } from "../components/StreamJoiner";
import { LOVEKIT_HELP } from "../help";

export default asDetailQueryRoute(
  useGetSoloBroadcastQuery,
  ({ data }) => {
    return (
      <LovekitSoloBroadcast.ModelPage
        help={LOVEKIT_HELP.soloBroadcast}
        title={data.soloBroadcast.title || "Broadcast"}
        object={data.soloBroadcast}
        pageActions={
          <>
            <LovekitSoloBroadcast.ObjectButton alwaysShow object={data.soloBroadcast} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Info">
              <BroadcastInfo broadcast={data.soloBroadcast} />
            </Sidebars.Tab>
            <Sidebars.Tab label="Knowledge">
              <LovekitSoloBroadcast.Knowledge object={data.soloBroadcast} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <StreamJoiner broadcast={data.soloBroadcast} />
      </LovekitSoloBroadcast.ModelPage>
    );
  },
);
