import { ELEKTRO_PROFILE_SECTIONS } from "@/elektro/profile/sections";
import { createProfileSectionRegistry } from "@/lib/profile/section";
import { MIKRO_PROFILE_SECTIONS } from "@/mikro/profile/sections";
import { REKUEST_PROFILE_SECTIONS } from "@/rekuest/profile/sections";

/**
 * What each module shows on a member's profile, merged the way
 * `app/smartcontext.tsx` merges menu sections. A new module plugs in by
 * exporting a `*_PROFILE_SECTIONS` array and adding it here.
 */
export const PROFILE_SECTIONS = createProfileSectionRegistry([
  ...MIKRO_PROFILE_SECTIONS,
  ...REKUEST_PROFILE_SECTIONS,
  ...ELEKTRO_PROFILE_SECTIONS,
]);
