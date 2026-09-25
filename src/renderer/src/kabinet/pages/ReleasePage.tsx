import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Badge } from "@/core/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { KabinetApp, KabinetRelease } from "@/core/linkers";
import { Boxes, KeyRound, Layers } from "lucide-react";
import { lazy, Suspense, useMemo } from "react";
import { useGetReleaseQuery } from "../api/graphql";
import { releaseIdentity } from "../appIdentity";
import { AppIcon, appGradient } from "../components/AppIcon";
import { AccessTab, ActionsTab, Fact, FlavoursTab } from "../components/AppTabs";
import { groupApps } from "../components/store/storeModel";
import { HardwareBadges, InstallMenu } from "../components/store/StoreParts";

/**
 * The hero mark is the one live WebGL context on this page, and only for an app
 * with no logo — so it is loaded on demand rather than by every visit.
 */
const AppMarkCanvas = lazy(() => import("../components/AppMarkCanvas"));

/**
 * The app's other versions.
 *
 * A release is one point on a line, and the line is the useful thing: what came
 * before, what superseded it. Read from `app.releases` in the same query, so
 * this costs nothing extra.
 */
const OtherVersions = ({
  releases,
  current,
}: {
  releases: readonly { id: string; version: string }[];
  current: string;
}) => {
  if (releases.length < 2) return null;

  return (
    <section className="flex flex-col gap-2 border-t pt-6">
      <h3 className="text-base font-semibold tracking-tight">Versions</h3>
      <div className="flex flex-wrap gap-1.5">
        {releases.map((release, index) =>
          release.id === current ? (
            <Badge key={release.id} className="rounded-full font-mono">
              v{release.version}
            </Badge>
          ) : (
            <KabinetRelease.DetailLink key={release.id} object={release}>
              <Badge variant="outline" className="rounded-full font-mono">
                v{release.version}
                {index === 0 && " · latest"}
              </Badge>
            </KabinetRelease.DetailLink>
          ),
        )}
      </div>
    </section>
  );
};

/**
 * A release: one version of an app, and the builds ("flavours") it ships.
 *
 * Summarised through `groupApps([release])` — the same fold the store and the
 * app page use, handed a single release. That is what lets this page reuse
 * their panels rather than growing its own copies.
 */
export const ReleasePage = asDetailQueryRoute(useGetReleaseQuery, ({ data }) => {
  const release = data.release;
  const app = useMemo(() => releaseIdentity(release), [release]);
  const summary = useMemo(() => groupApps([release])[0], [release]);

  return (
    <KabinetRelease.ModelPage title={release.name} object={release}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
        <header className="relative overflow-hidden rounded-3xl border">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-28 opacity-80"
            style={{ background: appGradient(app.hue ?? 0) }}
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
                  // Live here rather than rasterised: this is the one mark on
                  // the page, so it can afford a real canvas. AppIcon is the
                  // fallback for a machine without WebGL.
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
                    <Badge variant="secondary" className="rounded-full font-mono">
                      v{release.version}
                    </Badge>
                  </div>
                  {/* The identifier is the app; this is one of its versions. */}
                  {app.id ? (
                    <KabinetApp.DetailLink
                      object={{ id: app.id }}
                      className="block font-mono text-xs text-muted-foreground"
                    >
                      {app.identifier}
                    </KabinetApp.DetailLink>
                  ) : (
                    <p className="font-mono text-xs text-muted-foreground">
                      {app.identifier}
                    </p>
                  )}
                </div>
              </div>
              <InstallMenu
                flavours={release.flavours}
                size="lg"
                className="px-5"
                label={`Install v${release.version}`}
              />
            </div>
            {summary && (
              <>
                <div className="flex flex-wrap items-center gap-y-3">
                  <Fact label="Version" value={release.version} />
                  <Fact label="Flavours" value={release.flavours.length} />
                  <Fact label="Actions" value={summary.definitions.length} />
                  <Fact label="Deployments" value={summary.deploymentCount} />
                  <Fact label="Running" value={summary.runningCount} />
                  {summary.publisher && (
                    <Fact label="Publisher" value={summary.publisher} />
                  )}
                </div>
                <HardwareBadges app={summary} />
              </>
            )}
          </div>
        </header>

        {summary && (
          <Tabs defaultValue="flavours" className="flex flex-col gap-4">
            <TabsList>
              <TabsTrigger value="flavours">
                <Layers /> Flavours
              </TabsTrigger>
              <TabsTrigger value="actions">
                <Boxes /> Actions
              </TabsTrigger>
              <TabsTrigger value="access">
                <KeyRound /> Access
              </TabsTrigger>
            </TabsList>
            <TabsContent value="flavours">
              <FlavoursTab flavours={release.flavours} />
            </TabsContent>
            <TabsContent value="actions">
              <ActionsTab
                definitions={summary.definitions}
                empty="This release does not register any actions."
              />
            </TabsContent>
            <TabsContent value="access">
              <AccessTab flavours={release.flavours} scopes={release.scopes} />
            </TabsContent>
          </Tabs>
        )}

        <OtherVersions releases={release.app.releases} current={release.id} />
      </div>
    </KabinetRelease.ModelPage>
  );
});

export default ReleasePage;
