import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { KabinetDefinition } from "@/core/linkers";
import DefinitionList from "../components/lists/DefinitionList";
import { useListSearch } from "../components/ListSearch";
import { KABINET_HELP } from "../help";

/** Every action the releases of your repositories register. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <KabinetDefinition.ListPage
      title="Definitions"
      help={KABINET_HELP.definitions}
      pageActions={<CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search definitions…" />}
    >
      <div className="p-3">
        <DefinitionList title="" filters={filters} defaultLimit={40} />
      </div>
    </KabinetDefinition.ListPage>
  );
};

export default Page;
