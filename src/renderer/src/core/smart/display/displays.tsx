import { createDisplayProvider } from "@/core/smart/display/registry";
import { derivedRecord } from "@/core/modules/host/lazy";
import { MODULE_DISPLAYS } from "../../modules/registries";

/**
 * The display registry: every module's `displays` builtin, by identifier,
 * each behind its module's guard (see `app/modules/registries`).
 */
export const { DisplayProvider, useDisplay, useDisplayComponent, registry: DISPLAY_REGISTRY } =
  // Even handing the binding over is a read: defer it (app/modules/registries).
  createDisplayProvider(derivedRecord(() => MODULE_DISPLAYS));
