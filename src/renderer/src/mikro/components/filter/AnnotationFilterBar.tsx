import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { CollapsibleSearch } from "@/core/components/ui/collapsible-search";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
} from "@/core/components/ui/page-action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { useDebounce } from "@uidotdev/usehooks";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  RotateCcw,
  Shapes,
} from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "@/core/hooks/use-search-param-state";
import { useMemo } from "react";

import {
  AnnotationFilter,
  AnnotationOrder,
  Ordering,
  AnnotationKindChoices,
} from "../../api/graphql";

/**
 * The kinds, grouped the way they differ — what a shape spans. Flat, the enum
 * is twenty radio items in alphabetical order, where RECTANGLE sits between
 * POLYGON and SLICE and nothing tells a planar region from a hypercube.
 */
const KIND_GROUPS: {
  label: string;
  kinds: { kind: AnnotationKindChoices; label: string }[];
}[] = [
  {
    label: "Planar",
    kinds: [
      { kind: AnnotationKindChoices.Rectangle, label: "Rectangle" },
      { kind: AnnotationKindChoices.Ellipse, label: "Ellipse" },
      { kind: AnnotationKindChoices.Circle, label: "Circle" },
      { kind: AnnotationKindChoices.Polygon, label: "Polygon" },
    ],
  },
  {
    label: "Volumetric",
    kinds: [
      { kind: AnnotationKindChoices.Cube, label: "Cube" },
      { kind: AnnotationKindChoices.Sphere, label: "Sphere" },
      { kind: AnnotationKindChoices.Ellipsoid, label: "Ellipsoid" },
    ],
  },
  {
    label: "Points & paths",
    kinds: [
      { kind: AnnotationKindChoices.Point, label: "Point" },
      { kind: AnnotationKindChoices.MultiPoint, label: "Multi point" },
      { kind: AnnotationKindChoices.Line, label: "Line" },
      { kind: AnnotationKindChoices.Path, label: "Path" },
    ],
  },
];

const KIND_LABELS: Record<string, string> = Object.fromEntries(
  KIND_GROUPS.flatMap((group) =>
    group.kinds.map((entry) => [entry.kind as string, entry.label]),
  ),
);

const KIND_KEYS = [
  "any",
  ...KIND_GROUPS.flatMap((group) => group.kinds.map((entry) => entry.kind)),
] as [string, ...string[]];

/**
 * The list's order. `default` sends no ordering at all rather than a chosen
 * one: `AnnotationOrder` offers only id and name, and an annotation's id is a
 * UUID — sorting by it looks chronological and is not. So the unsorted server
 * order stays the default and the user opts into a real one.
 */
const SORT_FIELDS = ["default", "name", "id"] as const;
const SORT_FIELD_LABELS: Record<(typeof SORT_FIELDS)[number], string> = {
  default: "Unsorted",
  name: "Name",
  id: "ID",
};

/**
 * Search and kind as server filter fields, with an OMITTED key for "don't
 * care" — the server reads a present value as a real constraint, so sending
 * `kind: null` would be a different query from not asking.
 *
 * Exported for its test: `any` reaching the server as a kind would silently
 * empty the page, since no annotation has the literal kind "any".
 */
export const annotationFilters = (
  search: string,
  kind: string,
): Pick<AnnotationFilter, "search" | "kind"> => ({
  ...(search ? { search } : {}),
  ...(kind === "any" ? {} : { kind: kind as AnnotationKindChoices }),
});

/**
 * The filter set for annotation lists: search, kind, and sort — the
 * `ArrayDatasetFilterBar` idiom (URL state via nuqs, only non-defaults written, the
 * assembled variables returned next to the controls for a ListPage's
 * `pageActions`) narrowed to what `AnnotationFilter` actually offers.
 *
 * No created-range picker: annotations carry no timestamp of their own, and
 * their filter has no date field to hang one on. No collection picker either —
 * `AnnotationFilter.collection` takes an id, and there is no lightweight
 * options query for collections yet (the existing one drags a full coordinate
 * system per row).
 */
export const useAnnotationFilterBar = () => {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [kind, setKind] = useQueryState(
    "kind",
    parseAsStringLiteral(KIND_KEYS).withDefault("any"),
  );
  const [sortField, setSortField] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_FIELDS).withDefault("default"),
  );
  const [sortDirection, setSortDirection] = useQueryState(
    "dir",
    parseAsStringLiteral(["ASC", "DESC"] as const).withDefault("ASC"),
  );

  // Debounced so a keystroke does not refetch: the list refetches whenever
  // `filters` changes identity.
  const debouncedSearch = useDebounce(search.trim(), 400);

  const dir = sortDirection === "ASC" ? Ordering.Asc : Ordering.Desc;

  const filters: AnnotationFilter = useMemo(
    () => annotationFilters(debouncedSearch, kind),
    [debouncedSearch, kind],
  );

  const ordering: AnnotationOrder[] = useMemo(() => {
    if (sortField === "name") return [{ name: dir }];
    if (sortField === "id") return [{ id: dir }];
    return [];
  }, [sortField, dir]);

  const actions = (
    <>
      <CollapsibleSearch
        alwaysShow
        value={search}
        onChange={(value) => setSearch(value || null)}
        placeholder="Search annotations…"
      />

      <PageAction.Slot collapse="icon" priority={-10}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ActionTrigger aria-label="Kind">
              <Shapes className="h-4 w-4" />
              <ActionLabel>
                Kind
                {kind !== "any" && (
                  <Badge variant="secondary">{KIND_LABELS[kind] ?? kind}</Badge>
                )}
              </ActionLabel>
            </ActionTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-96 w-56 overflow-y-auto"
          >
            {/* One radio group across every section: the server field takes a
                single kind, so ticking two would be a query that cannot exist. */}
            <DropdownMenuRadioGroup
              value={kind}
              // Back to the default is signalled as `null`, which drops the key
              // from the URL entirely — a shared link carries only what changed.
              onValueChange={(next) => setKind(next === "any" ? null : next)}
            >
              <DropdownMenuRadioItem value="any">Any kind</DropdownMenuRadioItem>
              {KIND_GROUPS.map((group) => (
                <div key={group.label}>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  {group.kinds.map((entry) => (
                    <DropdownMenuRadioItem key={entry.kind} value={entry.kind}>
                      {entry.label}
                    </DropdownMenuRadioItem>
                  ))}
                </div>
              ))}
            </DropdownMenuRadioGroup>
            {kind !== "any" && (
              <>
                <DropdownMenuSeparator />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setKind(null)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </>
            )}
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
                {sortField !== "default" && (
                  <Badge variant="secondary" className="gap-1">
                    {SORT_FIELD_LABELS[sortField]}
                    {sortDirection === "ASC" ? (
                      <ArrowUpWideNarrow />
                    ) : (
                      <ArrowDownWideNarrow />
                    )}
                  </Badge>
                )}
              </ActionLabel>
            </ActionTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortField}
              onValueChange={(value) =>
                setSortField(
                  value === "default"
                    ? null
                    : (value as (typeof SORT_FIELDS)[number]),
                )
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
              onValueChange={(value) =>
                setSortDirection(value === "ASC" ? null : (value as "DESC"))
              }
            >
              <DropdownMenuRadioItem value="ASC">Ascending</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="DESC">
                Descending
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageAction.Slot>
    </>
  );

  return { filters, ordering, actions };
};
