"use client";

import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
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
  RenderGraphTableFilter,
  RenderGraphTableOrder,
  RenderGraphTablePagination,
  WhereOperator,
  useRenderGraphTableQuery
} from "@/kraph/api/graphql";
import { ViewOptions } from "../types";
import { calculateColumns, calculateRows } from "../utils";



export const RenderGraphQueryTable = (props: {
  graphQueryId: string;
  options?: ViewOptions;
}) => {
  const [search, setSearch] = React.useState<string>("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Which column the search box searches. `RenderGraphTableFilter` lost its
  // free-text `search` and gained `{ key, operator, value }` over a *returned
  // alias* — which is the only form that can work, since the old one was spliced
  // into raw Cypher ahead of its last RETURN and got `WITH` and `UNION` wrong.
  // Columns declare `searchable`, so the first one that does is the target.
  const [searchKey, setSearchKey] = React.useState<string | undefined>();

  const filters: RenderGraphTableFilter | undefined =
    search && searchKey
      ? { key: searchKey, operator: WhereOperator.Contains, value: search }
      : undefined;

  const paginationInput: RenderGraphTablePagination = {
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
  };

  const order: RenderGraphTableOrder | undefined =
    sorting.length > 0
      ? {
        key: sorting[0].id,
        direction: sorting[0].desc ? "DESC" : "ASC",
      }
      : undefined;

  const { data, loading, error } = useRenderGraphTableQuery({
    variables: {
      id: props.graphQueryId,
      filters,
      pagination: paginationInput,
      order,
    },
  });

  // Extract the Table from the response
  const table = data?.renderGraphTable;

  // The columns arrive with the first (unfiltered) render, which is enough: the
  // search box starts empty, so no filter is needed before they are known.
  React.useEffect(() => {
    const searchable = table?.query.columns.find((column) => column.searchable);
    if (searchable) setSearchKey(searchable.key);
  }, [table]);

  const columns = React.useMemo(() => calculateColumns(table), [table]);
  const rows = React.useMemo(() => calculateRows(table), [table]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactTable = useReactTable<{ [key: string]: any }>({
    data: rows || [],
    columns: columns || [],
    pageCount: -1,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
  });

  // Handle search with debouncing
  const debouncedSetSearch = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return (value: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setSearch(value);
          setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to first page on search
        }, 300);
      };
    }, []),
    [],
  );

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="w-full h-full">
      {!props.options?.minimal && (
        <div className="flex items-center py-4 gap-2">
          <Input
            placeholder="Search..."
            onChange={(event) => debouncedSetSearch(event.target.value)}
            className="max-w-sm w-full bg-background"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {reactTable
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div className="flex-grow flex flex-justify-between">
        <Table>
          <TableHeader>
            {reactTable.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : reactTable.getRowModel().rows?.length ? (
              reactTable.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
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
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {reactTable.getFilteredSelectedRowModel().rows.length} of{" "}
          {reactTable.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reactTable.previousPage();
            }}
            disabled={!reactTable.getCanPreviousPage() || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reactTable.nextPage();
            }}
            disabled={!reactTable.getCanNextPage() || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
