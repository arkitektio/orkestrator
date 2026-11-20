import { LokUser } from "@/core/linkers";
import { useListSearch } from "@/core/layout/useListSearch";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import UserList from "../components/lists/UserList";
import { LOK_HELP } from "../help";

/** Everyone with an account on this server. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <LokUser.ListPage
      title="Users"
      help={LOK_HELP.users}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search users…" />
        </>
      }
    >
      <div className="p-3">
        <UserList title="" filters={filters} />
      </div>
    </LokUser.ListPage>
  );
};

export default Page;
