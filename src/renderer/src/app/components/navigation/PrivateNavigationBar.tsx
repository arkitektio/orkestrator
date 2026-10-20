import { Arkitekt, serviceGuard } from "@/core/connection/arkitekt/host";
import { moduleRegistry } from "@/app/Arkitekt";
import { DroppableNavLink } from "@/core/ui/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { aliasToHttpPath } from "@/core/connection/arkitekt/alias/helpers";
import {
  Home,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import React from "react";
import { useMatch } from "react-router-dom";
import { matchIcon } from "../../../core/modules/moduleIcons";
import ModuleNavMenu, { useModuleHome } from "./ModuleNavMenu";
import RailTabs from "./RailTabs";
import RailFooter from "./RailFooter";
import { isModuleAllowed, ModuleRailIslands } from "@/core/modules/registries";
import { UploadIsland } from "@/core/datalayer/UploadProvider";
import { DownloadIsland } from "@/core/modules/download/DownloadProvider";
import { AgentIsland } from "@/core/agent/AgentIsland";
import { LocalActionIsland } from "@/app/components/rail/LocalActionIsland";
import { RailIslandStack } from "@/core/ui/rail/RailIsland";
import { ToastIsland } from "@/core/notify";
import { UpdateIsland } from "@/core/updates/UpdateIsland";
import { VoiceIsland } from "@/core/voice";
import { useRoles } from "@/core/connection/roles";
import { RoleOverrideIsland } from "@/core/connection/ui/RoleOverrideIsland";
import { describeServiceStatus } from "@/core/connection/progress/describe";
import { useMeshProgress, useServiceProgress } from "@/core/connection/progress/hooks";
import { ConnectionSteps } from "@/core/connection/ui/progress/ConnectionSteps";
import { serviceSteps } from "@/core/connection/ui/progress/serviceSteps";

const RekuestGuard = serviceGuard("rekuest");


export type INavigationBarProps = {
  children?: React.ReactNode;
};



const ServiceConnectionInfo = ({ moduleKey }: { moduleKey: string }) => {
  const moduleState = Arkitekt.useModuleState(moduleKey);
  const serviceState = Arkitekt.useServiceState(moduleState?.definition.key ?? "");
  const progress = useServiceProgress(moduleState?.definition.key);
  const meshProgress = useMeshProgress();

  if (!moduleState) {
    return (
      <div className="p-2 text-xs text-muted-foreground">
        No module information available
      </div>
    );
  }

  if (!serviceState) {
    return (
      <div className="p-2 text-xs text-muted-foreground">
        No service information available
      </div>
    );
  }

  const steps = serviceSteps({ progress, mesh: meshProgress });
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
          <div className="font-medium">{describeServiceStatus(serviceState.status, serviceState.revalidating)}</div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last checked: {lastChecked}
          </div>
        </div>
      </div>

      {serviceState.status === "checking" && steps.length > 0 && (
        <ConnectionSteps steps={steps} className="text-xs" />
      )}

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

/**
 * The foot of a module's right-click card: where the service is reached, and
 * a retry. What used to be the tile's whole context menu.
 *
 * Connected, one line is enough; otherwise the full breakdown — every alias
 * tried and every error — because then it is the reason you opened the card.
 */
const ModuleConnectionFooter = ({ moduleKey }: { moduleKey: string }) => {
  const moduleState = Arkitekt.useModuleState(moduleKey);
  const serviceState = Arkitekt.useServiceState(moduleState?.definition.key ?? "");
  const { retryModule } = Arkitekt.useActions();

  const retry = (
    <Button variant="ghost" size="xs" className="ml-auto shrink-0" onClick={() => void retryModule(moduleKey)}>
      <RefreshCw />
      Retry
    </Button>
  );

  if (moduleState?.status === "ready" && serviceState?.alias) {
    return (
      <div className="mt-2 flex items-center gap-2 border-t border-border/50 px-1.5 pt-1.5 text-[11px] text-muted-foreground">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
        <span className="min-w-0 truncate font-mono">{aliasToHttpPath(serviceState.alias, "")}</span>
        {retry}
      </div>
    );
  }

  return (
    <div className="mt-2 border-t border-border/50 pt-1.5">
      <ServiceConnectionInfo moduleKey={moduleKey} />
      <div className="flex px-1.5">{retry}</div>
    </div>
  );
};

/**
 * One module's tile.
 *
 * It selects its own state rather than being handed it. Passing
 * `availableModules.find(...)` in meant a fresh object on every health tick —
 * `lastCheckedAt` moves, the list's shallow compare fails, every tile's prop
 * changes identity — so `React.memo` never once held and polling any single
 * service redrew the whole grid. Selecting by key, a tick in kraph re-renders
 * kraph's tile and nothing else, and the memo is no longer load-bearing.
 */
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

/**
 * A module's tile: a click opens the module's home page, and the tile reads as
 * active anywhere under the module's route, not only on that page.
 */
const ModuleTile = ({
  route,
  home,
  label,
  className,
  children,
}: {
  route: string;
  home: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const isActive = useMatch({ path: route, end: false }) !== null;
  return (
    <DroppableNavLink to={home} className="block" aria-label={label}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span data-active={isActive} className={cn(tileClass(isActive), className)}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </DroppableNavLink>
  );
};

/**
 * Team — the lok module — as a tile of its own.
 *
 * Not a `moduleRegistry` entry: lok is the session's own service, not one of
 * the configured ones, so a registry row would read as "unconfigured". The rail
 * only renders inside a signed-in shell, where lok is by definition ready.
 */
const TeamNavItem = () => {
  const home = useModuleHome("lok", "/lok");
  return (
    <ModuleNavMenu moduleKey="lok" ready to="/lok" label="Team" icon={matchIcon("lok")}>
      <ModuleTile route="/lok" home={home} label="Team">
        {matchIcon("lok")}
      </ModuleTile>
    </ModuleNavMenu>
  );
};

const ModuleNavItem = ({ moduleKey }: { moduleKey: string }) => {
  const moduleState = Arkitekt.useModuleState(moduleKey);
  const home = useModuleHome(moduleKey, moduleState?.route ?? `/${moduleKey}`);

  /**
   * Every module the rail shows is navigable, including a broken one.
   *
   * A tile that cannot be clicked is a dead end: the page behind it is the
   * one place that explains WHICH service is down, what address it tried, and
   * offers the retry and the connection doctor. Refusing to open it hides the
   * only screen that helps. It still greys out, so the rail reads the same at
   * a glance — it just no longer withholds the explanation.
   *
   * Hidden ones are unreachable in practice: the rail is built from
   * `useAvailableModuleKeys`, which already drops them. Kept as an explicit
   * floor rather than a disabled tile, because a tile nobody can open has no
   * job here.
   */
  if (!moduleState || moduleState.status === "hidden") {
    return null;
  }

  const icon = matchIcon(moduleKey);
  const label = moduleState.definition.label || moduleState.key;

  return (
    <ModuleNavMenu
      moduleKey={moduleKey}
      ready={moduleState.status === "ready"}
      to={moduleState.route}
      label={label}
      icon={icon}
      footer={<ModuleConnectionFooter moduleKey={moduleKey} />}
    >
      <ModuleTile
        route={moduleState.route}
        home={home}
        label={label}
        className={cn(moduleState.status === "checking" && "opacity-80")}
      >
        <div
          className={cn(
            "flex items-center justify-center",
            moduleState.status === "invalid" && "opacity-35 grayscale",
          )}
        >
          {icon}
        </div>
      </ModuleTile>
    </ModuleNavMenu>
  );
};

const PrivateNavigationBar: React.FC<INavigationBarProps> = () => {
  // Keys, not module objects: a string list compared
  // shallowly, so it holds its identity across a service health tick and the
  // grid redraws only when a module actually appears or becomes ready.
  const availableKeys = Arkitekt.useAvailableModuleKeys();
  // A module declaring `roles` has no tile for anyone without them.
  const { roles } = useRoles();
  const moduleOrder = Object.keys(moduleRegistry).filter(
    (key) => availableKeys.includes(key) && isModuleAllowed(key, roles),
  );

  return (
    <>

      {/* Modules as a wrapping icon grid rather than a tall column: in a wide
          rail the vertical run is worth more to the module's own navigation and
          to the open tabs below than to twelve stacked icons. `auto-fit` with a
          `1fr` max stretches the tiles across the full rail width and wraps to
          a new row only once a tile would drop below its minimum size. */}
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
        <TeamNavItem />
        {moduleOrder.map((moduleKey) => (
          <ModuleNavItem key={moduleKey} moduleKey={moduleKey} />
        ))}
      </div>

      {/* The open tabs. A module's own links live on the right-click card of
          its icon above, not here — the vertical run belongs to what the user has open,
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
          modules' islands (rekuest: tasks). */}
      <RailIslandStack>
        <ToastIsland />
        <RoleOverrideIsland />
        <UpdateIsland />
        <VoiceIsland />
        <RekuestGuard unavailable={<></>} unconfigured={<></>} configuring={<></>} challenging={<></>}>
          <AgentIsland />
        </RekuestGuard>
        <ModuleRailIslands />
        <LocalActionIsland />
        <DownloadIsland />
        <UploadIsland />
      </RailIslandStack>

      <RailFooter />
    </>
  );
};

export { PrivateNavigationBar };
