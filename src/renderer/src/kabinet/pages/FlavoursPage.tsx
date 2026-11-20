import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { KabinetFlavour } from "@/core/linkers";
import FlavourList from "../components/lists/FlavourList";
import { useListSearch } from "../components/ListSearch";
import { KABINET_HELP } from "../help";

/** Every flavour: the builds the releases ship, one per kind of host. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <KabinetFlavour.ListPage
      title="Flavours"
      help={KABINET_HELP.flavours}
      pageActions={<CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search flavours…" />}
    >
      <div className="p-3">
        <FlavourList title="" filters={filters} defaultLimit={40} />
      </div>
    </KabinetFlavour.ListPage>
  );
};

export default Page;
