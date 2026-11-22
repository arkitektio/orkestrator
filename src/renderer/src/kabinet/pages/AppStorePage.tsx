import { PageLayout } from "@/core/layout/PageLayout";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { DialogButton } from "@/core/ui/dialog-button";
import { Input } from "@/core/ui/input";
import { ErrorNote } from "@/core/ui/error-note";
import { Skeleton } from "@/core/ui/skeleton";
import { useDebounce } from "@uidotdev/usehooks";
import {
  ArrowRight,
  Cpu,
  Layers,
  LucideIcon,
  PlayCircle,
  Search,
  Shapes,
  ShoppingBag,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAppStoreQuery, useAppStoreTotalsQuery, useRepoBloksQuery } from "../api/graphql";
import { AppShelfTile, AppStoreCard } from "../components/store/AppStoreCard";
import { AppBlokGrid, CustomBlokSection } from "../components/store/BlokStoreCard";
import { FeaturedApp } from "../components/store/FeaturedApp";
import { RepoBlokSection } from "../components/store/RepoBlokCard";
import { KABINET_HELP } from "../help";
import {
  Chip,
} from "../components/store/StoreParts";
import {
  filterAppBloks,
  filterRepoBloks,
  fromStoreApps,
  pickFeatured,
  storeAppFilter,
  storeAppOrder,
  StoreApp,
  StoreFilter,
  StoreSort,
} from "../components/store/storeModel";
import { AppFilter, AppHardware } from "../api/graphql";

const FILTERS: { value: StoreFilter; label: string; icon: LucideIcon }[] = [
  { value: "all", label: "All apps", icon: ShoppingBag },
  { value: "gpu", label: "GPU accelerated", icon: Zap },
  { value: "cpu", label: "Runs on CPU", icon: Cpu },
  { value: "installed", label: "Deployed", icon: PlayCircle },
  { value: "bloks", label: "Bloks", icon: Shapes },
];

const CUSTOM_BLOKS = {
  title: "Made in your organization",
  description: "Custom bloks: install one to bind it to your agents.",
};

const SORTS: { value: StoreSort; label: string }[] = [
  { value: "recent", label: "Newest" },
  { value: "name", label: "A–Z" },
];

const Stat = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col">
    <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
  </div>
);

/** Apps a page of the store asks for; "Show more" asks for as many again. */
const PAGE = 48;
/** Apps a shelf shows. */
const SHELF = 12;

/** A shelf of the store: its own small query, so it is not cut by the page above. */
const useShelf = (filters: AppFilter, skip: boolean) => {
  const { data } = useAppStoreQuery({
    variables: { filters, pagination: { limit: SHELF } },
    skip,
    fetchPolicy: "cache-and-network",
  });
  return useMemo(() => fromStoreApps(data?.apps ?? []), [data]);
};

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
  <div className="flex flex-col gap-4">
    <Skeleton className="h-48 w-full rounded-2xl" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-2xl" />
      ))}
    </div>
  </div>
);

const EmptyStore = () => (
  <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed p-4">
    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
      <ShoppingBag className="size-5 text-primary" />
    </div>
    <div>
      <h2 className="text-base font-semibold">The shelves are empty</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Add a repository to see apps registered with your organization.
      </p>
    </div>
    <div className="flex flex-wrap gap-2">
      <DialogButton name="createrepo" dialogProps={{}} size="sm">
        Add a repository
      </DialogButton>
      <DialogButton name="importocirepo" dialogProps={{}} size="sm" variant="outline">
        Import from registry
      </DialogButton>
    </div>
  </div>
);

export const AppStorePage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StoreFilter>("all");
  const [service, setService] = useState<string | null>(null);
  const [sort, setSort] = useState<StoreSort>("recent");
  const [limit, setLimit] = useState(PAGE);
  const debouncedSearch = useDebounce(search, 150);

  // The apps the chips, search and sort ask for, filtered and paged on the
  // server. The bloks view asks for the apps that bring a panel or scene, and
  // picks the bloks the search names within each.
  const bloksView = filter === "bloks";
  const filters = storeAppFilter({ search: debouncedSearch, filter, service });
  const { data, loading, error } = useAppStoreQuery({
    variables: { filters, ordering: storeAppOrder(sort), pagination: { limit } },
    fetchPolicy: "cache-and-network",
  });
  // Unfiltered, newest first: what the store has at all and its spotlight.
  const { data: allData } = useAppStoreQuery({
    variables: { pagination: { limit: PAGE } },
    fetchPolicy: "cache-and-network",
  });
  // Counts over every app, not a page: the stats, the service chips, and how
  // many apps the chosen filters keep.
  const { data: totalsData } = useAppStoreTotalsQuery({ fetchPolicy: "cache-and-network" });
  const { data: resultData } = useAppStoreTotalsQuery({
    variables: { filters },
    fetchPolicy: "cache-and-network",
  });
  const totals = totalsData?.appStoreTotals;
  const resultCount = resultData?.appStoreTotals.apps;

  const visible = useMemo(() => fromStoreApps(data?.apps ?? []), [data]);
  const apps = useMemo(() => fromStoreApps(allData?.apps ?? []), [allData]);
  const hasMore = (data?.apps.length ?? 0) >= limit;
  const services = useMemo(() => (totals?.services ?? []).map((s) => s.service), [totals]);
  const featured = useMemo(() => pickFeatured(apps), [apps]);
  const browsing = !debouncedSearch && filter === "all" && !service;
  // While browsing, a few apps that bring panels or scenes, whatever page they are on.
  const blokShelf = useShelf({ bloks: true }, !browsing);
  const appBloks = useMemo(
    () => filterAppBloks(bloksView ? visible : blokShelf, { search: debouncedSearch }),
    [bloksView, visible, blokShelf, debouncedSearch],
  );
  // Bloks GitHub repositories publish on their own. They need no service, so
  // a service chip leaves none of them.
  const { data: repoData } = useRepoBloksQuery({ fetchPolicy: "cache-and-network" });
  const repoBloks = useMemo(
    () => (service ? [] : filterRepoBloks(repoData?.repoBloks ?? [], debouncedSearch)),
    [repoData, debouncedSearch, service],
  );
  const repoBlokCount = repoData?.repoBloks.length ?? 0;
  const customBloks = useMemo(
    () => ({ ...CUSTOM_BLOKS, listedOrigins: new Set((repoData?.repoBloks ?? []).map((blok) => blok.origin)) }),
    [repoData],
  );

  const gpuShelf = useShelf({ hardware: [AppHardware.Gpu] }, !browsing);
  const runningShelf = useShelf({ deployed: true }, !browsing);

  return (
    <PageLayout
      title="App Store"
      help={KABINET_HELP.appStore}
      pageActions={
        <>
          <DialogButton alwaysShow name="createrepo" variant="outline" size="sm" dialogProps={{}}>
            Add Repo
          </DialogButton>
          <DialogButton alwaysShow name="importocirepo" variant="outline" size="sm" dialogProps={{}}>
            Import from registry
          </DialogButton>
        </>
      }
    >
      <div className="flex w-full flex-col gap-5 p-3">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Discover apps</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse the apps registered with your organization and the bloks they bring, and deploy them on a running engine.
              </p>
            </div>
            {totals && totals.apps > 0 && (
              <div className="flex gap-6">
                <Stat value={totals.apps} label="Apps" />
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
              placeholder="Search apps, identifiers, actions or bloks…"
              className="h-9 rounded-full pl-10 pr-10 text-sm"
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

        {error && !data && !allData && (
          <ErrorNote error={error} title="Couldn't load the app store" />
        )}

        {loading && !data && !allData ? (
          <LoadingGrid />
        ) : apps.length === 0 && repoBlokCount === 0 ? (
          !error && (
            <>
              <EmptyStore />
              <CustomBlokSection search={debouncedSearch} {...customBloks} />
            </>
          )
        ) : filter === "bloks" || apps.length === 0 ? (
          // An organization whose repositories publish only bloks lands here too.
          <>
            {apps.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">From apps</h3>
                    <p className="text-xs text-muted-foreground">
                      Panels and scenes an app brings: get the app to use them.
                    </p>
                  </div>
                  <Badge variant="secondary">{resultCount ?? appBloks.length} apps</Badge>
                </div>
                {appBloks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                    No app brings a panel or scene that matches.
                  </div>
                ) : (
                  <AppBlokGrid bloks={appBloks} />
                )}
                {hasMore && (
                  <Button variant="outline" size="sm" className="self-center rounded-full" onClick={() => setLimit((n) => n + PAGE)}>
                    Show more
                  </Button>
                )}
              </section>
            )}
            <RepoBlokSection bloks={repoBloks} />
            <CustomBlokSection search={debouncedSearch} {...customBloks} />
          </>
        ) : (
          <>
            {browsing && featured && <FeaturedApp app={featured} />}

            {browsing && apps.length > 4 && (
              <div className="flex flex-col gap-4">
                <Shelf
                  title="Fresh releases"
                  description="The latest additions and updates."
                  apps={apps.slice(0, 12)}
                />
                <Shelf
                  title="GPU accelerated"
                  description="Built to make use of CUDA, ROCm or oneAPI hardware."
                  apps={gpuShelf}
                />
                <Shelf
                  title="Already deployed"
                  description="Deployed on one of your engines."
                  apps={runningShelf}
                />
              </div>
            )}

            {browsing && appBloks.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">Panels & scenes</h3>
                    <p className="text-xs text-muted-foreground">
                      Bloks your apps bring along, drawn with their demo data.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setFilter("bloks")}
                  >
                    All bloks <ArrowRight />
                  </Button>
                </div>
                <AppBlokGrid bloks={appBloks.slice(0, 4)} />
              </section>
            )}

            {browsing && <RepoBlokSection bloks={repoBloks} limit={4} onShowAll={() => setFilter("bloks")} />}

            {browsing && (
              <CustomBlokSection
                search=""
                limit={4}
                onShowAll={() => setFilter("bloks")}
                {...customBloks}
              />
            )}

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold tracking-tight">
                  {browsing ? "All apps" : "Results"}
                </h3>
                <Badge variant="secondary">{resultCount ?? (hasMore ? `${visible.length}+` : visible.length)}</Badge>
              </div>
              {visible.length === 0 ? (
                <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
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
              {hasMore && (
                <Button variant="outline" size="sm" className="self-center rounded-full" onClick={() => setLimit((n) => n + PAGE)}>
                  Show more
                </Button>
              )}
            </section>

            {debouncedSearch && <RepoBlokSection bloks={repoBloks} />}
            {debouncedSearch && <CustomBlokSection search={debouncedSearch} {...customBloks} />}
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default AppStorePage;
