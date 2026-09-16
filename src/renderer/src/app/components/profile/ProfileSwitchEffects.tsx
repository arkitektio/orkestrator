import { Arkitekt } from "@/app/Arkitekt";
import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * What has to happen everywhere else when the live profile changes.
 *
 * Renders nothing. It lives inside the `Router` because it needs `useNavigate`,
 * which the Arkitekt provider cannot have, and deliberately OUTSIDE the
 * `key={activeProfileId}` subtree in `AppProvider` so it survives the remount it
 * is reacting to.
 *
 * The one job is navigation: the route you were on names ids belonging to the
 * organization you just left (`/mikro/images/42`), and following that link into
 * a different tenant is at best a not-found. Home is the safe landing, and it is
 * also the surface that was just re-scoped for the new profile — the dashboard
 * keys its layouts by the same `baseUrl::user::org` string the profile id is.
 *
 * Everything else about a switch is already handled where it belongs:
 * `disposeConnection` tears down the previous Apollo clients and sockets,
 * `OrganizationBrandSync` re-reads the brand, and the `key` remount clears
 * selection, dialog and agent state.
 */
export const ProfileSwitchEffects = () => {
  const navigate = useNavigate();
  const activeProfileId = Arkitekt.useActiveProfileId();
  const previous = React.useRef<string | null | undefined>(undefined);

  React.useEffect(() => {
    const before = previous.current;
    previous.current = activeProfileId;

    // `undefined` is the first render — restoring a session on launch is not a
    // switch and must not fight whatever route the user opened the app on.
    if (before === undefined || before === activeProfileId) {
      return;
    }

    // Signing out is not a switch either: the guards already replace the tree
    // with the welcome screen.
    if (!activeProfileId) {
      return;
    }

    navigate("/", { replace: true });
  }, [activeProfileId, navigate]);

  return null;
};

export default ProfileSwitchEffects;
