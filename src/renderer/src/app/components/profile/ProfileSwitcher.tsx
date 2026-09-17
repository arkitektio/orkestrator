import { Arkitekt } from "@/app/Arkitekt";
import { useDialog } from "@/app/dialog";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  groupProfilesByDeployment,
  type StoredProfile,
} from "@/lib/arkitekt/fakts/profileStorageSchema";
import { describeRefreshFailure } from "@/lib/arkitekt/runtime/profileAuth";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Plus, UserPlus } from "lucide-react";
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
 * Only switching lives in the list; adding is the pair of icons in the menu's
 * title row (`AddProfileActions`). Signing out and forgetting accounts are not
 * choices of organization, so they sit in Settings → Account.
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

    </>
  );
};

/**
 * The two ways in, as icons: another organization on the server you are on,
 * or another account anywhere. Rendered in the switcher menu's title row (see
 * `RailFooter`), not as rows of the list — they are the menu's only verbs and
 * the list is the point.
 */
export const AddProfileActions = () => {
  const connection = Arkitekt.useConnection();
  const { openDialog } = useDialog();

  return (
    <div className="flex items-center gap-0.5">
      {connection?.endpoint && (
        <AddButton
          label="Add organization"
          icon={<Building2 className="h-4 w-4" />}
          onClick={() =>
            openDialog(
              "addprofile",
              { endpoint: connection.endpoint },
              { size: "small" },
            )
          }
        />
      )}
      <AddButton
        label="Add account"
        icon={<UserPlus className="h-4 w-4" />}
        onClick={() => openDialog("addprofile", {}, { size: "small" })}
      />
    </div>
  );
};

/**
 * One of the switcher's icon verbs, with its name on hover.
 *
 * A real menu item rather than a button, so it stays in the menu's arrow-key
 * order and the menu closes when it is chosen — exactly as the text rows did.
 */
const AddButton = ({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <DropdownMenuItem
        aria-label={label}
        onSelect={onClick}
        className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md p-0 text-muted-foreground focus:text-foreground"
      >
        {icon}
        <Plus className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-popover" />
      </DropdownMenuItem>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

export default ProfileSwitcher;
