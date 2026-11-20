import { LokLayer } from "@/core/linkers";
import { useListSearch } from "@/core/layout/useListSearch";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import LayerList from "../components/lists/LayerList";
import { LOK_HELP } from "../help";

/** The connection layers between services and apps. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <LokLayer.ListPage
      title="Layers"
      help={LOK_HELP.layers}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search layers…" />
        </>
      }
    >
      <div className="p-3">
        <LayerList title="" filters={filters} />
      </div>
    </LokLayer.ListPage>
  );
};

export default Page;
