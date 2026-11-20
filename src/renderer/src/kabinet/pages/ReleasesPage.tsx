import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { KabinetRelease } from "@/core/linkers";
import ReleasesList from "../components/lists/ReleasesList";
import { useListSearch } from "../components/ListSearch";
import { KABINET_HELP } from "../help";

/** Every release: each published version of each app. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <KabinetRelease.ListPage
      title="Releases"
      help={KABINET_HELP.releases}
      pageActions={<CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search releases…" />}
    >
      <div className="p-3">
        <ReleasesList title="" filters={filters} defaultLimit={40} />
      </div>
    </KabinetRelease.ListPage>
  );
};

export default Page;
