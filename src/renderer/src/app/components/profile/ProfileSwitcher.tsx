import { Arkitekt } from "@/app/Arkitekt";
import { useDialog } from "@/app/dialog";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  groupProfilesByDeployment,
  type StoredProfile,
} from "@/lib/arkitekt/fakts/profileStorageSchema";
import { describeRefreshFailure } from "@/lib/arkitekt/runtime/profileAuth";
import { Building2, Plus } from "lucide-react";
import React from "react";
import { toast } from "sonner";

import ProfileRow from "./ProfileRow";

/**
 * The account switcher in the avatar menu.
 *
 * Reads the profile book and nothing else — no lok query, no live connection —
 * which is what lets it render in three states that used to be dead ends: signed
 * in, signed out (every parked login is one click away instead of a welcome
 * screen), and offline.
 *
 * A row is a *login*, not an organization: the same person in two organizations
 * is two rows, because the organization lives in the token. Rows are grouped by
 * deployment, so two organizations on one server read as what they are.
 *
 * Only switching and adding live here. Signing out and forgetting accounts are
 * not choices of organization, so they sit in Settings → Account.
 */
export const ProfileSwitcher = () => {
  const profiles = Arkitekt.useProfiles();
  const activeProfileId = Arkitekt.useActiveProfileId();
  const switchingProfileId = Arkitekt.useSwitchingProfileId();
  const switchProfile = Arkitekt.useSwitchProfile();
  const removeProfile = Arkitekt.useRemoveProfile();
  const connection = Arkitekt.useConnection();
  const { openDialog } = useDialog();

  const groups = React.useMemo(
    () => groupProfilesByDeployment(profiles),
    [profiles],
  );

  const onSelect = React.useCallback(
    (profile: StoredProfile) => {
      if (profile.id === activeProfileId && connection) {
        return;
      }

      // A stale profile's refresh chain is already known broken; sending the
      // user straight to the grant saves them a click and a failure.
      if (profile.status === "stale") {
        openDialog(
          "addprofile",
          { endpoint: profile.session.endpoint },
          { size: "small" },
        );
        return;
      }

      void switchProfile(profile.id).catch((error) => {
        // `switchProfile` has already classified this and left the current
        // profile running, so there is nothing to recover — the toast is the
        // whole user-facing consequence.
        const { kind, message } = describeRefreshFailure(error, profile);
        if (kind === "expired") {
          toast.error(message, {
            action: {
              label: "Sign in again",
              onClick: () =>
                openDialog(
                  "addprofile",
                  { endpoint: profile.session.endpoint },
                  { size: "small" },
                ),
            },
          });
          return;
        }
        toast.error(message);
      });
    },
    [activeProfileId, connection, openDialog, switchProfile],
  );

  const onRemove = React.useCallback(
    (profile: StoredProfile) => {
      void removeProfile(profile.id).then(() => {
        toast.success(
          `Removed ${profile.label.organizationName || profile.label.deploymentName || "account"} from this computer.`,
        );
      });
    },
    [removeProfile],
  );

  return (
    <>
      {groups.length > 0 && (
        <>
          <DropdownMenuSeparator />
          {groups.map((group) => (
            <DropdownMenuGroup key={group.baseUrl}>
              <DropdownMenuLabel className="flex items-center gap-1.5 py-1 text-[10px] font-medium text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{group.name}</span>
              </DropdownMenuLabel>
              {group.profiles.map((profile) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  active={profile.id === activeProfileId}
                  switching={profile.id === switchingProfileId}
                  onSelect={onSelect}
                  onRemove={onRemove}
                />
              ))}
            </DropdownMenuGroup>
          ))}
        </>
      )}

      <DropdownMenuSeparator />

      {connection?.endpoint && (
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() =>
            openDialog(
              "addprofile",
              { endpoint: connection.endpoint },
              { size: "small" },
            )
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Add organization…</span>
        </DropdownMenuItem>
      )}

      <DropdownMenuItem
        className="cursor-pointer"
        onSelect={() => openDialog("addprofile", {}, { size: "small" })}
      >
        <Plus className="mr-2 h-4 w-4" />
        <span>Add account…</span>
      </DropdownMenuItem>

    </>
  );
};

export default ProfileSwitcher;
