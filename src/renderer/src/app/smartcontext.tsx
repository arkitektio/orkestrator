import { ALPAKA_SECTIONS } from "@/providers/smart/extensions/alpaka/sections";
import { KABINET_SECTIONS } from "@/providers/smart/extensions/kabinet/sections";
import { KRAPH_SECTIONS } from "@/providers/smart/extensions/kraph/sections";
import { LOCAL_SECTIONS } from "@/providers/smart/extensions/local/sections";
import { REKUEST_SECTIONS } from "@/providers/smart/extensions/rekuest/sections";
import { createSmartSectionRegistry } from "@/providers/smart/extensions/sectionRegistry";

/**
 * The sections of the smart context menu, merged from every module the way
 * `app/localactions.tsx` merges local actions. Priority decides the order;
 * each section's `applies` decides whether it mounts for a given selection.
 */
export const SMART_SECTIONS = createSmartSectionRegistry([
  ...LOCAL_SECTIONS,
  ...ALPAKA_SECTIONS,
  ...REKUEST_SECTIONS,
  ...KRAPH_SECTIONS,
  ...KABINET_SECTIONS,
]);
