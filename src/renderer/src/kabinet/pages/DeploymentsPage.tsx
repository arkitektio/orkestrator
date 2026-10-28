import { KabinetDeployment } from "@/core/linkers";
import { useDebounce } from "@uidotdev/usehooks";
import { useState } from "react";
import { ListSearch } from "../components/ListSearch";
import DeploymentList from "../components/lists/DeploymentList";
import { KABINET_HELP } from "../help";

/** Every flavour installed on a backend: what pods are started from. */
const Page = () => {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 200);

  return (
    <KabinetDeployment.ListPage title="Deployments" help={KABINET_HELP.deployments}>
      <div className="flex w-full flex-col gap-3 p-3">
        <ListSearch value={search} onChange={setSearch} placeholder="Search deployments…" />
        <DeploymentList filters={debounced ? { search: debounced } : undefined} />
      </div>
    </KabinetDeployment.ListPage>
  );
};

export default Page;
