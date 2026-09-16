import { Arkitekt, moduleRegistry } from "@/app/Arkitekt";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DroppableNavLink } from "@/components/ui/link";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
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
import { Me, Username } from "@/lok-next/components/Me";
import { useDebug } from "@/providers/debug/DebugContext";
import { ChatBubbleIcon, DashIcon, HomeIcon, ReloadIcon } from "@radix-ui/react-icons";
import {
  Bug,
  ChevronUp,
  Database,
  Podcast,
  RefreshCw,
  Settings,
  ShoppingBasket,
  Users2,
  Workflow,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import React from "react";
import { BsLightning } from "react-icons/bs";
import { GoWorkflow } from "react-icons/go";
import { IconContext } from "react-icons/lib";
import { MdStream } from "react-icons/md";
import { PiDatabaseLight, PiGraph } from "react-icons/pi";
import { TbBugOff } from "react-icons/tb";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import ProfileSwitcher from "../profile/ProfileSwitcher";
import { ArkitektLogo } from "../logos/ArkitektLogo";
import { BackLogo } from "../logos/BackLogo";
import { Badge } from "@/components/ui/badge";


export type INavigationBarProps = {
  children?: React.ReactNode;
};

const matchIcon = (key: string) => {
  switch (key) {
    case "rekuest":
      return <Podcast className="w-8 h-8 mx-auto text-foreground" />;
    case "mikro":
      return <Database className="w-8 h-8 mx-auto text-foreground" />;
    case "omero_ark":
      return <PiDatabaseLight className="w-8 h-8 mx-auto text-foreground" />;
    case "fluss":
      return <Workflow className="w-8 h-8 mx-auto text-foreground" />;
    case "lok":
      return <Users2 className="w-8 h-8 mx-auto text-foreground" />;
    case "settings":
      return <GoWorkflow className="w-8 h-8 mx-auto text-foreground" />;
    case "kabinet":
      return <ShoppingBasket className="w-8 h-8 mx-auto text-foreground" />;
    case "kraph":
      return <PiGraph className="w-8 h-8 mx-auto text-foreground" />;
    case "alpaka":
      return <ChatBubbleIcon className="w-8 h-8 mx-auto text-foreground p-[0.5]" />;
    case "dokuments":
      return <DashIcon className="w-8 h-8 mx-auto text-foreground" />;
    case "lovekit":
      return <MdStream className="w-8 h-8 mx-auto text-foreground p-[0.5]" />;
    case "elektro":
      return <BsLightning className="w-8 h-8 mx-auto text-foreground" />;
    default:
      return <HomeIcon className="w-8 h-8 mx-auto text-foreground" />;
  }
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
  mobile = false,
}: {
  moduleKey: string;
  moduleState?: ReturnType<typeof Arkitekt.useAvailableModules>[number];
  mobile?: boolean;
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
    <div className="relative flex items-center justify-center">
      <div className={cn(isInvalid ? "opacity-35 grayscale" : "")}>{icon}</div>
    </div>
  );

  if (isInteractive) {
    return (
      <ContextMenu key={moduleKey}>
        <ContextMenuTrigger asChild>
          <DroppableNavLink to={moduleState.route} className={mobile ? "cursor-pointer" : undefined}>
            {({ isActive }) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavigationMenuLink
                    asChild
                    active={isActive}
                    className={cn(
                      "flex-1 cursor-pointer",
                      isActive ? "bg-primary" : "",
                      isChecking ? "opacity-80" : "",
                    )}
                  >
                    {buttonContent}
                  </NavigationMenuLink>
                </TooltipTrigger>
                <TooltipContent side={mobile ? "top" : "right"}>
                  {moduleState.definition.label || moduleState.key}
                </TooltipContent>
              </Tooltip>
            )}
          </DroppableNavLink>
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
                 className={cn("data-[active=true]:focus:bg-muted data-[active=true]:hover:bg-primary data-[active=true]:bg-muted/50 focus-visible:ring-ring/30 hover:bg-muted focus:bg-muted flex items-center gap-1.5 rounded-lg p-2 text-xs/relaxed transition-all outline-none focus-visible:ring-[2px] focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4")}
                disabled={!isInteractive}
                >
                  {buttonContent}
                </button>
              </PopoverTrigger>
            </ContextMenuTrigger>
          </TooltipTrigger>
        <TooltipContent side={mobile ? "top" : "right"}>
          {moduleState.definition.label || moduleState.key}
        </TooltipContent>
      </Tooltip>
      <PopoverContent side={mobile ? "top" : "right"}>
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

const SettingsNavItem = ({ mobile = false }: { mobile?: boolean }) => {
  return (
    <DroppableNavLink to="/settings" className={mobile ? "cursor-pointer" : undefined}>
      {({ isActive }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <NavigationMenuLink
              asChild
              active={isActive}
              className={cn(
                "flex-1 cursor-pointer",
                isActive ? "bg-primary" : "",
              )}
            >
              <div className="relative flex items-center justify-center">
                <Settings className="w-8 h-8 mx-auto text-foreground" />
              </div>
            </NavigationMenuLink>
          </TooltipTrigger>
          <TooltipContent side={mobile ? "top" : "right"}>
            Settings
          </TooltipContent>
        </Tooltip>
      )}
    </DroppableNavLink>
  );
};

const ActiveProfileMenuLabel = ({ fakts }: { fakts: any }) => {
  return (
    <div className="flex flex-col space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">
          <Username />
        </span>
        <NavLink
          to="lok"
          className="text-[10px] text-muted-foreground hover:text-foreground border rounded px-1.5 py-0.5 transition-colors"
        >
          Manage
        </NavLink>
      </div>

      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border/40">
        {fakts?.self?.deployment_name && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Composition:</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal truncate max-w-[120px]" title={fakts.self.deployment_name}>
              {fakts.self.deployment_name}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileMenuLabel = ({ hasLokProfile, fakts }: { hasLokProfile: boolean; fakts: any }) => {
  if (!hasLokProfile) {
    return (
      <div className="flex flex-col space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Guest</span>
        </div>
        {fakts?.self?.deployment_name && (
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Composition:</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal truncate max-w-[120px]" title={fakts.self.deployment_name}>
                {fakts.self.deployment_name}
              </Badge>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <ActiveProfileMenuLabel fakts={fakts} />;
};

const PrivateNavigationBar: React.FC<INavigationBarProps> = () => {
  const configurationIssues = Arkitekt.useConfigurationIssues();
  const availableModules = Arkitekt.useAvailableModules();
  const connection = Arkitekt.useConnection();
  const hasLokProfile = Boolean(connection?.selfService);
  const { debug, setDebug } = useDebug();
  const fakts = Arkitekt.useFakts()

  const navigate = useNavigate();
  const location = useLocation();

  const moduleOrder = React.useMemo(
    () =>
      Object.keys(moduleRegistry).filter((key) =>
        availableModules.some((entry) => entry.key === key),
      ),
    [availableModules],
  );

  const onClick = () => {
    if (window.electron) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const reload = () => {
    if (window.api) {
      window.api.reloadWindow();
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <div
        className="flex-initial h-10 w-10 justify-center items-center flex cursor-pointer mb-3"
        onClick={onClick}
      >
        {location.pathname === "/" ? (
          <ArkitektLogo
            width={"100%"}
            height={"100%"}
            cubeColor={"var(--primary)"}
            aColor={"var(--foreground)"}
            strokeColor={"var(--foreground)"}
          />
        ) : (
          <BackLogo
            width={"100%"}
            height={"100%"}
            cubeColor={"var(--primary)"}
            aColor={"var(--foreground)"}
            strokeColor={"var(--foreground)"}
          />
        )}
      </div>

      <div className="flex-grow flex-row md:flex-col flex justify-start md:gap-2 items-center gap-2 overflow-hidden md:flex hidden">
        {moduleOrder.map((moduleKey) => (
          <ModuleNavItem
            key={moduleKey}
            moduleKey={moduleKey}
            moduleState={availableModules.find((entry) => entry.key === moduleKey)}
          />
        ))}
      </div>

      <div className="flex-grow block md:hidden">

        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="ghost" className="w-full h-full flex justify-start items-start">
              <IconContext.Provider value={{ className: "w-8 h-8 mx-auto text-foreground" }}>
                <ChevronUp />
              </IconContext.Provider>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="p-2 mb-2 border-seperator grid grid-cols-1 gap-2">
            {moduleOrder.map((moduleKey) => (
              <div key={moduleKey} className="flex flex-col rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">
                    {moduleRegistry[moduleKey]?.label || moduleKey}
                  </div>
                  <ModuleNavItem
                    moduleKey={moduleKey}
                    moduleState={availableModules.find((entry) => entry.key === moduleKey)}
                    mobile
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-col rounded-md border p-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">
                  Settings
                </div>
                <SettingsNavItem mobile />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="flex-initial w-12 items-center flex flex-col justify-center">
        <SettingsNavItem />
        <DropdownMenu>
          <DropdownMenuTrigger className="text-foreground h-12 w-12">
            {hasLokProfile ? <Me /> : <div className="h-12 w-12 rounded-full border" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" className="w-64 mb-2 border-border">
            <DropdownMenuLabel className="font-normal">
              <ProfileMenuLabel hasLokProfile={hasLokProfile} fakts={fakts} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {configurationIssues.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
                  Configuration issues detected
                </div>
                {configurationIssues.slice(0, 3).map((issue) => (
                  <div key={issue} className="px-2 py-1 text-xs text-muted-foreground">
                    {issue}
                  </div>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setDebug(!debug)}>
              {debug ? <Bug className="mr-2 h-4 w-4" /> : <TbBugOff className="mr-2 h-4 w-4" />}
              <span>Debug Mode</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <DroppableNavLink key={"Settings"} to={"settings"} className="w-full cursor-pointer flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DroppableNavLink>
            </DropdownMenuItem>
            <ProfileSwitcher />
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" className="h-8 w-8" onClick={reload}>
          <ReloadIcon />
        </Button>
      </div>
    </>
  );
};

export { PrivateNavigationBar };
