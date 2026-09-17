import { Arkitekt } from "@/app/Arkitekt";
import ProfileSwitcher, { AddProfileActions } from "@/app/components/profile/ProfileSwitcher";
import { ProfileBrandAvatar } from "@/app/components/profile/ProfileBrandAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DroppableNavLink } from "@/components/ui/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Settings } from "lucide-react";

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

  const organization =
    activeProfile?.label.organizationName ||
    activeProfile?.label.deploymentName ||
    "Not signed in";
  const account = activeProfile?.label.username;

  return (
    // `app-no-drag`: the rail around it is a window-drag region, which would
    // otherwise swallow every click on the switcher and the settings link.
    <div className="app-no-drag flex w-full min-w-0 shrink-0 items-center gap-1 px-2 pb-2">
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
          {/* The menu's title bar: what the list is, and — at its right — the
              two ways to add to it. */}
          <DropdownMenuLabel className="flex items-center justify-between gap-2 py-1 pr-1 text-xs font-normal text-muted-foreground">
            <span>Switch organization</span>
            <AddProfileActions />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Only organizations here: signing out, debug mode and configuration
              issues live in Settings. */}
          <ProfileSwitcher />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings is a destination, not a menu item — one gear, no nesting.
          Appearance (light / dark) lives there too, not here. */}
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
