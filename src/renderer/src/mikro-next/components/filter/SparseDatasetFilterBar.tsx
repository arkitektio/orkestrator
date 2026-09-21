import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollapsibleSearch } from "@/components/ui/collapsible-search";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/hooks/use-search-param-state";
import { useDebounce } from "@uidotdev/usehooks";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
} from "lucide-react";
import { useMemo } from "react";
import {
  Ordering,
  SparseDatasetFilter,
  SparseDatasetOrder,
} from "../../api/graphql";

const SORT_FIELDS = ["createdAt", "name", "id"] as const;
const SORT_FIELD_LABELS: Record<(typeof SORT_FIELDS)[number], string> = {
  createdAt: "Date created",
  name: "Name",
  id: "ID",
};

/**
 * The filter set of the sparse dataset list: search, sort and created-range —
 * the array bar without its spec and data-property pickers, which are array
 * notions (a matrix has no spec and no pyramid). Same shape of return value,
 * so a page wires it in the same three lines.
 *
 * Every one of them filters SERVER-side (`SparseDatasetFilter` fields), and
 * state lives in the URL so a narrowed list is shareable. Only non-default
 * choices are written, so the default view has a clean URL.
 *
 * `indexesAxis` is deliberately not offered here: it takes an axis NAME, and
 * the names differ per dataset (`obs`/`var`, `cell`/`gene`), so a free-text
 * box would be the only honest control and a wrong guess would empty the list
 * without saying why. A surface that needs a matrix indexed on a given axis
 * (a colouring picker) knows the name and asks the server itself.
 */
export const useSparseDatasetFilterBar = () => {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [createdAfter, setCreatedAfter] = useQueryState(
    "after",
    parseAsIsoDateTime,
  );
  const [createdBefore, setCreatedBefore] = useQueryState(
    "before",
    parseAsIsoDateTime,
  );
  const [sortField, setSortField] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_FIELDS).withDefault("createdAt"),
  );
  const [sortDirection, setSortDirection] = useQueryState(
    "dir",
    parseAsStringLiteral(["ASC", "DESC"] as const).withDefault("DESC"),
  );

  // Debounced so a keystroke does not refetch: the list refetches whenever
  // `filters` changes identity.
  const debouncedSearch = useDebounce(search.trim(), 400);

  const dir = sortDirection === "ASC" ? Ordering.Asc : Ordering.Desc;
  const isCustomOrder = sortField !== "createdAt" || sortDirection !== "DESC";

  const filters: SparseDatasetFilter = useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(createdAfter ? { createdAfter: createdAfter.toISOString() } : {}),
      ...(createdBefore ? { createdBefore: createdBefore.toISOString() } : {}),
    }),
    [debouncedSearch, createdAfter, createdBefore],
  );

  const ordering: SparseDatasetOrder[] = useMemo(() => {
    if (sortField === "name") return [{ name: dir }];
    if (sortField === "id") return [{ id: dir }];
    return [{ createdAt: dir }];
  }, [sortField, dir]);

  const actions = (
    <>
      <CollapsibleSearch
        value={search}
        onChange={(value) => setSearch(value || null)}
        placeholder="Search sparse datasets…"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Sort
            {isCustomOrder && (
              <Badge variant="secondary" className="gap-1">
                {SORT_FIELD_LABELS[sortField]}
                {sortDirection === "ASC" ? (
                  <ArrowUpWideNarrow />
                ) : (
                  <ArrowDownWideNarrow />
                )}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortField}
            onValueChange={(value) =>
              setSortField(value as (typeof SORT_FIELDS)[number])
            }
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
            <DropdownMenuRadioItem value="DESC">
              Descending
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="ASC">Ascending</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DateTimeRangePicker
        initialDateFrom={createdAfter || undefined}
        initialDateTo={createdBefore || undefined}
        onUpdate={({ range }) => {
          setCreatedAfter(range.from || null);
          setCreatedBefore(range.to || null);
        }}
      />
    </>
  );

  return { filters, ordering, actions };
};
