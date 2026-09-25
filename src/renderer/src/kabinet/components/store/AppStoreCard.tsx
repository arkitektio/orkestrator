import { KabinetApp } from "@/core/linkers";
import { cn } from "@/core/lib/utils";
import { ArrowUpRight, Boxes, Layers } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { AppIcon, appGradient } from "../AppIcon";
import { HardwareBadges, InstallMenu } from "./StoreParts";
import { StoreApp } from "./storeModel";

/**
 * Where a store tile points. The app page is a model page now, so this goes
 * through the linker and is keyed by the app's id like every other one.
 */
export const appStorePath = (app: Pick<StoreApp, "id">) =>
  KabinetApp.linkBuilder(app.id);

/** Grid tile: icon, name, a taste of what the app does, hardware + install. */
export const AppStoreCard = React.memo(({ app }: { app: StoreApp }) => {
  const teaser =
    app.definitions.find((d) => d.description)?.description ??
    (app.definitions.length
      ? app.definitions
          .slice(0, 3)
          .map((d) => d.name)
          .join(" · ")
      : null);

  return (
    <Link
      to={appStorePath(app)}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30"
        style={{ background: appGradient(app.hue) }}
      />
      <div className="flex items-start gap-3">
        <AppIcon app={app} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-sm font-semibold">{app.name}</h3>
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="truncate font-mono text-[0.65rem] text-muted-foreground">
            {app.identifier}
          </p>
          <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
            v{app.latest.version}
            {app.releases.length > 1 && ` · ${app.releases.length} releases`}
          </p>
        </div>
      </div>

      <p className="line-clamp-2 min-h-[2.5em] text-xs text-muted-foreground">
        {teaser ?? "No actions registered yet."}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <HardwareBadges app={app} />
          <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Boxes className="size-3" />
              {app.definitions.length} actions
            </span>
            <span className="flex items-center gap-1">
              <Layers className="size-3" />
              {app.latest.flavours.length} flavours
            </span>
            {app.runningCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                {app.runningCount} running
              </span>
            )}
          </div>
        </div>
        <div onClick={(e) => e.preventDefault()}>
          <InstallMenu flavours={app.latest.flavours} label="Get" />
        </div>
      </div>
    </Link>
  );
});

/** Compact tile for horizontal shelves. */
export const AppShelfTile = ({ app }: { app: StoreApp }) => (
  <Link
    to={appStorePath(app)}
    className="group flex w-56 shrink-0 snap-start items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60"
  >
    <AppIcon
      app={app}
      size={48}
      className="size-12 transition-transform group-hover:scale-105"
    />
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{app.name}</p>
      <p className="truncate text-[0.65rem] text-muted-foreground">
        {app.publisher ?? app.identifier}
      </p>
      <p className="text-[0.65rem] text-muted-foreground">
        {app.definitions.length} actions · v{app.latest.version}
      </p>
    </div>
  </Link>
);
