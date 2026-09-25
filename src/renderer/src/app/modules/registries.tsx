import React, { type ComponentType, type ReactNode } from "react";

import { Arkitekt } from "@/app/Arkitekt";
import type { DisplayWidgetProps } from "@/lib/display/registry";
import type { FileDownloader } from "@/lib/export/fileDownloaders";
import type { Action } from "@/lib/localactions/LocalActionProvider";
import type { ModuleBuiltins, ModuleDefinition, PageSection } from "@/lib/module-host/define";
import { installedModules, useModuleHostVersion } from "@/lib/module-host/host";
import { derived, derivedRecord } from "@/lib/module-host/lazy";
import type { ProfileSection } from "@/lib/profile/section";
import type { TaskHook } from "@/lib/taskhooks/types";
import type { SmartContextSection } from "@/providers/smart/extensions/section";
import type { ModuleDialogs } from "./dialogTypes";
import type { ModuleActions } from "./install";
import { MODULES, SELF_MODULE } from "./index";

/**
 * The host registries, derived from the registered modules' builtins.
 *
 * A LEAF: imports no module code. Modules are registered into the module
 * host (`lib/module-host/host`) — first-party ones by `./install`, others as
 * they arrive — and every registry below is derived from it on use and
 * rebuilt when a module comes or goes (`derived` / `derivedRecord`).
 */
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

/** `fallback` is shown in every not-ready state; silent without one. */
type GuardComponent = ComponentType<{ children: ReactNode; fallback?: ReactNode }>;

const notReady = (fallback: ReactNode = <></>) => ({
  unavailable: fallback,
  unconfigured: fallback,
  configuring: fallback,
  challenging: fallback,
});

const SERVICE_KEYS: Record<string, string> = Object.fromEntries(
  MODULES.map(({ manifest, service }) => [manifest.namespace, service.key]),
);

const NoService: GuardComponent = ({ fallback }) => <>{fallback ?? null}</>;

/**
 * The guard for one module (CLAUDE.md §1), silent in every not-ready state.
 * Lok is the session's own service, so its guard is the session's. A module
 * the host has no service binding for yet renders nothing: its builtins
 * would query a client that does not exist.
 */
const buildGuard = (namespace: string): GuardComponent => {
  if (namespace === SELF_MODULE.namespace) {
    const SelfGuard: GuardComponent = ({ children, fallback = <></> }) => (
      <Arkitekt.Guard notConnectedFallback={fallback} connectingFallback={fallback}>
        {children}
      </Arkitekt.Guard>
    );
    return SelfGuard;
  }
  const key = SERVICE_KEYS[namespace];
  if (!key) return NoService;
  const ServiceGuard = Arkitekt.buildServiceGuard(key as never);
  const Guard: GuardComponent = ({ children, fallback }) => (
    <ServiceGuard {...notReady(fallback)}>{children}</ServiceGuard>
  );
  Guard.displayName = `Guard(${namespace})`;
  return Guard;
};

const guardCache: Record<string, GuardComponent> = {};

export const moduleGuard = (namespace: string): GuardComponent =>
  (guardCache[namespace] ??= buildGuard(namespace));

/** `Component`, mounted only once its module's service is ready. */
const guarded = <P extends object>(namespace: string, Component: ComponentType<P>): ComponentType<P> => {
  const Guarded = (props: P) => {
    const Guard = moduleGuard(namespace);
    // A display's `fallback` (see StructureDisplay) is shown while not ready.
    const fallback = (props as { fallback?: ReactNode }).fallback;
    return (
      <Guard fallback={fallback}>
        <Component {...props} />
      </Guard>
    );
  };
  Guarded.displayName = `Guarded(${Component.displayName ?? Component.name ?? namespace})`;
  return Guarded;
};

// --- registries ---------------------------------------------------------------


export const MODULE_DIALOGS = derivedRecord(
  () => mergeRecords((builtins) => builtins.dialogs, "Dialog") as ModuleDialogs,
);

export const MODULE_ACTIONS = derivedRecord(
  () => mergeRecords((builtins) => builtins.actions, "Action") as ModuleActions & Record<string, Action<any>>,
);

/** Displays, each behind its module's guard: a display runs its module's queries. */
export const MODULE_DISPLAYS = derivedRecord(() => {
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

export const MODULE_HOVERS = derivedRecord(() => {
  const hovers: Record<string, HoverCardEntry> = {};
  for (const definition of moduleDefinitions() as readonly ModuleDefinition[]) {
    for (const [identifier, Component] of Object.entries(definition.builtins.hovers ?? {})) {
      hovers[identifier] = { Component, Guard: moduleGuard(namespaceOf(definition)) };
    }
  }
  return hovers;
});

export const moduleSections = derived(
  (): SmartContextSection<any>[] => concat((builtins) => builtins.sections),
);

export const moduleMenuWrappers = derived(() => concat((builtins) => builtins.menuWrappers));

export const moduleOptionSources = derived(() => concat((builtins) => builtins.optionSources));

/** The module that answers options for `identifier` (keyed by `by`), if any. */
export const findOptionSource = (identifier: string, by?: string) =>
  moduleOptionSources().find((source) => source.identifier === identifier && source.by === by);

export const moduleProfileSections = derived(
  (): ProfileSection[] => concat((builtins) => builtins.profileSections),
);

export const moduleTaskHooks = derived((): TaskHook[] => concat((builtins) => builtins.taskHooks));

export const FILE_DOWNLOADERS = derivedRecord(
  (): Record<string, FileDownloader> =>
    mergeRecords((builtins) => builtins.fileDownloaders, "File downloader"),
);

export type HostPageSection = PageSection & { namespace: string };

/** Every module's page sections, each Component behind its module's guard. */
export const modulePageSections = derived((): HostPageSection[] =>
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

export const moduleSearches = derived((): ModuleSearch[] =>
  (moduleDefinitions() as readonly ModuleDefinition[]).flatMap((definition) =>
    definition.builtins.search
      ? [{ namespace: namespaceOf(definition), Guard: moduleGuard(namespaceOf(definition)), Search: definition.builtins.search }]
      : [],
  ),
);

const pageCache = new WeakMap<ModuleDefinition, React.LazyExoticComponent<ComponentType>>();

/**
 * Each module's routes, one lazy chunk per module, by namespace. Cached per
 * definition, so a module arriving or leaving does not remount the others.
 */
export const modulePages = derived(() =>
  (moduleDefinitions() as readonly ModuleDefinition[]).map((definition) => {
    let Page = pageCache.get(definition);
    if (!Page) {
      Page = React.lazy(definition.builtins.page);
      pageCache.set(definition, Page);
    }
    return { namespace: namespaceOf(definition), Page };
  }),
);

export const moduleNavLoaders = derived(() =>
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
export const ModuleBackground = () => {
  useModuleHostVersion();
  return (
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
};
