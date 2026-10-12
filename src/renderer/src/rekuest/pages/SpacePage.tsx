import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestSpace } from "@/core/linkers";
import { useSpaceQuery } from "@/rekuest/api/graphql";
import { SpaceScene } from "../space-scene";
import { REKUEST_HELP } from "../help";

export const SpacePage = asDetailQueryRoute(useSpaceQuery, ({ data }) => {
  return (
    <RekuestSpace.ModelPage
      title={data.space.name}
      help={REKUEST_HELP.space}
      object={data.space}
      pageActions={
        <>
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
        <SpaceScene space={data.space} />
      </div>
    </RekuestSpace.ModelPage>
  );
});


export default SpacePage;
