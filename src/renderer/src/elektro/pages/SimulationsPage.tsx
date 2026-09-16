import { Guard } from "@/app/Arkitekt";
import { Explainer } from "@/components/explainer/Explainer";
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
  Ordering,
  SimulationFilter,
  SimulationOrder,
} from "@/elektro/api/graphql";
import { ElektroSimulation } from "@/linkers";
import { UserFilter, UserFilterValue } from "@/lok-next/components/filter/UserFilter";
import {
  ProvenanceFilter,
  ProvenanceFilterValue,
} from "@/rekuest/components/filter/ProvenanceFilter";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  Layers,
  UploadIcon,
} from "lucide-react";
import {
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/hooks/use-search-param-state";
import React, { useState } from "react";
import SimulationList from "../components/lists/SimulationList";
import {
  getSimulationGrouping,
  SIMULATION_GROUP_KEYS,
  SIMULATION_GROUPINGS,
  SimulationGroupKey,
} from "../components/lists/simulationGroupings";

export type IRepresentationScreenProps = {};

const SORT_FIELD_LABELS = { createdAt: "Date created", id: "ID" } as const;

const SimulationsPage: React.FC<IRepresentationScreenProps> = () => {
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
    parseAsStringLiteral(["createdAt", "id"] as const).withDefault("createdAt"),
  );
  const [sortDirection, setSortDirection] = useQueryState(
    "dir",
    parseAsStringLiteral(["ASC", "DESC"] as const).withDefault("DESC"),
  );
  const [groupKey, setGroupKey] = useQueryState(
    "group",
    parseAsStringLiteral(SIMULATION_GROUP_KEYS).withDefault("none"),
  );

  const [userValue, setUserValue] = useState<UserFilterValue>({});
  const [provValue, setProvValue] = useState<ProvenanceFilterValue>({});

  const searchTerm = search.trim();
  const dir = sortDirection === "ASC" ? Ordering.Asc : Ordering.Desc;
  const isCustomOrder = sortField !== "createdAt" || sortDirection !== "DESC";

  const filters: SimulationFilter = {
    ...(searchTerm ? { search: searchTerm } : {}),
    ...(createdAfter ? { createdAfter: createdAfter.toISOString() } : {}),
    ...(createdBefore ? { createdBefore: createdBefore.toISOString() } : {}),
    ...(userValue.createdBy ? { createdBy: userValue.createdBy } : {}),
    ...(userValue.mine ? { mine: true } : {}),
    ...(provValue.createdWith ? { createdWith: provValue.createdWith } : {}),
    ...(provValue.provenanceTask
      ? { provenanceTask: provValue.provenanceTask }
      : {}),
    ...(provValue.provenanceRootTask
      ? { provenanceRootTask: provValue.provenanceRootTask }
      : {}),
    ...(provValue.createdByAgent ? { createdByAgent: true } : {}),
  };

  const ordering: SimulationOrder[] = [
    sortField === "id" ? { id: dir } : { createdAt: dir },
  ];

  const grouping = getSimulationGrouping(groupKey);
  // Grouping is client-side over the loaded page — load more so groups aren't
  // truncated to a single page's worth of items.
  const limit = grouping ? 100 : 30;

  return (
    <ElektroSimulation.ListPage
      title="Simulations"
      pageActions={
        <>
          <CollapsibleSearch
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search simulations…"
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Layers className="h-4 w-4" />
                Group
                {grouping && (
                  <Badge variant="secondary">{grouping.label}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Group by</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={groupKey}
                onValueChange={(value) =>
                  setGroupKey(value as SimulationGroupKey)
                }
              >
                <DropdownMenuRadioItem value="none">
                  No grouping
                </DropdownMenuRadioItem>
                {SIMULATION_GROUPINGS.map((group) => (
                  <DropdownMenuRadioItem key={group.key} value={group.key}>
                    {group.label}
                  </DropdownMenuRadioItem>
                ))}
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

          <UserFilter value={userValue} onChange={setUserValue} />

          <Guard.Rekuest unavailable={<></>}>
            <ProvenanceFilter value={provValue} onChange={setProvValue} />
          </Guard.Rekuest>

          <ElektroSimulation.NewButton>
            <Button variant="outline" size="sm">
              <UploadIcon className="h-4 w-4 mr-2" />
              New
            </Button>
          </ElektroSimulation.NewButton>
        </>
      }
    >
      <div className="p-3 flex flex-col gap-3">
        <Explainer
          title="Simulations"
          description="Simulations are runs of neuron models, where specific recording and stimulation protocols are applied. They are the result of a simulation run."
        />
        <SimulationList
          defaultLimit={limit}
          filters={filters}
          ordering={ordering}
          groupBy={grouping}
        />
      </div>
    </ElektroSimulation.ListPage>
  );
};

export default SimulationsPage;
