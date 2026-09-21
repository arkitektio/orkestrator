import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { DisplayWidget } from "@/command/Menu";
import { FormSheet } from "@/components/dialog/FormDialog";
import { Sidebars } from "@/components/layout/Sidebars";
import { Card } from "@/components/ui/card";
import { KraphStructure, KraphStructureKind } from "@/linkers";
import { HobbyKnifeIcon } from "@radix-ui/react-icons";
import { useGetStructureQuery } from "../api/graphql";
import { MetricsForStructure } from "../components/MetricsForStructure";

const Page = asDetailQueryRoute(useGetStructureQuery, ({ data }) => {
  return (
    <KraphStructure.ModelPage
      object={{ id: data.structure.id }}
      title={data?.structure.identifier}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <KraphStructure.Knowledge object={{ id: data.structure.id }} />
          </Sidebars.Tab>
        </Sidebars>
      }
      pageActions={
        <>
          <FormSheet trigger={<HobbyKnifeIcon />}>Not implemented</FormSheet>
        </>
      }
    >
      <KraphStructure.Drop
        object={{ id: data.structure.id }}
        className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6"
      >
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            <KraphStructureKind.DetailLink object={{ id: data.structure.kindId }} className="font-light text-muted-foreground">
              {data.structure.kind?.identifier || data.structure.identifier}
            </KraphStructureKind.DetailLink>{" "}{data.structure.object}
          </h1>
          {/* A structure has no label: `(identifier, object)` is how it is named. */}
          <p className="mt-3 text-xl text-muted-foreground">
            {data.structure.kind?.label ?? data.structure.kind?.identifier}
          </p>
        </div>
        <Card className="flex flex-row gap-2 p-4">
          <DisplayWidget
            identifier={data.structure.identifier}
            object={data.structure.object}
            link
          />
        </Card>
      </KraphStructure.Drop>

      <MetricsForStructure structureId={data.structure.id} />

    </KraphStructure.ModelPage>
  );
});


export default Page;
