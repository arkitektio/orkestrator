import { DateTimeRangePicker } from "@/core/ui/date-time-range-picker";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { FilterClear, FilterSearchField, FilterTrigger } from "@/core/ui/filter-bar";
import {
  parseAsArrayOf,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { useDebounce } from "@uidotdev/usehooks";
import { ArrowUpDown, Shapes, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Ordering,
  TableDatasetFilter,
  TableDatasetOrder,
  TableDatasetSpec,
  useHomeFilterOptionsQuery,
} from "../../api/graphql";
import { TDATASET_SPECS } from "../../specs";
import { PeopleFilter } from "../home/HomeFilters";

const SPEC_SLUGS = TDATASET_SPECS.map((entry) => entry.slug) as [string, ...string[]];
const SPEC_BY_SLUG = Object.fromEntries(TDATASET_SPECS.map((entry) => [entry.slug, entry]));

export const TABLE_SORTS = ["newest", "oldest", "name"] as const;
export type TableSort = (typeof TABLE_SORTS)[number];
const SORT_LABEL: Record<TableSort, string> = { newest: "Newest first", oldest: "Oldest first", name: "Name A–Z" };
const SORT_ORDER: Record<TableSort, TableDatasetOrder> = {
  newest: { createdAt: Ordering.Desc },
  oldest: { createdAt: Ordering.Asc },
  name: { name: Ordering.Asc },
};

export type TableFilterState = {
  search: string;
  /** The creator's sub. */
  user: string | null;
  specs: TableDatasetSpec[];
  from: Date | null;
  to: Date | null;
};

/**
 * The row as `TableDatasetFilter`. A field is omitted, never sent as null,
 * when it does not narrow, so an untouched row asks exactly what the
 * unfiltered page asked.
 */
export const tableDatasetFilter = ({ search, user, specs, from, to }: TableFilterState): TableDatasetFilter => {
  const text = search.trim();
  return {
    ...(text ? { search: text } : {}),
    ...(user ? { owner: user } : {}),
    ...(specs.length ? { spec: specs } : {}),
    ...(from ? { createdAfter: from.toISOString() } : {}),
    ...(to ? { createdBefore: to.toISOString() } : {}),
  };
};

/**
 * The table list's filters, kept in the URL so a filtered list is a link, the
 * way the Mikro home keeps its own. Only what was changed is written.
 */
export const useTableDatasetFilters = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const debouncedSearch = useDebounce(search.trim(), 400);
  const [user, setUser] = useQueryState("user", parseAsString);
  const [from, setFrom] = useQueryState("from", parseAsIsoDateTime);
  const [to, setTo] = useQueryState("to", parseAsIsoDateTime);
  const [sort, setSort] = useQueryState("sort", parseAsStringLiteral(TABLE_SORTS).withDefault("newest"));
  const [specSlugs, setSpecSlugs] = useQueryState("spec", parseAsArrayOf(parseAsStringLiteral(SPEC_SLUGS)).withDefault([]));

  // Unknown slugs (a hand-edited URL) drop out rather than reaching the server.
  const specKey = specSlugs.join(",");
  const specs = useMemo(
    () => specSlugs.flatMap((slug) => SPEC_BY_SLUG[slug]?.spec ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [specKey],
  );
  const fromKey = from?.getTime();
  const toKey = to?.getTime();
  const filters = useMemo(
    () => tableDatasetFilter({ search: debouncedSearch, user, specs, from, to }),
    // The dates are compared by time: the URL parser hands out a fresh Date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, user, specs, fromKey, toKey],
  );
  const ordering = useMemo(() => [SORT_ORDER[sort]], [sort]);

  return {
    state: { search, user, specs, from, to } satisfies TableFilterState,
    filters,
    ordering,
    sort,
    specSlugs,
    // The typed text counts at once, so Clear shows while the search settles.
    active: Object.keys(filters).length > 0 || search.trim().length > 0,
    setSearch: (next: string) => setSearch(next || null),
    setUser,
    setSort: (next: TableSort) => setSort(next === "newest" ? null : next),
    setSpecSlugs: (next: string[]) => setSpecSlugs(next.length ? next : null),
    setRange: (next: { from?: Date; to?: Date }) => {
      setFrom(next.from ?? null);
      setTo(next.to ?? null);
    },
    clear: () => {
      setSearch(null);
      setUser(null);
      setFrom(null);
      setTo(null);
      setSpecSlugs(null);
    },
  };
};

export type TableDatasetFilters = ReturnType<typeof useTableDatasetFilters>;

/** What kind of table: one shape (how its rows are placed), any number of modifiers. */
const TableSpecFilter = ({ value, onChange }: { value: string[]; onChange: (slugs: string[]) => void }) => {
  const picked = TDATASET_SPECS.filter((entry) => value.includes(entry.slug));
  const shapes = TDATASET_SPECS.filter((entry) => entry.kind === "shape");
  const modifiers = TDATASET_SPECS.filter((entry) => entry.kind === "modifier");
  const shapeSlugs = new Set(shapes.map((entry) => entry.slug));

  const toggle = (slug: string, checked: boolean) => {
    if (!checked) return onChange(value.filter((entry) => entry !== slug));
    // Exactly one shape ever holds, so a second one would match nothing.
    const rest = shapeSlugs.has(slug) ? value.filter((entry) => !shapeSlugs.has(entry)) : value;
    onChange([...rest, slug]);
  };
  const item = (entry: (typeof TDATASET_SPECS)[number]) => (
    <DropdownMenuCheckboxItem
      key={entry.slug}
      checked={value.includes(entry.slug)}
      onCheckedChange={(checked) => toggle(entry.slug, checked)}
      onSelect={(event) => event.preventDefault()}
    >
      <entry.icon className="h-3.5 w-3.5 text-muted-foreground" />
      {entry.label}
    </DropdownMenuCheckboxItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FilterTrigger active={picked.length > 0} icon={Shapes} aria-label="Kind">
          <span className="max-w-48 truncate">
            {picked.length ? picked.map((entry) => entry.label).join(" · ") : "Any kind"}
          </span>
        </FilterTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Rows are (pick one)</DropdownMenuLabel>
        {shapes.map(item)}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>And</DropdownMenuLabel>
        {modifiers.map(item)}
        {picked.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              <X className="h-3.5 w-3.5" />
              Any kind
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** The order: tinted once it is not the default. */
const SortFilter = ({ value, onChange }: { value: TableSort; onChange: (sort: TableSort) => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <FilterTrigger active={value !== "newest"} icon={ArrowUpDown} aria-label="Sort">
        {SORT_LABEL[value]}
      </FilterTrigger>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-44">
      <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as TableSort)}>
        {TABLE_SORTS.map((sort) => (
          <DropdownMenuRadioItem key={sort} value={sort}>
            {SORT_LABEL[sort]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

/**
 * The table list's filter row, the Mikro home's in shape: what it is called,
 * who made it, what kind of table, when it came in, and the order. One quiet
 * line over the grid; a filter that narrows is tinted.
 */
export const TableDatasetFilterRow = ({ filters }: { filters: TableDatasetFilters }) => {
  const { state, active, sort, specSlugs, setSearch, setUser, setSort, setSpecSlugs, setRange, clear } = filters;
  const { data } = useHomeFilterOptionsQuery({ fetchPolicy: "cache-first" });
  // The range picker keeps its own range; remount it when Clear resets it.
  const [pickerKey, setPickerKey] = useState(0);
  const members = useMemo(() => [...new Set((data?.members ?? []).map((member) => member.user.sub))], [data?.members]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSearchField value={state.search} onChange={setSearch} placeholder="Search tables…" />
      <PeopleFilter value={state.user} onChange={setUser} members={members} />
      <TableSpecFilter value={specSlugs} onChange={setSpecSlugs} />
      <DateTimeRangePicker
        key={pickerKey}
        align="start"
        initialDateFrom={state.from ?? undefined}
        initialDateTo={state.to ?? undefined}
        onUpdate={({ range }) => setRange({ from: range.from, to: range.to })}
      />
      <SortFilter value={sort} onChange={setSort} />
      {active && (
        <FilterClear
          onClear={() => {
            clear();
            setPickerKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
};
