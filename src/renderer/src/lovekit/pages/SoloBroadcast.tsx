import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { LovekitSoloBroadcast } from "@/core/linkers";
import { useGetSoloBroadcastQuery } from "../api/graphql";

import { cn } from "@/core/lib/utils";
import { StreamJoiner } from "../components/StreamJoiner";

export default asDetailQueryRoute(
  useGetSoloBroadcastQuery,
  ({ data }) => {


    const broadcast = data?.soloBroadcast?.id;
    return (
      <LovekitSoloBroadcast.ModelPage
        title={data?.soloBroadcast.title || "Broadcast"}
        object={data.soloBroadcast}
        pageActions={
          <>
            <LovekitSoloBroadcast.ObjectButton alwaysShow object={data.soloBroadcast} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <LovekitSoloBroadcast.Knowledge object={data.soloBroadcast} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className={cn("relative h-full w-full overflow-hidden bg-black")}>
          {broadcast && (
            <StreamJoiner broadcast={data.soloBroadcast} />
          )}
          {!broadcast && (
            <div className="flex items-center justify-center h-full">
              <span className="text-white">Loading broadcast...</span>
            </div>
          )}
        </div>
      </LovekitSoloBroadcast.ModelPage>
    );
  },
);
