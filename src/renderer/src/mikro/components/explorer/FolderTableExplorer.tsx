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
import {
  ArrowUpDown,
  ChevronDown,
  Columns3,
  LayoutList,
  ListIcon,
  MoreHorizontal,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/core/ui/button";
import { Checkbox } from "@/core/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
  PageActionGroup,
} from "@/core/ui/page-action";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/ui/table";

import { Sidebars } from "@/core/layout/Sidebars";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { MikroArrayDataset, MikroFile, MikroFolder, MikroTableDataset } from "@/core/linkers";
import { SlotSections } from "@/core/layout/PageSections";
import {
  ChildrenQuery,
  FolderFragment,
  useChildrenQuery,
} from "@/mikro/api/graphql";
import { ViewType } from "@/mikro/pages/FolderPage";
import { ProvenanceSidebar } from "../sidebars/ProvenanceSidebar";
import { datasetStoredBytes, formatBytes } from "../../specs";
import { DatasetStoredSize } from "./DatasetStoredSize";

export type Item = ChildrenQuery["children"][0];

export const columns: ColumnDef<Item>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="ring-0 border-border bg-background"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="ring-0 border-border bg-background"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "id",
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="capitalize text-center items-center mx-auto">
        {row.getValue("id")}
      </span>
    ),
  },
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const item = row.original;
      const name = row.getValue("name") as string;

      switch (item.__typename) {
        case "Folder":
          return (
            <MikroFolder.DetailLink object={item} className="lowercase">
              {name}
            </MikroFolder.DetailLink>
          );
        case "File":
          return (
            <MikroFile.DetailLink object={item} className="lowercase">
              {name}
            </MikroFile.DetailLink>
          );
        case "ArrayDataset":
          return (
            <MikroArrayDataset.DetailLink object={item} className="lowercase">
              {name}
            </MikroArrayDataset.DetailLink>
          );
        case "TableDataset":
          return (
            <MikroTableDataset.DetailLink object={item} className="lowercase">
              {name}
            </MikroTableDataset.DetailLink>
          );
        // Mesh and annotation collections have no detail route yet.
        default:
          return <span className="lowercase">{name}</span>;
      }
    },
  },
  {
    id: "type",
    accessorKey: "__typename",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="capitalize">{row.getValue("type")}</span>
    ),
  },
  {
    // A file's size, or what a dataset's stores hold on disk. Undefined when
    // the API does not say (other kinds, stores measured before sizeBytes).
    id: "size",
    accessorFn: (item) => {
      if (item.__typename === "File") return item.size ?? undefined;
      if (item.__typename === "ArrayDataset") return datasetStoredBytes(item.dataArrays);
      return undefined;
    },
    sortUndefined: "last",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const item = row.original;
      if (item.__typename === "ArrayDataset" && datasetStoredBytes(item.dataArrays) !== undefined) {
        return <DatasetStoredSize dataArrays={item.dataArrays} axisNames={item.axisNames} />;
      }
      const bytes = row.getValue<number | undefined>("size");
      return <span>{bytes === undefined ? "-" : formatBytes(bytes)}</span>;
    },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Acquired At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="capitalize">{row.getValue("createdAt")}</span>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const item = row.original;
      const id = "id" in item ? item.id : undefined;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => id && navigator.clipboard.writeText(id)}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem>View payment details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

const calculateColumns = () => {
  const calculated_columns = columns;

  return calculated_columns;
};

export type FormValues = {
  metrics?: string[];
  kinds?: string[];
  search?: string | null;
};

export const FolderTableExplorer = (props: {
  folder: FolderFragment;
  setView: (type: ViewType) => void;
}) => {
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  });
  // The search box is bound to `search`; the server only sees it once the
  // user pauses, and every new term starts back on page 0.
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, loading } = useChildrenQuery({
    variables: {
      id: props.folder.id,
      pagination: {
        offset: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
      },
      filters: {
        search: debouncedSearch || undefined,
      },
    },
  });

  const handleSearchChange = React.useCallback((value: string) => {
    setSearch(value);
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
    );
  }, []);

  // `children` has no total in the schema, so "there is a next page" means
  // "this page came back full".
  const rows = data?.children ?? [];
  const hasNextPage = rows.length === pagination.pageSize;

  const [columns] = React.useState<ColumnDef<Item>[]>(() =>
    calculateColumns(),
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: -1,
    manualPagination: true,
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

  return (
    <MikroFolder.ModelPage
      object={props.folder}
      title={props.folder.name}
      actions={<MikroFolder.Actions object={props.folder} />}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <SlotSections
              slot="knowledge"
              identifier="@mikro/folder"
              object={props.folder}
            />
          </Sidebars.Tab>
          <Sidebars.Tab label="Provenance">
            <ProvenanceSidebar items={props.folder.provenanceEntries} />
          </Sidebars.Tab>
        </Sidebars>
      }
      pageActions={
        <>
          {/* The table's own chrome lives on the page's action row; the list
              below is only the list. */}
          <CollapsibleSearch
            alwaysShow
            value={search}
            onChange={handleSearchChange}
            placeholder="Search…"
          />
          <PageAction.Slot collapse="icon" priority={-10}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionTrigger aria-label="Columns">
                  <Columns3 className="h-4 w-4" />
                  <ActionLabel>
                    Columns
                    <ChevronDown className="h-4 w-4" />
                  </ActionLabel>
                </ActionTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
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
          </PageAction.Slot>

          {/* One control: a view picker missing half its options is a trap. */}
          <PageActionGroup priority={10} className="gap-0">
            <PageAction
              size="sm"
              icon={<ListIcon />}
              menuLabel="List view"
              aria-label="List view"
              className="rounded-r-none"
              onClick={() => props.setView("list")}
              disabled={true}
            />
            <PageAction
              size="sm"
              icon={<LayoutList />}
              menuLabel="Icon view"
              aria-label="Icon view"
              className="rounded-l-none border-l-0"
              onClick={() => props.setView("icons")}
            />
          </PageActionGroup>
        </>
      }
    >
      <div className="w-full h-full">
        <div className="w-full h-full">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
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
                  <TableCell colSpan={columns.length} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
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
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={loading || !table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={loading || !hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </MikroFolder.ModelPage>
  );
};
