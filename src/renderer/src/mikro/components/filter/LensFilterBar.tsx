import { Badge } from "@/core/ui/badge";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { DateTimeRangePicker } from "@/core/ui/date-time-range-picker";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { ActionLabel, ActionTrigger, PageAction } from "@/core/ui/page-action";
import {
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { useDebounce } from "@uidotdev/usehooks";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  ScanSearch,
} from "lucide-react";
import { useMemo } from "react";
import { LensFilter, LensKind, LensOrder, Ordering } from "../../api/graphql";
import { LENS_KIND_ORDER, LENS_KINDS, lensKindInfo } from "../../lenses";

const SORT_FIELDS = ["createdAt", "name", "id"] as const;
const SORT_FIELD_LABELS: Record<(typeof SORT_FIELDS)[number], string> = {
  createdAt: "Date created",
  name: "Name",
  id: "ID",
};

const ALL_KINDS = "all";
const KINDS = [ALL_KINDS, ...LENS_KIND_ORDER.map((typename) => LENS_KINDS[typename].kind)] as const;

/**
 * The filter set of the lens list: search, kind, sort, created-range and
 * whether whole lenses are listed. Same shape of return value as the dataset
 * bars, so a page wires it in the same three lines.
 *
 * Every one of them filters SERVER-side (`LensFilter` fields), and state lives
 * in the URL so a narrowed list is shareable. Only non-default choices are
 * written, so the default view has a clean URL.
 *
 * **Whole lenses are off by default.** Every container has one — it IS the
 * container, looked at whole — so listing them would bury the cuts people made
 * under a copy of every dataset and table. They are one toggle away because
 * for a mesh, a network or an annotation collection the whole lens is the only
 * page there is.
 */
export const useLensFilterBar = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [kind, setKind] = useQueryState(
    "kind",
    parseAsStringLiteral(KINDS).withDefault(ALL_KINDS),
  );
  const [whole, setWhole] = useQueryState(
    "whole",
    parseAsStringLiteral(["yes", "no"] as const).withDefault("no"),
  );
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

  // Debounced so a keystroke does not refetch: the list refetches whenever
  // `filters` changes identity.
  const debouncedSearch = useDebounce(search.trim(), 400);

  const dir = sortDirection === "ASC" ? Ordering.Asc : Ordering.Desc;
  const isCustomOrder = sortField !== "createdAt" || sortDirection !== "DESC";
  const includeWhole = whole === "yes";
  const selectedKind = kind === ALL_KINDS ? null : (kind as LensKind);

  const filters: LensFilter = useMemo(
    () => ({
      ...(includeWhole ? {} : { sliced: true }),
      ...(selectedKind ? { kind: selectedKind } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(createdAfter ? { createdAfter: createdAfter.toISOString() } : {}),
      ...(createdBefore ? { createdBefore: createdBefore.toISOString() } : {}),
    }),
    [includeWhole, selectedKind, debouncedSearch, createdAfter, createdBefore],
  );

  const ordering: LensOrder[] = useMemo(() => {
    if (sortField === "name") return [{ name: dir }];
    if (sortField === "id") return [{ id: dir }];
    return [{ createdAt: dir }];
  }, [sortField, dir]);

  const actions = (
    <>
      <CollapsibleSearch
        alwaysShow
        value={search}
        onChange={(value) => setSearch(value || null)}
        placeholder="Search lenses and their containers…"
      />

      <PageAction.Slot collapse="icon" priority={-5}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ActionTrigger aria-label="Kind">
              <ScanSearch className="h-4 w-4" />
              <ActionLabel>
                Kind
                {(selectedKind || includeWhole) && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedKind ? lensKindInfo(selectedKind).label : "With whole"}
                  </Badge>
                )}
              </ActionLabel>
            </ActionTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Selects over</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={kind}
              onValueChange={(value) => setKind(value as (typeof KINDS)[number])}
            >
              <DropdownMenuRadioItem value={ALL_KINDS}>Anything</DropdownMenuRadioItem>
              {LENS_KIND_ORDER.map((typename) => {
                const info = LENS_KINDS[typename];
                return (
                  <DropdownMenuRadioItem key={info.kind} value={info.kind}>
                    <info.icon className="mr-2 h-3.5 w-3.5" />
                    {info.container}s
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={includeWhole}
              onCheckedChange={(checked) => setWhole(checked ? "yes" : "no")}
            >
              Include whole lenses
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageAction.Slot>

      <PageAction.Slot collapse="icon" priority={-10}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ActionTrigger aria-label="Sort">
              <ArrowUpDown className="h-4 w-4" />
              <ActionLabel>
                Sort
                {isCustomOrder && (
                  <Badge variant="secondary" className="gap-1">
                    {SORT_FIELD_LABELS[sortField]}
                    {sortDirection === "ASC" ? <ArrowUpWideNarrow /> : <ArrowDownWideNarrow />}
                  </Badge>
                )}
              </ActionLabel>
            </ActionTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
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
      </PageAction.Slot>

      <PageAction.Slot collapse="hide" priority={-20}>
        <DateTimeRangePicker
          initialDateFrom={createdAfter || undefined}
          initialDateTo={createdBefore || undefined}
          onUpdate={({ range }) => {
            setCreatedAfter(range.from || null);
            setCreatedBefore(range.to || null);
          }}
        />
      </PageAction.Slot>
    </>
  );

  return { filters, ordering, actions, kind: selectedKind };
};
