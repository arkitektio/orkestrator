import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { ListRender } from "@/components/layout/ListRender";
import { Sidebars } from "@/components/layout/Sidebars";
import { Card } from "@/components/ui/card";
import { KabinetFlavour, KabinetRelease } from "@/linkers";
import { useGetReleaseQuery } from "../api/graphql";
import FlavourCard from "../components/cards/FlavourCard";

export const ReleasePage = asDetailQueryRoute(useGetReleaseQuery, ({ data, refetch }) => {
  return (
    <KabinetRelease.ModelPage
      title={data?.release.name}
      object={data?.release}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <KabinetRelease.Knowledge object={data?.release} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="col-span-4 grid md:grid-cols-2 gap-2 md:gap-8 xl:gap-20 md:items-center p-6">
        <div className="mb-3">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl cursor-pointer">
            {data?.release.app.identifier}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground max-w-[80%]">
            {data?.release.version}
          </p>
        </div>
        <Card className="w-full h-full flex-row relative"></Card>
      </div>
      <div className="p-6">
        <ListRender
          array={data?.release?.flavours}
          title={
            <KabinetFlavour.ListLink className="flex-0 mb-5">
              <h2 className="text-2xl font-bold ">Available Flavours</h2>
              <div className="text-muted-foreground text-xs mb-3">
                This release has {data?.release?.flavours.length} different
                flavours that might run better on different hardware.
              </div>
            </KabinetFlavour.ListLink>
          }
          refetch={refetch}
        >
          {(item, key) => <FlavourCard item={item} key={key} />}
        </ListRender>
      </div>
    </KabinetRelease.ModelPage>
  );
});


export default ReleasePage;
