import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { KabinetDeployment } from "@/core/linkers";
import DeploymentList from "../components/lists/DeploymentList";
import { useListSearch } from "../components/ListSearch";
import { KABINET_HELP } from "../help";

/** Every flavour installed on a backend: what pods are started from. */
const Page = () => {
  const { search, setSearch, filters } = useListSearch();

  return (
    <KabinetDeployment.ListPage
      title="Deployments"
      help={KABINET_HELP.deployments}
      pageActions={<CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search deployments…" />}
    >
      <div className="p-3">
        <DeploymentList title="" filters={filters} defaultLimit={40} />
      </div>
    </KabinetDeployment.ListPage>
  );
};

export default Page;
