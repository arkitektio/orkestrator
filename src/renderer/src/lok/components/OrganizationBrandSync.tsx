import { useEffect } from "react";
import { Arkitekt } from "@/core/app/Arkitekt";
import { setBrandRemote } from "@/core/providers/settings/brandTheme";
import { EMPTY_BRAND } from "../lib/membershipBrand";

/**
 * Pushes the active login's membership brand into the shared `--brand-hue` /
 * `--brand-chroma` variables for as long as it is mounted.
 *
 * It reads the brand CACHED on the profile, not lok: `ProfileIdentitySync`
 * resolves `mycontext` with the same `resolveContextBrand` and stores the
 * result on the profile's label, so this is the same value — available on the
 * very first frame of a launch instead of after lok answers. That is what used
 * to make the colour visibly jump on every start. It therefore needs no lok
 * client and is mounted outside `Guard.Lok`; with no active profile the
 * variables go back to the local settings brand.
 */
export const OrganizationBrandSync = () => {
  const profile = Arkitekt.useActiveProfile();
  const hue = profile?.label.brandHue ?? undefined;
  const chroma = profile?.label.brandChroma ?? undefined;

  useEffect(() => {
    setBrandRemote({ hue, chroma });
  }, [hue, chroma]);

  useEffect(() => () => setBrandRemote(EMPTY_BRAND), []);

  return null;
};

export default OrganizationBrandSync;
