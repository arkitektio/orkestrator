import { RekuestMaterializedBlok } from "@/core/linkers";
import MaterializedBlokList from "../components/lists/MaterializedBlokList";
import { REKUEST_HELP } from "../help";

/** App bloks: the bloks agents keep of the templates their app provides. */
const Page = () => {
  return (
    <RekuestMaterializedBlok.ListPage
      help={REKUEST_HELP.providedMaterializedBloks}
      title={"App Bloks"}
      description="The bloks your apps bring along: each agent keeps its own, in step with what it registers. Edit one to make a copy of your own."
    >
      <div className="p-3">
        <MaterializedBlokList filters={{ provided: true }} />
      </div>
    </RekuestMaterializedBlok.ListPage>
  );
};

export default Page;
