import { PageLayout } from "@/components/layout/PageLayout";
import { Separator } from "@/components/ui/separator";

import { asParamlessRoute, HookFunction } from "@/app/routes/ParamlessRoute";
import { OperationVariables } from "@apollo/client";
import { Sidebars } from "@/components/layout/Sidebars";
import { HelpSidebar } from "@/components/sidebars/help";
import { Button } from "@/components/ui/button";
import { PageAction } from "@/components/ui/page-action";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogButton } from "@/components/ui/dialog-button";
import {
  BarChart3,
  Network,
  ShoppingBasket,
  Store,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  HomePageQuery,
  ListDefinitionsDocument,
  ListReleasesDocument,
  useHomePageQuery,
  useRescanReposMutation,
} from "../api/graphql";
import { PopularCarousel } from "../components/PopularCarousel";
import DefinitionList from "../components/lists/DefinitionList";
import RepoList from "../components/lists/RepoList";
import ReleasesList from "../components/lists/ReleasesList";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";

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
      title="Home"
    >

      {data?.repos?.length == 0 ? (
        // Empty State with Hero Design
        <div className="min-h-full w-full  flex items-center justify-center rounded-lg">
          <div className="max-w-4xl mx-auto text-center px-6 py-16">
            {/* Hero Section */}
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="">
                  <ShoppingBasket className="h-16 w-16 text-primary" />
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Welcome to Kabinet
                </span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Your personal organization wide app-store. That allows you to
                install and manage apps directly from your GitHub repositories.
              </p>
            </div>

            {/* Action Section */}
            <div className="mt-12 space-y-6">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button variant="default" size="lg" onClick={() => { }}>
                  Add your first Repo
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/kabinet/app-store">
                    <Store className="mr-2 h-4 w-4" />
                    Browse the App Store
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Add Apps</span>
                </div>
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  <span>Manage Plugin Engines</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Start Analyzing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Dashboard View with Data
        <div className="space-y-8 p-3">
          {/* Welcome Header */}
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <ShoppingBasket className="h-8 w-8 text-primary" />
              Apps
            </CardTitle>
            <CardDescription className="text-lg">
              Your recently uploaded and managed apps
            </CardDescription>
          </CardHeader>

          <PopularCarousel />

          <Separator className="mt-8 mb-2" />

          <RepoList pagination={{ limit: 6 }} />

          <Separator className="mt-8 mb-2" />

          <DefinitionList />
          <ReleasesList />
        </div>
      )}
    </PageLayout>
  );
});

export default Page;
