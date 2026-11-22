import { useState } from "react";
import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";
import { Skeleton } from "@/core/ui/skeleton";
import { CARD_FRAME_GRID, CARD_FRAME_SIZE } from "@/core/ui/card-frame";
import { TableDatasetFilter, TableDatasetOrder, useBrowseTableDatasetsQuery } from "../../api/graphql";
import TableDatasetCard from "../cards/TableDatasetCard";

/** How many cards a page of the grid brings, and "Show more" adds. */
const PAGE = 24;

// The Mikro home's cell, without its spans.
const GRID = CARD_FRAME_GRID;

/**
 * One page of the grid, by offset. Its own request, so "Show more" asks for
 * the next page only (growing one request's limit asked again for every card
 * on screen, and stopped at the server's page cap of 100). `tableDatasets` is
 * offset-paged in the cache, so the pages share one window.
 */
const TablePage = ({
  filters,
  ordering,
  index,
}: {
  filters: TableDatasetFilter;
  ordering: TableDatasetOrder[];
  index: number;
}) => {
  const { data } = useBrowseTableDatasetsQuery({
    variables: { filters, ordering, pagination: { offset: index * PAGE, limit: PAGE } },
    fetchPolicy: "cache-and-network",
  });
  return (
    <>
      {data?.tableDatasets.map((table) => (
        <TableDatasetCard key={table.id} item={table} />
      ))}
    </>
  );
};

/**
 * The table list as the Mikro home lays out its data: cards in a grid, newest
 * first unless sorted otherwise, and "Show more" at the foot rather than pages.
 * The previous cards stay while a filter's answer runs. An empty filtered list
 * says nothing matched and offers to clear; an empty unfiltered one says how
 * tables get here.
 */
export const TableDatasetGrid = ({
  filters,
  ordering,
  filtered,
  onClear,
}: {
  filters: TableDatasetFilter;
  ordering: TableDatasetOrder[];
  filtered: boolean;
  onClear: () => void;
}) => {
  const [pages, setPages] = useState(1);
  // A new filter or order starts from the first page again.
  const key = JSON.stringify([filters, ordering]);
  const [shownKey, setShownKey] = useState(key);
  if (shownKey !== key) {
    setShownKey(key);
    setPages(1);
  }

  // The first page decides the empty, error and loading states; the last one
  // whether there is more. Both are the pages' own requests (same variables,
  // so the same cache entry and one request each).
  const first = useBrowseTableDatasetsQuery({
    variables: { filters, ordering, pagination: { offset: 0, limit: PAGE } },
    fetchPolicy: "cache-and-network",
  });
  const last = useBrowseTableDatasetsQuery({
    variables: { filters, ordering, pagination: { offset: (pages - 1) * PAGE, limit: PAGE } },
    fetchPolicy: "cache-and-network",
  });
  const tables = (first.data ?? first.previousData)?.tableDatasets;
  const { error, refetch } = first;

  if (error && !tables) {
    return (
      <div className="flex flex-col items-start gap-2">
        <ErrorNote error={error} title="Couldn't load the tables" />
        <Button variant="outline" size="sm" onClick={() => void refetch().catch(() => undefined)}>
          Try again
        </Button>
      </div>
    );
  }

  if (!tables) {
    return (
      <div className={GRID}>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className={`${CARD_FRAME_SIZE} rounded-2xl`} style={{ opacity: 1 - index * 0.08 }} />
        ))}
      </div>
    );
  }

  if (tables.length === 0) {
    return filtered ? (
      <div className="flex flex-col items-start gap-2 py-6 text-sm text-muted-foreground">
        No table matches these filters.
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    ) : (
      <p className="py-6 text-sm text-muted-foreground">
        No tables yet. Tables come from tasks that measure your data, or from files you upload.
      </p>
    );
  }

  const lastPage = last.data?.tableDatasets;
  const hasMore = lastPage !== undefined && lastPage.length >= PAGE;
  return (
    <div className="flex flex-col gap-4">
      <div className={GRID} style={{ opacity: first.loading && first.data === undefined ? 0.6 : 1 }}>
        {first.data === undefined ? (
          // The previous filter's cards, while this one's first page runs.
          tables.map((table) => <TableDatasetCard key={table.id} item={table} />)
        ) : (
          Array.from({ length: pages }, (_, index) => (
            <TablePage key={index} filters={filters} ordering={ordering} index={index} />
          ))
        )}
      </div>
      {last.data === undefined && pages > 1 ? (
        <span className="self-center text-xs text-muted-foreground">Loading…</span>
      ) : (
        hasMore && (
          <Button
            variant="outline"
            size="sm"
            className="self-center rounded-full"
            onClick={() => setPages((current) => current + 1)}
          >
            Show more
          </Button>
        )
      )}
    </div>
  );
};
