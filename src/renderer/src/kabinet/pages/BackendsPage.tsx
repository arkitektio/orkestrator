import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { KabinetBackend } from "@/core/linkers";
import BackendList from "../components/lists/BackendList";
import { useListSearch } from "../components/ListSearch";
import { KABINET_HELP } from "../help";

/** Every backend: the machines and container engines that run deployed apps. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <KabinetBackend.ListPage
      title="Backends"
      help={KABINET_HELP.backends}
      pageActions={<CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search backends…" />}
    >
      <div className="p-3">
        <BackendList title="" filters={filters} defaultLimit={40} />
      </div>
    </KabinetBackend.ListPage>
  );
};

export default Page;
