import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { RekuestToolbox } from "@/core/linkers";
import { useToolboxQuery } from "@/rekuest/api/graphql";
import ShortcutList from "../components/lists/ShortcutList";

export const ToolboxPage = asDetailQueryRoute(useToolboxQuery, ({ data }) => {
  return (
    <RekuestToolbox.ModelPage
      title={data.toolbox.name}
      object={data.toolbox}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestToolbox.Knowledge object={data?.toolbox} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className=" p-6">
        <div className="mb-3">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl cursor-pointer">
            {data?.toolbox?.name}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground max-w-[80%]">
            {data.toolbox.description}
          </p>
        </div>

      </div>
      <ShortcutList filters={{ toolbox: data.toolbox.id }} />
    </RekuestToolbox.ModelPage>
  );
});


export default ToolboxPage;
