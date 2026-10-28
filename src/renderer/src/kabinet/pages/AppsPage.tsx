import { ListRender } from "@/core/layout/ListRender";
import { KabinetApp } from "@/core/linkers";
import { DialogButton } from "@/core/ui/dialog-button";
import { useDebounce } from "@uidotdev/usehooks";
import { useMemo, useState } from "react";
import { useAppCatalogQuery } from "../api/graphql";
import { ListSearch } from "../components/ListSearch";
import { AppStoreCard } from "../components/store/AppStoreCard";
import { groupApps } from "../components/store/storeModel";
import { KABINET_HELP } from "../help";

/**
 * Every app registered with the organization, as the store draws them. The
 * server ranks a search (substring, then similarity); grouping keeps its order.
 */
const Page = () => {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 200);
  const { data, error, refetch } = useAppCatalogQuery({
    variables: { filters: debounced ? { search: debounced } : undefined },
    fetchPolicy: "cache-and-network",
  });
  // An app without a release yet has nothing to draw a card from.
  const apps = useMemo(() => groupApps((data?.apps ?? []).flatMap((app) => app.releases)), [data]);

  return (
    <KabinetApp.ListPage
      title="Apps"
      help={KABINET_HELP.apps}
      pageActions={
        <DialogButton alwaysShow name="createrepo" variant="outline" size="sm" dialogProps={{}}>
          Add Repo
        </DialogButton>
      }
    >
      <div className="flex w-full flex-col gap-3 p-3">
        <ListSearch value={search} onChange={setSearch} placeholder="Search apps by identifier…" />
        <ListRender
          array={apps}
          error={error}
          refetch={(variables) => refetch(variables)}
          minItemWidth={256}
        >
          {(app) => <AppStoreCard key={app.identifier} app={app} />}
        </ListRender>
      </div>
    </KabinetApp.ListPage>
  );
};

export default Page;
