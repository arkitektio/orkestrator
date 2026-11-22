import { ListRender } from "@/core/layout/ListRender";
import { KabinetApp } from "@/core/linkers";
import { useDialog } from "@/core/dialogs/registry";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { PageAction } from "@/core/ui/page-action";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useAppCatalogQuery } from "../api/graphql";
import { useListSearch } from "../components/ListSearch";
import { AppStoreCard } from "../components/store/AppStoreCard";
import { fromStoreApps } from "../components/store/storeModel";
import { KABINET_HELP } from "../help";

/**
 * Every app registered with the organization, as the store draws them. The
 * server ranks a search (substring, then similarity); grouping keeps its order.
 */
const Page = () => {
  const { openDialog } = useDialog();
  const { search, setSearch, filters } = useListSearch();
  const { data, error, refetch } = useAppCatalogQuery({
    variables: { filters },
    fetchPolicy: "cache-and-network",
  });
  // An app without a release yet has nothing to draw a card from.
  const apps = useMemo(() => fromStoreApps(data?.apps ?? []), [data]);

  return (
    <KabinetApp.ListPage
      title="Apps"
      help={KABINET_HELP.apps}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search apps by identifier…" />
          <PageAction
            size="sm"
            collapse="icon"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openDialog("createrepo", {})}
          >
            Add Repo
          </PageAction>
        </>
      }
    >
      <div className="p-3">
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
