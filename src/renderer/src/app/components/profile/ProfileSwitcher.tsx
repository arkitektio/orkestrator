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
import { Building2, LogOut, Plus, Trash2 } from "lucide-react";
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
 */
export const ProfileSwitcher = () => {
  const profiles = Arkitekt.useProfiles();
  const activeProfileId = Arkitekt.useActiveProfileId();
  const switchingProfileId = Arkitekt.useSwitchingProfileId();
  const switchProfile = Arkitekt.useSwitchProfile();
  const removeProfile = Arkitekt.useRemoveProfile();
  const forgetAllProfiles = Arkitekt.useForgetAllProfiles();
  const disconnect = Arkitekt.useDisconnect();
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

      <DropdownMenuSeparator />

      {activeProfileId && (
        <DropdownMenuItem className="cursor-pointer" onSelect={() => void disconnect()}>
          <LogOut className="mr-2 h-4 w-4" />
          {/* "Sign out" now parks rather than wipes — the login stays in the
              list, which is the whole point of the switcher. */}
          <span>Sign out</span>
        </DropdownMenuItem>
      )}

      {profiles.length > 0 && (
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onSelect={() => {
            void forgetAllProfiles().then(() =>
              toast.success("Forgot every account on this computer."),
            );
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Forget all accounts</span>
        </DropdownMenuItem>
      )}
    </>
  );
};

export default ProfileSwitcher;
