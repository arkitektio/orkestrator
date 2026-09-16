import { Guard } from "@/app/Arkitekt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Cpu, Download, Sparkles, Zap } from "lucide-react";
import React, { useState } from "react";
import { StoreFlavourFragment } from "../../api/graphql";
import { FlavourInstallTargets } from "../cards/FlavourCard";
import { selectorLabel, StoreApp } from "./storeModel";

/** Soft two-stop gradient derived from the app's hue. */
export const appGradient = (hue: number, alpha = 1) =>
  `linear-gradient(135deg, hsl(${hue} 70% 55% / ${alpha}), hsl(${(hue + 40) % 360} 75% 42% / ${alpha}))`;

export const AppIcon = ({
  app,
  className,
}: {
  app: Pick<StoreApp, "logo" | "hue" | "name">;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  const initials = app.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10",
        "size-14 text-lg",
        className,
      )}
      style={app.logo && !failed ? undefined : { background: appGradient(app.hue) }}
    >
      {app.logo && !failed ? (
        <img
          src={app.logo}
          alt=""
          className="size-full bg-background object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-semibold tracking-tight text-white drop-shadow-sm">
          {initials}
        </span>
      )}
    </div>
  );
};

export const HardwareBadges = ({
  app,
  className,
}: {
  app: StoreApp;
  className?: string;
}) => (
  <div className={cn("flex flex-wrap gap-1", className)}>
    {app.accelerators.map((accelerator) => (
      <Badge
        key={accelerator}
        variant="secondary"
        className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      >
        <Zap className="size-3" />
        {accelerator}
      </Badge>
    ))}
    {app.hardware.includes("cpu") && (
      <Badge variant="secondary" className="gap-1">
        <Cpu className="size-3" />
        CPU
      </Badge>
    )}
  </div>
);

export const SelectorBadges = ({ flavour }: { flavour: StoreFlavourFragment }) => (
  <div className="flex flex-wrap gap-1">
    {flavour.selectors.length === 0 && (
      <Badge variant="secondary" className="gap-1">
        <Cpu className="size-3" />
        Any backend
      </Badge>
    )}
    {flavour.selectors.map((selector, index) => (
      <Badge
        key={index}
        variant={selector.required ? "secondary" : "outline"}
        title={selector.required ? "Required" : "Preferred"}
      >
        {selectorLabel(selector)}
      </Badge>
    ))}
  </div>
);

/**
 * Installs a flavour through any engine exposing a `@kabinet/flavour → @kabinet/pod`
 * implementation. Those implementations live in rekuest, hence the guard.
 */
export const InstallMenu = ({
  flavours,
  size = "sm",
  className,
  label = "Install",
}: {
  flavours: StoreFlavourFragment[];
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: React.ReactNode;
}) => (
  <Guard.Rekuest unavailable={<></>}>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size={size}
          className={cn("rounded-full", className)}
          disabled={flavours.length === 0}
          onClick={(e) => e.stopPropagation()}
        >
          <Download />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-56"
        onClick={(e) => e.stopPropagation()}
      >
        {flavours.map((flavour, index) => (
          <React.Fragment key={flavour.id}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="flex items-center justify-between gap-2 text-xs">
              <span>{flavour.name}</span>
              <span className="font-normal text-muted-foreground">
                {flavour.selectors.map(selectorLabel).join(", ") || "any backend"}
              </span>
            </DropdownMenuLabel>
            <FlavourInstallTargets flavour={flavour.id} />
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </Guard.Rekuest>
);

export const FeaturedBadge = () => (
  <Badge className="gap-1 rounded-full bg-primary/10 text-primary hover:bg-primary/10">
    <Sparkles className="size-3" />
    Featured
  </Badge>
);
