import { Button } from "@/core/ui/button";
import { ArrowRight, Boxes } from "lucide-react";
import type React from "react";
import { Link } from "react-router-dom";
import { AppIcon, appGradient } from "../AppIcon";
import { DefinitionLogo } from "../logo/KabinetBlokLogo";
import { appStorePath } from "./AppStoreCard";
import { FeaturedBadge, HardwareBadges, InstallButton } from "./StoreParts";
import { StoreApp } from "./storeModel";

/**
 * One app, portrayed large: its icon on its own gradient, what it does, the
 * hardware it runs on, Install and a taste of its actions. The store's
 * spotlight, and the newest app on Kabinet's home (`badge` says which).
 */
export const FeaturedApp = ({ app, badge = <FeaturedBadge /> }: { app: StoreApp; badge?: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-2xl border">
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
    <div className="relative grid gap-4 p-4 md:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-3">
        {badge}
        <div className="flex items-center gap-4">
          <AppIcon app={app} size={64} className="size-16 rounded-2xl text-xl" />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold tracking-tight">{app.name}</h2>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {app.identifier} · v{app.latest.version}
            </p>
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {app.definitions.find((d) => d.description)?.description ??
            `Brings ${app.definitions.length} actions to your organization.`}
        </p>
        <HardwareBadges app={app} />
        <div className="flex items-center gap-2">
          <InstallButton release={app.latest} size="lg" className="px-4" />
          <Button variant="ghost" size="lg" className="rounded-full" asChild>
            <Link to={appStorePath(app)}>
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
              {definition.logo ? (
                <DefinitionLogo definition={definition} className="size-3.5" />
              ) : (
                <Boxes className="size-3.5 shrink-0 text-muted-foreground" />
              )}
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
