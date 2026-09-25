import type { ModuleDefinition } from "./define";

/**
 * The modules the app runs with, installed once by the app's entry
 * (`app/modules/install`). Registries read them from here, on first use.
 *
 * Why a slot instead of an import: nearly every module component imports a
 * registry file for its hook (`useDialog`, ...). If registry files imported
 * the modules, any component would be an entry into every module, and which
 * binding is initialised when would depend on import order. With the slot,
 * registry files import no module code at all.
 */
let installed: readonly ModuleDefinition[] | null = null;
let warned = false;

export const installModules = (definitions: readonly ModuleDefinition[]) => {
  installed = definitions;
};

export const installedModules = (): readonly ModuleDefinition[] => {
  if (!installed) {
    if (!warned && typeof console !== "undefined") {
      warned = true;
      console.warn("[modules] read before app/modules/install ran; no module builtins are available");
    }
    return [];
  }
  return installed;
};
