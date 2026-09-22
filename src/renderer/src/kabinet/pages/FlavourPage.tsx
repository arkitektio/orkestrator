import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Timestamp from "@/components/ui/timestamp";
import { KabinetApp, KabinetFlavour, KabinetRelease } from "@/linkers";
import { Boxes, Container, GitBranch, KeyRound, Layers, Server } from "lucide-react";
import { lazy, Suspense, useMemo } from "react";
import { PodStatus, useGetFlavourQuery } from "../api/graphql";
import { logoFor, releaseIdentity } from "../appIdentity";
import { AppIcon, appGradient } from "../components/AppIcon";
import { AccessTab, ActionsTab, Fact } from "../components/AppTabs";
import { InstallMenu, SelectorBadges } from "../components/store/StoreParts";

/**
 * The hero mark is the one live WebGL context on this page, and only for an app
 * with no logo — so it is loaded on demand rather than by every visit.
 */
const AppMarkCanvas = lazy(() => import("../components/AppMarkCanvas"));

/** Where this build came from, and what it runs as. */
const SourceTab = ({
  image,
  repo,
}: {
  image: { imageString: string; buildAt?: string | null };
  repo?: { user: string; repo: string; url: string } | null;
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <Container className="size-4" /> Image
      </h4>
      <span className="break-all font-mono text-xs text-muted-foreground">
        {image.imageString}
      </span>
      {image.buildAt && (
        <span className="text-xs text-muted-foreground">
          built <Timestamp date={image.buildAt} relative />
        </span>
      )}
    </div>
    {repo && (
      <a
        href={repo.url}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col gap-2 rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/20"
      >
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <GitBranch className="size-4" /> Source
        </h4>
        <span className="font-mono text-xs text-muted-foreground">
          {repo.user}/{repo.repo}
        </span>
      </a>
    )}
  </div>
);

/** Where this build is actually running. */
const DeploymentsTab = ({
  deployments,
}: {
  deployments: readonly { id: string; status: PodStatus }[];
}) => {
  if (deployments.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        This flavour is not deployed anywhere.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {deployments.map((deployment) => (
        <Badge key={deployment.id} variant="outline" className="rounded-full">
          {deployment.status.toLowerCase()}
        </Badge>
      ))}
    </div>
  );
};

/**
 * The other builds of the same version.
 *
 * A flavour is one way to run a release — CUDA, ROCm, plain CPU — so its useful
 * neighbours are its siblings, not other versions. Read from `release.flavours`
 * in the same query, so this costs nothing extra.
 */
const OtherFlavours = ({
  flavours,
  current,
}: {
  flavours: { id: string; name: string }[];
  current: string;
}) => {
  const siblings = flavours.filter((flavour) => flavour.id !== current);
  if (siblings.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 border-t pt-6">
      <h3 className="text-base font-semibold tracking-tight">
        Other builds of this version
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {siblings.map((flavour) => (
          <KabinetFlavour.DetailLink key={flavour.id} object={flavour}>
            <Badge variant="outline" className="rounded-full">
              {flavour.name}
            </Badge>
          </KabinetFlavour.DetailLink>
        ))}
      </div>
    </section>
  );
};

/**
 * A flavour: one build of one release, and the hardware it needs.
 *
 * It wears the app's identity — with its own logo preferred, since that is the
 * one specific to this build.
 */
export const FlavourPage = asDetailQueryRoute(useGetFlavourQuery, ({ data }) => {
  const flavour = data.flavour;

  const app = useMemo(
    () => ({
      // The sibling flavours on `release` carry no logos of their own, so they
      // are not offered as logo candidates.
      ...releaseIdentity({ ...flavour.release, flavours: undefined }),
      logo: logoFor(flavour) ?? undefined,
    }),
    [flavour],
  );

  const running = flavour.deployments.filter(
    (deployment) => deployment.status === PodStatus.Running,
  ).length;

  return (
    <KabinetFlavour.ModelPage title={flavour.name} object={flavour}>
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
                  <h1 className="text-3xl font-bold tracking-tight">{flavour.name}</h1>
                  {/* Where this build sits: which app, which version. */}
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
                    {app.id ? (
                      <KabinetApp.DetailLink object={{ id: app.id }}>
                        {app.identifier}
                      </KabinetApp.DetailLink>
                    ) : (
                      <span>{app.identifier}</span>
                    )}
                    <span>·</span>
                    <KabinetRelease.DetailLink object={flavour.release}>
                      v{flavour.release.version}
                    </KabinetRelease.DetailLink>
                  </div>
                </div>
              </div>
              <InstallMenu flavours={[flavour]} size="lg" className="px-5" />
            </div>
            <div className="flex flex-wrap items-center gap-y-3">
              <Fact label="Actions" value={flavour.definitions.length} />
              <Fact label="Deployments" value={flavour.deployments.length} />
              <Fact label="Running" value={running} />
              <Fact label="Requirements" value={flavour.requirements.length} />
            </div>
            {/* Where it can run — the constraints, not the capabilities. */}
            <SelectorBadges flavour={flavour} />
          </div>
        </header>

        <Tabs defaultValue="actions" className="flex flex-col gap-4">
          <TabsList>
            <TabsTrigger value="actions">
              <Boxes /> Actions
            </TabsTrigger>
            <TabsTrigger value="access">
              <KeyRound /> Access
            </TabsTrigger>
            <TabsTrigger value="source">
              <Layers /> Source
            </TabsTrigger>
            <TabsTrigger value="deployments">
              <Server /> Deployments
            </TabsTrigger>
          </TabsList>
          <TabsContent value="actions">
            <ActionsTab
              definitions={flavour.definitions}
              empty="This flavour does not register any actions."
            />
          </TabsContent>
          <TabsContent value="access">
            <AccessTab flavours={[flavour]} scopes={flavour.release.scopes} />
          </TabsContent>
          <TabsContent value="source">
            <SourceTab image={flavour.image} repo={flavour.repo} />
          </TabsContent>
          <TabsContent value="deployments">
            <DeploymentsTab deployments={flavour.deployments} />
          </TabsContent>
        </Tabs>

        <OtherFlavours flavours={flavour.release.flavours} current={flavour.id} />
      </div>
    </KabinetFlavour.ModelPage>
  );
});

export default FlavourPage;
