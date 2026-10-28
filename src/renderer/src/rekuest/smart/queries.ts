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

export type SearchOptions = { search?: string; limit?: number };

const searchField = (search: string | undefined) =>
  search ? { search } : {};

export const shortcutsVariables = (
  demands: PortDemandInput[],
  options: SearchOptions = {},
): ShortcutsQueryVariables => ({
  filters: { demands, ...searchField(options.search) },
  ordering: RUNNABLE_FIRST_SHORTCUT_ORDERING,
  pagination: { limit: options.limit ?? SMART_SHORTCUT_LIMIT },
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
    demands,
    ...searchField(options.search),
    ...(options.collection ? { inCollection: options.collection } : {}),
    ...(options.app ? { appIdentifier: options.app } : {}),
    ...(options.exceptApp ? { NOT: { appIdentifier: options.exceptApp } } : {}),
  },
  ordering: RUNNABLE_FIRST_ACTION_ORDERING,
  pagination: { limit: options.limit ?? SMART_ACTION_LIMIT },
});

/**
 * The bloks the selection opens in: their args, matched like an action's
 * (`requires` included). Only the args demands: a blok returns nothing, and the
 * server refuses a returns demand on one rather than answer it with nothing.
 */
export const openableBloksVariables = (
  demands: PortDemandInput[],
  options: SearchOptions = {},
): OpenableBloksQueryVariables => ({
  filters: { demands: demands.filter((demand) => demand.kind === DemandKind.Args), ...searchField(options.search) },
  pagination: { limit: options.limit ?? SMART_BLOK_LIMIT },
});
