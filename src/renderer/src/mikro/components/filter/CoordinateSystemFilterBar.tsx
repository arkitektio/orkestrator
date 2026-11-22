import { DateTimeRangePicker } from "@/core/ui/date-time-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { FilterClear, FilterSearchField, FilterTrigger } from "@/core/ui/filter-bar";
import {
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { useDebounce } from "@uidotdev/usehooks";
import { ArrowDownWideNarrow, ArrowUpDown, ArrowUpWideNarrow, Axis3d } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CoordinateSystemFilter,
  CoordinateSystemOrder,
  Ordering,
  useHomeFilterOptionsQuery,
} from "../../api/graphql";
import { PeopleFilter } from "../home/HomeFilters";

/**
 * What a space holds, as `CoordinateSystemFilter.uninhabited` reads it. A system
 * no longer declares a kind (see `coordinates/residents.ts`): an empty
 * `residents` IS a reference frame, so this is the one distinction the server
 * can filter on. Whether a space is physical (its axes carry units) it cannot
 * filter on yet.
 */
export const SPACE_OPTIONS = [
  { key: "any", label: "Any space", value: undefined },
  { key: "data", label: "Holds data", value: false },
  { key: "frames", label: "Reference frames", value: true },
] as const;
const SPACE_KEYS = SPACE_OPTIONS.map((option) => option.key) as ["any", ...string[]];

const SORT_FIELDS = ["createdAt", "name"] as const;
const SORT_FIELD_LABELS: Record<(typeof SORT_FIELDS)[number], string> = {
  createdAt: "Date created",
  name: "Name",
};

export type CoordinateSystemFilterState = {
  search: string;
  space: string;
  owner: string | null;
  createdAfter: Date | null;
  createdBefore: Date | null;
};

/**
 * The row as `CoordinateSystemFilter`. A field is omitted, never sent as null,
 * when it does not narrow: the server reads a present `false` as a constraint,
 * so `uninhabited: false` ("holds data") must only go out when picked.
 */
export const coordinateSystemFilters = ({
  search,
  space,
  owner,
  createdAfter,
  createdBefore,
}: CoordinateSystemFilterState): CoordinateSystemFilter => {
  const text = search.trim();
  const uninhabited = SPACE_OPTIONS.find((option) => option.key === space)?.value;
  return {
    ...(text ? { search: text } : {}),
    ...(uninhabited === undefined ? {} : { uninhabited }),
    ...(owner ? { owner } : {}),
    ...(createdAfter ? { createdAfter: createdAfter.toISOString() } : {}),
    ...(createdBefore ? { createdBefore: createdBefore.toISOString() } : {}),
  };
};

/**
 * The coordinate system list's filter row, the same pills the Mikro home and
 * the array-dataset lists have: what it is called, what it holds, who made it,
 * when, and the order. Everything filters server-side, and the state lives in
 * the URL (only what was changed), so a narrowed list is a link.
 */
export const useCoordinateSystemFilterBar = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [space, setSpace] = useQueryState("space", parseAsStringLiteral(SPACE_KEYS).withDefault("any"));
  const [owner, setOwner] = useQueryState("user", parseAsString);
  const [createdAfter, setCreatedAfter] = useQueryState("after", parseAsIsoDateTime);
  const [createdBefore, setCreatedBefore] = useQueryState("before", parseAsIsoDateTime);
  const [sortField, setSortField] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_FIELDS).withDefault("createdAt"),
  );
  const [sortDirection, setSortDirection] = useQueryState(
    "dir",
    parseAsStringLiteral(["ASC", "DESC"] as const).withDefault("DESC"),
  );
  // The range picker keeps its own range; remount it when Clear resets it.
  const [pickerKey, setPickerKey] = useState(0);

  // Who can be picked: mikro's members, by the sub `owner` takes.
  const { data: options } = useHomeFilterOptionsQuery({ fetchPolicy: "cache-first" });
  const members = useMemo(
    () => [...new Set((options?.members ?? []).map((member) => member.user.sub))],
    [options?.members],
  );

  // Settled, so a keystroke does not refetch.
  const settled = useDebounce(search.trim(), 400);
  const afterKey = createdAfter?.getTime();
  const beforeKey = createdBefore?.getTime();
  const filters = useMemo(
    () => coordinateSystemFilters({ search: settled, space, owner, createdAfter, createdBefore }),
    // The dates are compared by time: the URL parser hands out a fresh Date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settled, space, owner, afterKey, beforeKey],
  );

  const dir = sortDirection === "ASC" ? Ordering.Asc : Ordering.Desc;
  const ordering: CoordinateSystemOrder[] = useMemo(
    () => (sortField === "name" ? [{ name: dir }] : [{ createdAt: dir }]),
    [sortField, dir],
  );
  const isCustomOrder = sortField !== "createdAt" || sortDirection !== "DESC";

  const filtered =
    !!search || space !== "any" || !!owner || !!createdAfter || !!createdBefore || isCustomOrder;
  const clear = () => {
    setSearch(null);
    setSpace(null);
    setOwner(null);
    setCreatedAfter(null);
    setCreatedBefore(null);
    setSortField(null);
    setSortDirection(null);
    setPickerKey((key) => key + 1);
  };

  const spaceLabel = SPACE_OPTIONS.find((option) => option.key === space)?.label ?? "Any space";

  const bar = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSearchField
        value={search}
        onChange={(value) => setSearch(value || null)}
        placeholder="Search coordinate systems…"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FilterTrigger active={space !== "any"} icon={Axis3d} aria-label="Space">
            {spaceLabel}
          </FilterTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel>What it holds</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={space}
            onValueChange={(next) => setSpace(next === "any" ? null : (next as typeof space))}
          >
            {SPACE_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.key} value={option.key}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <PeopleFilter value={owner} onChange={setOwner} members={members} />

      <DateTimeRangePicker
        key={pickerKey}
        align="start"
        initialDateFrom={createdAfter || undefined}
        initialDateTo={createdBefore || undefined}
        onUpdate={({ range }) => {
          setCreatedAfter(range.from || null);
          setCreatedBefore(range.to || null);
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FilterTrigger active={isCustomOrder} icon={ArrowUpDown} aria-label="Sort">
            {SORT_FIELD_LABELS[sortField]}
            {sortDirection === "ASC" ? (
              <ArrowUpWideNarrow className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownWideNarrow className="h-3.5 w-3.5" />
            )}
          </FilterTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortField}
            onValueChange={(value) => setSortField(value as (typeof SORT_FIELDS)[number])}
          >
            {SORT_FIELDS.map((field) => (
              <DropdownMenuRadioItem key={field} value={field}>
                {SORT_FIELD_LABELS[field]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Direction</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortDirection}
            onValueChange={(value) => setSortDirection(value as "ASC" | "DESC")}
          >
            <DropdownMenuRadioItem value="DESC">Descending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="ASC">Ascending</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {filtered && <FilterClear onClear={clear} />}
    </div>
  );

  return { filters, ordering, bar };
};
