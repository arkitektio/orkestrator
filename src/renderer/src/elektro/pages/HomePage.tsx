import { asParamlessRoute, HookFunction } from "@/app/routes/ParamlessRoute";
import { OperationVariables } from "@apollo/client";
import { Sidebars } from "@/components/layout/Sidebars";
import { PageLayout } from "@/components/layout/PageLayout";
import { HelpSidebar } from "@/components/sidebars/help";
import { Badge } from "@/components/ui/badge";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
} from "@/components/ui/page-action";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSearch } from "@/components/ui/collapsible-search";
import { useDebounce } from "@/hooks/use-debounce";
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
import { Separator } from "@/components/ui/separator";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  BarChart3,
  Network,
  TrendingUp,
} from "lucide-react";
import { BsLightning } from "react-icons/bs";
import {
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/hooks/use-search-param-state";
import { HomePageQuery, Ordering, useHomePageQuery } from "../api/graphql";
import ExperimentList from "../components/lists/ExperimentList";
import NeuronModelList from "../components/lists/NeuronModelList";
import ArrayDatasetList from "../components/lists/ArrayDatasetList";

export interface IRepresentationScreenProps {}

// The generated `useHomePageQuery` takes no variables at all (`Exact<{}>`),
// which is too narrow for `asParamlessRoute`'s generic `HookFunction` (it is
// invoked with a generic `OperationVariables` options object). The runtime
// shape is unaffected: options are always `{}` for this query.
const useHomePageQueryAsHookFunction = useHomePageQuery as unknown as HookFunction<
  HomePageQuery,
  OperationVariables
>;

const Page = asParamlessRoute(useHomePageQueryAsHookFunction, ({ data }) => {
  // All dashboard filters live in the URL so the view is shareable/bookmarkable.
  const [createdAfter, setCreatedAfter] = useQueryState("after", parseAsIsoDateTime);

  const [createdBefore, setCreatedBefore] = useQueryState(
    "before",
    parseAsIsoDateTime,
  );

  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );

  // Elektro *Order inputs are @oneOf over createdAt/id (no name ordering).
  const [sortField, setSortField] = useQueryState(
    "sort",
    parseAsStringLiteral(["createdAt", "id"] as const).withDefault("createdAt"),
  );

  const [sortDirection, setSortDirection] = useQueryState(
    "dir",
    parseAsStringLiteral(["ASC", "DESC"] as const).withDefault("DESC"),
  );

  const temporalFilter = {
    createdAfter: createdAfter ?? undefined,
    createdBefore: createdBefore ?? undefined,
  };

  // Debounce the value that drives the queries so each keystroke doesn't fire a
  // request; the input itself (`search`) stays immediate so typing feels snappy.
  const searchTerm = useDebounce(search.trim(), 400);
  const searchFilter = searchTerm ? { search: searchTerm } : {};

  const direction = Ordering[sortDirection === "ASC" ? "Asc" : "Desc"];
  // One ordering value, shared across lists — every elektro *Order input has the
  // same { createdAt | id } shape, so this is assignable to each list's TOrdering.
  const orderEntry =
    sortField === "createdAt"
      ? { createdAt: direction }
      : { id: direction };
  const listOrdering = [orderEntry];

  const sortFieldLabels = { createdAt: "Date created", id: "ID" } as const;
  // Defaults the dashboard ships with — a tag is shown when the user diverges.
  const isCustomOrder = sortField !== "createdAt" || sortDirection !== "DESC";

  const listFilters = { ...temporalFilter, ...searchFilter };

  return (
    <PageLayout
      title="Elektro"
      pageActions={
        <>
          {/* Collapsible search drives the `search` filter on every list */}
          <CollapsibleSearch
            alwaysShow
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search datasets, experiments and models…"
          />

          {/* Ordering: field + direction in a dropdown, shared across lists.
              A tag surfaces the active sort whenever it differs from default. */}
          <PageAction.Slot collapse="icon" priority={-10}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionTrigger aria-label="Sort">
                  <ArrowUpDown className="h-4 w-4" />
                  <ActionLabel>
                    Sort
                    {isCustomOrder && (
                      <Badge variant="secondary" className="gap-1">
                        {sortFieldLabels[sortField]}
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
                    setSortField(value as "createdAt" | "id")
                  }
                >
                  <DropdownMenuRadioItem value="createdAt">
                    Date created
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="id">ID</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Direction</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortDirection}
                  onValueChange={(value) =>
                    setSortDirection(value as "ASC" | "DESC")
                  }
                >
                  <DropdownMenuRadioItem value="DESC">
                    Descending
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ASC">
                    Ascending
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </PageAction.Slot>

          {/* Temporal range writes the `after`/`before` URL params */}
          <PageAction.Slot collapse="hide" priority={-20}>
            <DateTimeRangePicker
              initialDateFrom={createdAfter ?? undefined}
              initialDateTo={createdBefore ?? undefined}
              onUpdate={({ range }) => {
                setCreatedAfter(range.from || null);
                setCreatedBefore(range.to || null);
              }}
            />
          </PageAction.Slot>
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Help">
            <HelpSidebar />
          </Sidebars.Tab>
        </Sidebars>
      }
    >

      {data?.experiments.length == 0 && data?.models.length == 0 ? (
        // Empty State with Hero Design
        <div className="min-h-full w-full flex items-center justify-center rounded-lg">
          <div className="max-w-4xl mx-auto text-center px-6 py-16">
            {/* Hero Section */}
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="p-6 rounded-full bg-gradient-to-br from-primary to-secondary/20 border border-primary/20 dark:border-primary/20">
                  <BsLightning className="h-16 w-16 text-primary" />
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Welcome to Elektro
                </span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Your electrophysiology and modelling platform. Lay recordings out on timelines,
                build neuron models, and run simulations — then explore it all
                from here.
              </p>
            </div>

            {/* Action Section */}
            <div className="mt-12 space-y-6">
              <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Visualize Recordings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  <span>Build Models</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Run Simulations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Dashboard View with Data
        <div className="space-y-8 p-3">
          {/* Welcome Header */}
          <CardHeader className="px-0">
            <CardTitle className="text-3xl flex items-center gap-3">
              <BsLightning className="h-8 w-8 text-primary" />
              Your Elektro Data
            </CardTitle>
            <CardDescription className="text-lg">
              Your recently recorded and simulated data
            </CardDescription>
          </CardHeader>

          <ArrayDatasetList filters={listFilters} ordering={listOrdering} />
          <NeuronModelList filters={listFilters} ordering={listOrdering} />
          <Separator className="my-4" />
          <ExperimentList filters={listFilters} ordering={listOrdering} />
        </div>
      )}
    </PageLayout>
  );
});

export default Page;
