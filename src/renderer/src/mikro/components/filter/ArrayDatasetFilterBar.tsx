import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
} from "@/core/ui/page-action";
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
import { useDebounce } from "@uidotdev/usehooks";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  RotateCcw,
  Shapes,
  SlidersHorizontal,
} from "lucide-react";
import {
  parseAsArrayOf,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { useMemo } from "react";
import {
  ArrayDatasetFilter,
  ArrayDatasetOrder,
  ArrayDatasetSpec,
  Ordering,
} from "../../api/graphql";
import { ADATASET_SPEC_BY_SLUG, ADATASET_SPECS } from "../../specs";

const SORT_FIELDS = ["createdAt", "name", "id"] as const;
const SORT_FIELD_LABELS: Record<(typeof SORT_FIELDS)[number], string> = {
  createdAt: "Date created",
  name: "Name",
  id: "ID",
};

const SPEC_SLUGS = ADATASET_SPECS.map((entry) => entry.slug) as [
  string,
  ...string[],
];

/**
 * The tri-state boolean filters, as radio groups rather than checkboxes: the
 * server field is a nullable boolean, so "unset" is a third state a checkbox
 * cannot express — a ticked-then-unticked box would have to mean "false", which
 * is a different query from "don't care".
 *
 * `value` is what goes to the server; `undefined` leaves the field off.
 */
const ORIGIN_OPTIONS = [
  { key: "acquired", label: "Acquired only", value: true },
  { key: "derived", label: "Derived only", value: false },
  { key: "all", label: "All", value: undefined },
] as const;

const PYRAMID_OPTIONS = [
  { key: "any", label: "Any", value: undefined },
  { key: "multiscale", label: "Multiscale", value: true },
  { key: "single", label: "Single level", value: false },
] as const;

const UNITS_OPTIONS = [
  { key: "any", label: "Any", value: undefined },
  { key: "physical", label: "Physically calibrated", value: true },
  { key: "pixels", label: "Pixels only", value: false },
] as const;

const ORIGIN_KEYS = ORIGIN_OPTIONS.map((o) => o.key) as ["acquired", ...string[]];
const PYRAMID_KEYS = PYRAMID_OPTIONS.map((o) => o.key) as ["any", ...string[]];
const UNITS_KEYS = UNITS_OPTIONS.map((o) => o.key) as ["any", ...string[]];

const valueOf = <T extends { key: string; value: boolean | undefined }>(
  options: readonly T[],
  key: string,
): boolean | undefined => options.find((option) => option.key === key)?.value;

const labelOf = <T extends { key: string; label: string }>(
  options: readonly T[],
  key: string,
): string => options.find((option) => option.key === key)?.label ?? key;

/**
 * Derived datasets — the deconvolutions, segmentations and projections computed
 * from other datasets — are hidden by default. A processing run can multiply one
 * acquisition into dozens of children, which buries the data someone actually
 * went to the microscope for. The trigger always carries a badge naming the
 * active origin, so the rows this hides never go unexplained.
 */
export const DEFAULT_ORIGIN = "acquired";

/**
 * The three data-property choices as server filter fields. A field is OMITTED
 * for "don't care" — the server reads a present `false` as a real constraint, so
 * sending `notDerived: null` would be a different query from not asking.
 *
 * Exported for its test: the origin mapping is the one place a sign flip would
 * silently invert the page's default from "acquired only" to "derived only".
 */
export const arrayDatasetPropertyFilters = (
  origin: string,
  pyramid: string,
  units: string,
): Pick<ArrayDatasetFilter, "notDerived" | "multiscale" | "hasPhysicalSpace"> => {
  const notDerived = valueOf(ORIGIN_OPTIONS, origin);
  const multiscale = valueOf(PYRAMID_OPTIONS, pyramid);
  const hasPhysicalSpace = valueOf(UNITS_OPTIONS, units);

  return {
    ...(notDerived === undefined ? {} : { notDerived }),
    ...(multiscale === undefined ? {} : { multiscale }),
    ...(hasPhysicalSpace === undefined ? {} : { hasPhysicalSpace }),
  };
};

export type UseArrayDatasetFilterBarOptions = {
  /**
   * A spec the page itself is about — the one behind /arrayDatasets/spec/:spec. It
   * is always applied and cannot be unticked; the picker still offers the rest,
   * because specs stack (VOLUME + TIMESERIES is a 3D timelapse).
   */
  lockedSpec?: ArrayDatasetSpec;
};

/**
 * The filter set shared by every array-dataset list: search, sort, created-range,
 * spec, and the three data properties under "Data" — origin (acquired vs
 * derived), resolution (multiscale vs single level) and units (physically
 * calibrated vs bare pixels). Returns the assembled query variables together
 * with the controls to drop into a ListPage's `pageActions`, so a page wires it
 * in three lines rather than restating ~90 lines of dropdowns (which is how the
 * Sort block already ended up copied across three pages).
 *
 * Every one of them filters SERVER-side: they are `ArrayDatasetFilter` fields, so a
 * narrowed list pages through matching rows instead of paging through everything
 * and dropping most of it.
 *
 * State lives in the URL (nuqs), so a filtered list is shareable — same idiom as
 * elektro's list pages. Only non-default choices are written, so the
 * default view has a clean URL.
 *
 * No user filter: ArrayDatasetFilter.owner takes the creator's *sub*, while lok's
 * UserOptions yields user ids, so the shared UserFilter would filter on the
 * wrong key.
 */
export const useArrayDatasetFilterBar = ({
  lockedSpec,
}: UseArrayDatasetFilterBarOptions = {}) => {
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
  const [specSlugs, setSpecSlugs] = useQueryState(
    "spec",
    parseAsArrayOf(parseAsStringLiteral(SPEC_SLUGS)).withDefault([]),
  );
  const [origin, setOrigin] = useQueryState(
    "origin",
    parseAsStringLiteral(ORIGIN_KEYS).withDefault(DEFAULT_ORIGIN),
  );
  const [pyramid, setPyramid] = useQueryState(
    "pyramid",
    parseAsStringLiteral(PYRAMID_KEYS).withDefault("any"),
  );
  const [units, setUnits] = useQueryState(
    "units",
    parseAsStringLiteral(UNITS_KEYS).withDefault("any"),
  );

  // Debounced so a keystroke does not refetch: the list refetches whenever
  // `filters` changes identity.
  const debouncedSearch = useDebounce(search.trim(), 400);

  // Unknown slugs (a hand-edited URL) drop out rather than reaching the server.
  const picked = useMemo(
    () =>
      specSlugs
        .map((slug) => ADATASET_SPEC_BY_SLUG[slug])
        .filter((entry) => entry !== undefined),
    [specSlugs],
  );

  const dir = sortDirection === "ASC" ? Ordering.Asc : Ordering.Desc;
  const isCustomOrder = sortField !== "createdAt" || sortDirection !== "DESC";

  const filters: ArrayDatasetFilter = useMemo(() => {
    const specs = [
      ...new Set([
        ...(lockedSpec ? [lockedSpec] : []),
        ...picked.map((entry) => entry.spec),
      ]),
    ];

    return {
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(createdAfter ? { createdAfter: createdAfter.toISOString() } : {}),
      ...(createdBefore ? { createdBefore: createdBefore.toISOString() } : {}),
      ...(specs.length ? { spec: specs } : {}),
      ...arrayDatasetPropertyFilters(origin, pyramid, units),
    };
  }, [
    debouncedSearch,
    createdAfter,
    createdBefore,
    picked,
    lockedSpec,
    origin,
    pyramid,
    units,
  ]);

  const ordering: ArrayDatasetOrder[] = useMemo(() => {
    if (sortField === "name") return [{ name: dir }];
    if (sortField === "id") return [{ id: dir }];
    return [{ createdAt: dir }];
  }, [sortField, dir]);

  const toggleSpec = (slug: string, checked: boolean) => {
    const next = checked
      ? [...specSlugs, slug]
      : specSlugs.filter((entry) => entry !== slug);
    setSpecSlugs(next.length ? next : null);
  };

  const spatial = ADATASET_SPECS.filter((entry) => entry.kind === "spatial");
  const modifiers = ADATASET_SPECS.filter((entry) => entry.kind === "modifier");

  const specItem = (slug: string, label: string, spec: ArrayDatasetSpec) => {
    const locked = lockedSpec === spec;
    return (
      <DropdownMenuCheckboxItem
        key={slug}
        checked={locked || specSlugs.includes(slug)}
        disabled={locked}
        onCheckedChange={(checked) => toggleSpec(slug, checked)}
        onSelect={(event) => event.preventDefault()}
      >
        {label}
        {locked && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            this page
          </span>
        )}
      </DropdownMenuCheckboxItem>
    );
  };

  // Everything the Data dropdown holds that is not on its default setting. The
  // origin counts as narrowing whenever it filters at all — including on its
  // hides-derived default, which is exactly the state that needs announcing.
  const narrowedCount = [
    valueOf(ORIGIN_OPTIONS, origin) !== undefined,
    pyramid !== "any",
    units !== "any",
  ].filter(Boolean).length;

  const radioGroup = (
    label: string,
    options: readonly { key: string; label: string }[],
    value: string,
    // Back to the default is signalled as `null`, which drops the key from the
    // URL entirely — a shared link carries only what was actually changed.
    onChange: (next: string | null) => void,
    defaultKey: string,
  ) => (
    <>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={value}
        onValueChange={(next) => onChange(next === defaultKey ? null : next)}
      >
        {options.map((option) => (
          <DropdownMenuRadioItem key={option.key} value={option.key}>
            {option.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );

  const actions = (
    <>
      <CollapsibleSearch
        alwaysShow
        value={search}
        onChange={(value) => setSearch(value || null)}
        placeholder="Search array datasets…"
      />

      <PageAction.Slot collapse="icon" priority={-10}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ActionTrigger aria-label="Data">
              <SlidersHorizontal className="h-4 w-4" />
              <ActionLabel>
                Data
                {narrowedCount > 0 && (
                  <Badge variant="secondary">
                    {/* Name the origin rather than count it: "Acquired only" is on
                        by default, and a bare number would leave a user wondering
                        why their derived datasets are missing. */}
                    {labelOf(ORIGIN_OPTIONS, origin)}
                    {narrowedCount > 1 ? ` +${narrowedCount - 1}` : ""}
                  </Badge>
                )}
              </ActionLabel>
            </ActionTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {radioGroup(
              "Origin",
              ORIGIN_OPTIONS,
              origin,
              (next) => setOrigin(next as typeof origin | null),
              DEFAULT_ORIGIN,
            )}
            <DropdownMenuSeparator />
            {radioGroup(
              "Resolution",
              PYRAMID_OPTIONS,
              pyramid,
              (next) => setPyramid(next as typeof pyramid | null),
              "any",
            )}
            <DropdownMenuSeparator />
            {radioGroup(
              "Units",
              UNITS_OPTIONS,
              units,
              (next) => setUnits(next as typeof units | null),
              "any",
            )}
            {(origin !== DEFAULT_ORIGIN || pyramid !== "any" || units !== "any") && (
              <>
                <DropdownMenuSeparator />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setOrigin(null);
                    setPyramid(null);
                    setUnits(null);
                  }}
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
            <ActionTrigger aria-label="Spec">
              <Shapes className="h-4 w-4" />
              <ActionLabel>
                Spec
                {picked.length > 0 && (
                  <Badge variant="secondary">{picked.length}</Badge>
                )}
              </ActionLabel>
            </ActionTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {/* Spatial specs are mutually exclusive server-side — ticking two
                matches nothing — so they are offered as their own group. */}
            <DropdownMenuLabel>Spatial (pick one)</DropdownMenuLabel>
            {spatial.map((entry) => specItem(entry.slug, entry.label, entry.spec))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Acquisition</DropdownMenuLabel>
            {modifiers.map((entry) =>
              specItem(entry.slug, entry.label, entry.spec),
            )}
            {picked.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSpecSlugs(null)}
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
              </ActionLabel>
            </ActionTrigger>
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

  return { filters, ordering, actions };
};
