import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestSpace } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { useSpaceQuery } from "@/rekuest/api/graphql";
import { BlokTravelProvider } from "@/rekuest/travel/context";
import { TravelBar } from "@/rekuest/travel/TravelBar";
import { useBlokTravel } from "@/rekuest/travel/useBlokTravel";
import { History } from "lucide-react";
import { useMemo } from "react";
import { SpaceScene } from "../space-scene";
import { REKUEST_HELP } from "../help";

export const SpacePage = asDetailQueryRoute(useSpaceQuery, ({ data }) => {
  const travel = useBlokTravel();
  const agentNames = useMemo(
    () => new Map(data.space.placements.map((placement) => [placement.agent.id, placement.agent.name])),
    [data.space.placements],
  );

  return (
    <RekuestSpace.ModelPage
      title={data.space.name}
      help={REKUEST_HELP.space}
      object={data.space}
      pageActions={
        <>
          <PageAction
            size="sm"
            variant={travel.open ? "secondary" : "outline"}
            onClick={travel.toggle}
            title={travel.open ? "Back to live, and hide the history bar" : "Show this space as it was at an earlier time"}
          >
            <History className="h-4 w-4" />
            History
          </PageAction>
          <RekuestSpace.DetailLink object={data.space} subroute="edit">
            Edit
          </RekuestSpace.DetailLink>
          <RekuestSpace.ObjectButton alwaysShow object={data.space} />
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestSpace.Knowledge object={data?.space} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="h-full min-h-[500px]">
        {/* Around the whole room: one clock for every device in it, and for the cards they open. */}
        <BlokTravelProvider source={travel.source}>
          <SpaceScene
            space={data.space}
            overlay={
              travel.open ? (
                // Above the scene's own controls and notices, which hold the bottom corners.
                <TravelBar
                  travel={travel}
                  names={agentNames}
                  className="pointer-events-auto absolute inset-x-2 bottom-12 z-30 mx-auto max-w-3xl"
                />
              ) : null
            }
          />
        </BlokTravelProvider>
      </div>
    </RekuestSpace.ModelPage>
  );
});


export default SpacePage;
