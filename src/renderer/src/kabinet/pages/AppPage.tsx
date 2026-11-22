import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/ui/tabs";
import { KabinetApp } from "@/core/linkers";
import { Boxes, KeyRound, Layers, Tag } from "lucide-react";
import { Suspense, useMemo } from "react";
import { preloadable } from "@/core/util/preloadable";
import { useGetAppQuery, useListAppsQuery } from "../api/graphql";
import { hasOwnLogo, splitIdentifier } from "../appIdentity";
import { AppIcon, appGradient } from "../components/AppIcon";
import {
  AccessTab,
  ActionsTab,
  Fact,
  FlavoursTab,
  VersionsTab,
} from "../components/AppTabs";
import { AppShelfTile } from "../components/store/AppStoreCard";
import { HardwareBadges, InstallButton } from "../components/store/StoreParts";
import { fromShelfApp, fromStoreApp, ShelfTile, StoreApp } from "../components/store/storeModel";
import { KABINET_HELP } from "../help";

/**
 * The hero mark is the one live WebGL context on this page, and only for an app
 * with no logo. Its own chunk (three.js and the mark data), loaded before the
 * window's first render: see `core/util/preloadable`.
 */
const AppMarkCanvas = preloadable(() => import("../components/AppMarkCanvas"));

/**
 * More from the same publisher: `AppFilter.publisher` keeps exactly the apps
 * whose identifier is that publisher plus one segment (`search` would also
 * match action names and similar identifiers). The publisher is the one in the
 * identifier; an app without one has nothing to show, and the section does not
 * render.
 */
const MoreFromPublisher = ({ app }: { app: StoreApp }) => {
  const { publisher } = splitIdentifier(app.identifier);
  const { data } = useListAppsQuery({
    variables: { filters: { publisher: publisher ?? "" }, pagination: { limit: 9 } },
    skip: !publisher,
  });

  const siblings = useMemo(
    () => (data?.apps ?? []).filter((a) => a.id !== app.id).flatMap((a) => fromShelfApp(a) ?? []),
    [data, app.id],
  );

  if (!publisher || siblings.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 border-t pt-6">
      <h3 className="text-base font-semibold tracking-tight">
        More from <span className="font-mono text-sm">{publisher}</span>
      </h3>
      <div className="-mx-2 flex snap-x gap-1 overflow-x-auto pb-2">
        {siblings.map((sibling: ShelfTile) => (
          <AppShelfTile key={sibling.identifier} app={sibling} />
        ))}
      </div>
    </section>
  );
};

/**
 * An app: what a scientist installs, with its versions, builds and actions.
 *
 * Drawn as the store draws it (`fromStoreApp`): its newest release in full and
 * what the server works out over all releases. The other versions are only
 * lines of the Versions tab, so only their version and build names are read.
 */
export const AppPage = asDetailQueryRoute(useGetAppQuery, ({ data }) => {
  const app = useMemo(() => fromStoreApp(data.app), [data.app]);

  return (
    <KabinetApp.ModelPage
      title={app?.name ?? data.app.identifier}
      object={data.app}
      help={KABINET_HELP.app}
      // No Knowledge sidebar: an app is infrastructure, not a datum, so
      // `KabinetApp.Knowledge` renders nothing and the tab would be an empty
      // panel. What there is to say about an app is in the tabs below.
    >
      <div className="flex w-full flex-col gap-4 p-3">
        {!app ? (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            <span className="font-mono">{data.app.identifier}</span> has no
            releases yet.
          </div>
        ) : (
          <>
            <header className="relative overflow-hidden rounded-2xl border">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-16 opacity-80"
                style={{ background: appGradient(app.hue) }}
              />
              <div className="relative flex flex-col gap-3 p-4 pt-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex items-end gap-4">
                    {hasOwnLogo(app) ? (
                      <AppIcon
                        app={app}
                        size={64}
                        className="size-16 rounded-2xl text-xl ring-4 ring-background"
                      />
                    ) : (
                      // Live here rather than rasterised: this is the one mark
                      // on the page, so it can afford a real canvas. AppIcon is
                      // the fallback for a machine without WebGL.
                      <Suspense
                        fallback={
                          <AppIcon
                            app={app}
                            size={64}
                            className="size-16 rounded-2xl text-xl ring-4 ring-background"
                          />
                        }
                      >
                        <AppMarkCanvas app={app} className="size-16" />
                      </Suspense>
                    )}
                    <div className="min-w-0 pb-1">
                      <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
                      <p className="font-mono text-xs text-muted-foreground">
                        {app.identifier}
                      </p>
                    </div>
                  </div>
                  <InstallButton
                    release={app.latest}
                    size="lg"
                    className="px-5"
                    label={`Install v${app.latest.version}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-y-3">
                  <Fact label="Version" value={app.latest.version} />
                  <Fact label="Actions" value={app.definitions.length} />
                  <Fact label="Flavours" value={app.latest.flavours.length} />
                  <Fact label="Releases" value={app.releaseCount} />
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
                <VersionsTab releases={data.app.releases} hue={app.hue} />
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
