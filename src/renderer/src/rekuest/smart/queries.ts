import {
  ActionOrder,
  AllPrimaryActionsQueryVariables,
  DemandKind,
  ImplementationOrder,
  OpenableBloksQueryVariables,
  Ordering,
  PortDemandInput,
  ShortcutOrder,
  ShortcutsQueryVariables,
} from "@/rekuest/api/graphql";

/**
 * The exact variables the menu's rekuest queries run with. The section hooks
 * and the prefetcher both build through here, never inline: the Apollo cache
 * entry is keyed on `filters` + `ordering` and read as an offset window
 * (`lib/arkitekt/builders/cachePolicies.ts`), so a prefetch is only found
 * later if the filters are deep-equal and the limit is not larger.
 *
 * Actions and shortcuts are ordered runnable first (`assignable`: an agent
 * that can take them is connected, kept by rekuest's database). That ordering
 * keeps the server's `search` ranking (substring first, then similarity) as
 * its tie-break, so a search still lists the best match first in each group.
 */

export const SMART_SHORTCUT_LIMIT = 12;
export const SMART_ACTION_LIMIT = 20;
export const SMART_IMPLEMENTATION_PAGE_SIZE = 12;
export const SMART_BLOK_LIMIT = 12;

export const ACTIVE_IMPLEMENTATION_ORDERING = [
  { active: Ordering.Desc },
] as unknown as ImplementationOrder[];

export const RUNNABLE_FIRST_ACTION_ORDERING: ActionOrder[] = [{ assignable: Ordering.Desc }];
/** What an admin pinned for the caller first, so the limit never cuts it; then what can run. */
export const RUNNABLE_FIRST_SHORTCUT_ORDERING: ShortcutOrder[] = [
  { pinned: Ordering.Desc },
  { assignable: Ordering.Desc },
];

export type SearchOptions = {
  search?: string;
  limit?: number;
  /**
   * The demands of the page's related contexts (its whole lens): one query
   * then asks for what matches the selection OR any of these (`anyDemands`),
   * and the menu routes each row back by its first arg.
   */
  alsoDemands?: readonly PortDemandInput[][];
};

const searchField = (search: string | undefined) =>
  search ? { search } : {};

/**
 * The demand sets one query asks for: the selection's, then each related
 * context's, with `only` applied. A set left empty is dropped: the server
 * refuses an empty inner set rather than read it as "anything".
 */
const demandSets = (
  demands: PortDemandInput[],
  also: readonly PortDemandInput[][] | undefined,
  only: (demands: PortDemandInput[]) => PortDemandInput[],
) => [demands, ...(also ?? [])].map(only).filter((set) => set.length > 0);

/**
 * The demands of a filter: the selection's alone, exactly as before (so its
 * cache entries do not move), or with related contexts `anyDemands` — the
 * sets are ORed in one indexed statement, and the filter's other fields
 * (search, collection, app) are its siblings, so they bind every set.
 */
const demandsField = (
  demands: PortDemandInput[],
  also: readonly PortDemandInput[][] | undefined,
  only: (demands: PortDemandInput[]) => PortDemandInput[] = (d) => d,
): { demands: PortDemandInput[] } | { anyDemands: PortDemandInput[][] } => {
  const sets = demandSets(demands, also, only);
  return sets.length > 1 ? { anyDemands: sets } : { demands: only(demands) };
};

/** One limit per set asked for, so the selection's rows cannot crowd the others out. */
const limitFor = (
  base: number,
  options: SearchOptions,
  demands: PortDemandInput[],
  only: (demands: PortDemandInput[]) => PortDemandInput[] = (d) => d,
) => options.limit ?? base * Math.max(1, demandSets(demands, options.alsoDemands, only).length);

export const shortcutsVariables = (
  demands: PortDemandInput[],
  options: SearchOptions = {},
): ShortcutsQueryVariables => ({
  filters: {
    ...demandsField(demands, options.alsoDemands),
    ...searchField(options.search),
  },
  ordering: RUNNABLE_FIRST_SHORTCUT_ORDERING,
  pagination: { limit: limitFor(SMART_SHORTCUT_LIMIT, options, demands) },
});

/**
 * `app` keeps only that app's actions, `exceptApp` drops them: a supervised
 * agent's supervisor actions are listed under Supervisor, so Run leaves them out.
 */
export type ActionScopeOptions = { collection?: string; app?: string; exceptApp?: string };

export const actionsVariables = (
  demands: PortDemandInput[],
  options: SearchOptions & ActionScopeOptions = {},
): AllPrimaryActionsQueryVariables => ({
  filters: {
    ...demandsField(demands, options.alsoDemands),
    ...searchField(options.search),
    ...(options.collection ? { inCollection: options.collection } : {}),
    ...(options.app ? { appIdentifier: options.app } : {}),
    ...(options.exceptApp ? { NOT: { appIdentifier: options.exceptApp } } : {}),
  },
  ordering: RUNNABLE_FIRST_ACTION_ORDERING,
  pagination: { limit: limitFor(SMART_ACTION_LIMIT, options, demands) },
});

/**
 * The bloks the selection opens in: their args, matched like an action's
 * (`requires` included). Only the args demands: a blok returns nothing, and the
 * server refuses a returns demand on one rather than answer it with nothing.
 */
const argsOnly = (demands: PortDemandInput[]) =>
  demands.filter((demand) => demand.kind === DemandKind.Args);

export const openableBloksVariables = (
  demands: PortDemandInput[],
  options: SearchOptions = {},
): OpenableBloksQueryVariables => ({
  filters: {
    ...demandsField(demands, options.alsoDemands, argsOnly),
    ...searchField(options.search),
  },
  pagination: { limit: limitFor(SMART_BLOK_LIMIT, options, demands, argsOnly) },
});
