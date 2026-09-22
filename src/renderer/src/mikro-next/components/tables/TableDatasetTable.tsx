"use client";

import {
  type ColumnDef,
  type ColumnSizingState,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Tags,
  X,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type TableDatasetFragment,
  useGetTableDatasetAnchorsQuery,
} from "@/mikro-next/api/graphql";
import { cn } from "@/lib/utils";

import {
  ColumnAxisGlyph,
  ColumnInfoPopover,
  type SortDirection,
} from "./ColumnInfoPopover";
import {
  MIN_COLUMN_WIDTH,
  mergeMeasuredWidths,
  unsizedColumns,
} from "./columnSizing";
import { TableAnchorsOverlay, type ThinTableAnchor } from "./TableAnchorsOverlay";
import { anchorCaption, partitionTableAnchors } from "./tableAnchors";
import {
  type DuckDbColumnFilters,
  rowsToCsv,
  useDuckDbTable,
} from "./useDuckDbTable";

export type Item = Record<string, unknown>;

type TableColumn = TableDatasetFragment["columns"][number];

const formatCellValue = (value: unknown) => {
  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

// Rows arrive one DuckDB page at a time and carry no server-side identity, so a
// selection has to be keyed by the values themselves. A positional key would
// make a row picked on page 1 come back selected on page 2, and re-sorting
// would move the selection onto whichever row landed in that slot. Rows that
// are byte-identical do share a key and therefore toggle together — which is
// the only honest answer for rows nothing can tell apart.
export const resolveRowKey = (row: Item, columnNames: string[]) => {
  if (typeof row.id === "string") {
    return row.id;
  }

  return columnNames
    .map((columnName) => JSON.stringify(row[columnName] ?? null))
    .join("\u0001");
};

// Keys the table can switch *on* always belong to the current page, so their
// record is in `pageRowsByKey`; keys it leaves untouched belong to other pages
// and keep the record captured when they were picked. Anything it switches off
// is dropped, record and all.
export const mergeRowSelection = (
  current: Record<string, Item>,
  next: RowSelectionState,
  pageRowsByKey: Record<string, Item>,
): Record<string, Item> =>
  Object.entries(next).reduce<Record<string, Item>>(
    (accumulated, [key, isSelected]) => {
      if (!isSelected) {
        return accumulated;
      }

      const row = current[key] ?? pageRowsByKey[key];

      if (row) {
        accumulated[key] = row;
      }

      return accumulated;
    },
    {},
  );

// A table of numbers is here to be read, so the checkboxes stay out of the way
// until the pointer (or the keyboard) asks for them: hidden by default, faded
// in on the row under the cursor, and held visible for as long as the box is
// ticked. The column keeps its width either way, so revealing one does not
// shift the numbers sideways mid-read.
const SELECT_REVEAL_CLASSES =
  "border-border bg-background opacity-0 ring-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100";

const createSelectColumn = (): ColumnDef<Item> => ({
  id: "select",
  header: ({ table }) => {
    const someSelected =
      table.getIsAllPageRowsSelected() || table.getIsSomePageRowsSelected();

    return (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all rows on this page"
        className={cn(SELECT_REVEAL_CLASSES, someSelected && "opacity-100")}
      />
    );
  },
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
      className={cn(
        SELECT_REVEAL_CLASSES,
        row.getIsSelected() && "opacity-100",
      )}
    />
  ),
  enableSorting: false,
  enableHiding: false,
  enableResizing: false,
});

// The row number, plus a marker when a coordinate anchor pins this row —
// the table's twin of the viewport overlay's in-view rule, at row grain, so
// the anchored slices are findable while paging. The glyph's slot is always
// reserved: a page with no marked rows must lay out exactly like one with
// them, or the numbers shift between pages.
const createIndexColumn = (
  rowIndexOffset: number,
  anchorLabelsForRow: (rowKey: string) => readonly string[],
): ColumnDef<Item> => ({
  id: "index",
  header: () => <div className="text-center font-medium">#</div>,
  cell: ({ row }) => {
    // `row.id` is already the value key (`getRowId`), so no second hash here.
    const labels = anchorLabelsForRow(row.id);

    return (
      <div className="flex items-center justify-center gap-0.5 text-sm text-muted-foreground">
        <span>{rowIndexOffset + row.index + 1}</span>
        <span
          className="inline-flex h-2.5 w-2.5 shrink-0 items-center"
          title={labels.length ? labels.join(", ") : undefined}
          aria-hidden={labels.length === 0}
        >
          {labels.length > 0 && (
            <Tags className="h-2.5 w-2.5 text-muted-foreground/70" />
          )}
        </span>
      </div>
    );
  },
  enableSorting: false,
  enableHiding: false,
});

// One quiet line per column: the name, which opens the column's popover, and
// a sort control that only shows itself when the row is hovered or the column
// is sorted. Everything the header used to spell out under the name — role
// badge, dtype, unit — is in the popover now, so a wide table reads as its
// numbers rather than as a row of badges. Two sibling buttons, not one: the
// popover trigger is itself a button, and a button inside a button is
// invalid HTML that Radix also warns about.
const ColumnHeader = (props: {
  column: TableColumn;
  store: TableDatasetFragment["store"];
  sortDirection: SortDirection;
  onSort: (direction: SortDirection) => void;
  onHide: () => void;
}) => {
  const { column, store, sortDirection, onSort, onHide } = props;

  // Cycle asc → desc → none so the one arrow drives all three states.
  const toggleSort = () =>
    onSort(
      sortDirection === "asc" ? "desc" : sortDirection === "desc" ? false : "asc",
    );

  return (
    // Centred over the column, because the values under it are: a header
    // hugging the left edge of a wide column stops reading as the label of
    // the numbers below it. The sort control trails the name rather than
    // being pinned to the cell's edge, so the fitting pass measures it and
    // it can never land on top of a long name.
    <div className="flex items-center justify-center gap-0.5">
      <ColumnInfoPopover
        column={column}
        store={store}
        actions={{ sortDirection, onSort, onHide }}
      >
        <button
          type="button"
          title={`${column.dtype}${column.unit != null ? ` · ${String(column.unit)}` : ""}`}
          className="flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-center font-medium transition-colors hover:bg-accent"
        >
          <ColumnAxisGlyph column={column} />
          <span className="max-w-40 truncate">
            {column.longName ?? column.name}
          </span>
        </button>
      </ColumnInfoPopover>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Sort by ${column.name}`}
        onClick={toggleSort}
        // `opacity-0`, not `hidden`: the width stays reserved so revealing
        // the arrow on hover does not shift the column sideways.
        className={cn(
          "h-6 w-6 shrink-0 transition-opacity",
          sortDirection
            ? "text-primary opacity-100"
            : "opacity-0 group-hover/row:opacity-60 focus-visible:opacity-100",
        )}
      >
        {sortDirection === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : sortDirection === "desc" ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
};

const calculateColumns = (
  columns: TableColumn[],
  options: {
    store: TableDatasetFragment["store"];
    rowIndexOffset: number;
    sorting: SortingState;
    onColumnSortingChange: (
      columnName: string,
      direction: SortDirection,
    ) => void;
    onHideColumn: (columnName: string) => void;
    anchorLabelsForRow: (rowKey: string) => readonly string[];
  },
): ColumnDef<Item>[] => {
  const calculatedColumns: ColumnDef<Item>[] = [
    createSelectColumn(),
    createIndexColumn(options.rowIndexOffset, options.anchorLabelsForRow),
  ];

  [...columns]
    .sort((a, b) => a.order - b.order)
    .forEach((column) => {
      const activeSort = options.sorting.find(
        (entry) => entry.id === column.name,
      );
      const sortDirection = activeSort
        ? activeSort.desc
          ? "desc"
          : "asc"
        : false;

      calculatedColumns.push({
        id: column.name,
        accessorKey: column.name,
        header: () => (
          <ColumnHeader
            column={column}
            store={options.store}
            sortDirection={sortDirection}
            onSort={(direction) =>
              options.onColumnSortingChange(column.name, direction)
            }
            onHide={() => options.onHideColumn(column.name)}
          />
        ),
        cell: ({ row }) => {
          const text = formatCellValue(row.getValue(column.name));
          // Widths are fixed after the first fit, so a longer value on a
          // later page clips rather than widening the column under the
          // reader; the whole value stays one hover away.
          return (
            <div className="truncate text-center font-mono text-sm" title={text}>
              {text}
            </div>
          );
        },
      });
    });

  return calculatedColumns;
};

const EMPTY_ANCHORS: readonly ThinTableAnchor[] = [];
const EMPTY_LABELS: readonly string[] = [];

export const TableDatasetTable = (props: { table: TableDatasetFragment }) => {
  "use no memo";

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = React.useState("");
  const [columnFilters] = React.useState<DuckDbColumnFilters>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  // Fitted once from the first page, then kept — see `columnSizing.ts`.
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = React.useState(false);
  // The selection stores the row *data*, not just its key: a row selected on
  // page 1 is gone from `rows` by the time the user hits export on page 4, and
  // there is no id to re-query it by. Keeping the record means a selection
  // export is a client-side write with no second trip to DuckDB.
  const [selectedRows, setSelectedRows] = React.useState<Record<string, Item>>(
    {},
  );

  const { rows, totalRowCount, loading, error, exportAsCsv } = useDuckDbTable({
    table: props.table,
    pagination,
    sorting,
    search,
    columnFilters,
  });

  const handleColumnSortingChange = React.useCallback(
    (columnName: string, direction: SortDirection) => {
      setSorting((current) => {
        const existingIndex = current.findIndex(
          (entry) => entry.id === columnName,
        );

        if (direction === false) {
          return existingIndex === -1
            ? current
            : current.filter((entry) => entry.id !== columnName);
        }

        if (existingIndex === -1) {
          return [...current, { id: columnName, desc: direction === "desc" }];
        }

        return current.map((entry, index) =>
          index === existingIndex
            ? { ...entry, desc: direction === "desc" }
            : entry,
        );
      });
    },
    [],
  );

  const handleHideColumn = React.useCallback((columnName: string) => {
    setColumnVisibility((current) => ({ ...current, [columnName]: false }));
  }, []);

  const columnNames = React.useMemo(
    () => props.table.columns.map((column) => column.name),
    [props.table.columns],
  );

  // The thin projection of the table's coordinate anchors: enough for the
  // row markers and the overlay's collapsed pill. The full payload is the
  // overlay's business, fetched when it unfolds. Cache-first: anchors do not
  // change while the table is on screen.
  const { data: anchorsData } = useGetTableDatasetAnchorsQuery({
    variables: { id: props.table.id },
    fetchPolicy: "cache-first",
  });
  const anchors: readonly ThinTableAnchor[] =
    anchorsData?.tableDataset.anchors ?? EMPTY_ANCHORS;

  // One partition per page, shared by the markers and the overlay so they
  // agree about what is in view. Keyed on exactly the inputs that move it —
  // a search keystroke reaches it only once DuckDB answers with new rows.
  const anchorPartition = React.useMemo(
    () =>
      partitionTableAnchors(anchors, rows, (row) =>
        resolveRowKey(row, columnNames),
      ),
    [anchors, columnNames, rows],
  );

  const anchorLabelsByRowKey = React.useMemo(() => {
    const map = new Map<string, string[]>();
    anchorPartition.inView.forEach(({ anchor, pins, rowKeys }) => {
      const caption = anchorCaption(anchor, pins);
      rowKeys.forEach((rowKey) => {
        const labels = map.get(rowKey);
        if (labels) labels.push(caption);
        else map.set(rowKey, [caption]);
      });
    });
    return map;
  }, [anchorPartition]);

  // Stable across renders that do not move the partition — it is a column
  // definition input, and a fresh function would rebuild every column def.
  const anchorLabelsForRow = React.useCallback(
    (rowKey: string): readonly string[] =>
      anchorLabelsByRowKey.get(rowKey) ?? EMPTY_LABELS,
    [anchorLabelsByRowKey],
  );

  const columns = React.useMemo(
    () =>
      calculateColumns(props.table.columns, {
        store: props.table.store,
        rowIndexOffset: pagination.pageIndex * pagination.pageSize,
        sorting,
        onColumnSortingChange: handleColumnSortingChange,
        onHideColumn: handleHideColumn,
        anchorLabelsForRow,
      }),
    [
      anchorLabelsForRow,
      handleColumnSortingChange,
      handleHideColumn,
      pagination.pageIndex,
      pagination.pageSize,
      props.table.columns,
      props.table.store,
      sorting,
    ],
  );

  const pageRowsByKey = React.useMemo(() => {
    const map: Record<string, Item> = {};

    rows.forEach((row) => {
      map[resolveRowKey(row, columnNames)] = row;
    });

    return map;
  }, [columnNames, rows]);

  const rowSelection = React.useMemo<RowSelectionState>(
    () =>
      Object.fromEntries(Object.keys(selectedRows).map((key) => [key, true])),
    [selectedRows],
  );

  const handleRowSelectionChange = React.useCallback<
    OnChangeFn<RowSelectionState>
  >(
    (updater) => {
      setSelectedRows((current) => {
        const currentSelection: RowSelectionState = Object.fromEntries(
          Object.keys(current).map((key) => [key, true]),
        );
        const next =
          typeof updater === "function" ? updater(currentSelection) : updater;

        return mergeRowSelection(current, next, pageRowsByKey);
      });
    },
    [pageRowsByKey],
  );

  const selectedRowList = React.useMemo(
    () => Object.values(selectedRows),
    [selectedRows],
  );

  const clearSelection = React.useCallback(() => {
    setSelectedRows({});
  }, []);

  const clearGlobalSearch = React.useCallback(() => {
    setSearch("");
  }, []);

  React.useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [props.table.id, search]);

  React.useEffect(() => {
    setSearch("");
    setSorting([]);
    setSelectedRows({});
    // Another table is another sheet: its columns fit themselves afresh.
    setColumnSizing({});
  }, [props.table.id]);

  const pageCount = Math.max(1, Math.ceil(totalRowCount / pagination.pageSize));
  const pageStart =
    totalRowCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const pageEnd = Math.min(
    totalRowCount,
    (pagination.pageIndex + 1) * pagination.pageSize,
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    getRowId: (row) => resolveRowKey(row, columnNames),
    enableRowSelection: true,
    enableColumnResizing: true,
    // Live: the column follows the pointer while it is dragged, as a
    // spreadsheet's does, rather than snapping on release.
    columnResizeMode: "onChange",
    defaultColumn: { minSize: MIN_COLUMN_WIDTH },
    state: {
      sorting,
      columnVisibility,
      columnSizing,
      pagination,
      rowSelection,
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: handleRowSelectionChange,
  });

  // The grid is in `auto` layout while any visible column has no width yet,
  // and in `fixed` layout at the recorded widths once every column has one.
  const fitting =
    unsizedColumns(
      table.getVisibleLeafColumns().map((column) => column.id),
      columnSizing,
    ).length > 0;
  // A fit needs content to fit against: the first page of rows, or the
  // headers alone for a table that has no rows at all. Fitting against a
  // "Loading…" placeholder would size every column to its header.
  const canFit = !loading && (rows.length > 0 || totalRowCount === 0);

  // Layout effect, not effect: the measurement and the switch to fixed
  // widths happen before the auto-layout frame is painted, so the reader
  // never sees the columns fitted and then re-fitted.
  React.useLayoutEffect(() => {
    if (!fitting || !canFit) return;
    const root = gridRef.current;
    if (!root) return;
    const measured = Array.from(
      root.querySelectorAll<HTMLTableCellElement>("th[data-column-id]"),
    ).map((cell) => ({
      id: cell.dataset.columnId ?? "",
      width: cell.getBoundingClientRect().width,
    }));
    const next = mergeMeasuredWidths(columnSizing, measured);
    if (next) setColumnSizing(next);
  }, [canFit, columnSizing, fitting, rows]);

  const visibleExportColumns = React.useMemo(
    () =>
      props.table.columns
        .map((column) => column.name)
        .filter((columnName) => table.getColumn(columnName)?.getIsVisible()),
    // `table` is a stable instance, so hiding a column would not otherwise
    // recompute this and the export would carry the column it just lost.
    [columnVisibility, props.table.columns, table],
  );

  const downloadCsv = React.useCallback(
    (csv: string, suffix = "") => {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = props.table.name
        .replace(/[^a-z0-9-_]+/gi, "_")
        .replace(/^_+|_+$/g, "");

      link.href = url;
      link.download = `${safeName || "tabledataset"}${suffix}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    [props.table.name],
  );

  const handleExportCsv = React.useCallback(async () => {
    setExporting(true);

    try {
      downloadCsv(await exportAsCsv(visibleExportColumns));
    } finally {
      setExporting(false);
    }
  }, [downloadCsv, exportAsCsv, visibleExportColumns]);

  // No query for this one — the picked rows are already in memory, and going
  // back to DuckDB could not reproduce a selection that spans pages anyway.
  const handleExportSelectionCsv = React.useCallback(() => {
    downloadCsv(rowsToCsv(selectedRowList, visibleExportColumns), "_selection");
  }, [downloadCsv, selectedRowList, visibleExportColumns]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-initial flex-wrap items-center gap-2 py-4">
        <div className="relative w-full max-w-sm">
          <Input
            placeholder="Search all columns..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-background pr-9"
          />
          {search ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={clearGlobalSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        {error && (
          <div className="text-xs text-destructive">{error.message}</div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={loading || exporting || totalRowCount === 0}
        >
          <ArrowDownToLine className="mr-2 h-4 w-4" />
          {exporting
            ? "Exporting..."
            : selectedRowList.length
              ? "Export all rows"
              : "Export as CSV"}
        </Button>

        {/* Only worth a control once there is a selection to export — an always
            visible button that is disabled most of the time reads as broken. */}
        {selectedRowList.length ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleExportSelectionCsv}
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Export {selectedRowList.length} selected
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* `relative` so the anchors overlay docks to the visible rows area, not
          the page. It must sit OUTSIDE the scroll container — inside it would
          scroll away with the rows and be clipped by the overflow — and
          outside `Table`'s own `relative overflow-x-auto` box, which is as
          tall as the whole table rather than the part on screen. */}
      <div className="relative flex min-h-0 flex-grow flex-col">
        {/* The rows are what scrolls — `min-h-0` lets this shrink below its
            content height so the search bar above and the pager below stay put
            instead of being pushed off the page by a full page of rows. */}
        <div
          ref={gridRef}
          className="flex min-h-0 flex-grow flex-col overflow-y-auto"
        >
          {/* The table's width is the SUM of its columns, not the container's:
              in a fixed layout a 100% table hands its spare width out to the
              columns and quietly undoes what the reader just dragged. */}
          <Table
            className="flex-grow"
            style={
              fitting
                ? undefined
                : { width: table.getTotalSize(), tableLayout: "fixed" }
            }
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="group/row">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      data-column-id={header.column.id}
                      className="relative"
                      style={
                        columnSizing[header.column.id] !== undefined
                          ? { width: header.getSize() }
                          : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      {header.column.getCanResize() && (
                        // The divider a spreadsheet has: drag to resize,
                        // double-click to fit the column to its content again.
                        //
                        // `inset-y-0`, never `h-full`: a percentage height
                        // inside a table cell resolves against a height the
                        // cell computes from its content, so `h-full` came
                        // out as zero and the handle could not be grabbed.
                        //
                        // The line is always drawn — faintly — because a
                        // control that appears only once the pointer is
                        // already on it cannot be found. The hit area is
                        // wider than the line it paints.
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Resize ${header.column.id}`}
                          title="Drag to resize · double-click to fit"
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => header.column.resetSize()}
                          className={cn(
                            "absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none select-none",
                            "after:absolute after:inset-y-1 after:right-0 after:w-px after:bg-border after:transition-colors",
                            "group-hover/row:after:bg-muted-foreground/50",
                            "hover:after:w-0.5 hover:after:bg-primary",
                            header.column.getIsResizing() &&
                              "after:w-0.5 after:bg-primary",
                          )}
                        />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            {/* The previous page stays on screen, dimmed, while the next one
                loads: swapping twenty-five rows for one "Loading…" line and
                back is a flash on every sort, and there is nothing in it for
                the reader. The placeholder is for the very first load only. */}
            <TableBody
              className={cn(loading && rows.length > 0 && "opacity-50")}
            >
              {loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group/row"
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TableAnchorsOverlay
          tableId={props.table.id}
          anchors={anchors}
          partition={anchorPartition}
        />
      </div>

      <div className="flex flex-initial items-center justify-end space-x-2 py-4">
        <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {pageStart}-{pageEnd} of {totalRowCount} rows.
          </span>
          {/* Selections survive paging, so the count has to be visible from any
              page — otherwise rows picked earlier are exported unannounced. */}
          {selectedRowList.length ? (
            <>
              <span className="text-foreground">
                {selectedRowList.length} row(s) selected.
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </>
          ) : null}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={pagination.pageIndex === 0 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={pagination.pageIndex + 1 >= pageCount || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TableDatasetTable;
