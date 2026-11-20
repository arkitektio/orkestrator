import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { KabinetResource } from "@/core/linkers";
import ResourceList from "../components/lists/ResourceList";
import { useListSearch } from "../components/ListSearch";
import { KABINET_HELP } from "../help";

/** Every resource the backends report: where pods are scheduled onto. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <KabinetResource.ListPage
      title="Resources"
      help={KABINET_HELP.resources}
      pageActions={<CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search resources…" />}
    >
      <div className="p-3">
        <ResourceList title="" filters={filters} defaultLimit={40} />
      </div>
    </KabinetResource.ListPage>
  );
};

export default Page;
