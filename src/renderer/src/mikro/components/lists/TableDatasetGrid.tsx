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
  const [limit, setLimit] = useState(PAGE);
  // A new filter or order starts from the first page again.
  const key = JSON.stringify([filters, ordering]);
  const [shownKey, setShownKey] = useState(key);
  if (shownKey !== key) {
    setShownKey(key);
    setLimit(PAGE);
  }

  const { data, previousData, loading, error, refetch } = useBrowseTableDatasetsQuery({
    variables: { filters, ordering, pagination: { limit } },
    fetchPolicy: "cache-and-network",
  });
  const tables = (data ?? previousData)?.tableDatasets;

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

  return (
    <div className="flex flex-col gap-4">
      <div className={GRID} style={{ opacity: loading && data === undefined ? 0.6 : 1 }}>
        {tables.map((table) => (
          <TableDatasetCard key={table.id} item={table} />
        ))}
      </div>
      {tables.length >= limit && (
        <Button
          variant="outline"
          size="sm"
          className="self-center rounded-full"
          disabled={loading}
          onClick={() => setLimit((current) => current + PAGE)}
        >
          {loading ? "Loading…" : "Show more"}
        </Button>
      )}
    </div>
  );
};
