import { parseAsString, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { useDebounce } from "@uidotdev/usehooks";
import { useMemo } from "react";

/**
 * The search a list page keeps: the field's text, held in the URL so a
 * narrowed list is shareable, and the `filters` it sends once typing settles.
 * The field itself is core's `CollapsibleSearch`, in the page actions.
 */
export const useListSearch = () => {
  const [search, setSearchParam] = useQueryState("search", parseAsString.withDefault(""));
  const debounced = useDebounce(search.trim(), 200);
  const filters = useMemo(() => (debounced ? { search: debounced } : undefined), [debounced]);
  // Only a term is written, so the unfiltered page keeps a clean URL.
  const setSearch = (value: string) => void setSearchParam(value || null);
  return { search, setSearch, filters, searching: debounced.length > 0 };
};
