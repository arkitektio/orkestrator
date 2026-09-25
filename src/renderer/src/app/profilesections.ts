import { derived } from "@/lib/module-host/lazy";
import {
  createProfileSectionRegistry,
  type ProfileSectionRegistry,
} from "@/lib/profile/section";
import { moduleProfileSections } from "./modules/registries";

const build = derived(() => createProfileSectionRegistry(moduleProfileSections()));

/**
 * What each module shows on a member's profile: every module's
 * `profileSections` builtin, in priority order. Built on first read.
 */
export const PROFILE_SECTIONS: ProfileSectionRegistry = {
  get sections() {
    return build().sections;
  },
};
