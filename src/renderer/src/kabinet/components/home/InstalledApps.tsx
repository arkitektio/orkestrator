import { HomeSection } from "@/core/layout/ModuleHome";
import { cn } from "@/core/util/utils";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PodStatus, useAppStoreQuery } from "../../api/graphql";
import { POD_STATUS_DOT, POD_STATUS_RANK, podStatusLabel } from "../../lib/podStatus";
import { AppIcon } from "../AppIcon";
import { appStorePath } from "../store/AppStoreCard";
import { fromStoreApps, StoreApp } from "../store/storeModel";

/** How many apps the home page shows; the App Store's "Deployed" filter has every one. */
const SHOWN = 12;

/**
 * An app's deployments as one status: its liveliest (running beats starting
 * beats failed …). Running is the server's count over all of its releases; the
 * other states are read off its newest release's deployments.
 */
const statusOf = (app: StoreApp): PodStatus =>
  app.runningCount > 0
    ? PodStatus.Running
    : app.flavours
    .flatMap((flavour) => flavour.deployments)
    .reduce<PodStatus>(
      (best, deployment) => (POD_STATUS_RANK[deployment.status] < POD_STATUS_RANK[best] ? deployment.status : best),
      PodStatus.Stopped,
    );

const InstalledAppTile = ({ app }: { app: StoreApp }) => {
  const status = statusOf(app);
  const running = status === PodStatus.Running;
  return (
    <Link
      to={appStorePath(app)}
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-2.5 transition-colors",
        running
          ? "border-primary/25 bg-primary/5 hover:border-primary/40 hover:bg-primary/10"
          : "border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-muted/50",
      )}
    >
      <AppIcon app={app} size={48} className="size-12 rounded-xl text-sm transition-transform group-hover:scale-105" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">{app.name}</span>
        <span className="block truncate text-xs text-muted-foreground">v{app.latest.version}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-1.5 shrink-0 rounded-full", POD_STATUS_DOT[status])} />
          {running ? `${app.runningCount} running` : podStatusLabel(status)}
        </span>
      </span>
    </Link>
  );
};

/**
 * The apps you have installed (deployed at least once), the running ones
 * first: what Kabinet runs for you, app by app. Nothing installed draws nothing.
 */
export const InstalledApps = () => {
  // The deployed ones, asked of the server (`deployed: true`), newest release first.
  const { data } = useAppStoreQuery({
    variables: { filters: { deployed: true }, pagination: { limit: SHOWN } },
    fetchPolicy: "cache-and-network",
  });
  const apps = useMemo(
    () =>
      fromStoreApps(data?.apps ?? [])
        // Stable: within a status the newest-first order holds.
        .sort((a, b) => POD_STATUS_RANK[statusOf(a)] - POD_STATUS_RANK[statusOf(b)]),
    [data],
  );
  if (apps.length === 0) return null;

  return (
    <HomeSection
      title={
        <span className="flex w-full items-center justify-between">
          <span>Your apps</span>
          <Link
            to="/kabinet/pods"
            className="text-[11px] font-normal normal-case tracking-normal hover:text-foreground"
          >
            All pods →
          </Link>
        </span>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
        {apps.map((app) => (
          <InstalledAppTile key={app.identifier} app={app} />
        ))}
      </div>
    </HomeSection>
  );
};
