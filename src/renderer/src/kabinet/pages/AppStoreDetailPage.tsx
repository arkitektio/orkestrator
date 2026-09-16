import { PageLayout } from "@/components/layout/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Timestamp from "@/components/ui/timestamp";
import { KabinetDefinition, KabinetFlavour, KabinetRelease } from "@/linkers";
import {
  ArrowLeft,
  Boxes,
  Container,
  GitBranch,
  KeyRound,
  Layers,
  Plug,
  Tag,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppStoreQuery } from "../api/graphql";
import { AppShelfTile } from "../components/store/AppStoreCard";
import {
  AppIcon,
  appGradient,
  HardwareBadges,
  InstallMenu,
  SelectorBadges,
} from "../components/store/StoreParts";
import { groupApps, StoreApp } from "../components/store/storeModel";

const Fact = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 border-l px-4 first:border-l-0 first:pl-0">
    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <span className="text-sm font-semibold tabular-nums">{value}</span>
  </div>
);

const ActionsTab = ({ app }: { app: StoreApp }) => {
  const [search, setSearch] = useState("");
  const shown = app.definitions.filter((d) =>
    `${d.name} ${d.description ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  if (app.definitions.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        This release does not register any actions.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {app.definitions.length > 6 && (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Filter ${app.definitions.length} actions…`}
          className="max-w-sm rounded-full"
        />
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {shown.map((definition) => (
          <KabinetDefinition.DetailLink
            key={definition.id}
            object={definition}
            className="group flex gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Boxes className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium group-hover:underline">
                  {definition.name}
                </span>
                <Badge variant="outline" className="lowercase">
                  {definition.kind}
                </Badge>
              </div>
              {definition.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {definition.description}
                </p>
              )}
            </div>
          </KabinetDefinition.DetailLink>
        ))}
      </div>
    </div>
  );
};

const FlavoursTab = ({ app }: { app: StoreApp }) => (
  <div className="grid gap-3 lg:grid-cols-2">
    {app.latest.flavours.map((flavour) => (
      <div key={flavour.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <KabinetFlavour.DetailLink
              object={flavour}
              className="text-sm font-semibold hover:underline"
            >
              {flavour.name}
            </KabinetFlavour.DetailLink>
            <p className="text-xs text-muted-foreground">
              {flavour.definitions.length} actions · {flavour.deployments.length}{" "}
              deployments
            </p>
          </div>
          <InstallMenu flavours={[flavour]} />
        </div>
        <SelectorBadges flavour={flavour} />
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2 truncate font-mono">
            <Container className="size-3.5 shrink-0" />
            <span className="truncate">{flavour.image.imageString}</span>
          </span>
          {flavour.image.buildAt && (
            <span className="flex items-center gap-2">
              <Tag className="size-3.5 shrink-0" />
              built <Timestamp date={flavour.image.buildAt} relative />
            </span>
          )}
          {flavour.repo && (
            <a
              href={flavour.repo.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-foreground"
            >
              <GitBranch className="size-3.5 shrink-0" />
              {flavour.repo.user}/{flavour.repo.repo}
            </a>
          )}
        </div>
      </div>
    ))}
  </div>
);

const VersionsTab = ({ app }: { app: StoreApp }) => (
  <ol className="relative flex flex-col gap-4 border-l pl-6">
    {app.releases.map((release, index) => (
      <li key={release.id} className="relative">
        <span
          className="absolute -left-[1.85rem] top-1 size-3 rounded-full border-2 border-background"
          style={{ background: index === 0 ? appGradient(app.hue) : "var(--muted-foreground)" }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <KabinetRelease.DetailLink
            object={release}
            className="font-mono text-sm font-semibold hover:underline"
          >
            v{release.version}
          </KabinetRelease.DetailLink>
          {index === 0 && <Badge>latest</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {release.flavours.map((f) => f.name).join(", ") || "no flavours"}
        </p>
      </li>
    ))}
  </ol>
);

const AccessTab = ({ app }: { app: StoreApp }) => {
  const requirements = useMemo(() => {
    const seen = new Map<string, StoreApp["flavours"][number]["requirements"][number]>();
    app.latest.flavours
      .flatMap((f) => f.requirements)
      .forEach((r) => seen.set(r.key, r));
    return [...seen.values()];
  }, [app]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Plug className="size-4" /> Services it talks to
        </h4>
        {requirements.length === 0 && (
          <p className="text-xs text-muted-foreground">No service requirements.</p>
        )}
        {requirements.map((requirement) => (
          <div key={requirement.key} className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{requirement.service}</span>
              {requirement.optional && <Badge variant="outline">optional</Badge>}
            </div>
            {requirement.description && (
              <p className="text-xs text-muted-foreground">{requirement.description}</p>
            )}
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4" /> Requested scopes
        </h4>
        {app.latest.scopes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No scopes requested.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {app.latest.scopes.map((scope) => (
              <Badge key={scope} variant="secondary" className="font-mono">
                {scope}
              </Badge>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export const AppStoreDetailPage = () => {
  const { identifier = "" } = useParams<{ identifier: string }>();
  const { data, loading } = useAppStoreQuery({ fetchPolicy: "cache-first" });
  const apps = useMemo(() => groupApps(data?.releases ?? []), [data]);
  const app = apps.find((a) => a.identifier === identifier);

  const related = useMemo(() => {
    if (!app) return [];
    return apps
      .filter((a) => a.identifier !== app.identifier)
      .map((a) => ({
        a,
        score:
          (a.publisher && a.publisher === app.publisher ? 3 : 0) +
          a.services.filter((s) => app.services.includes(s)).length +
          a.hardware.filter((h) => app.hardware.includes(h)).length,
      }))
      .sort((x, y) => y.score - x.score)
      .slice(0, 8)
      .map(({ a }) => a);
  }, [apps, app]);

  return (
    <PageLayout title={app?.name ?? identifier}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
        <Button variant="ghost" size="sm" className="w-fit rounded-full" asChild>
          <Link to="/kabinet/app-store">
            <ArrowLeft /> App Store
          </Link>
        </Button>

        {loading && !data ? (
          <Skeleton className="h-56 rounded-3xl" />
        ) : !app ? (
          <div className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            No app registered as <span className="font-mono">{identifier}</span>.
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
                    <AppIcon
                      app={app}
                      className="size-24 rounded-3xl text-3xl ring-4 ring-background"
                    />
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
                <ActionsTab app={app} />
              </TabsContent>
              <TabsContent value="flavours">
                <FlavoursTab app={app} />
              </TabsContent>
              <TabsContent value="versions">
                <VersionsTab app={app} />
              </TabsContent>
              <TabsContent value="access">
                <AccessTab app={app} />
              </TabsContent>
            </Tabs>

            {related.length > 0 && (
              <section className="flex flex-col gap-2 border-t pt-6">
                <h3 className="text-base font-semibold tracking-tight">You might also like</h3>
                <div className="-mx-2 flex snap-x gap-1 overflow-x-auto pb-2">
                  {related.map((a) => (
                    <AppShelfTile key={a.identifier} app={a} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default AppStoreDetailPage;
