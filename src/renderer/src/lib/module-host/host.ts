import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { validateManifest, type ManifestIssue } from "@/lib/module-spec";
import type { ModuleBuiltins, ModuleDefinition } from "./define";

/**
 * The modules the app is running with, as a live store.
 *
 * Modules come and go: first-party ones are registered by the app's entry
 * (`app/modules/install`), and later a module can arrive from the hub or be
 * switched off. Registering returns the function that unregisters it. Every
 * host registry (`app/modules/registries`) is derived from this store and
 * rebuilt when its `version` moves; components that list modules subscribe
 * with `useModuleHostVersion`.
 *
 * Why a store instead of imports: nearly every module component imports a
 * registry file for its hook (`useDialog`, ...). If registry files imported
 * the modules, any component would be an entry into every module, and which
 * binding is initialised when would depend on import order. Registry files
 * import no module code; they read this.
 */
type ModuleHostState = {
  modules: readonly ModuleDefinition[];
  /** Bumped on every change; derived registries rebuild when it moves. */
  version: number;
};

const store = createStore<ModuleHostState>(() => ({ modules: [], version: 0 }));

export type RegisterResult =
  | { ok: true; unregister: () => void }
  | { ok: false; issues: ManifestIssue[] };

/** Every key a module's builtins claim, per kind: two modules may not share one. */
const claims = (builtins: ModuleBuiltins): Record<string, string[]> => ({
  dialog: Object.keys(builtins.dialogs ?? {}),
  action: Object.keys(builtins.actions ?? {}),
  display: Object.keys(builtins.displays ?? {}),
  hover: Object.keys(builtins.hovers ?? {}),
  "file downloader": Object.keys(builtins.fileDownloaders ?? {}),
  "task hook": (builtins.taskHooks ?? []).map((hook) => hook.type),
  "page section": (builtins.pageSections ?? []).map((section) => section.id),
  "menu section": (builtins.sections ?? []).map((section) => section.id),
  "profile section": (builtins.profileSections ?? []).map((section) => section.id),
});

/** Why `definition` cannot join `installed`, if anything. */
export const registrationIssues = (
  definition: ModuleDefinition,
  installed: readonly ModuleDefinition[],
): ManifestIssue[] => {
  const validation = validateManifest(definition.manifest);
  if (!validation.ok) return validation.issues;

  const { namespace } = definition.manifest;
  const issues: ManifestIssue[] = [];
  if (installed.some((other) => other.manifest.namespace === namespace)) {
    issues.push({ path: "namespace", message: `namespace ${namespace} is already registered` });
  }

  const mine = claims(definition.builtins);
  for (const other of installed) {
    const theirs = claims(other.builtins);
    for (const [kind, keys] of Object.entries(mine)) {
      for (const key of keys) {
        if (theirs[kind]?.includes(key)) {
          issues.push({
            path: `builtins.${kind}`,
            message: `${kind} "${key}" is already claimed by ${other.manifest.namespace}`,
          });
        }
      }
    }
  }
  return issues;
};

/**
 * Adds a module. Refused (nothing changes) when its manifest is invalid, its
 * namespace is taken, or a builtin key clashes with an installed module's.
 */
export const registerModule = (definition: ModuleDefinition): RegisterResult => {
  const { modules } = store.getState();
  const issues = registrationIssues(definition, modules);
  if (issues.length) return { ok: false, issues };

  store.setState((state) => ({ modules: [...state.modules, definition], version: state.version + 1 }));

  let registered = true;
  return {
    ok: true,
    unregister: () => {
      if (!registered) return;
      registered = false;
      store.setState((state) => ({
        modules: state.modules.filter((module) => module !== definition),
        version: state.version + 1,
      }));
    },
  };
};

/**
 * Registers modules that must work (the first-party set): a refusal here is
 * a bug in the app, so it throws with every issue rather than running
 * without the module.
 */
export const registerModules = (definitions: readonly ModuleDefinition[]): (() => void) => {
  const unregisters = definitions.map((definition) => {
    const result = registerModule(definition);
    if (!result.ok) {
      const detail = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
      throw new Error(`Module ${definition.manifest.namespace} was refused: ${detail}`);
    }
    return result.unregister;
  });
  return () => unregisters.forEach((unregister) => unregister());
};

export const installedModules = (): readonly ModuleDefinition[] => store.getState().modules;

export const moduleHostVersion = (): number => store.getState().version;

export const subscribeModuleHost = (listener: () => void) => store.subscribe(listener);

/** Re-renders when a module is registered or unregistered. */
export const useModuleHostVersion = (): number => useStore(store, (state) => state.version);

/** Test support: back to no modules. */
export const resetModuleHost = () => store.setState({ modules: [], version: 0 });
