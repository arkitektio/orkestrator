import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { RekuestSpace } from "@/core/linkers";
import { useSpaceQuery } from "@/rekuest/api/graphql";
import { SpaceEditor } from "../space-scene";
import { REKUEST_HELP } from "../help";

export const SpaceEditPage = asDetailQueryRoute(useSpaceQuery, ({ data }) => {
  return (
    <RekuestSpace.ModelPage
      title={`Edit ${data.space.name}`}
      help={REKUEST_HELP.spaceEdit}
      object={data.space}
      pageActions={
        <>
          <RekuestSpace.DetailLink object={data.space}>View</RekuestSpace.DetailLink>
          <RekuestSpace.ObjectButton alwaysShow object={data.space} />
        </>
      }
    >
      <div className="h-full min-h-[500px]">
        <SpaceEditor space={data.space} />
      </div>
    </RekuestSpace.ModelPage>
  );
});

export default SpaceEditPage;
