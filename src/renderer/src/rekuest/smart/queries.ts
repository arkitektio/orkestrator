import {
  ActionDemandInput,
  AllPrimaryActionsQueryVariables,
  ImplementationOrder,
  ImplementationsQueryVariables,
  Ordering,
  PortDemandInput,
  ShortcutsQueryVariables,
} from "@/rekuest/api/graphql";

/**
 * The exact variables the menu's rekuest queries run with. The section hooks
 * and the prefetcher both build through here, never inline: the Apollo cache
 * entry is keyed on `filters` + `ordering` and read as an offset window
 * (`lib/arkitekt/builders/cachePolicies.ts`), so a prefetch is only found
 * later if the filters are deep-equal and the limit is not larger.
 *
 * No `ordering` for actions and shortcuts: the server ranks a `search`
 * (substring first, then similarity) and an ordering would replace that.
 */

export const SMART_SHORTCUT_LIMIT = 12;
export const SMART_ACTION_LIMIT = 20;
export const SMART_IMPLEMENTATION_PAGE_SIZE = 12;

export const ACTIVE_IMPLEMENTATION_ORDERING = [
  { active: Ordering.Desc },
] as unknown as ImplementationOrder[];

export type SearchOptions = { search?: string; limit?: number };

const searchField = (search: string | undefined) =>
  search ? { search } : {};

export const shortcutsVariables = (
  demands: PortDemandInput[],
  options: SearchOptions = {},
): ShortcutsQueryVariables => ({
  filters: { demands, ...searchField(options.search) },
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
  pagination: { limit: options.limit ?? SMART_ACTION_LIMIT },
});

export const implementationsVariables = (
  actionDemand: ActionDemandInput,
  options: SearchOptions = {},
): ImplementationsQueryVariables => ({
  filters: { actionDemand, ...searchField(options.search) },
  ordering: ACTIVE_IMPLEMENTATION_ORDERING,
  pagination: { limit: options.limit ?? SMART_IMPLEMENTATION_PAGE_SIZE },
});
