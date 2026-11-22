import { reportErrorAs } from "@/core/notify";
import { PageLayout } from "@/core/layout/PageLayout";

import { asParamlessRoute, HookFunction } from "@/core/layout/routes/ParamlessRoute";
import { OperationVariables } from "@apollo/client";
import { PageAction } from "@/core/ui/page-action";
import { HomeEmpty, ModuleHome, ModuleHomeSidebars } from "@/core/layout/ModuleHome";
import { DialogButton } from "@/core/ui/dialog-button";
import { Store } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AppStoreDocument,
  HomePageDocument,
  HomePageQuery,
  ListDefinitionsDocument,
  ListReleasesDocument,
  useHomePageQuery,
  useRescanReposMutation,
  useHomePageStatsQuery,
} from "../api/graphql";
import { InstalledApps } from "../components/home/InstalledApps";
import { StoreShelf } from "../components/home/StoreShelf";
import { KABINET_HELP } from "../help";

// The generated `useHomePageQuery` takes no variables at all (`Exact<{}>`),
// which is too narrow for `asParamlessRoute`'s generic `HookFunction` (it is
// invoked with a generic `OperationVariables` options object). The runtime
// shape is unaffected: options are always `{}` for this query.
const useHomePageQueryAsHookFunction = useHomePageQuery as unknown as HookFunction<
  HomePageQuery,
  OperationVariables
>;

const Page = asParamlessRoute(useHomePageQueryAsHookFunction, ({ data }: { data: HomePageQuery }) => {
  const [rescan, { loading }] = useRescanReposMutation({
    refetchQueries: [HomePageDocument, AppStoreDocument, ListReleasesDocument, ListDefinitionsDocument],
  });
  const { data: stats } = useHomePageStatsQuery();
  return (
    <PageLayout
      help={KABINET_HELP.home}
      sidebars={
        <ModuleHomeSidebars
          moduleKey="kabinet"
          stats={stats ? { "/kabinet/repos": { count: stats.githubRepoStats.count } } : undefined}
        />
      }
      pageActions={
        <>
          <PageAction asChild alwaysShow size="sm">
            <Link to="/kabinet/app-store">
              <Store className="h-4 w-4" />
              App Store
            </Link>
          </PageAction>
          <DialogButton
            alwaysShow
            name="createrepo"
            variant="outline"
            size="sm"
            dialogProps={{}}
          >
            Add Repo
          </DialogButton>
          <DialogButton alwaysShow name="importocirepo" variant="outline" size="sm" dialogProps={{}}>
            Import from registry
          </DialogButton>
          <PageAction
            priority={-10}
            onClick={() => rescan().catch(reportErrorAs("Couldn't rescan the repositories"))}
            size="sm"
          >
            {loading ? "Rescanning..." : "Rescan Repos"}
          </PageAction>
        </>
      }
      title="Kabinet"
    >

      <ModuleHome
        moduleKey="kabinet"
        pages={false}
        title="Kabinet"
        description="Your organization's app store: install and manage apps from their repositories."
      >
        {/* No app at all, from a repository or a registry: say how to bring one in. */}
        {data.appStoreTotals.apps === 0 ? (
          <HomeEmpty title="No repos yet">
            Press <b>Add Repo</b> or <b>Import from registry</b> to bring in
            your first apps, or browse the <Link to="/kabinet/app-store" className="underline">App Store</Link>.
          </HomeEmpty>
        ) : (
          <>
            {/* Apps first. The repositories they come from are a page of their own (sidebar). */}
            <InstalledApps />
            <StoreShelf />
          </>
        )}
      </ModuleHome>
    </PageLayout>
  );
});

export default Page;
