import { Arkitekt } from "@/core/app/Arkitekt";
import type { ShareScope } from "@/core/lib/shareScope";
import type { StoredProfile } from "@/core/lib/arkitekt/fakts/profileStorageSchema";
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
