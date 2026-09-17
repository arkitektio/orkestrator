"use client";

import {
  type ColumnDef,
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
  X,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
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
import { type TableDatasetFragment } from "@/mikro-next/api/graphql";
import { cn } from "@/lib/utils";

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
});

const createIndexColumn = (rowIndexOffset: number): ColumnDef<Item> => ({
  id: "index",
  header: () => <div className="text-center font-medium">#</div>,
  cell: ({ row }) => (
    <div className="text-center text-sm text-muted-foreground">
      {rowIndexOffset + row.index + 1}
    </div>
  ),
  enableSorting: false,
  enableHiding: false,
});

// A COORDINATE column is an axis of the table's coordinate system — surface that
// so the reader can tell measurement columns apart from the space they live in.
const ColumnHeader = (props: {
  column: TableColumn;
  sortDirection: false | "asc" | "desc";
  onToggleSort: () => void;
}) => {
  const { column, sortDirection, onToggleSort } = props;

  return (
    <Button
      variant="ghost"
      onClick={onToggleSort}
      className={cn(
        "h-auto flex-col items-start gap-1 border px-2 py-1 font-medium transition-colors",
        sortDirection
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
          : "border-transparent",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="max-w-40 truncate">
          {column.longName ?? column.name}
        </span>
        {sortDirection === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : sortDirection === "desc" ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
        )}
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
          {column.role}
        </Badge>
        <span className="font-mono text-[10px] text-muted-foreground">
          {column.dtype}
          {column.unit ? ` · ${column.unit}` : ""}
        </span>
      </div>
    </Button>
  );
};

const calculateColumns = (
  columns: TableColumn[],
  options: {
    rowIndexOffset: number;
    sorting: SortingState;
    onColumnSortingChange: (
      columnName: string,
      direction: false | "asc" | "desc",
    ) => void;
  },
): ColumnDef<Item>[] => {
  const calculatedColumns: ColumnDef<Item>[] = [
    createSelectColumn(),
    createIndexColumn(options.rowIndexOffset),
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
            sortDirection={sortDirection}
            // Cycle asc → desc → none so a single control drives all three states.
            onToggleSort={() =>
              options.onColumnSortingChange(
                column.name,
                sortDirection === "asc"
                  ? "desc"
                  : sortDirection === "desc"
                    ? false
                    : "asc",
              )
            }
          />
        ),
        cell: ({ row }) => (
          <div className="text-center font-mono text-sm">
            {formatCellValue(row.getValue(column.name))}
          </div>
        ),
      });
    });

  return calculatedColumns;
};

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
    (columnName: string, direction: false | "asc" | "desc") => {
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

  const columns = React.useMemo(
    () =>
      calculateColumns(props.table.columns, {
        rowIndexOffset: pagination.pageIndex * pagination.pageSize,
        sorting,
        onColumnSortingChange: handleColumnSortingChange,
      }),
    [
      handleColumnSortingChange,
      pagination.pageIndex,
      pagination.pageSize,
      props.table.columns,
      sorting,
    ],
  );

  const columnNames = React.useMemo(
    () => props.table.columns.map((column) => column.name),
    [props.table.columns],
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
    state: {
      sorting,
      columnVisibility,
      pagination,
      rowSelection,
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
  });

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
          <DropdownMenuTrigger>
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

      {/* The rows are what scrolls — `min-h-0` lets this shrink below its
          content height so the search bar above and the pager below stay put
          instead of being pushed off the page by a full page of rows. */}
      <div className="flex min-h-0 flex-grow flex-col overflow-y-auto">
        <Table className="flex-grow">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="group/row">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
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
