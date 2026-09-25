import type { StoredProfile } from "@/core/lib/arkitekt/fakts/profileStorageSchema";

/**
 * How a parked login names itself, everywhere one is drawn.
 *
 * The HUB leads. It is what the user is actually picking between: one person in
 * one organization can hold a separate approval in each hub, so two rows of the
 * same organization differ only there — and a list whose first word is the same
 * on every line tells you nothing. The organization follows in muted text,
 * because it is the context the hub sits in rather than the choice being made.
 *
 * Without a hub (a client bound to none, or a deployment that does not fill
 * `Context.hub`) nothing changes from before: the organization leads, as the
 * only name there is.
 *
 * Shared so the rail's rows, the sign-in screen's cards and the rail footer
 * agree — they are the same login seen from three places.
 */
export const profileTitle = (profile: StoredProfile): string =>
  profile.label.hubName ||
  profile.label.organizationName ||
  profile.label.organizationSlug ||
  profile.label.deploymentName ||
  profile.identity.baseUrl;

/** True when the title above is the hub, so the organization still needs saying. */
const titleIsHub = (profile: StoredProfile): boolean => Boolean(profile.label.hubName);

const organization = (profile: StoredProfile): string | undefined =>
  profile.label.organizationName || profile.label.organizationSlug;

/**
 * The muted line under the name: the organization the hub belongs to, then who
 * and where. Ordered so the first thing after the hub is the thing that places
 * it.
 */
export const profileDetail = (profile: StoredProfile): string =>
  [
    titleIsHub(profile) ? organization(profile) : undefined,
    profile.label.username,
    profile.label.deploymentName,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * The one line a narrow surface has room for — a card face.
 *
 * The organization when the hub is the title (that pair is the whole identity),
 * otherwise the account, which is the only thing the avatar cannot say.
 */
export const profileShortDetail = (profile: StoredProfile): string =>
  (titleIsHub(profile) ? organization(profile) : undefined) ||
  profile.label.username ||
  profile.label.deploymentName ||
  "";
