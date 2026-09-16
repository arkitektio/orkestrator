import React, { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { createStore, type StoreApi } from "zustand/vanilla";

import { useDialog } from "@/app/dialog";
import { matchesFilter, scoreFilter } from "@/command/filter";
import type { PinsValue } from "@/command/PinsProvider";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";
import { smartRegistry } from "@/providers/smart/registry";
import type { Structure as AppStructure } from "@/types";
import type { InferedServiceMap, ServiceBuilderMap } from "../arkitekt/types";
import type { ServiceMap } from "../arkitekt/provider";
import { useNavigate } from "react-router-dom";

export type IdentifierActive = {
  type: "identifier";
  optional?: boolean;
  identifier: string;
};

export type MixtureActive = {
  type: "mixture";
  identifiers: string[];
};

export type PartnerIdentifierActive = {
  type: "pidentifier";
  identifier: string;
};

export type PartnerMixtureActive = {
  type: "pmixture";
  identifiers: string[];
};

export type ObjectHomogenous = {
  type: "homogenous";
};

export type PartnerHomogenous = {
  type: "phomogenous";
};

export type PartnerActive = {
  type: "partner";
  partner: string;
};

export type PartnerIsNull = {
  type: "nopartner";
};

export type HasPartner = {
  type: "haspartner";
};

export type OnRoute = {
  type: "onroute";
  route: string;
};

export type CommandSelect = {
  type: "command";
  command: boolean;
};

/**
 * At least one selected structure is a *datum* — something a scientist makes
 * claims about (see `SmartRegistry.isDatum`). The organization-scoped claims
 * (labelling, sameness) apply to every datum alike, so an action over them
 * would otherwise have to enumerate every datum identifier in the registry.
 */
export type DatumActive = {
  type: "datum";
};

/** The partner (right) side holds at least one datum. */
export type PartnerDatumActive = {
  type: "pdatum";
};

export type Condition =
  | IdentifierActive
  | PartnerActive
  | CommandSelect
  | PartnerIsNull
  | ObjectHomogenous
  | HasPartner
  | OnRoute
  | PartnerIdentifierActive
  | PartnerHomogenous
  | MixtureActive
  | PartnerMixtureActive
  | DatumActive
  | PartnerDatumActive;

export type Structure = AppStructure;

export type ActionState = {
  left: Structure[];
  right?: Structure[]; // Potentiall if there was a drag and drop on another group
  isCommand: boolean;
};

export type ResolveActionServices<TAppOrServices = ServiceMap> =
  TAppOrServices extends {
    useConnection: () => infer TConnection;
  }
    ? NonNullable<TConnection> extends { serviceMap: infer TServices }
      ? TServices
      : ServiceMap
    : TAppOrServices extends ServiceBuilderMap
      ? InferedServiceMap<TAppOrServices>
      : TAppOrServices extends Record<string, unknown>
        ? TAppOrServices
        : ServiceMap;

export type ActionParams<TAppOrServices = ServiceMap> = {
  state: ActionState;
  location: Location;
  services: ResolveActionServices<TAppOrServices>;
  onProgress: (progress: number) => void;
  abortSignal: AbortSignal;
  modifiers: {
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
  };
  confirm: (options: {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
  dialog: ReturnType<typeof useDialog>;
  navigate: ReturnType<typeof useNavigate>;
  /** The rail's pins — pinning something is what opens it as a new tab. */
  pins: Pick<PinsValue, "pin" | "canPin">;
};

export type SetAction = ActionState;

export type Action<TAppOrServices = ServiceMap> = {
  title: string;
  description: string;
  icon?: LucideIcon;
  pinned?: boolean;
  conditions: readonly Condition[];
  collections?: readonly string[];
  execute: (action: ActionParams<TAppOrServices>) => Promise<ActionState | void>;
};

export type ActionRegistry<TAppOrServices = ServiceMap> = Record<string, Action<TAppOrServices>>;

type ActionMetadata = Pick<
  Action,
  "title" | "description" | "icon" | "pinned" | "conditions" | "collections"
>;

type RegistryActionId<TRegistry extends Record<string, unknown>> = Extract<
  keyof TRegistry,
  string
>;

export type ActionEntry<
  TRegistry extends Record<string, ActionMetadata> = Record<string, ActionMetadata>,
> = {
  id: RegistryActionId<TRegistry>;
  action: TRegistry[RegistryActionId<TRegistry>];
};

const LOCAL_ACTION_PINS_STORAGE_KEY = "wasser-local-action-pins";

type LocalActionScopedStoreState = {
  registry: Record<string, unknown>;
  pinnedActionIds: string[];
  setPinnedActionIds: (ids: string[]) => void;
  togglePinnedAction: (id: string) => void;
  hydrate: () => void;
};

type LocalActionScopedStore = StoreApi<LocalActionScopedStoreState> & {
  cleanup: () => void;
};

type LocalActionScopedHooks = ReturnType<
  typeof createScopedStoreHooks<LocalActionScopedStoreState, LocalActionScopedStore>
>;

type LocalActionGlobalScope = typeof globalThis & {
  __orkestratorLocalActionStoreHooks?: LocalActionScopedHooks;
};

const globalLocalActionScope = globalThis as LocalActionGlobalScope;

if (!globalLocalActionScope.__orkestratorLocalActionStoreHooks) {
  globalLocalActionScope.__orkestratorLocalActionStoreHooks =
    createScopedStoreHooks<LocalActionScopedStoreState, LocalActionScopedStore>(
      "LocalActionStore",
    );
}

const stableLocalActionStoreHooks =
  globalLocalActionScope.__orkestratorLocalActionStoreHooks;

const getRegistryEntries = <TRegistry extends Record<string, ActionMetadata>>(
  registry: TRegistry,
): ActionEntry<TRegistry>[] => {
  return Object.entries(registry).map(([id, action]) => ({
    id: id as RegistryActionId<TRegistry>,
    action: action as TRegistry[RegistryActionId<TRegistry>],
  }));
};

const getDeclaredPinnedActionIds = <TRegistry extends Record<string, ActionMetadata>>(
  registry: TRegistry,
): RegistryActionId<TRegistry>[] => {
  return getRegistryEntries(registry)
    .filter((entry) => entry.action.pinned)
    .map((entry) => entry.id);
};

const matchesConditionsForState = (
  conditions: readonly Condition[],
  state: ActionState,
) => {
  return conditions.every((condition) => {
      if (condition.type === "identifier") {
        return state.left.some(
          (structure) => structure.identifier === condition.identifier,
        );
      }
      if (condition.type === "homogenous") {
        const identifier = state.left.at(0)?.identifier;
        if (!identifier) {
          return true;
        }
        return state.left.every(
          (structure) => structure.identifier === identifier,
        );
      }
      if (condition.type === "pidentifier") {
        return state.right?.some(
          (structure) => structure.identifier === condition.identifier,
        );
      }
      if (condition.type === "mixture") {
        return condition.identifiers.some((id) =>
          state.left.some((structure) => structure.identifier === id),
        );
      }
      if (condition.type === "pmixture") {
        return condition.identifiers.some((id) =>
          state.right?.some((structure) => structure.identifier === id),
        );
      }

      if (condition.type === "phomogenous") {
        const identifier = state.right?.at(0)?.identifier;
        if (!identifier) {
          return true;
        }
        return state.right?.every(
          (structure) => structure.identifier === identifier,
        );
      }

      if (condition.type === "nopartner") {
        return !state.right || state.right.length === 0;
      }
      if (condition.type === "haspartner") {
        return state.right && state.right?.length > 0;
      }
      if (condition.type === "partner") {
        return state.right?.some(
          (structure) => structure.identifier === condition.partner,
        );
      }
      if (condition.type === "onroute") {
        return window.location.pathname.includes(condition.route);
      }

      if (condition.type === "command") {
        return state.isCommand === condition.command;
      }
      // `some`, like `identifier` / `pidentifier`: an action's `execute` is
      // where "exactly one on each side" gets enforced.
      if (condition.type === "datum") {
        return state.left.some((structure) =>
          smartRegistry.isDatum(structure.identifier),
        );
      }
      if (condition.type === "pdatum") {
        return !!state.right?.some((structure) =>
          smartRegistry.isDatum(structure.identifier),
        );
      }
      return false;
  });
};

export const getActionsForState = <TAppOrServices = ServiceMap>(
  registry: ActionRegistry<TAppOrServices>,
  state: ActionState,
): Action<TAppOrServices>[] => {
  return Object.values(registry).filter((action) =>
    matchesConditionsForState(action.conditions, state),
  );
};

export const getActionEntriesForState = <TRegistry extends Record<string, ActionMetadata>>(
  registry: TRegistry,
  state: ActionState,
): ActionEntry<TRegistry>[] => {
  return getRegistryEntries(registry).filter((entry) =>
    matchesConditionsForState(entry.action.conditions, state),
  );
};

/** The palette's matcher, so local actions are found the way pages are. */
const matchesActionSearch = <TAppOrServices = ServiceMap>(
  action: Action<TAppOrServices>,
  search?: string,
) => matchesFilter([action.title, action.description], search);

/**
 * The order the palette shows actions in: pinned first, then how well each
 * fits what was typed, then by name. With nothing typed every fit is equal, so
 * it is pinned-then-alphabetical, as before.
 */
export const orderActionEntries = <
  TEntry extends { id: string; action: { title: string; description: string } },
>(
  entries: readonly TEntry[],
  pinnedActionIds: readonly string[],
  search?: string,
): TEntry[] => {
  const pinned = new Set(pinnedActionIds);
  const scores = new Map(
    entries.map((e) => [e.id, scoreFilter([e.action.title, e.action.description], search)]),
  );
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const ap = pinned.has(a.entry.id);
      const bp = pinned.has(b.entry.id);
      if (ap !== bp) return ap ? -1 : 1;
      const byScore = (scores.get(b.entry.id) ?? 0) - (scores.get(a.entry.id) ?? 0);
      if (byScore !== 0) return byScore;
      return a.entry.action.title.localeCompare(b.entry.action.title) || a.index - b.index;
    })
    .map(({ entry }) => entry);
};

export const  createLocalActionProvider = <TAppOrServices = ServiceMap, TRegistry extends Record<string, Action<TAppOrServices>> = Record<string,Action<TAppOrServices>>>(registry: TRegistry) => {
  type LocalActionId = RegistryActionId<TRegistry>;
  type LocalActionStoreState = {
    registry: TRegistry;
    pinnedActionIds: string[];
    setPinnedActionIds: (ids: string[]) => void;
    togglePinnedAction: (id: string) => void;
    hydrate: () => void;
  };
  type LocalActionStore = StoreApi<LocalActionStoreState> & {
    cleanup: () => void;
  };

  const LocalActionContext = stableLocalActionStoreHooks.StoreContext as React.Context<
    LocalActionStore | null
  >;

  const useLocalActions = <TSelected,>(
    selector: (state: LocalActionStoreState) => TSelected,
  ) => {
    return stableLocalActionStoreHooks.useScopedStore((state) =>
      selector(state as LocalActionStoreState),
    );
  };

  const normalizePinnedActionIds = (value: unknown): LocalActionId[] => {
    const persistedPinnedActionIds = Array.isArray(value)
      ? value.filter(
          (item): item is LocalActionId =>
            typeof item === "string" && item in registry,
        )
      : [];

    return Array.from(
      new Set([...declaredPinnedActionIds, ...persistedPinnedActionIds]),
    );
  };

  const declaredPinnedActionIds = getDeclaredPinnedActionIds(registry);

  const persistPinnedActionIds = (pinnedActionIds: LocalActionId[]) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      LOCAL_ACTION_PINS_STORAGE_KEY,
      JSON.stringify(pinnedActionIds),
    );
  };

  const createLocalActionStore = (): LocalActionStore => {
    const store = createStore<LocalActionStoreState>((set) => ({
      registry,
      pinnedActionIds: declaredPinnedActionIds,
      setPinnedActionIds: (ids) => {
        const pinnedActionIds = normalizePinnedActionIds(ids);
        persistPinnedActionIds(pinnedActionIds);
        set({ pinnedActionIds });
      },
      togglePinnedAction: (id) => {
        const pinnedActionIds = store.getState().pinnedActionIds.includes(id)
          ? store.getState().pinnedActionIds.filter((pinnedId) => pinnedId !== id)
          : [...store.getState().pinnedActionIds, id];

        const normalizedPinnedActionIds = normalizePinnedActionIds(pinnedActionIds);
        persistPinnedActionIds(normalizedPinnedActionIds);
        set({ pinnedActionIds: normalizedPinnedActionIds });
      },
      hydrate: () => {
        if (typeof window === "undefined") {
          return;
        }

        try {
          const serializedPinnedActionIds = window.localStorage.getItem(
            LOCAL_ACTION_PINS_STORAGE_KEY,
          );

          if (!serializedPinnedActionIds) {
            set({ pinnedActionIds: declaredPinnedActionIds });
            return;
          }

          set({
            pinnedActionIds: normalizePinnedActionIds(
              JSON.parse(serializedPinnedActionIds),
            ),
          });
        } catch (error) {
          console.error("Failed to hydrate pinned local actions", error);
        }
      },
    }));

    const extendedStore = store as LocalActionStore;
    extendedStore.cleanup = () => {
      return;
    };

    return extendedStore;
  };

  const useLocalActionEntries = (): ActionEntry<TRegistry>[] => {
    const actionRegistry = useLocalActions((state) => state.registry);
    return getRegistryEntries(actionRegistry);
  };

  const useMatchingActionEntries = (options: {
    state: ActionState;
    search?: string;
  }): ActionEntry<TRegistry>[] => {
    const actionRegistry = useLocalActions((state) => state.registry);

    return getActionEntriesForState(actionRegistry, options.state).filter((entry) =>
      matchesActionSearch(entry.action, options.search),
    );
  };

  const useMatchingActions = (options: {
    state: ActionState;
    search?: string;
  }) => {
    return useMatchingActionEntries(options).map((entry) => entry.action);
  };

  const usePinnedActionIds = () =>
    useLocalActions((state) => state.pinnedActionIds as LocalActionId[]);

  const usePinnedMatchingActionEntries = (options: {
    state: ActionState;
    search?: string;
  }): ActionEntry<TRegistry>[] => {
    const pinnedActionIds = usePinnedActionIds();

    return useMatchingActionEntries(options).filter((entry) =>
      pinnedActionIds.includes(entry.id),
    );
  };

  const useUnpinnedMatchingActionEntries = (options: {
    state: ActionState;
    search?: string;
  }): ActionEntry<TRegistry>[] => {
    const pinnedActionIds = usePinnedActionIds();

    return useMatchingActionEntries(options).filter(
      (entry) => !pinnedActionIds.includes(entry.id),
    );
  };

  const useTogglePinnedAction = () =>
    useLocalActions((state) => state.togglePinnedAction);

  const useSetPinnedActionIds = () =>
    useLocalActions((state) => state.setPinnedActionIds);

  const useAction = <T extends LocalActionId>(identifier: T): TRegistry[T] => {
    return useLocalActions((state) => state.registry[identifier]);
  };

  const LocalActionProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    const [store] = useState<LocalActionStore>(() => createLocalActionStore());

    useEffect(() => {
      store.getState().hydrate();

      return () => {
        store.cleanup();
      };
    }, [store]);

    return (
      <LocalActionContext.Provider value={store}>
        {children}
      </LocalActionContext.Provider>
    );
  };

  return {
    LocalActionProvider,
    useAction,
    useLocalActionEntries,
    useMatchingActions,
    useMatchingActionEntries,
    usePinnedActionIds,
    usePinnedMatchingActionEntries,
    useSetPinnedActionIds,
    useTogglePinnedAction,
    useUnpinnedMatchingActionEntries,
    registry,
  };
}
