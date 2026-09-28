import { Badge } from "@/core/ui/badge";
import { MikroCoordinateSystem, MikroTableDataset } from "@/core/linkers";
import {
  GetTableDatasetQuery,
  ColumnRole,
  useGetTableDatasetDerivedQuery,
} from "../../api/graphql";
import { residentLabel } from "../coordinates/residents";
import { ColumnAxisGlyph, ColumnInfoPopover } from "../tables/ColumnInfoPopover";
import { DerivedFromSection } from "./DerivedFromSection";
import { FileLinksSection } from "./FileLinksSection";
import { ProvenanceSection } from "./ProvenanceSection";

type PageTable = GetTableDatasetQuery["tableDataset"];

/**
 * Everything about a table dataset that is not its rows — the counterpart of
 * `DatasetInfoSidebar`, section for section, so the two detail pages read the
 * same way: the container's identity and structure in the rail, the data itself
 * in the middle.
 *
 * What the array page says with shape/dtype/levels, a table says with its
 * declared columns: their roles are what makes it either a placeable table (it
 * has COORDINATE columns, which ARE the axes of the space it owns) or a pure
 * measurement table keyed by an index.
 *
 * The static facts come from the page's own query; the lineage and the history
 * are one extra round trip made here, exactly as on the array page — the tab is
 * unmounted while inactive (Radix `TabsContent`) so it costs nothing until
 * someone opens it. One section fewer than the array's four: nothing on
 * TableDataset points downwards, so there is no "derived tables" to list.
 */
export const TableDatasetInfoSidebar = ({ dataset }: { dataset: PageTable }) => {
  // `order` is a field, not a position — the API does not promise order.
  const columns = [...dataset.columns].sort((a, b) => a.order - b.order);
  const coordinateColumns = columns.filter(
    (column) => column.role === ColumnRole.Coordinate,
  );

  // cache-and-network so reopening the tab after a task ran shows what it
  // recorded rather than the answer from before it started.
  const { data, error, loading } = useGetTableDatasetDerivedQuery({
    variables: { id: dataset.id },
    fetchPolicy: "cache-and-network",
  });

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        {/* `break-all` like the array page's rail: a table name is usually one
            long token, which word-wrap would not break at all. The description
            below is prose and keeps wrapping at spaces. */}
        <MikroTableDataset.DetailLink
          object={dataset}
          className="break-all text-lg font-semibold"
        >
          {dataset.name}
        </MikroTableDataset.DetailLink>
        {dataset.description && (
          <p className="text-sm text-muted-foreground">{dataset.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Axes</div>
        <div className="font-mono text-xs text-muted-foreground">
          {dataset.axisNames.length
            ? dataset.axisNames.join(" × ")
            : "measurement table"}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">Columns</span>
          <span className="font-mono text-xs">{columns.length}</span>
        </div>
        {coordinateColumns.length > 0 && (
          <div>
            {/* The count that matters, in the place the array rail badges
                multiscale depth: coordinate columns are what place the rows. */}
            <Badge variant="outline" className="text-[0.625rem]">
              {coordinateColumns.length} coordinate
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Coordinate system</div>
        <MikroCoordinateSystem.DetailLink
          object={dataset.coordinateSystem}
          className="break-all text-2xs ellipsis font-mono text-muted-foreground"
        >
          {dataset.coordinateSystem.name}
        </MikroCoordinateSystem.DetailLink>
        <div>
          <Badge variant="outline" className="text-[0.625rem]">
            {residentLabel(dataset.coordinateSystem)}
          </Badge>
        </div>
      </div>

      {/* The declared schema, one line per column: the name, which opens the
          same popover the table header does, and the dtype. The role, the
          unit, the axis type and the description used to be spelled out here
          in a card per column, and the rail read as a stack of cards saying
          the same three things — the popover says all of it, on demand. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-baseline justify-between gap-2">
          <div className="text-xs font-semibold">Schema</div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {columns.length}
          </span>
        </div>

        {columns.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            No columns declared.
          </span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex flex-row items-baseline justify-between gap-2"
              >
                <ColumnInfoPopover
                  column={column}
                  store={dataset.store}
                  side="left"
                >
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left font-mono text-xs transition-colors hover:bg-accent"
                  >
                    <ColumnAxisGlyph column={column} />
                    <span className="min-w-0 break-all">{column.name}</span>
                  </button>
                </ColumnInfoPopover>
                <span className="shrink-0 font-mono text-[0.625rem] text-muted-foreground">
                  {column.dtype}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lineage and history. One failure message for both: they come from one
          query, so a partial rendering would be a lie about which part is
          missing. */}
      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">
            Could not load lineage: {error.message}
          </p>
        </div>
      ) : !data ? (
        <div className="text-xs text-muted-foreground">
          {loading ? "Loading lineage…" : null}
        </div>
      ) : (
        <>
          <DerivedFromSection
            edges={data.tableDataset.derivedFrom}
            // Not "acquired": nothing measures a feature table off an
            // instrument. A table with no parent edge is one that claims no data
            // underneath it at all.
            emptyTitle="Freestanding table"
            emptyDescription="This table names no parent, so its rows are not recorded as measured over any other data."
          />

          {/* Which BYTES this table came out of, next to which DATA it was
              computed from — two different questions, and both can have an
              answer. A file has no coordinate system, so these links place
              nothing, which is why they are their own section rather than more
              rows in `DerivedFromSection`. */}
          <FileLinksSection
            title="Loaded from"
            links={data.tableDataset.sourceFiles}
            emptyTitle="No source file"
            emptyDescription="These rows were written directly rather than loaded out of a CSV or parquet file held here."
          />

          <FileLinksSection
            title="Exported to"
            links={data.tableDataset.exports}
            emptyTitle="Never exported"
            emptyDescription="No file has been written out of this table."
          />

          <ProvenanceSection entries={data.tableDataset.provenanceEntries} />
        </>
      )}
    </div>
  );
};
