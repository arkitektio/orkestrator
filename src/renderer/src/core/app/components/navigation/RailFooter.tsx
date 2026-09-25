import { Arkitekt } from "@/core/lib/arkitekt/host";
import ProfileSwitcher from "@/core/app/components/profile/ProfileSwitcher";
import { profileDetail, profileTitle } from "@/core/connection/profile/ui/profileLabels";
import { ProfileBrandAvatar } from "@/core/connection/profile/ui/ProfileBrandAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { DroppableNavLink } from "@/core/components/ui/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { cn } from "@/core/lib/utils";
import { ChevronsUpDown, Settings, UsersRound } from "lucide-react";
import React from "react";

import { useRailSwitcherRequests } from "./railSwitcher";

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
  // The launch path: the window is already open on this account, its token is
  // still being proven. The only sign the app gives that anything is pending —
  // there is no splash, no page skeleton and no island for it.
  const autoLoggingIn = Arkitekt.useIsAutoLoggingIn();
  const parkSession = Arkitekt.useDisconnect();

  // Controlled so other surfaces can point the user here — Settings → Account
  // has a "Switch account" button rather than a second copy of the list.
  const [open, setOpen] = React.useState(false);
  const requests = useRailSwitcherRequests();
  const seen = React.useRef(requests);
  React.useEffect(() => {
    if (seen.current === requests) return;
    seen.current = requests;
    setOpen(true);
  }, [requests]);

  // The same pair the switcher's rows draw: the hub leads, because that is what
  // is being chosen between, and what places it follows in muted text.
  const name = activeProfile ? profileTitle(activeProfile) : "Not signed in";
  const detail = autoLoggingIn
    ? "Signing in…"
    : activeProfile
      ? profileDetail(activeProfile)
      : undefined;

  return (
    // `app-no-drag`: the rail around it is a window-drag region, which would
    // otherwise swallow every click on the switcher and the settings link.
    <div className="app-no-drag flex w-full min-w-0 shrink-0 items-center gap-1 px-2 pb-2">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          className={cn(
            "group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left",
            "transition-colors hover:bg-background focus-visible:outline-none",
          )}
        >
          {activeProfile ? (
            // The ring spins around the real avatar rather than replacing it:
            // the account is known from the cached label, only its session is
            // pending, and swapping in a spinner would hide what we do know.
            <span className="relative shrink-0">
              <ProfileBrandAvatar profile={activeProfile} className="h-6 w-6 text-[9px]" />
              {autoLoggingIn && (
                <span
                  data-testid="rail-footer-signing-in"
                  aria-hidden
                  className="absolute -inset-0.5 animate-spin rounded-lg border border-transparent border-t-primary"
                />
              )}
            </span>
          ) : (
            <div className="h-6 w-6 shrink-0 rounded-md border border-dashed" />
          )}

          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-xs font-medium text-foreground">
              {name}
            </span>
            {detail && (
              <span
                className={cn(
                  "truncate text-[10px] text-muted-foreground",
                  autoLoggingIn && "animate-pulse",
                )}
              >
                {detail}
              </span>
            )}
          </span>

          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-64 border-border">
          <DropdownMenuLabel className="py-1 text-xs font-normal text-muted-foreground">
            Switch organization
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Only organizations here: switching is the menu's whole job. */}
          <ProfileSwitcher />

          <DropdownMenuSeparator />

          {/* Adding an account hands off to an external browser for up to a
              minute, which a menu that closes on every click cannot host — so
              there is no "add" in here and no dialog reimplementing the sign-in
              screen. This parks the session instead: nothing is signed out, the
              credential is untouched, and the real sign-in screen comes back
              with every stored account on it. */}
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-xs text-muted-foreground focus:text-foreground"
            onSelect={() => void parkSession()}
          >
            <UsersRound className="h-3.5 w-3.5" />
            Manage accounts…
          </DropdownMenuItem>
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
