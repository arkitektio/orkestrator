import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { KabinetPod } from "@/core/linkers";
import PodsList from "../components/lists/PodsList";
import { useListSearch } from "../components/ListSearch";
import { KABINET_HELP } from "../help";

/** Every pod: the running copies of your deployed apps, and where they run. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <KabinetPod.ListPage
      title="Pods"
      help={KABINET_HELP.pods}
      pageActions={<CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search pods…" />}
    >
      <div className="p-3">
        <PodsList title="" filters={filters} defaultLimit={40} />
      </div>
    </KabinetPod.ListPage>
  );
};

export default Page;
