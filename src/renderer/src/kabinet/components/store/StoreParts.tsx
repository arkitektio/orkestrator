import { RekuestGuard } from "@/rekuest/api/hooks";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { useDialog } from "@/core/dialogs/registry";
import { cn } from "@/core/util/utils";
import { Cpu, Download, Sparkles, Zap } from "lucide-react";
import React from "react";
import { StoreFlavourFragment } from "../../api/graphql";
import { selectorLabel, StoreApp } from "./storeModel";

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
 * Installs a release: opens the install dialog, which approves the release to
 * run as you and hands the approval to a deployer's `install(approval)`.
 * Approvals are per release; the deployer picks the flavour for its host.
 * The deployers live in rekuest, hence the guard.
 */
export const InstallButton = ({
  release,
  size = "sm",
  className,
  label = "Install",
}: {
  release: { id: string };
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: React.ReactNode;
}) => {
  const { openDialog } = useDialog();
  return (
    <RekuestGuard unavailable={<></>}>
      <Button
        size={size}
        className={cn("rounded-full", className)}
        onClick={(e) => {
          e.stopPropagation();
          openDialog("installrelease", { release: release.id }, { className: "max-w-xl" });
        }}
      >
        <Download />
        {label}
      </Button>
    </RekuestGuard>
  );
};

export const FeaturedBadge = () => (
  <Badge className="gap-1 rounded-full bg-primary/10 text-primary hover:bg-primary/10">
    <Sparkles className="size-3" />
    Featured
  </Badge>
);
