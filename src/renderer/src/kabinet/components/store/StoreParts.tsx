import { RekuestGuard } from "@/rekuest/api/hooks";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { useDialog } from "@/core/dialogs/registry";
import { cn } from "@/core/util/utils";
import { useSelf } from "@/core/connection/useSelf";
import { Cpu, Download, Rocket, Sparkles, Zap } from "lucide-react";
import React from "react";
import { StoreFlavourFragment, useGetApprovableReleaseQuery } from "../../api/graphql";
import { deployableApprovals } from "../../lib/approvals";
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
 * Installs a release: opens the install dialog, which only authorizes it
 * (approves a deployer app to run it as you). Running it is the separate
 * Deploy step, offered once installed. Approvals are per release; the
 * deployer picks the flavour for its host. The deployers live in rekuest,
 * hence the guard.
 */
export const InstallButton = ({
  release,
  size = "sm",
  className,
  label = "Install",
  variant,
}: {
  release: { id: string };
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) => {
  const { openDialog } = useDialog();
  return (
    <RekuestGuard unavailable={<></>}>
      <Button
        size={size}
        variant={variant}
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

/**
 * Deploys an installed release: hands one of your approvals of it to a
 * deployer host, which starts it on that backend.
 */
export const DeployButton = ({
  release,
  approval,
  size = "sm",
  className,
  label = "Deploy",
  variant,
}: {
  release: { id: string };
  approval?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) => {
  const { openDialog } = useDialog();
  return (
    <RekuestGuard unavailable={<></>}>
      <Button
        size={size}
        variant={variant}
        className={cn("rounded-full", className)}
        onClick={(e) => {
          e.stopPropagation();
          openDialog("deployrelease", { release: release.id, approval }, { className: "max-w-xl" });
        }}
      >
        <Rocket />
        {label}
      </Button>
    </RekuestGuard>
  );
};

/**
 * A release page's main action: Install while you have not authorized it,
 * Deploy once you have (Install stays, quieter, to approve another deployer).
 */
export const ReleaseInstallActions = ({
  release,
  size = "lg",
}: {
  release: { id: string; version: string };
  size?: "sm" | "default" | "lg";
}) => {
  const self = useSelf();
  const { data } = useGetApprovableReleaseQuery({ variables: { id: release.id } });
  const installed = deployableApprovals(data?.release.approvals ?? [], self.userId).length > 0;

  if (!installed) {
    return <InstallButton release={release} size={size} className="px-5" label={`Install v${release.version}`} />;
  }
  return (
    <div className="flex items-center gap-2">
      <InstallButton release={release} size={size} variant="outline" className="px-4" label="Installed" />
      <DeployButton release={release} size={size} className="px-5" label={`Deploy v${release.version}`} />
    </div>
  );
};

export const FeaturedBadge = () => (
  <Badge className="gap-1 rounded-full bg-primary/10 text-primary hover:bg-primary/10">
    <Sparkles className="size-3" />
    Featured
  </Badge>
);
