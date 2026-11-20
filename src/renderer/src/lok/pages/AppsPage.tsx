import { LokApp } from "@/core/linkers";
import { useListSearch } from "@/core/layout/useListSearch";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import AppList from "../components/lists/AppList";
import { LOK_HELP } from "../help";

/** Every app registered with the organization. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <LokApp.ListPage
      title="Applications"
      help={LOK_HELP.apps}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search apps…" />
        </>
      }
    >
      <div className="p-3">
        <AppList title="" filters={filters} />
      </div>
    </LokApp.ListPage>
  );
};

export default Page;
