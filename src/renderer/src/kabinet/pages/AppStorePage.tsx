import { PageLayout } from "@/components/layout/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDebounce } from "@uidotdev/usehooks";
import {
  ArrowRight,
  Boxes,
  Cpu,
  Layers,
  LucideIcon,
  PlayCircle,
  Search,
  ShoppingBag,
  X,
  Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppStoreQuery } from "../api/graphql";
import { AppShelfTile, AppStoreCard, appStorePath } from "../components/store/AppStoreCard";
import {
  AppIcon,
  appGradient,
  HardwareBadges,
  InstallMenu,
  FeaturedBadge,
} from "../components/store/StoreParts";
import {
  filterApps,
  groupApps,
  pickFeatured,
  sortApps,
  StoreApp,
  StoreFilter,
  StoreSort,
} from "../components/store/storeModel";

const FILTERS: { value: StoreFilter; label: string; icon: LucideIcon }[] = [
  { value: "all", label: "All apps", icon: ShoppingBag },
  { value: "gpu", label: "GPU accelerated", icon: Zap },
  { value: "cpu", label: "Runs on CPU", icon: Cpu },
  { value: "installed", label: "Deployed", icon: PlayCircle },
];

const SORTS: { value: StoreSort; label: string }[] = [
  { value: "recent", label: "Newest" },
  { value: "actions", label: "Most actions" },
  { value: "name", label: "A–Z" },
];

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors [&>svg]:size-3.5",
      active
        ? "border-foreground bg-foreground text-background"
        : "bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const Stat = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col">
    <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
  </div>
);

const FeaturedApp = ({ app }: { app: StoreApp }) => (
  <div className="relative overflow-hidden rounded-3xl border">
    <div
      aria-hidden
      className="absolute inset-0 opacity-[0.12] dark:opacity-20"
      style={{ background: appGradient(app.hue) }}
    />
    <div
      aria-hidden
      className="absolute -right-24 -top-24 size-80 rounded-full opacity-40 blur-3xl"
      style={{ background: appGradient(app.hue) }}
    />
    <div className="relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
      <div className="flex flex-col gap-4">
        <FeaturedBadge />
        <div className="flex items-center gap-4">
          <AppIcon app={app} className="size-20 rounded-3xl text-2xl" />
          <div className="min-w-0">
            <h2 className="truncate text-3xl font-bold tracking-tight">{app.name}</h2>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {app.identifier} · v{app.latest.version}
            </p>
          </div>
        </div>
        <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">
          {app.definitions.find((d) => d.description)?.description ??
            `Brings ${app.definitions.length} actions to your organization.`}
        </p>
        <HardwareBadges app={app} />
        <div className="flex items-center gap-2">
          <InstallMenu flavours={app.latest.flavours} size="lg" className="px-4" />
          <Button variant="ghost" size="lg" className="rounded-full" asChild>
            <Link to={appStorePath(app.identifier)}>
              Explore <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
      {app.definitions.length > 0 && (
        <div className="hidden w-72 flex-col gap-1.5 md:flex">
          <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            What it can do
          </span>
          {app.definitions.slice(0, 5).map((definition) => (
            <div
              key={definition.id}
              className="flex items-center gap-2 rounded-lg bg-background/70 px-3 py-2 text-xs backdrop-blur"
            >
              <Boxes className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{definition.name}</span>
            </div>
          ))}
          {app.definitions.length > 5 && (
            <span className="px-3 text-[0.65rem] text-muted-foreground">
              + {app.definitions.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  </div>
);

const Shelf = ({
  title,
  description,
  apps,
}: {
  title: string;
  description: string;
  apps: StoreApp[];
}) =>
  apps.length === 0 ? null : (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="-mx-2 flex snap-x gap-1 overflow-x-auto pb-2">
        {apps.map((app) => (
          <AppShelfTile key={app.identifier} app={app} />
        ))}
      </div>
    </section>
  );

const LoadingGrid = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-64 w-full rounded-3xl" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-2xl" />
      ))}
    </div>
  </div>
);

const EmptyStore = () => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed px-6 py-20 text-center">
    <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
      <ShoppingBag className="size-8 text-primary" />
    </div>
    <div>
      <h2 className="text-xl font-semibold">The shelves are empty</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Apps appear here once a GitHub repository with an Arkitekt manifest has been
        added and scanned.
      </p>
    </div>
    <DialogButton name="createrepo" dialogProps={{}} size="sm">
      Add a repository
    </DialogButton>
  </div>
);

export const AppStorePage = () => {
  const { data, loading, error } = useAppStoreQuery({
    fetchPolicy: "cache-and-network",
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StoreFilter>("all");
  const [service, setService] = useState<string | null>(null);
  const [sort, setSort] = useState<StoreSort>("recent");
  const debouncedSearch = useDebounce(search, 150);

  const apps = useMemo(() => groupApps(data?.releases ?? []), [data]);
  const services = useMemo(
    () => [...new Set(apps.flatMap((a) => a.services))].sort(),
    [apps],
  );
  const visible = useMemo(
    () =>
      sortApps(filterApps(apps, { search: debouncedSearch, filter, service }), sort),
    [apps, debouncedSearch, filter, service, sort],
  );
  const featured = useMemo(() => pickFeatured(apps), [apps]);

  const browsing = !debouncedSearch && filter === "all" && !service;
  const totals = useMemo(
    () => ({
      actions: apps.reduce((n, a) => n + a.definitions.length, 0),
      flavours: apps.reduce((n, a) => n + a.flavours.length, 0),
      running: apps.reduce((n, a) => n + a.runningCount, 0),
    }),
    [apps],
  );

  return (
    <PageLayout
      title="App Store"
      pageActions={
        <DialogButton name="createrepo" variant="outline" size="sm" dialogProps={{}}>
          Add Repo
        </DialogButton>
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 md:p-6">
        {/* Header */}
        <header className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Discover apps</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Everything registered with your organization — ready to deploy on your
                engines.
              </p>
            </div>
            {apps.length > 0 && (
              <div className="flex gap-8">
                <Stat value={apps.length} label="Apps" />
                <Stat value={totals.actions} label="Actions" />
                <Stat value={totals.flavours} label="Flavours" />
                <Stat value={totals.running} label="Running" />
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps, identifiers or actions…"
              className="h-11 rounded-full pl-10 pr-10 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(({ value, label, icon: Icon }) => (
                <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
                  <Icon />
                  {label}
                </Chip>
              ))}
              {services.length > 0 && <span className="mx-1 w-px self-stretch bg-border" />}
              {services.map((s) => (
                <Chip
                  key={s}
                  active={service === s}
                  onClick={() => setService(service === s ? null : s)}
                >
                  <Layers />
                  {s}
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Sort
              {SORTS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={sort === value ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setSort(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {error && !data && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Could not load the app store: {error.message}
          </div>
        )}

        {loading && !data ? (
          <LoadingGrid />
        ) : apps.length === 0 ? (
          !error && <EmptyStore />
        ) : (
          <>
            {browsing && featured && <FeaturedApp app={featured} />}

            {browsing && apps.length > 4 && (
              <div className="flex flex-col gap-6">
                <Shelf
                  title="Fresh releases"
                  description="The latest additions and updates."
                  apps={apps.slice(0, 12)}
                />
                <Shelf
                  title="GPU accelerated"
                  description="Built to make use of CUDA, ROCm or oneAPI hardware."
                  apps={apps.filter((a) => a.hardware.includes("gpu"))}
                />
                <Shelf
                  title="Already running"
                  description="Deployed on one of your engines right now."
                  apps={apps.filter((a) => a.runningCount > 0)}
                />
              </div>
            )}

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold tracking-tight">
                  {browsing ? "All apps" : "Results"}
                </h3>
                <Badge variant="secondary">{visible.length}</Badge>
              </div>
              {visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-14 text-center text-sm text-muted-foreground">
                  Nothing matches these filters.
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                      setService(null);
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {visible.map((app) => (
                    <AppStoreCard key={app.identifier} app={app} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default AppStorePage;
