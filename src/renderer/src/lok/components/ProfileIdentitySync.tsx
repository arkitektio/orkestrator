import { useEffect } from "react";

import { Arkitekt } from "@/core/lib/arkitekt/host";
import { useMyContextQuery } from "../api/graphql";
import { resolveContextBrand } from "../lib/membershipBrand";

/**
 * Tells the profile book who the active login actually is.
 *
 * A device grant cannot know which user or organization it just produced — the
 * token carries the claim, but only lok can name it — so a freshly granted
 * profile starts on a provisional id and an endpoint-only label. This component
 * closes that gap: on the first `mycontext` it hands the provider the real
 * identity, which re-keys the profile to `baseUrl::user::org` (collapsing it onto
 * the existing row if that organization in that hub was already stored) and caches the label
 * the switcher draws parked profiles from.
 *
 * Renders nothing — it exists only to own that one write. The brand it
 * caches is what `OrganizationBrandSync` paints, from the first frame of the
 * next launch. It must be mounted inside `Guard.Lok`: `useMyContextQuery`
 * needs lok's Apollo client, which only exists once the service is ready.
 */
export const ProfileIdentitySync = () => {
  const { data } = useMyContextQuery({ fetchPolicy: "cache-and-network" });
  const activeProfileId = Arkitekt.useActiveProfileId();
  const setProfileIdentity = Arkitekt.useSetProfileIdentity();
  const connection = Arkitekt.useConnection();

  const baseUrl = connection?.endpoint?.base_url;
  const context = data?.mycontext;
  const userId = context?.user?.id;
  const username = context?.user?.username;
  const organizationId = context?.organization?.id;
  const organizationName = context?.organization?.name;
  const organizationSlug = context?.organization?.slug;
  // The hub this client was approved into. Part of the profile's KEY, not just
  // its label: the same user can hold a separate approval — a separate OAuth
  // client with its own refresh chain — in each hub of one organization, and
  // without this they would collapse onto one row and one of the two chains
  // would be lost. Null for a client bound to no hub.
  const hubId = context?.hub?.id ?? null;
  const hubName = context?.hub?.name;
  const hubSlug = context?.hub?.identifier as string | undefined;

  // The membership's own override wins over the organization default, resolved
  // field by field — reusing the one function that already knows that rule.
  const brand = resolveContextBrand(context);

  // Depending on the resolved scalars rather than on `data` keeps this to one
  // write per actual change: the query is `cache-and-network` and refetches on
  // reactivate, which would otherwise re-persist an identical identity (and
  // re-key the book) on every refetch.
  useEffect(() => {
    if (!activeProfileId || !baseUrl || !userId) {
      return;
    }

    setProfileIdentity(activeProfileId, {
      identity: {
        baseUrl,
        userId,
        organizationId: organizationId ?? null,
        hubId,
      },
      label: {
        username,
        organizationName,
        organizationSlug,
        hubName,
        hubSlug,
        brandHue: brand.hue ?? null,
        brandChroma: brand.chroma ?? null,
        refreshedAt: Date.now(),
      },
    });
  }, [
    activeProfileId,
    baseUrl,
    userId,
    username,
    organizationId,
    organizationName,
    organizationSlug,
    hubId,
    hubName,
    hubSlug,
    brand.hue,
    brand.chroma,
    setProfileIdentity,
  ]);

  return null;
};

export default ProfileIdentitySync;
