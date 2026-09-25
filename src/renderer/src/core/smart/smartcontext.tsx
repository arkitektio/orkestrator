import { LOCAL_SECTIONS } from "@/core/providers/smart/extensions/local/sections";
import { provideSmartRegistries } from "@/core/providers/smart/hostRegistries";
import {
  createSmartSectionRegistry,
  type SmartSectionRegistry,
} from "@/core/providers/smart/extensions/sectionRegistry";
import { derived } from "@/core/lib/module-host/lazy";
import { moduleMenuWrappers, moduleSections } from "../modules/registries";

const build = derived(() => createSmartSectionRegistry([...LOCAL_SECTIONS, ...moduleSections()]));

/**
 * The sections of the smart context menu: the host's local-actions section
 * plus every module's `sections` builtin. Priority decides the order; each
 * section's `applies` decides whether it mounts for a given selection.
 * Built on first read (see `app/modules/registries`).
 */
export const SMART_SECTIONS: SmartSectionRegistry = {
  get sections() {
    return build().sections;
  },
};

// The menu (`providers/smart/extensions/context`) reads the sections through this.
provideSmartRegistries({ sections: SMART_SECTIONS, menuWrappers: moduleMenuWrappers });
