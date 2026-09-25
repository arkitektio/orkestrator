import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { RekuestStructure } from "@/core/linkers";
import {
  useGetStructureQuery
} from "@/rekuest/api/graphql";
import InputStructureUsageCard from "../components/cards/InputStructureUsageCard";
import OutputStructureUsageCard from "../components/cards/OutputStructureUsageCard";

export const StructurePage = asDetailQueryRoute(useGetStructureQuery, ({ data }) => {
  return (
    <RekuestStructure.ModelPage
      title={data.structure.key}
      object={data.structure}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestStructure.Knowledge object={data?.structure} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className=" p-6">
        <div className="mb-3">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl cursor-pointer">
            {data?.structure?.key}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground max-w-[80%]">
            {data.structure.identifier}
          </p>
        </div>
      </div>

      <div className="p-6 pt-0">
        {data.structure.outputUsages.length > 0 && (
          <>
            <h2 className="scroll-m-20 text-2xl font-bold tracking-tight lg:text-3xl mb-4">
              Used in Actions
            </h2>
            <div className="mb-6 grid md:grid-cols-7 gap-2 md:items-center">
              {data.structure.outputUsages.map((type, index) => (
                <OutputStructureUsageCard
                  key={`${type.action.id}-${type.keyPath}-${index}`}
                  item={type}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="p-6 pt-0">
        {data.structure.inputUsages.length > 0 && (
          <>
            <h2 className="scroll-m-20 text-2xl font-bold tracking-tight lg:text-3xl mb-4">
              Used as Input in Actions
            </h2>
            <div className="mb-6 grid md:grid-cols-7 gap-2 md:items-center">
              {data.structure.inputUsages.map((type, index) => (
                <InputStructureUsageCard
                  key={`${type.action.id}-${type.keyPath}-${index}`}
                  item={type}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </RekuestStructure.ModelPage>
  );
});


export default StructurePage;
