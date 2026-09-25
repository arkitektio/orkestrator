import React, { type ComponentType, type ReactNode } from "react";

import { Arkitekt } from "@/app/Arkitekt";
import type { DisplayWidgetProps } from "@/lib/display/registry";
import type { FileDownloader } from "@/lib/export/fileDownloaders";
import type { Action } from "@/lib/localactions/LocalActionProvider";
import type { ModuleBuiltins, ModuleDefinition, PageSection } from "@/lib/module-host/define";
import { installedModules } from "@/lib/module-host/installed";
import { lazyRecord, lazyValue } from "@/lib/module-host/lazy";
import type { ProfileSection } from "@/lib/profile/section";
import type { TaskHook } from "@/lib/taskhooks/types";
import type { SmartContextSection } from "@/providers/smart/extensions/section";
import type { ModuleDialogs } from "./dialogTypes";
import type { ModuleActions } from "./install";
import { MODULES, SELF_MODULE } from "./index";

/**
 * The host registries, derived from the installed modules' builtins.
 *
 * A LEAF: imports no module code. The modules are installed by the app's
 * entry (`./install`) and read from `lib/module-host/installed`; every
 * registry below resolves on first use (`lazyRecord` / `lazyValue`), never
 * while files are being evaluated.
 */
/** The installed modules (see `lib/module-host/installed`). */
export const moduleDefinitions = installedModules;

const namespaceOf = (definition: ModuleDefinition) => definition.manifest.namespace;

/**
 * Merges one builtin map across modules. Two modules claiming the same key
 * is a bug (the second would silently win), so it throws.
 */
const mergeRecords = <V,>(
  pick: (builtins: ModuleBuiltins) => Record<string, V> | undefined,
  what: string,
): Record<string, V> => {
  const merged: Record<string, V> = {};
  const owner: Record<string, string> = {};
  for (const definition of moduleDefinitions() as readonly ModuleDefinition[]) {
    for (const [key, value] of Object.entries(pick(definition.builtins) ?? {})) {
      if (key in merged) {
        throw new Error(`${what} "${key}" is claimed by ${owner[key]} and ${namespaceOf(definition)}`);
      }
      merged[key] = value;
      owner[key] = namespaceOf(definition);
    }
  }
  return merged;
};

const concat = <V,>(pick: (builtins: ModuleBuiltins) => readonly V[] | undefined): V[] =>
  (moduleDefinitions() as readonly ModuleDefinition[]).flatMap((definition) => [
    ...(pick(definition.builtins) ?? []),
  ]);

// --- guards -----------------------------------------------------------------

type GuardComponent = ComponentType<{ children: ReactNode }>;

const SILENT = { unavailable: <></>, unconfigured: <></>, configuring: <></>, challenging: <></> };

/**
 * The guard for one module (CLAUDE.md §1), silent in every not-ready state.
 * Lok is the session's own service, so its guard is the session's.
 */
const guards = lazyValue(() => {
  const byNamespace: Record<string, GuardComponent> = {};
  for (const { manifest, service } of MODULES) {
    const ServiceGuard = Arkitekt.buildServiceGuard(service.key as never);
    const Guard = ({ children }: { children: ReactNode }) => <ServiceGuard {...SILENT}>{children}</ServiceGuard>;
    Guard.displayName = `Guard(${manifest.namespace})`;
    byNamespace[manifest.namespace] = Guard;
  }
  const SelfGuard = ({ children }: { children: ReactNode }) => (
    <Arkitekt.Guard notConnectedFallback={<></>} connectingFallback={<></>}>
      {children}
    </Arkitekt.Guard>
  );
  byNamespace[SELF_MODULE.namespace] = SelfGuard;
  return byNamespace;
});

export const moduleGuard = (namespace: string): GuardComponent => {
  const guard = guards()[namespace];
  if (!guard) throw new Error(`No module ${namespace}`);
  return guard;
};

/** `Component`, mounted only once its module's service is ready. */
const guarded = <P extends object>(namespace: string, Component: ComponentType<P>): ComponentType<P> => {
  const Guarded = (props: P) => {
    const Guard = moduleGuard(namespace);
    return (
      <Guard>
        <Component {...props} />
      </Guard>
    );
  };
  Guarded.displayName = `Guarded(${Component.displayName ?? Component.name ?? namespace})`;
  return Guarded;
};

// --- registries ---------------------------------------------------------------


export const MODULE_DIALOGS = lazyRecord(
  () => mergeRecords((builtins) => builtins.dialogs, "Dialog") as ModuleDialogs,
);

export const MODULE_ACTIONS = lazyRecord(
  () => mergeRecords((builtins) => builtins.actions, "Action") as ModuleActions & Record<string, Action<any>>,
);

/** Displays, each behind its module's guard: a display runs its module's queries. */
export const MODULE_DISPLAYS = lazyRecord(() => {
  const displays: Record<string, ComponentType<DisplayWidgetProps>> = {};
  for (const definition of moduleDefinitions() as readonly ModuleDefinition[]) {
    for (const [identifier, Display] of Object.entries(definition.builtins.displays ?? {})) {
      displays[identifier] = guarded(namespaceOf(definition), Display);
    }
  }
  return displays;
});

export type HoverCardEntry = {
  Component: ComponentType<{ object: any }>;
  Guard: GuardComponent;
};

export const MODULE_HOVERS = lazyRecord(() => {
  const hovers: Record<string, HoverCardEntry> = {};
  for (const definition of moduleDefinitions() as readonly ModuleDefinition[]) {
    for (const [identifier, Component] of Object.entries(definition.builtins.hovers ?? {})) {
      hovers[identifier] = { Component, Guard: moduleGuard(namespaceOf(definition)) };
    }
  }
  return hovers;
});

export const moduleSections = lazyValue(
  (): SmartContextSection<any>[] => concat((builtins) => builtins.sections),
);

export const moduleProfileSections = lazyValue(
  (): ProfileSection[] => concat((builtins) => builtins.profileSections),
);

export const moduleTaskHooks = lazyValue((): TaskHook[] => concat((builtins) => builtins.taskHooks));

export const FILE_DOWNLOADERS = lazyRecord(
  (): Record<string, FileDownloader> =>
    mergeRecords((builtins) => builtins.fileDownloaders, "File downloader"),
);

export type HostPageSection = PageSection & { namespace: string };

/** Every module's page sections, each Component behind its module's guard. */
export const modulePageSections = lazyValue((): HostPageSection[] =>
  (moduleDefinitions() as readonly ModuleDefinition[]).flatMap((definition) =>
    (definition.builtins.pageSections ?? []).map((section) => ({
      ...section,
      namespace: namespaceOf(definition),
      Component: guarded(namespaceOf(definition), section.Component),
    })),
  ),
);

/** The sections that apply to a page of `identifier`, in module order. */
export const pageSectionsFor = (
  identifier: string,
  where: { placement?: PageSection["placement"]; slot?: PageSection["slot"] | null },
  isDatum: boolean,
): HostPageSection[] =>
  modulePageSections().filter((section) => {
    if (where.placement && section.placement !== where.placement) return false;
    if (where.slot !== undefined && (section.slot ?? null) !== where.slot) return false;
    const { identifiers, datum } = section.match;
    const byIdentifier = !!identifiers?.includes(identifier);
    const byDatum = !!datum && isDatum;
    const everywhere = !identifiers?.length && !datum;
    return everywhere || byIdentifier || byDatum;
  });

export type ModuleSearch = {
  namespace: string;
  Guard: GuardComponent;
  Search: NonNullable<ModuleBuiltins["search"]>;
};

export const moduleSearches = lazyValue((): ModuleSearch[] =>
  (moduleDefinitions() as readonly ModuleDefinition[]).flatMap((definition) =>
    definition.builtins.search
      ? [{ namespace: namespaceOf(definition), Guard: moduleGuard(namespaceOf(definition)), Search: definition.builtins.search }]
      : [],
  ),
);

/** Each module's routes, one lazy chunk per module, by namespace. */
export const modulePages = lazyValue(() =>
  (moduleDefinitions() as readonly ModuleDefinition[]).map((definition) => ({
    namespace: namespaceOf(definition),
    Page: React.lazy(definition.builtins.page),
  })),
);

export const moduleNavLoaders = lazyValue(() =>
  Object.fromEntries(
    (moduleDefinitions() as readonly ModuleDefinition[]).flatMap((definition) =>
      definition.builtins.nav ? [[namespaceOf(definition), definition.builtins.nav] as const] : [],
    ),
  ),
);

/**
 * Every module's always-on components (updaters, dashboard widget
 * registrars), each module's behind its guard.
 */
export const ModuleBackground = () => (
  <>
    {(moduleDefinitions() as readonly ModuleDefinition[]).map((definition) => {
      const background = definition.builtins.background;
      if (!background?.length) return null;
      const Guard = moduleGuard(namespaceOf(definition));
      return (
        <Guard key={namespaceOf(definition)}>
          {background.map((Component, index) => (
            <Component key={index} />
          ))}
        </Guard>
      );
    })}
  </>
);
