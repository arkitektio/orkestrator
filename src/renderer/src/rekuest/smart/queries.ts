import {
  ActionOrder,
  AllPrimaryActionsQueryVariables,
  ImplementationOrder,
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

export const ACTIVE_IMPLEMENTATION_ORDERING = [
  { active: Ordering.Desc },
] as unknown as ImplementationOrder[];

export const RUNNABLE_FIRST_ACTION_ORDERING: ActionOrder[] = [{ assignable: Ordering.Desc }];
export const RUNNABLE_FIRST_SHORTCUT_ORDERING: ShortcutOrder[] = [{ assignable: Ordering.Desc }];

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

export const actionsVariables = (
  demands: PortDemandInput[],
  options: SearchOptions & { collection?: string } = {},
): AllPrimaryActionsQueryVariables => ({
  filters: {
    demands,
    ...searchField(options.search),
    ...(options.collection ? { inCollection: options.collection } : {}),
  },
  ordering: RUNNABLE_FIRST_ACTION_ORDERING,
  pagination: { limit: options.limit ?? SMART_ACTION_LIMIT },
});
