import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { FilterClear, FilterPicker, FilterSearchField, FilterTrigger } from "@/core/ui/filter-bar";
import { parseAsString, parseAsStringLiteral, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { useDebounce } from "@uidotdev/usehooks";
import { ArrowUpDown, Group } from "lucide-react";
import { useMemo } from "react";
import { DeviceFilter, DeviceOrdering, Ordering, useDeviceFilterOptionsQuery } from "../../api/graphql";

export const DEVICE_SORTS = ["name", "name-desc", "newest"] as const;
export type DeviceSort = (typeof DEVICE_SORTS)[number];
const SORT_LABEL: Record<DeviceSort, string> = { name: "Name A–Z", "name-desc": "Name Z–A", newest: "Newest first" };
const SORT_ORDER: Record<DeviceSort, DeviceOrdering> = {
  name: { name: Ordering.Asc },
  "name-desc": { name: Ordering.Desc },
  newest: { id: Ordering.Desc },
};

/**
 * The device list's filters, in the URL so a narrowed list is a link. All of
 * them narrow on the server: the search as `search`, a group as `deviceGroup`.
 */
export const useDeviceFilters = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [group, setGroup] = useQueryState("group", parseAsString);
  const [sort, setSort] = useQueryState("sort", parseAsStringLiteral(DEVICE_SORTS).withDefault("name"));
  const debounced = useDebounce(search.trim(), 300);
  const { data } = useDeviceFilterOptionsQuery({ fetchPolicy: "cache-first" });
  const groups = data?.deviceGroups ?? [];

  const filters: DeviceFilter = useMemo(
    () => ({
      ...(debounced ? { search: debounced } : {}),
      ...(group ? { deviceGroup: group } : {}),
    }),
    [debounced, group],
  );
  const ordering = useMemo(() => [SORT_ORDER[sort]], [sort]);

  return {
    search,
    group,
    sort,
    groups,
    filters,
    ordering,
    active: !!(search.trim() || group),
    setSearch: (next: string) => setSearch(next || null),
    setGroup,
    setSort: (next: DeviceSort) => setSort(next === "name" ? null : next),
    clear: () => {
      setSearch(null);
      setGroup(null);
    },
  };
};

export type DeviceFilters = ReturnType<typeof useDeviceFilters>;

/**
 * The device list's filter row, the Mikro home's in shape: what it is called,
 * which group it is in, and the order. A filter that narrows is tinted.
 */
export const DeviceFilterRow = ({ filters }: { filters: DeviceFilters }) => {
  const { search, group, sort, groups, active, setSearch, setGroup, setSort, clear } = filters;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSearchField value={search} onChange={setSearch} placeholder="Search devices…" />
      <FilterPicker
        icon={Group}
        label="Group"
        value={group}
        onChange={setGroup}
        defaultLabel="Any group"
        options={groups.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
        searchable={groups.length > 8}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FilterTrigger active={sort !== "name"} icon={ArrowUpDown} aria-label="Sort">
            {SORT_LABEL[sort]}
          </FilterTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuRadioGroup value={sort} onValueChange={(next) => setSort(next as DeviceSort)}>
            {DEVICE_SORTS.map((value) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {SORT_LABEL[value]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {active && <FilterClear onClear={clear} />}
    </div>
  );
};
