"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Download, RefreshCw } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FancyInput } from "@/components/ui/fancy-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ListStructuresQuery,
  Ordering,
  StructureKindFragment,
  StructureFilter,
  StructureOrder,
  useListStructuresQuery,
} from "@/kraph/api/graphql";
import { KraphStructure } from "@/linkers";
import { ViewOptions } from "../types";

const calculateColumns = (
  kind?: StructureKindFragment,
): ColumnDef<ListStructuresQuery["structures"][0]>[] => {
  const defaults: ColumnDef<ListStructuresQuery["structures"][0]>[] = [
    {
      id: "select",
      header: () => <div className="text-center">Select</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={() => row.toggleSelected()}
          >
            {row.getIsSelected() ? (
              <Badge className="h-4 w-4 flex items-center justify-center p-0">✓</Badge>
            ) : (
              <div className="h-4 w-4 border border-gray-400 rounded-sm" />
            )}
          </Button>
        </div>
      ),
      enableSorting: false,
      enableGlobalFilter: false,
    },
    {
      id: "id",
      accessorKey: "id",
      header: () => <div className="text-center">Open</div>,
      cell: ({ row }) => {
        const id = row.getValue("id") as string;
        return (
          <KraphStructure.DetailLink
            object={{ id }}
            className="items-center justify-center flex"
          >
            Open
          </KraphStructure.DetailLink>
        );
      },
      enableSorting: true,
      enableGlobalFilter: true,
    },
    {
      id: "label",
      // A structure has no label — `(identifier, object)` is how it is named.
      accessorFn: (x) => x.object,
      header: () => <div className="text-center">Object</div>,
      cell: ({ row }) => {
        const label = row.getValue("label") as string;
        return <div className="text-center">{label || ""}</div>;
      },
      enableSorting: true,
      enableGlobalFilter: true,
    },
    {
      id: "object",
      accessorFn: (x) => x.object,
      header: () => <div className="text-center">Object</div>,
      cell: ({ row }) => {
        const object = row.getValue("object") as string;
        return <div className="text-center font-mono text-xs">{object || ""}</div>;
      },
      enableSorting: true,
      enableGlobalFilter: true,
    },
    {
      id: "identifier",
      accessorFn: (x) => String(x.identifier),
      header: () => <div className="text-center">Identifier</div>,
      cell: ({ row }) => {
        const identifier = row.getValue("identifier") as string;
        return <div className="text-center font-mono text-xs">{identifier || ""}</div>;
      },
      enableSorting: true,
      enableGlobalFilter: true,
    },
    {
      id: "kindLabel",
      accessorFn: (x) => x.kind?.label || kind?.label || x.kind?.identifier || "",
      header: () => <div className="text-center">Category Label</div>,
      cell: ({ row }) => {
        const value = row.getValue("kindLabel") as string;
        return <div className="text-center">{value || ""}</div>;
      },
      enableSorting: true,
      enableGlobalFilter: true,
    },
    {
      id: "kindIdentifier",
      accessorFn: (x) => x.kind?.identifier || kind?.identifier || "",
      header: () => <div className="text-center">Category Identifier</div>,
      cell: ({ row }) => {
        const value = row.getValue("kindIdentifier") as string;
        return <div className="text-center font-mono text-xs">{value || ""}</div>;
      },
      enableSorting: true,
      enableGlobalFilter: true,
    },
  ];

  return defaults;
};

export const StructureList = (props: {
  kind?: StructureKindFragment;
  options?: ViewOptions;
}) => {
  const [searchInput, setSearchInput] = React.useState<string>("");
  const [search, setSearch] = React.useState<string>("");
  const [serverOrdering, setServerOrdering] = React.useState<Ordering>(Ordering.Desc);

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters: StructureFilter = React.useMemo(
    () => ({ search: search || undefined }),
    [search],
  );

  const ordering: StructureOrder[] = React.useMemo(
    () => [{ id: serverOrdering }],
    [serverOrdering],
  );

  const { data, loading, refetch, error } = useListStructuresQuery({
    variables: {
      id: props.kind?.id,
      filters,
      ordering,
      pagination: {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
      },
    },
  });

  const rows = React.useMemo(() => data?.structures || [], [data?.structures]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns = React.useMemo(() => calculateColumns(props.kind), [props.kind]);

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: -1,
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
  });

  const exportToCSV = () => {
    if (rows.length === 0) return;

    const headers = [
      "id",
      "object",
      "identifier",
      "kindLabel",
      "kindIdentifier",
    ];

    const csvHeaders = headers.join(",");

    const csvRows = rows.map((row) => {
      const values = [
        row.id,
        row.object || "",
        String(row.identifier || ""),
        row.kind?.label || props.kind?.label || "",
        row.kind?.identifier || props.kind?.identifier || "",
      ];

      return values
        .map((value) => {
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",");
    });

    const csv = [csvHeaders, ...csvRows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${props.kind?.label || props.kind?.identifier || "structures"}_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full bg-card text-card-foreground border rounded-xl flex flex-col overflow-hidden">
      {error && (
        <div className="p-4 bg-red-600 text-white">Error loading structures: {error.message}</div>
      )}

      {!props.options?.minimal && (
        <div className="py-4 bg-secondary/20 px-3 rounded-md rounded-top flex-initial">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 max-w-lg w-lg">
              <FancyInput
                placeholder="Search structures..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-black"
              />
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">{props.kind?.label || props.kind?.identifier}</Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {props.kind?.identifier}
              </Badge>

              <Select
                value={serverOrdering}
                onValueChange={(value) => {
                  setServerOrdering(value as Ordering);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Ordering.Desc}>Newest first</SelectItem>
                  <SelectItem value={Ordering.Asc}>Oldest first</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="outline">
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
                  <DropdownMenuSeparator />
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={rows.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow flex flex-justify-between overflow-y-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-secondary/20">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4 flex-initial px-2 border-t">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StructureList;
