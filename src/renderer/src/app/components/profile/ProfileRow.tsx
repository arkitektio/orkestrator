import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { StoredProfile } from "@/lib/arkitekt/fakts/profileStorageSchema";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Loader2, MoreHorizontal } from "lucide-react";
import React from "react";

import { ProfileBrandAvatar } from "./ProfileBrandAvatar";

export type ProfileRowProps = {
  profile: StoredProfile;
  active: boolean;
  switching: boolean;
  onSelect: (profile: StoredProfile) => void;
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
  onRemove,
}: ProfileRowProps) => {
  const stale = profile.status === "stale";

  const title =
    profile.label.organizationName ||
    profile.label.organizationSlug ||
    profile.label.deploymentName ||
    profile.identity.baseUrl;

  const subtitle = stale
    ? "Session expired — sign in again"
    : [profile.label.username, profile.label.deploymentName]
        .filter(Boolean)
        .join(" · ");

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
        {/* A submenu places itself against its trigger; Radix takes no `side`/`align` here. */}
        <DropdownMenuSubContent className="w-64">
          <div className="px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
            Removing forgets this login on this computer only. It stays valid on
            the server until it expires.
          </div>
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              onRemove(profile);
            }}
          >
            Remove {title}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </div>
  );
};

export default React.memo(ProfileRow);
