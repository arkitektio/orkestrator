import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { RekuestInterface, RekuestToolbox } from "@/core/linkers";
import {
  useGetInterfaceQuery
} from "@/rekuest/api/graphql";

export const InterfacePage = asDetailQueryRoute(useGetInterfaceQuery, ({ data }) => {
  return (
    <RekuestInterface.ModelPage
      title={data.interface.key}
      object={data.interface}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestToolbox.Knowledge object={data?.interface} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className=" p-6">
        <div className="mb-3">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl cursor-pointer">
            {data?.interface?.key}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground max-w-[80%]">
            {data.interface.identifier}
          </p>
        </div>
      </div>
    </RekuestInterface.ModelPage>
  );
});


export default InterfacePage;
