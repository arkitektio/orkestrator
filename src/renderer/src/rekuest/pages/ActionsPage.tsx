import { Sidebars } from "@/components/layout/Sidebars";
import { HelpSidebar } from "@/components/sidebars/help";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
} from "@/components/ui/page-action";
import { CollapsibleSearch } from "@/components/ui/collapsible-search";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  parseAsBoolean,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/hooks/use-search-param-state";
import { RekuestAction } from "@/linkers";
import { ArrowUpDown, Layers, Wifi } from "lucide-react";
import { useMemo } from "react";
import { ActionKind } from "../api/graphql";
import {
  ActionFacetFilter,
  ActionFacets,
} from "../components/filter/ActionFacetFilter";
import { StructureDemandFilter } from "../components/filter/StructureDemandFilter";
import ActionBrowseList from "../components/lists/ActionBrowseList";
import {
  ACTION_GROUP_KEYS,
  ACTION_GROUPINGS,
  ActionGroupKey,
  getActionGrouping,
} from "../components/lists/actionGroupings";
import {
  ACTION_SORTS,
  buildActionFilter,
  buildActionOrdering,
  isRunnable,
} from "../lib/actionBrowse";
import { ActionsManageSidebar } from "../sidebars/ActionsManageSidebar";
import { ActionsStatisticsSidebar } from "../sidebars/ActionsStatisticsSidebar";

const SORT_KEYS = ["default", ...ACTION_SORTS] as const;
type SortKey = (typeof SORT_KEYS)[number];

const SORT_LABELS: Record<SortKey, string> = {
  default: "Default",
  used: "Last used",
  newest: "Newest",
};

const Page = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [kind, setKind] = useQueryState(
    "kind",
    parseAsStringLiteral([ActionKind.Function, ActionKind.Generator] as const),
  );
  const [stateful, setStateful] = useQueryState("stateful", parseAsBoolean);
  const [app, setApp] = useQueryState("app", parseAsString);
  const [protocol, setProtocol] = useQueryState("protocol", parseAsString);
  const [collection, setCollection] = useQueryState("collection", parseAsString);
  const [structure, setStructure] = useQueryState("structure", parseAsString);
  const [dir, setDir] = useQueryState(
    "dir",
    parseAsStringLiteral(["consumes", "produces"] as const).withDefault("consumes"),
  );
  const [runnable, setRunnable] = useQueryState(
    "runnable",
    parseAsBoolean.withDefault(false),
  );
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_KEYS).withDefault("default"),
  );
  const [groupKey, setGroupKey] = useQueryState(
    "group",
    parseAsStringLiteral(ACTION_GROUP_KEYS).withDefault("none"),
  );
  const [usedAfter, setUsedAfter] = useQueryState("after", parseAsIsoDateTime);
  const [usedBefore, setUsedBefore] = useQueryState("before", parseAsIsoDateTime);

  const facets: ActionFacets = { kind, stateful, app, protocol, collection };
  const setFacets = (next: Partial<ActionFacets>) => {
    if ("kind" in next) setKind(next.kind ?? null);
    if ("stateful" in next) setStateful(next.stateful ?? null);
    if ("app" in next) setApp(next.app ?? null);
    if ("protocol" in next) setProtocol(next.protocol ?? null);
    if ("collection" in next) setCollection(next.collection ?? null);
  };

  const afterKey = usedAfter?.getTime();
  const beforeKey = usedBefore?.getTime();
  const filters = useMemo(
    () =>
      buildActionFilter({
        search,
        kind,
        stateful,
        app,
        protocol,
        collection,
        structure,
        dir,
        after: usedAfter,
        before: usedBefore,
      }),
    // Dates are fresh objects on every parse; key them by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, kind, stateful, app, protocol, collection, structure, dir, afterKey, beforeKey],
  );
  const ordering = useMemo(
    () => buildActionOrdering(sort === "default" ? null : sort),
    [sort],
  );

  const grouping = getActionGrouping(groupKey);
  // Grouping is client-side over the loaded page — load more so groups aren't
  // truncated to a single page's worth of items.
  const limit = grouping ? 100 : 30;

  const hasFilter = Boolean(
    Object.keys(filters).length > 0 || runnable,
  );
  const clearAll = () => {
    setSearch(null);
    setFacets({ kind: null, stateful: null, app: null, protocol: null, collection: null });
    setStructure(null);
    setRunnable(null);
    setUsedAfter(null);
    setUsedBefore(null);
  };

  return (
    <RekuestAction.ListPage
      title={"Actions"}
      pageActions={
        <>
          {/* The search is what this page is for: it is pinned, and until it
              is used it is already no wider than a glyph. */}
          <CollapsibleSearch
            alwaysShow
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search actions…"
          />
          <PageAction
            priority={10}
            collapse="icon"
            icon={<Wifi className="h-4 w-4" />}
            variant={runnable ? "default" : "outline"}
            onClick={() => setRunnable(runnable ? null : true)}
            aria-pressed={runnable}
          >
            Runnable now
          </PageAction>
          <StructureDemandFilter
            collapse="icon"
            structure={structure}
            direction={dir}
            onChange={(next) => {
              if ("structure" in next) setStructure(next.structure ?? null);
              if (next.direction) setDir(next.direction);
            }}
          />
          <ActionFacetFilter collapse="icon" facets={facets} onChange={setFacets} />

          {/* Sort and grouping are how the page is read rather than what it
              shows: they go before the filters do. */}
          <PageAction.Slot collapse="icon" priority={-10}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionTrigger aria-label="Sort">
                  <ArrowUpDown className="h-4 w-4" />
                  <ActionLabel>
                    Sort
                    {sort !== "default" ? (
                      <Badge variant="secondary">{SORT_LABELS[sort]}</Badge>
                    ) : (
                      // A search term is ranked by the server (substring
                      // matches first, then by meaning); an explicit sort
                      // replaces that.
                      search && <Badge variant="secondary">Relevance</Badge>
                    )}
                  </ActionLabel>
                </ActionTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) => setSort(value as SortKey)}
                >
                  {SORT_KEYS.map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {key === "default" && search ? "Relevance" : SORT_LABELS[key]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </PageAction.Slot>

          <PageAction.Slot collapse="icon" priority={-10}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionTrigger aria-label="Group">
                  <Layers className="h-4 w-4" />
                  <ActionLabel>
                    Group
                    {grouping && <Badge variant="secondary">{grouping.label}</Badge>}
                  </ActionLabel>
                </ActionTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Group by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={groupKey}
                  onValueChange={(value) => setGroupKey(value as ActionGroupKey)}
                >
                  <DropdownMenuRadioItem value="none">No grouping</DropdownMenuRadioItem>
                  {ACTION_GROUPINGS.map((group) => (
                    <DropdownMenuRadioItem key={group.key} value={group.key}>
                      {group.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </PageAction.Slot>

          {/* The widest control on the row, and the one a visitor is least
              likely to want: it goes first, and it goes altogether rather
              than into the burger, where a range picker does not belong. */}
          <PageAction.Slot collapse="hide" priority={-20}>
            <DateTimeRangePicker
              initialDateFrom={usedAfter ?? undefined}
              initialDateTo={usedBefore ?? undefined}
              onUpdate={({ range }) => {
                setUsedAfter(range.from || null);
                setUsedBefore(range.to || null);
              }}
            />
          </PageAction.Slot>
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Statistics">
            <ActionsStatisticsSidebar filters={filters} />
          </Sidebars.Tab>
          <Sidebars.Tab label="Manage">
            <ActionsManageSidebar />
          </Sidebars.Tab>
          <Sidebars.Tab label="Help">
            <HelpSidebar />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="p-6">
        <div className="mb-6 max-w-3xl">
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
            Actions
          </h1>
          <p className="mt-2 text-muted-foreground">
            Everything your connected apps can do. Find one by what it works on,
            check that an app providing it is online, and run it.
          </p>
        </div>

        {grouping && (
          <p className="mb-3 text-xs text-muted-foreground">
            Groups cover the {limit} actions loaded per page. Follow a group
            title, or add filters, to see a whole group.
          </p>
        )}

        <ActionBrowseList
          filters={filters}
          ordering={ordering}
          groupBy={grouping}
          defaultLimit={limit}
          clientFilter={runnable ? isRunnable : undefined}
          emptyActions={
            hasFilter ? (
              <Button variant="outline" onClick={clearAll}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      </div>
    </RekuestAction.ListPage>
  );
};

export default Page;
