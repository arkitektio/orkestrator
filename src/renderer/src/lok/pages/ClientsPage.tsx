import { LokClient } from "@/core/linkers";
import { useListSearch } from "@/core/layout/useListSearch";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import ClientList from "../components/lists/ClientList";
import { LOK_HELP } from "../help";

/** Every app signed in to the organization. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <LokClient.ListPage
      title="Clients"
      help={LOK_HELP.clients}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search clients…" />
        </>
      }
    >
      <div className="p-3">
        <ClientList title="" filters={filters} />
      </div>
    </LokClient.ListPage>
  );
};

export default Page;
