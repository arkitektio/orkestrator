import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { KabinetApp } from "@/core/linkers";
import { Boxes, KeyRound, Layers, Tag } from "lucide-react";
import { lazy, Suspense, useMemo } from "react";
import { useGetAppQuery, useListAppsQuery } from "../api/graphql";
import { AppIcon, appGradient } from "../components/AppIcon";
import {
  AccessTab,
  ActionsTab,
  Fact,
  FlavoursTab,
  VersionsTab,
} from "../components/AppTabs";
import { AppShelfTile } from "../components/store/AppStoreCard";
import { HardwareBadges, InstallMenu } from "../components/store/StoreParts";
import { groupApps, StoreApp } from "../components/store/storeModel";

/**
 * The hero mark is the one live WebGL context on this page, and only for an app
 * with no logo — so it is loaded on demand rather than by every visit.
 */
const AppMarkCanvas = lazy(() => import("../components/AppMarkCanvas"));

/**
 * More from the same publisher.
 *
 * A separate, filtered query rather than a slice of every app: `AppFilter.search`
 * matches the identifier, and an identifier is reverse-domain, so the publisher
 * prefix selects exactly that publisher's apps. An app with no publisher in its
 * identifier has nothing to show, and the section does not render.
 */
const MoreFromPublisher = ({ app }: { app: StoreApp }) => {
  const { data } = useListAppsQuery({
    variables: { filters: { search: app.publisher ?? "" }, pagination: { limit: 9 } },
    skip: !app.publisher,
  });

  const siblings = useMemo(
    () =>
      groupApps((data?.apps ?? []).flatMap((a) => a.releases)).filter(
        (a) => a.identifier !== app.identifier,
      ),
    [data, app.identifier],
  );

  if (!app.publisher || siblings.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 border-t pt-6">
      <h3 className="text-base font-semibold tracking-tight">
        More from <span className="font-mono text-sm">{app.publisher}</span>
      </h3>
      <div className="-mx-2 flex snap-x gap-1 overflow-x-auto pb-2">
        {siblings.map((sibling) => (
          <AppShelfTile key={sibling.identifier} app={sibling} />
        ))}
      </div>
    </section>
  );
};

/**
 * An app: what a scientist installs, with its versions, builds and actions.
 *
 * Reads its releases from `App.releases` rather than fetching every release in
 * the deployment and picking one out client-side, which is what this page did
 * while the schema had no `app(id:)`.
 */
export const AppPage = asDetailQueryRoute(useGetAppQuery, ({ data }) => {
  // `groupApps` folds a set of releases into the one shape every store surface
  // renders. Handed one app's releases it returns exactly that app.
  const app = useMemo(() => groupApps(data.app.releases)[0], [data.app.releases]);

  return (
    <KabinetApp.ModelPage
      title={app?.name ?? data.app.identifier}
      object={data.app}
      // No Knowledge sidebar: an app is infrastructure, not a datum, so
      // `KabinetApp.Knowledge` renders nothing and the tab would be an empty
      // panel. What there is to say about an app is in the tabs below.
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
        {!app ? (
          <div className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            <span className="font-mono">{data.app.identifier}</span> has no
            releases yet.
          </div>
        ) : (
          <>
            <header className="relative overflow-hidden rounded-3xl border">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-28 opacity-80"
                style={{ background: appGradient(app.hue) }}
              />
              <div className="relative flex flex-col gap-5 p-6 pt-14">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex items-end gap-4">
                    {app.logo ? (
                      <AppIcon
                        app={app}
                        size={96}
                        className="size-24 rounded-3xl text-3xl ring-4 ring-background"
                      />
                    ) : (
                      // Live here rather than rasterised: this is the one mark
                      // on the page, so it can afford a real canvas. AppIcon is
                      // the fallback for a machine without WebGL.
                      <Suspense
                        fallback={
                          <AppIcon
                            app={app}
                            size={96}
                            className="size-24 rounded-3xl text-3xl ring-4 ring-background"
                          />
                        }
                      >
                        <AppMarkCanvas app={app} />
                      </Suspense>
                    )}
                    <div className="min-w-0 pb-1">
                      <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
                      <p className="font-mono text-xs text-muted-foreground">
                        {app.identifier}
                      </p>
                    </div>
                  </div>
                  <InstallMenu
                    flavours={app.latest.flavours}
                    size="lg"
                    className="px-5"
                    label={`Install v${app.latest.version}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-y-3">
                  <Fact label="Version" value={app.latest.version} />
                  <Fact label="Actions" value={app.definitions.length} />
                  <Fact label="Flavours" value={app.latest.flavours.length} />
                  <Fact label="Releases" value={app.releases.length} />
                  <Fact label="Running" value={app.runningCount} />
                  {app.publisher && <Fact label="Publisher" value={app.publisher} />}
                </div>
                <HardwareBadges app={app} />
              </div>
            </header>

            <Tabs defaultValue="actions" className="flex flex-col gap-4">
              <TabsList>
                <TabsTrigger value="actions">
                  <Boxes /> Actions
                </TabsTrigger>
                <TabsTrigger value="flavours">
                  <Layers /> Flavours
                </TabsTrigger>
                <TabsTrigger value="versions">
                  <Tag /> Versions
                </TabsTrigger>
                <TabsTrigger value="access">
                  <KeyRound /> Access
                </TabsTrigger>
              </TabsList>
              <TabsContent value="actions">
                <ActionsTab
                  definitions={app.definitions}
                  empty="This app does not register any actions."
                />
              </TabsContent>
              <TabsContent value="flavours">
                <FlavoursTab flavours={app.latest.flavours} />
              </TabsContent>
              <TabsContent value="versions">
                <VersionsTab releases={app.releases} hue={app.hue} />
              </TabsContent>
              <TabsContent value="access">
                <AccessTab flavours={app.latest.flavours} scopes={app.latest.scopes} />
              </TabsContent>
            </Tabs>

            <MoreFromPublisher app={app} />
          </>
        )}
      </div>
    </KabinetApp.ModelPage>
  );
});

export default AppPage;
