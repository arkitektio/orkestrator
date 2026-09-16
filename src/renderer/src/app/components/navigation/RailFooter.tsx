import { Arkitekt } from "@/app/Arkitekt";
import ProfileSwitcher from "@/app/components/profile/ProfileSwitcher";
import { ProfileBrandAvatar } from "@/app/components/profile/ProfileBrandAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DroppableNavLink } from "@/components/ui/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDebug } from "@/providers/debug/DebugContext";
import { cn } from "@/lib/utils";
import { Bug, ChevronsUpDown, Settings } from "lucide-react";
import { TbBugOff } from "react-icons/tb";

/**
 * The foot of the rail: which organization you are in, and a way out of it.
 *
 * The organization is the single most consequential piece of state in the app —
 * every id on screen belongs to one — and it used to be a badge buried two
 * levels inside an avatar menu. Here it is a named, always-visible row that
 * reads as what it is: a switcher.
 *
 * Renders from the profile book, not from a lok query, so it still says
 * something useful while signed out or offline.
 */
export const RailFooter = () => {
  const activeProfile = Arkitekt.useActiveProfile();
  const configurationIssues = Arkitekt.useConfigurationIssues();
  const { debug, setDebug } = useDebug();

  const organization =
    activeProfile?.label.organizationName ||
    activeProfile?.label.deploymentName ||
    "Not signed in";
  const account = activeProfile?.label.username;

  return (
    <div className="flex w-full min-w-0 shrink-0 items-center gap-1 px-2 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left",
            "transition-colors hover:bg-background focus-visible:outline-none",
          )}
        >
          {activeProfile ? (
            <ProfileBrandAvatar profile={activeProfile} className="h-6 w-6 text-[9px]" />
          ) : (
            <div className="h-6 w-6 shrink-0 rounded-md border border-dashed" />
          )}

          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-xs font-medium text-foreground">
              {organization}
            </span>
            {account && (
              <span className="truncate text-[10px] text-muted-foreground">{account}</span>
            )}
          </span>

          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-64 border-border">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Switch organization
          </DropdownMenuLabel>

          {configurationIssues.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
                Configuration issues detected
              </div>
              {configurationIssues.slice(0, 3).map((issue) => (
                <div key={issue} className="px-2 py-1 text-xs text-muted-foreground">
                  {issue}
                </div>
              ))}
            </>
          )}

          {/* The switcher owns the account list, adding, and signing out. */}
          <ProfileSwitcher />

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDebug(!debug)}>
            {debug ? <Bug className="mr-2 h-4 w-4" /> : <TbBugOff className="mr-2 h-4 w-4" />}
            <span>Debug Mode</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings is a destination, not a menu item — one gear, no nesting. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <DroppableNavLink to="/settings" aria-label="Settings">
            {({ isActive }) => (
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                <Settings className="h-4 w-4" />
              </span>
            )}
          </DroppableNavLink>
        </TooltipTrigger>
        <TooltipContent side="top">Settings</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default RailFooter;
