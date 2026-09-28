import { Arkitekt } from "@/core/connection/arkitekt/host";
import type { StoredProfile } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { describeRefreshFailure } from "@/core/connection/arkitekt/runtime/profileAuth";
import React from "react";
import { toast } from "@/core/notify";

/**
 * Switch this window to another login (another organization), as the rail's
 * switcher and the palette's "Switch to …" rows both do.
 *
 * The active login is a no-op. A stale one parks the session instead: its
 * refresh chain is known broken, and a re-grant hands off to an external
 * browser for up to a minute — the sign-in screen, with this account's card,
 * is where that can wait. Anything else swaps the connection in place; a
 * failure leaves the current login running, so the toast is the whole
 * user-facing consequence.
 */
export const useSwitchToProfile = () => {
  const activeProfileId = Arkitekt.useActiveProfileId();
  const connection = Arkitekt.useConnection();
  const switchProfile = Arkitekt.useSwitchProfile();
  const parkSession = Arkitekt.useDisconnect();

  return React.useCallback(
    (profile: StoredProfile) => {
      if (profile.id === activeProfileId && connection) return;

      if (profile.status === "stale") {
        void parkSession();
        return;
      }

      void switchProfile(profile.id).catch((error) => {
        const { kind, message } = describeRefreshFailure(error, profile);
        if (kind === "expired") {
          toast.error(message, { action: { label: "Sign in again", onClick: () => void parkSession() } });
          return;
        }
        toast.error(message);
      });
    },
    [activeProfileId, connection, parkSession, switchProfile],
  );
};
