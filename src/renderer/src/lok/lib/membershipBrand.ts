/**
 * Resolving the brand a signed-in user should see.
 *
 * lok stores the brand twice: the organization carries a default, and each
 * membership may override it for one member. The schema is explicit that a null
 * membership field means "not overridden" rather than "no brand" — so the two
 * are merged FIELD BY FIELD, not object by object. A member who set only a hue
 * keeps the organization's chroma.
 *
 * The result feeds `setBrandRemote`, which sits above the local settings brand
 * and below the open scene's tint.
 */

import type { PartialBrand } from "@/providers/settings/brandTheme";
import type { ContextFragment } from "../api/graphql";

/** Out-of-range values are dropped rather than clamped: a hue of 400 or a
 * chroma of 5 is a backend bug, and letting the layer below show through is
 * less wrong than painting the app a colour nobody chose. */
const inRange = (
  value: number | null | undefined,
  max: number,
): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max
    ? value
    : undefined;

export const EMPTY_BRAND: PartialBrand = { hue: undefined, chroma: undefined };

/**
 * The brand for the context's ACTIVE organization.
 *
 * `mycontext.user.memberships` spans every organization the user belongs to, so
 * the one matching `mycontext.organization` is the only one that may speak —
 * otherwise switching organizations would leave the previous one's colour on.
 * Returns an empty brand when there is no context, no membership, and nothing
 * set on the organization either.
 */
export const resolveContextBrand = (
  context: ContextFragment | null | undefined,
): PartialBrand => {
  if (!context) {
    return EMPTY_BRAND;
  }

  const organization = context.organization;
  const membership = context.user.memberships.find(
    (candidate) => candidate.organization.id === organization.id,
  );

  return {
    hue: inRange(membership?.brandHue, 360) ?? inRange(organization.brandHue, 360),
    chroma: inRange(membership?.brandChroma, 1) ?? inRange(organization.brandChroma, 1),
  };
};
