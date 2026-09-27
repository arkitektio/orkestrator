import { Arkitekt } from "@/core/connection/arkitekt/host";
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/core/ui/dropdown-menu";
import {
  groupProfilesByDeployment,
  type StoredProfile,
} from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { useSwitchToProfile } from "@/core/connection/profile/ui/useSwitchToProfile";
import { Building2 } from "lucide-react";
import React from "react";
import { toast } from "@/core/notify";

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
 * Only switching lives in the list. Adding an account is not a choice of
 * organization and does not belong in a menu that closes on every click — it
 * happens on the sign-in screen, which "Manage accounts" parks the session to
 * reach. Signing out and forgetting a login are on each row's own submenu.
 */
export const ProfileSwitcher = () => {
  const profiles = Arkitekt.useProfiles();
  const activeProfileId = Arkitekt.useActiveProfileId();
  const switchingProfileId = Arkitekt.useSwitchingProfileId();
  const signOutProfile = Arkitekt.useSignOutProfile();
  const removeProfile = Arkitekt.useRemoveProfile();

  const groups = React.useMemo(
    () => groupProfilesByDeployment(profiles),
    [profiles],
  );

  const onSelect = useSwitchToProfile();

  const onSignOut = React.useCallback(
    (profile: StoredProfile) => {
      void signOutProfile(profile.id).then(() => {
        toast.success(
          `Signed out of ${profile.label.organizationName || profile.label.deploymentName || "this account"}. It stays in the list; signing back in needs your browser.`,
        );
      });
    },
    [signOutProfile],
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
                  onSignOut={onSignOut}
                  onRemove={onRemove}
                />
              ))}
            </DropdownMenuGroup>
          ))}
        </>
      )}

    </>
  );
};

export default ProfileSwitcher;
