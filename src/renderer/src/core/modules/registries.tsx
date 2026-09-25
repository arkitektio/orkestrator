import React, { type ComponentType, type ReactNode } from "react";

import { Arkitekt, serviceGuard } from "@/core/lib/arkitekt/host";
import type { DisplayWidgetProps } from "@/core/lib/display/registry";
import type { FileDownloader } from "@/core/lib/export/fileDownloaders";
import type { Action } from "@/core/lib/localactions/LocalActionProvider";
import type {
  ModuleBuiltins,
  ModuleDefinition,
  PageSection,
  PaletteHitActionProps,
} from "@/core/lib/module-host/define";
import type { PassDownProps } from "@/core/providers/smart/extensions/types";
import { installedModules, useModuleHostVersion } from "@/core/lib/module-host/host";
import { derived, derivedRecord } from "@/core/lib/module-host/lazy";
import type { ProfileSection } from "@/core/lib/profile/section";
import type { TaskHook } from "@/core/lib/taskhooks/types";
import type { SmartContextSection } from "@/core/providers/smart/extensions/section";
import type { DialogRegistry } from "./types";

/**
 * The host registries, derived from the registered modules' builtins.
 *
 * A LEAF: imports no module code. Modules are registered into the module
 * host (`lib/module-host/host`) — first-party ones by `./install`, others as
 * they arrive — and every registry below is derived from it on use and
 * rebuilt when a module comes or goes (`derived` / `derivedRecord`).
 */
export const moduleDefinitions = installedModules;

/** Whether `segment` (a route's first path segment) is an installed module's namespace. */
export const isInstalledModule = (segment?: string): boolean =>
  !!segment && (installedModules() as readonly ModuleDefinition[]).some((d) => d.manifest.namespace === segment);

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

const NoService: GuardComponent = ({ fallback }) => <>{fallback ?? null}</>;

/**
 * The guard for one module (CLAUDE.md §1), silent in every not-ready state
 * unless given a `fallback`. The key comes from the module's definition
 * (`serviceKey`); "self" is the session's own service (lok). A module that is
 * not installed renders nothing: its builtins would query a client that does
 * not exist.
 */
const buildModuleGuard = (namespace: string): GuardComponent => {
  const definition = (moduleDefinitions() as readonly ModuleDefinition[]).find(
    (candidate) => namespaceOf(candidate) === namespace,
  );
  if (!definition) return NoService;
  if (definition.serviceKey === "self") {
    const SelfGuard: GuardComponent = ({ children, fallback = <></> }) => (
      <Arkitekt.Guard notConnectedFallback={fallback} connectingFallback={fallback}>
        {children}
      </Arkitekt.Guard>
    );
    return SelfGuard;
  }
  const ServiceGuard = serviceGuard(definition.serviceKey);
  const Guard: GuardComponent = ({ children, fallback }) => (
    <ServiceGuard {...notReady(fallback)}>{children}</ServiceGuard>
  );
  Guard.displayName = `Guard(${namespace})`;
  return Guard;
};

const guardCache: Record<string, GuardComponent> = {};

export const moduleGuard = (namespace: string): GuardComponent => {
  const cached = guardCache[namespace];
  if (cached) return cached;
  const guard = buildModuleGuard(namespace);
  // Not cached while the module is missing: it may register later.
  if (guard !== NoService) guardCache[namespace] = guard;
  return guard;
};

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
  () => mergeRecords((builtins) => builtins.dialogs, "Dialog") as DialogRegistry,
);

export const MODULE_ACTIONS = derivedRecord(
  () => mergeRecords((builtins) => builtins.actions, "Action") as Record<string, Action<any>>,
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

export const MODULE_OPERATIONS = derivedRecord(() =>
  mergeRecords((builtins) => builtins.operations, "Operation"),
);

export const moduleOptionSources = derived(() => concat((builtins) => builtins.optionSources));

/** The module that answers options for `identifier` (keyed by `by`), if any. */
export const findOptionSource = (identifier: string, by?: string) =>
  moduleOptionSources().find((source) => source.identifier === identifier && source.by === by);

/** Every module's palette pages, tagged with the module they belong to. */
export const moduleNavLinks = derived(() =>
  (moduleDefinitions() as readonly ModuleDefinition[]).flatMap((definition) =>
    (definition.builtins.navLinks ?? []).map((link) => ({ ...link, module: namespaceOf(definition) })),
  ),
);

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

/** Renders `pick`'s components from every module, each module's behind its guard. */
const PerModule = <P extends object>({
  pick,
  props,
}: {
  pick: (builtins: ModuleBuiltins) => readonly ComponentType<P>[] | undefined;
  props: P;
}) => {
  useModuleHostVersion();
  return (
    <>
      {(moduleDefinitions() as readonly ModuleDefinition[]).map((definition) => {
        const components = pick(definition.builtins);
        if (!components?.length) return null;
        const Guard = moduleGuard(namespaceOf(definition));
        return (
          <Guard key={namespaceOf(definition)}>
            {components.map((Component, index) => (
              <Component key={index} {...props} />
            ))}
          </Guard>
        );
      })}
    </>
  );
};

/** Every module's rows in the ⌘K palette (alpaka: "Ask an agent"). */
export const ModulePaletteSources = (props: PassDownProps) => (
  <PerModule pick={(builtins) => builtins.paletteSources} props={props} />
);

/** Every module's trailing action on a palette hit (alpaka: "Talk"). */
export const ModulePaletteHitActions = (props: PaletteHitActionProps) => (
  <PerModule pick={(builtins) => builtins.paletteHitActions} props={props} />
);

/** Every module's rail islands, each module's behind its guard. */
export const ModuleRailIslands = () => {
  useModuleHostVersion();
  return (
    <>
      {(moduleDefinitions() as readonly ModuleDefinition[]).map((definition) => {
        const islands = definition.builtins.railIslands;
        if (!islands?.length) return null;
        const Guard = moduleGuard(namespaceOf(definition));
        return (
          <Guard key={namespaceOf(definition)}>
            {islands.map((Island, index) => (
              <Island key={index} />
            ))}
          </Guard>
        );
      })}
    </>
  );
};

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
