import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { RekuestStructurePackage, RekuestToolbox } from "@/core/linkers";
import {
  useGetStructurePackageQuery
} from "@/rekuest/api/graphql";
import InterfaceCard from "../components/cards/InterfaceCard";
import StructureCard from "../components/cards/StructureCard";

export const TPage = asDetailQueryRoute(
  useGetStructurePackageQuery,
  ({ data }) => {
    return (
      <RekuestStructurePackage.ModelPage
        title={data.structurePackage.id}
        object={data.structurePackage}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <RekuestToolbox.Knowledge object={data?.structurePackage} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className=" p-6">
          <div className="mb-3">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl cursor-pointer">
              {data?.structurePackage?.key}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground max-w-[80%]">
              ccc
            </p>
          </div>
        </div>

        <div className="p-6 pt-0">
          <h2 className="scroll-m-20 text-2xl font-bold tracking-tight lg:text-3xl mb-4">
            Interfaces in this Package
          </h2>
          <div className="mb-6 grid md:grid-cols-7 gap-2 md:items-center">
            {data.structurePackage.interfaces.map((type) => (
              <InterfaceCard key={type.id} item={type} />
            ))}
          </div>
        </div>

        <div className="p-6 pt-0">
          <h2 className="scroll-m-20 text-2xl font-bold tracking-tight lg:text-3xl mb-4">
            Types in this Package
          </h2>
          <div className="mb-6 grid md:grid-cols-7 gap-2 md:items-center">
            {data.structurePackage.structures.map((type) => (
              <>
                <StructureCard key={type.id} item={type} />
              </>
            ))}
          </div>
        </div>
      </RekuestStructurePackage.ModelPage>
    );
  },
);

export default TPage;
