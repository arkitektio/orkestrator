import { Arkitekt, Guard, moduleRegistry } from "@/app/Arkitekt";
import { Button } from "@/components/ui/button";
import { DroppableNavLink } from "@/components/ui/link";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { aliasToHttpPath } from "@/lib/arkitekt/alias/helpers";
import {
  Home,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import React from "react";
import { matchIcon } from "./moduleIcons";
import ModuleNavHover, { ModuleNavHoverGroup, hasModuleNav } from "./ModuleNavHover";
import RailTabs from "./RailTabs";
import RailFooter from "./RailFooter";
import { TaskNotificationStack } from "@/rekuest/components/global/TaskNotificationStack";
import { UploadIsland } from "@/providers/upload/UploadProvider";
import { DownloadIsland } from "@/providers/download/DownloadProvider";
import { AgentIsland } from "@/app/agent/AgentIsland";
import { LocalActionIsland } from "@/app/components/rail/LocalActionIsland";
import { RailIslandStack } from "@/app/components/rail/RailIsland";
import { UpdateIsland } from "@/app/updates/UpdateIsland";


export type INavigationBarProps = {
  children?: React.ReactNode;
};



const ServiceConnectionInfo = ({ moduleKey }: { moduleKey: string }) => {
  const availableServices = Arkitekt.useAvailableServices();
  const moduleState = Arkitekt.useAvailableModules().find((entry) => entry.key === moduleKey);

  if (!moduleState) {
    return (
      <div className="p-2 text-xs text-muted-foreground">
        No module information available
      </div>
    );
  }

  const serviceState = availableServices.find(service => service.key === moduleState.definition.key);

  if (!serviceState) {
    return (
      <div className="p-2 text-xs text-muted-foreground">
        No service information available
      </div>
    );
  }

  const connectedAlias = serviceState.alias;
  const allAliases = serviceState.instance?.aliases || [];
  const hasErrors = serviceState.errors.length > 0;
  const isConnected = serviceState.status === "ready" && connectedAlias;
  const lastChecked = serviceState.lastCheckedAt
    ? new Date(serviceState.lastCheckedAt).toLocaleString()
    : "Never";

  return (
    <div className="p-2 space-y-3 min-w-[280px]">
      <div>
        <div className="text-xs font-semibold mb-2 flex items-center gap-2">
          {isConnected ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : (
            <XCircle className="w-3 h-3 text-red-500" />
          )}
          {serviceState.key}
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Status: <span className="font-medium">{serviceState.status}</span></div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last checked: {lastChecked}
          </div>
        </div>
      </div>

      {connectedAlias ? (
        <div>
          <div className="text-xs font-semibold mb-1 text-green-600 dark:text-green-400">✓ Connected Alias:</div>
          <div className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 p-2 rounded border border-green-500/20 font-mono">
            {aliasToHttpPath(connectedAlias, "")}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">✗ No Connected Alias</div>
          <div className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 p-2 rounded border border-red-500/20">
            Service is not currently connected
          </div>
        </div>
      )}

      {allAliases.length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-1">
            {connectedAlias ? "Available Aliases:" : "Tried Aliases (all failed):"}
          </div>
          <div className="space-y-1">
            {allAliases.map((alias, index) => {
              const isConnected = connectedAlias?.id === alias.id;
              const url = aliasToHttpPath(alias, "");
              return (
                <div key={index}>
                  <div
                    className={cn(
                      "text-xs p-2 rounded border font-mono",
                      isConnected
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                        : "bg-red-500/5 text-muted-foreground border-red-500/20"
                    )}
                  >
                    {isConnected && <span className="text-green-600 dark:text-green-500 mr-1">✓</span>}
                    {!isConnected && <span className="text-red-600 dark:text-red-500 mr-1">✗</span>}
                    {url}
                  </div>
                  {!isConnected && hasErrors && (
                    <div className="text-xs text-red-600 dark:text-red-400 pl-3 pt-0.5 italic">
                      Failed to connect
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasErrors && (
        <div>
          <div className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Connection Errors:</div>
          <div className="space-y-1">
            {serviceState.errors.map((error, index) => (
              <div
                key={index}
                className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 p-2 rounded border border-red-500/20"
              >
                {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {!connectedAlias && !hasErrors && allAliases.length === 0 && (
        <div className="text-xs text-muted-foreground italic p-2 bg-muted/20 rounded">
          No instance configured for this service
        </div>
      )}
    </div>
  );
};

const ModuleNavItem = React.memo(({
  moduleKey,
  moduleState,
}: {
  moduleKey: string;
  moduleState?: ReturnType<typeof Arkitekt.useAvailableModules>[number];
}) => {
  const { retryModule } = Arkitekt.useActions();

  if (!moduleState) {
    return null;
  }

  const icon = matchIcon(moduleKey);
  const isInteractive = moduleState.status === "ready" || moduleState.status === "checking";
  const isChecking = moduleState.status === "checking";
  const isInvalid = moduleState.status === "invalid";

  const buttonContent = (
    <div className={cn("flex items-center justify-center", isInvalid && "opacity-35 grayscale")}>
      {icon}
    </div>
  );

  /**
   * A small recessed tile, as a browser gives its pinned sites.
   *
   * Inset rather than raised on purpose: the rail is the window's own surface,
   * and a tile pressed INTO it reads as part of the chrome, where a raised chip
   * would read as content sitting on top of it. The active one lifts out of the
   * recess — lighter fill, brand ring — which is the same language the pinned
   * rows below use, so "where I am" looks the same wherever it appears.
   */
  const tileClass = (active: boolean) =>
    cn(
      // Fills its grid cell, so the tiles line up whatever the rail's width.
      "flex h-9 w-full cursor-pointer items-center justify-center rounded-lg transition-colors",
      "text-muted-foreground shadow-[inset_0_1px_2px_rgb(0_0_0/0.10)] ring-1",
      active
        ? "bg-background/80 text-foreground ring-primary/35 shadow-none"
        : "bg-background/25 ring-border/30 hover:bg-background/55 hover:text-foreground",
    );

  if (isInteractive) {
    return (
      <ContextMenu key={moduleKey}>
        <ContextMenuTrigger asChild>
          <ModuleNavHover
            moduleKey={moduleKey}
            ready={moduleState.status === "ready"}
            label={moduleState.definition.label || moduleState.key}
            icon={icon}
          >
          <DroppableNavLink to={moduleState.route} className="block">
            {({ isActive }) => {
              const tile = (
                <span
                  data-active={isActive}
                  className={cn(tileClass(isActive), isChecking && "opacity-80")}
                >
                  {buttonContent}
                </span>
              );
              // The hover card already names the module in its header; a
              // tooltip on top of it would say the same thing in the same spot.
              if (hasModuleNav(moduleKey, moduleState.status === "ready")) {
                return tile;
              }
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{tile}</TooltipTrigger>
                  <TooltipContent side="right">
                    {moduleState.definition.label || moduleState.key}
                  </TooltipContent>
                </Tooltip>
              );
            }}
          </DroppableNavLink>
          </ModuleNavHover>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-auto">
          <ContextMenuLabel>{moduleState.definition.label || moduleState.key}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ServiceConnectionInfo moduleKey={moduleKey} />
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => {
              void retryModule(moduleKey);
            }}
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Retry Connection
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu key={moduleKey}>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(tileClass(false), "outline-none focus-visible:ring-2 focus-visible:ring-ring/30")}
                  disabled={!isInteractive}
                >
                  {buttonContent}
                </button>
              </PopoverTrigger>
            </ContextMenuTrigger>
          </TooltipTrigger>
        <TooltipContent side="right">
          {moduleState.definition.label || moduleState.key}
        </TooltipContent>
      </Tooltip>
      <PopoverContent side="right">
        <PopoverHeader>
          <PopoverTitle>{moduleState.definition.label || moduleState.key}</PopoverTitle>
          <PopoverDescription>
            This module is configured, but one or more required services are currently invalid.
          </PopoverDescription>
        </PopoverHeader>
        <div className="space-y-2">
          {moduleState.errors.map((error) => (
            <div key={error} className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
              {error}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => {
              void retryModule(moduleKey);
            }}
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Retry
          </Button>
        </div>
      </PopoverContent>
    </Popover>
    <ContextMenuContent className="w-auto">
      <ContextMenuLabel>{moduleState.definition.label || moduleState.key}</ContextMenuLabel>
      <ContextMenuSeparator />
      <ServiceConnectionInfo moduleKey={moduleKey} />
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => {
          void retryModule(moduleKey);
        }}
      >
        <RefreshCw className="mr-2 h-3 w-3" />
        Retry Connection
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
  );
});
ModuleNavItem.displayName = "ModuleNavItem";

const PrivateNavigationBar: React.FC<INavigationBarProps> = () => {
  const availableModules = Arkitekt.useAvailableModules();

  const moduleOrder = React.useMemo(
    () =>
      Object.keys(moduleRegistry).filter((key) =>
        availableModules.some((entry) => entry.key === key),
      ),
    [availableModules],
  );

  const readyModules = React.useMemo(
    () => availableModules.filter((entry) => entry.status === "ready").map((entry) => entry.key),
    [availableModules],
  );

  return (
    <>

      {/* Modules as a wrapping icon grid rather than a tall column: in a wide
          rail the vertical run is worth more to the module's own navigation and
          to the open tabs below than to twelve stacked icons. `auto-fit` with a
          `1fr` max stretches the tiles across the full rail width and wraps to
          a new row only once a tile would drop below its minimum size. */}
      <ModuleNavHoverGroup preload={readyModules}>
      {/* `app-no-drag`: the rail's surface is a window-drag region, and a drag
          region eats the clicks of everything inside it that has not opted out.
          The gaps AROUND this grid still drag the window. */}
      <div className="app-no-drag grid grid-cols-[repeat(auto-fit,minmax(2.25rem,1fr))] gap-1 px-2 pb-3 shrink-0 mt-1">
        {/* The dashboard, first. The logo that used to double as "home" is
            gone from the rail, so this is now the one place to reach it. */}
        <DroppableNavLink to="/" end aria-label="Home" className="block">
          {({ isActive }) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  data-active={isActive}
                  className={cn(
                    "flex h-9 w-full cursor-pointer items-center justify-center rounded-lg ring-1 transition-colors",
                    "shadow-[inset_0_1px_2px_rgb(0_0_0/0.10)]",
                    isActive
                      ? "bg-background/80 text-foreground ring-primary/35 shadow-none"
                      : "bg-background/25 text-muted-foreground ring-border/30 hover:bg-background/55 hover:text-foreground",
                  )}
                >
                  <Home className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">Home</TooltipContent>
            </Tooltip>
          )}
        </DroppableNavLink>
        {moduleOrder.map((moduleKey) => (
          <ModuleNavItem
            key={moduleKey}
            moduleKey={moduleKey}
            moduleState={availableModules.find((entry) => entry.key === moduleKey)}
          />
        ))}
      </div>
      </ModuleNavHoverGroup>

      {/* The open tabs. A module's own links live on the hover over its icon
          above, not here — the vertical run belongs to what the user has open,
          the pinned ones first.

          Deliberately NOT `app-no-drag` on this scroller: `RailTabs` opts its
          own list out, so the empty rail below a short list — usually the
          largest drag target in the window — keeps moving the window. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <RailTabs />
      </div>

      {/* Everything ambient and long-running, where a browser puts its
          now-playing control: in the chrome that is always there, rather than
          floating over the page. Each island renders nothing while it is empty,
          and they share one scroller so a busy app cannot push the footer off
          the bottom of the rail.

          Ordered by how often they appear, rarest at the top: what shows up
          constantly (transfers) sits nearest the footer and the pointer, so a
          rare arrival above does not shove it around. The agent sits beside the
          task island to share the one rekuest guard. */}
      <RailIslandStack>
        <UpdateIsland />
        <Guard.Rekuest unavailable={<></>} unconfigured={<></>} configuring={<></>} challenging={<></>}>
          <AgentIsland />
          <TaskNotificationStack />
        </Guard.Rekuest>
        <LocalActionIsland />
        <DownloadIsland />
        <UploadIsland />
      </RailIslandStack>

      <RailFooter />
    </>
  );
};

export { PrivateNavigationBar };
