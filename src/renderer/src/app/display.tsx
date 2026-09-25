import { createDisplayProvider } from "@/lib/display/registry";
import { lazyRecord } from "@/lib/module-host/lazy";
import { MODULE_DISPLAYS } from "./modules/registries";

/**
 * The display registry: every module's `displays` builtin, by identifier,
 * each behind its module's guard (see `app/modules/registries`).
 */
export const { DisplayProvider, useDisplay, useDisplayComponent, registry: DISPLAY_REGISTRY } =
  // Even handing the binding over is a read: defer it (app/modules/registries).
  createDisplayProvider(lazyRecord(() => MODULE_DISPLAYS));
