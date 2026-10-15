import { PageLayout } from "@/core/layout/PageLayout";

import { asParamlessRoute, HookFunction } from "@/core/layout/routes/ParamlessRoute";
import { OperationVariables } from "@apollo/client";
import { Sidebars } from "@/core/layout/Sidebars";
import { HelpSidebar } from "@/core/layout/help";
import { PageAction } from "@/core/ui/page-action";
import { HomeEmpty, ModuleHome } from "@/core/layout/ModuleHome";
import { DialogButton } from "@/core/ui/dialog-button";
import { Store } from "lucide-react";
import { Link } from "react-router-dom";
import {
  HomePageQuery,
  ListDefinitionsDocument,
  ListReleasesDocument,
  useHomePageQuery,
  useRescanReposMutation,
} from "../api/graphql";
import { RunningPods } from "../components/home/RunningPods";
import { StoreShelf } from "../components/home/StoreShelf";
import RepoList from "../components/lists/RepoList";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";
import { KABINET_HELP } from "../help";

// The generated `useHomePageQuery` takes no variables at all (`Exact<{}>`),
// which is too narrow for `asParamlessRoute`'s generic `HookFunction` (it is
// invoked with a generic `OperationVariables` options object). The runtime
// shape is unaffected: options are always `{}` for this query.
const useHomePageQueryAsHookFunction = useHomePageQuery as unknown as HookFunction<
  HomePageQuery,
  OperationVariables
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Page = asParamlessRoute(useHomePageQueryAsHookFunction, ({ data }: { data: any }) => {
  const [rescan, { loading }] = useRescanReposMutation({
    refetchQueries: [ListReleasesDocument, ListDefinitionsDocument],
  });
  return (
    <PageLayout
      help={KABINET_HELP.home}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Statistics">
            <HomePageStatisticsSidebar />
          </Sidebars.Tab>
          <Sidebars.Tab label="Help">
            <HelpSidebar />
          </Sidebars.Tab>
        </Sidebars>
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
            onClick={async () => {
              await rescan();
            }}
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
        title="Kabinet"
        description="Your organization's app store: install and manage apps from their repositories."
      >
        {data?.repos?.length == 0 ? (
          <HomeEmpty title="No repos yet">
            Press <b>Add Repo</b> or <b>Import from registry</b> to bring in
            your first apps, or browse the <Link to="/kabinet/app-store" className="underline">App Store</Link>.
          </HomeEmpty>
        ) : (
          <>
            <RunningPods />
            <StoreShelf />
            <RepoList pagination={{ limit: 6 }} />
          </>
        )}
      </ModuleHome>
    </PageLayout>
  );
});

export default Page;
