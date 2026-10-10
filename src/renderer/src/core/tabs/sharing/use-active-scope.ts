import { Arkitekt } from "@/core/connection/arkitekt/host";
import type { ShareScope } from "@/core/tabs/sharing/shareScope";
import type { LinkHost } from "@/core/tabs/sharing/universalLink";
import type { StoredProfile } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { useMemo } from "react";

/**
 * The scope a stored profile stands for.
 *
 * Read from `identity` rather than the live connection so a PARKED profile can
 * be matched against a link without connecting to it — which is the whole point
 * of the gate: deciding where a link belongs must not cost a token refresh.
 */
export const profileScope = (profile: StoredProfile): ShareScope => ({
  baseUrl: profile.identity.baseUrl,
  org: profile.identity.organizationId,
  hub: profile.identity.hubId ?? null,
});

/**
 * The scope of the connection we are on, or null before there is one.
 *
 * This is what a freshly copied link is stamped with, and what an arriving link
 * is compared against.
 */
export const useActiveScope = (): ShareScope | null => {
  const profile = Arkitekt.useActiveProfile();
  return useMemo(() => (profile ? profileScope(profile) : null), [profile]);
};

/**
 * Where a profile's links are served, or null when one cannot be: the
 * deployment names no front door, the organization has no slug, or the
 * profile has not heard its slug or hub yet.
 */
export const profileLinkHost = (profile: StoredProfile): LinkHost | null => {
  const frontendUrl = profile.session?.endpoint?.frontend_url;
  const slug = profile.label?.organizationSlug;
  const hub = profile.identity.hubId;
  return frontendUrl && slug && hub ? { frontendUrl, slug, hub, user: profile.identity.userId } : null;
};

/** The same for the connection we are on. */
export const useActiveLinkHost = (): LinkHost | null => {
  const profile = Arkitekt.useActiveProfile();
  return useMemo(() => (profile ? profileLinkHost(profile) : null), [profile]);
};
