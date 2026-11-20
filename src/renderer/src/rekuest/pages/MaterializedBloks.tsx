import { RekuestMaterializedBlok } from "@/core/linkers";
import MaterializedBlokList from "../components/lists/MaterializedBlokList";
import { REKUEST_HELP } from "../help";

/** The materializations people made, of their custom bloks. */
const Page = () => {
  return (
    <RekuestMaterializedBlok.ListPage
      help={REKUEST_HELP.materializedBloks}
      title={"Custom Materialized Bloks"}
      description="Bloks bound into a dashboard with their agents, made by people from custom bloks."
    >
      <div className="p-3">
        <MaterializedBlokList filters={{ provided: false }} />
      </div>
    </RekuestMaterializedBlok.ListPage>
  );
};

export default Page;
