import { RekuestMaterializedBlok } from "@/core/linkers";
import MaterializedBlokList from "../components/lists/MaterializedBlokList";
import { REKUEST_HELP } from "../help";

/** Agents' own materializations of the bloks their app provides. */
const Page = () => {
  return (
    <RekuestMaterializedBlok.ListPage
      help={REKUEST_HELP.providedMaterializedBloks}
      title={"App-provided Materialized Bloks"}
      description="Each agent keeps its own materialization of the bloks its app provides. Rematerialize one to make a copy of your own."
    >
      <div className="p-3">
        <MaterializedBlokList filters={{ provided: true }} />
      </div>
    </RekuestMaterializedBlok.ListPage>
  );
};

export default Page;
