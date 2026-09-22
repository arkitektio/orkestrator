import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { StoredProfile } from "@/lib/arkitekt/fakts/profileStorageSchema";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Loader2, LogOut, MoreHorizontal, Trash2 } from "lucide-react";
import React from "react";

import { ProfileBrandAvatar } from "./ProfileBrandAvatar";
import { profileDetail, profileTitle } from "./profileLabels";

export type ProfileRowProps = {
  profile: StoredProfile;
  active: boolean;
  switching: boolean;
  /** Just switch: the parked credential is proven, nothing is spent. */
  onSelect: (profile: StoredProfile) => void;
  /** Spend the credential: this account needs a new sign-in afterwards. */
  onSignOut: (profile: StoredProfile) => void;
  /** Forget the login on this computer entirely. */
  onRemove: (profile: StoredProfile) => void;
};

/**
 * One login in the switcher.
 *
 * Everything here comes from the cached label, never from a query: the row has
 * to draw identically for the live profile, for a parked one, and while the app
 * is offline.
 */
export const ProfileRow = ({
  profile,
  active,
  switching,
  onSelect,
  onSignOut,
  onRemove,
}: ProfileRowProps) => {
  const stale = profile.status === "stale";

  const title = profileTitle(profile);

  const subtitle = stale ? "Session expired — sign in again" : profileDetail(profile);

  return (
    <div className="flex w-full items-center justify-between gap-1 pr-1">
      <DropdownMenuItem
        className={cn(
          "flex flex-1 min-w-0 cursor-pointer items-center gap-2",
          active && "bg-muted/60",
        )}
        disabled={switching}
        onSelect={(event) => {
          // A switch is not instant — it proves the parked credential first —
          // so keep the menu open to show the row spinner and any failure.
          event.preventDefault();
          onSelect(profile);
        }}
      >
        <ProfileBrandAvatar
          profile={profile}
          className={cn(stale && "opacity-40 grayscale")}
        />
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-sm", stale && "text-muted-foreground")}>
            {title}
          </div>
          {subtitle && (
            <div
              className={cn(
                "truncate text-[10px]",
                stale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
              )}
            >
              {subtitle}
            </div>
          )}
        </div>
        {switching ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : stale ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        ) : active ? (
          <Check className="h-4 w-4 shrink-0" />
        ) : null}
      </DropdownMenuItem>

      {/* The row's own menu, at its right edge; opens out to the right. */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          aria-label={`More for ${title}`}
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md p-0 text-muted-foreground hover:text-foreground [&>svg:last-child]:hidden"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuSubTrigger>
        {/* A submenu places itself against its trigger; Radix takes no `side`/`align` here.

            The two things that are NOT a switch. Picking the row switches and
            leaves the credential alone; these two spend it or forget it, so
            each says what it costs — the difference is invisible in the moment
            and expensive to get wrong. */}
        <DropdownMenuSubContent className="w-72">
          {!stale && (
            <DropdownMenuItem
              className="cursor-pointer flex-col items-start gap-0.5"
              onSelect={(event) => {
                event.preventDefault();
                onSignOut(profile);
              }}
            >
              <span className="flex items-center gap-2 text-xs font-medium">
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </span>
              <span className="pl-5 text-[10px] leading-relaxed text-muted-foreground">
                Ends this session. Signing back in needs your browser.
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="cursor-pointer flex-col items-start gap-0.5 text-destructive focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              onRemove(profile);
            }}
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Trash2 className="h-3.5 w-3.5" />
              Remove from this computer
            </span>
            <span className="pl-5 text-[10px] leading-relaxed text-muted-foreground">
              Forgets this login here. It stays valid on the server until it
              expires.
            </span>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </div>
  );
};

export default React.memo(ProfileRow);
