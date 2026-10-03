import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestStructure } from "@/core/linkers";
import {
  useGetStructureQuery
} from "@/rekuest/api/graphql";
import InputStructureUsageCard from "../components/cards/InputStructureUsageCard";
import OutputStructureUsageCard from "../components/cards/OutputStructureUsageCard";
import { REKUEST_HELP } from "../help";
import { KIND_LABELS } from "../lib/triggerConditions";

export const StructurePage = asDetailQueryRoute(useGetStructureQuery, ({ data }) => {
  return (
    <RekuestStructure.ModelPage
      title={data.structure.key}
      help={REKUEST_HELP.structure}
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
          {data.structure.service ? (
            <p className="mt-3 max-w-[80%] text-sm text-muted-foreground">
              Hosted by the <span className="font-medium text-foreground">{data.structure.service.name}</span> service
              {data.structure.label ? <> as “{data.structure.label}”</> : null}.
              {data.structure.description ? <> {data.structure.description}</> : null}
            </p>
          ) : (
            <p className="mt-3 max-w-[80%] text-sm text-muted-foreground">
              No service of this hub declares that it hosts this structure; it is known only from the actions that use it.
            </p>
          )}
        </div>
      </div>

      {data.structure.descriptors.length > 0 && (
        <div className="p-6 pt-0">
          <h2 className="scroll-m-20 text-2xl font-bold tracking-tight lg:text-3xl mb-4">Descriptors</h2>
          <p className="mb-3 max-w-[80%] text-sm text-muted-foreground">
            What every object of this structure says about itself. An action's port can require or provide these, and a trigger can test them.
          </p>
          <table className="w-full max-w-3xl text-sm">
            <tbody>
              {data.structure.descriptors.map((descriptor) => (
                <tr key={descriptor.key} className="border-b last:border-0">
                  <td className="py-1.5 pr-4 font-mono text-xs">{descriptor.key}</td>
                  <td className="py-1.5 pr-4 text-xs text-muted-foreground">{descriptor.type}</td>
                  <td className="py-1.5 text-muted-foreground">{descriptor.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.structure.signals.length > 0 && (
        <div className="p-6 pt-0">
          <h2 className="scroll-m-20 text-2xl font-bold tracking-tight lg:text-3xl mb-4">Signals</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {data.structure.signals.map((signal) => (
              <li key={signal.id}>
                <span className="font-medium">{KIND_LABELS[signal.kind]}</span>
                {signal.description ? <span className="text-muted-foreground"> — {signal.description}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

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
