"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Download } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { FancyInput } from "@/components/ui/fancy-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  EntityCategoryFragment,
  EntityFilter,
  EntityNodesQuery,
  PropertyDefinitionFragment,
  ValueKind,
  useEntityNodesQuery,
  useGetEntityQuery,
  useAssertMetricValueMutation
} from "@/kraph/api/graphql";
import { buildItoldyousoMetric, isManuallyAssertable } from "@/kraph/lib/itoldyouso";
import { KraphNode } from "@/linkers";
import { Plus, RefreshCw } from "lucide-react";
import Timestamp from "@/components/ui/timestamp";
import { ViewOptions } from "../types";


export type FormValues = {
  metrics?: string[];
  kinds?: string[];
  search?: string | null;
};


const toEditValue = (value: any, kind: ValueKind) => {
  switch (kind) {
    case ValueKind.Int:
      return parseInt(value);
    case ValueKind.Float:
      return parseFloat(value);
    case ValueKind.Boolean:
      return value === "true" || value === true;
    case ValueKind.Datetime:
      return value ? new Date(value * 1000) : undefined;
    default:
      return value;
  }
};


const EditableCell = ({
  value,
  nodeId,
  propertyDefinition,
}: {
  value: any;
  nodeId: string;
  propertyDefinition: PropertyDefinitionFragment;
}) => {

  const [assertMetricValue] = useAssertMetricValueMutation();

  // Properties are derived, so a hand-entered value goes in as the weakest
  // evidence there is: an "itoldyouso" metric with no measurement behind it.
  const setNodeProperty = (value: unknown) =>
    assertMetricValue({
      variables: {
        input: buildItoldyousoMetric({
          entityId: nodeId,
          key: propertyDefinition.key,
          valueKind: propertyDefinition.valueKind,
          value,
          unit: propertyDefinition.unit,
        }),
      },
    });

  const assertable = isManuallyAssertable(propertyDefinition.valueKind);
  const [editingValue, setEditingValue] = React.useState(value);
  const [isEditing, setIsEditing] = React.useState(false);

  const handleBlur = () => {
    setIsEditing(false);
    if (editingValue !== value) {
      setNodeProperty(editingValue);
    }
  }

  const onDateChange = (newValue: Date | undefined) => {
    if (!newValue) return;
    setNodeProperty(newValue.toISOString());
    setIsEditing(false);
  };

  const handleBooleanChange = (checked: boolean) => {
    setEditingValue(checked);
    setNodeProperty(checked);
  }

  const renderEditWidget = () => {
    const kind = propertyDefinition.valueKind;

    switch (kind) {
      case ValueKind.Boolean:
        return (
          <div className="flex items-center justify-center p-2">
            <Switch
              checked={editingValue}
              onCheckedChange={handleBooleanChange}
            />
          </div>
        );

      case ValueKind.Int:
        return (
          <Input
            type="number"
            step="1"
            value={editingValue || ""}
            onChange={(e) => setEditingValue(parseInt(e.target.value) || 0)}
            onBlur={handleBlur}
            autoFocus
            className="h-8"
          />
        );

      case ValueKind.Float:
        return (
          <Input
            type="number"
            step="any"
            value={editingValue || ""}
            onChange={(e) => setEditingValue(parseFloat(e.target.value) || 0)}
            onBlur={handleBlur}
            autoFocus
            className="h-8"
          />
        );

      case ValueKind.Datetime:
        return (
          <DateTimePicker value={editingValue} onChange={onDateChange} className="h-8" />
        );

      case ValueKind.String:
      case ValueKind.Category:
      default:
        return (
          <Input
            value={editingValue || ""}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            className="h-8"
          />
        );
    }
  };

  const formatDisplayValue = (val: any, kind: ValueKind) => {
    if (val === null || val === undefined) {
      return <span className="text-muted-foreground italic">None</span>;
    }

    switch (kind) {
      case ValueKind.Boolean:
        return (
          <Badge variant={val ? "default" : "secondary"}>
            {val ? "True" : "False"}
          </Badge>
        );

      case ValueKind.Int:
      case ValueKind.Float:
        return (
          <span className="font-mono text-sm">
            {typeof val === "number" ? val.toLocaleString() : val}
          </span>
        );

      case ValueKind.Datetime:
        return (
          <Timestamp date={val} autoUpdate relative />
        );

      case ValueKind.Category:
        return (
          <Badge variant="outline">
            {String(val)}
          </Badge>
        );

      case ValueKind.String:
      default:
        return <span className="text-sm">{String(val)}</span>;
    }
  };

  const renderDisplayValue = () => {
    const kind = propertyDefinition.valueKind;

    if (kind === ValueKind.Boolean) {
      return (
        <div className="flex items-center justify-center">
          <Switch
            checked={value}
            disabled={!assertable}
            onCheckedChange={handleBooleanChange}
          />
        </div>
      );
    }

    // Vector kinds beyond 3D have no metric column, so there is no way to
    // assert them by hand — those cells stay read-only.
    if (!assertable) {
      return (
        <div className="px-2 py-1.5 min-h-[32px] flex items-center justify-center">
          {formatDisplayValue(value, kind)}
        </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded min-h-[32px] flex items-center justify-center"
        onClick={() => setIsEditing(true)}
      >
        {formatDisplayValue(value, kind)}
      </div>
    );
  };

  return isEditing ? renderEditWidget() : renderDisplayValue();
};


const calculateColumns = (
  category: EntityCategoryFragment,
): ColumnDef<EntityNodesQuery["entities"][0]>[] => {
  if (!category) {
    return [];
  }


  const defaults = [
    {
      id: "select",
      header: () => <div className="text-center">Select</div>,
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center">
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={() => {
              row.toggleSelected();
            }}>
              {row.getIsSelected() ? (
                <Badge className="h-4 w-4 flex items-center justify-center p-0">
                  ✓
                </Badge>
              ) : (
                <div className="h-4 w-4 border border-gray-400 rounded-sm" />
              )}
            </Button>
          </div>
        );
      },
      enableSorting: false,
      enableGlobalFilter: false,
    },
    {
      id: "id",
      accessorKey: "id",
      header: () => <div className="text-center">Open</div>,
      cell: ({ row }) => {
        const label = row.getValue("id") as string;

        return (
          <KraphNode.DetailLink object={{ id: label }} className={"items-center justify-center flex"}>
            Open
          </KraphNode.DetailLink>
        );
      },
      enableSorting: true,
      enableGlobalFilter: true,
    },

    {
      id: "label",
      accessorFn: (x) => x.__typename === "Entity" && x.label,
      header: () => <div className="text-center">Label</div>,
      cell: ({ row }) => {
        const label = row.getValue("label") as string;

        return <div className="text-center">{label || ""}</div>;
      },
      enableSorting: true,
      enableGlobalFilter: true,
    },
  ];

  category.propertyDefinitions?.forEach((variable) => {
    defaults.push({
      id: variable.key,
      accessorFn: (x) =>
        x.__typename === "Entity"
          ? x.properties
            ? (x.properties as Record<string, any>)[variable.key]
            : undefined
          : undefined,
      header: () => (
        <div className="flex items-center justify-center gap-1">

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{variable.label || variable.key}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1.5">
                  <div>
                    <span className="font-semibold">Key: </span>
                    <span className="font-mono text-xs">{variable.key}</span>
                  </div>
                  {variable.label && (
                    <div>
                      <span className="font-semibold">Label: </span>
                      <span>{variable.label}</span>
                    </div>
                  )}
                  {variable.description && (
                    <div>
                      <span className="font-semibold">Description: </span>
                      <span className="text-sm">{variable.description}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Type: </span>
                    <span className="font-mono text-xs">
                      {variable.valueKind.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      cell: ({ row }) => {
        const value = row.getValue(variable.key) as string;
        const id = row.getValue("id") as string;
        return <EditableCell value={toEditValue(value, variable.valueKind)} nodeId={id} propertyDefinition={variable} />;
      },
      enableSorting: true,
      enableGlobalFilter: true,
    });
  });




  return defaults;
};

const calculateRows = (entities: EntityNodesQuery["entities"] | undefined) => {
  const rowObjects = entities;
  return rowObjects;
};


export const RowEntity = ({
  row,
  graphId,
}: {
  row: Row<EntityNodesQuery["entities"][0]>;
  // An entity is a *drawing*, so reading one needs the graph that drew it. It
  // comes from the category being listed rather than from the route: this list
  // renders on `entitycategories/:id`, which is claim-shaped in the URL but
  // view-grain in what it shows, and a category belongs to exactly one graph.
  graphId: string;
}) => {
  const { data } = useGetEntityQuery({
    variables: { id: row.getValue("id"), graph: graphId },
  });

  // `measuredBy`, `participatedIn` and `resultedOut` were three traversals for
  // three of the eight link kinds. `connections` is every link touching this
  // node, and the kind is what tells them apart.
  const connections = data?.entity.connections ?? [];

  if (connections.length === 0) {
    return (
      <div className="p-3 w-full text-sm text-muted-foreground bg-slate-900/70">
        No connections recorded
      </div>
    );
  }

  return (
    <div className="p-1 w-full h-full overflow-hidden bg-slate-900/70 flex flex-row gap-3">
      {connections.map((connection) => (
        <Card
          key={connection.id}
          className="p-2 flex flex-col flex-1 h-32 w-32 truncate"
        >
          <div className="text-xs text-muted-foreground">
            {connection.__typename}
          </div>
          <pre className="truncate">
            {"category" in connection
              ? (connection.category?.label ?? connection.label)
              : connection.label}
          </pre>
        </Card>
      ))}
    </div>
  );
};


export const EntityRow = ({
  row,
  graphId,
}: {
  row: Row<EntityNodesQuery["entities"][0]>;
  graphId: string;
}) => {

  const [moreData, setMoreData] = React.useState(false);




  return <>

    <TableRow
      key={row.id}
      data-state={row.getIsSelected() && "selected"}
    >

      <TableCell className="w-4 px-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0"
          onClick={() => setMoreData(!moreData)}
        >
          <ChevronDown
            className={`ml-2 h-4 w-4 transition-transform ${moreData ? "rotate-180" : ""
              }`}
          />
        </Button>
      </TableCell>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(
            cell.column.columnDef.cell,
            cell.getContext(),
          )}
        </TableCell>
      ))}
    </TableRow>
    {moreData && (
      <tr className="h-[200px] w-full flex flex-grow" >

        <RowEntity row={row} graphId={graphId} />
      </tr>
    )}
  </>
};

export const EntityList = (props: {
  category: EntityCategoryFragment;
  options?: ViewOptions;
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState<string>("");
  const [searchInput, setSearchInput] = React.useState<string>("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
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

  const filters: EntityFilter = React.useMemo(
    () => ({ search: search || undefined }),
    [search],
  );

  const { data, loading, refetch, error } = useEntityNodesQuery({
    variables: {
      category: props.category.id,
      filters,
      pagination: {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
      },
    },
  });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns = React.useMemo(
    () => calculateColumns(props.category),
    [props.category],
  );
  const rows = React.useMemo(
    () => calculateRows(data?.entities || []),
    [data?.entities],
  );

  const exportToCSV = () => {
    if (!rows || rows.length === 0) {
      return;
    }

    // Get all column headers
    const headers = columns
      .filter((col) => col.id !== "select") // Exclude select column
      .map((col) => col.id || "");

    // Build CSV header row
    const csvHeaders = headers.join(",");

    // Build CSV data rows
    const csvRows = rows.map((row) => {
      return headers
        .map((header) => {
          let value = "";

          if (header === "id") {
            value = row.id;
          } else if (header === "label") {
            value = row.__typename === "Entity" ? row.label : "";
          } else {
            // Property value
            const propValue =
              row.__typename === "Entity" && row.properties
                ? (row.properties as Record<string, any>)[header]
                : undefined;

            // Format the value
            if (propValue === null || propValue === undefined) {
              value = "";
            } else if (typeof propValue === "object") {
              value = JSON.stringify(propValue);
            } else {
              value = String(propValue);
            }
          }

          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            value = `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        })
        .join(",");
    });

    // Combine header and rows
    const csv = [csvHeaders, ...csvRows].join("\n");

    // Create blob and download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${props.category.label || "entities"}_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const table = useReactTable({
    data: rows || [],
    columns: columns || [],
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

  return (
    <div className="w-full h-full bg-card text-card-foreground   border  rounded-xl flex flex-col overflow-hidden">
      {error && (
        <div className="p-4 bg-red-600 text-white">
          Error loading entities: {error.message}
        </div>
      )}
      {!props.options?.minimal && (
        <div className="py-4 bg-secondary/20 px-3 rounded-md rounded-top flex-initial">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-initial max-w-lg w-lg">
              <FancyInput
                placeholder="Search entities..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  debouncedSetSearch(e.target.value);
                }}
                className="bg-black"
              />

            </div>

            <div className="flex items-center gap-2">
              {/*
                The property filter and property sort controls lived here.
                Neither is expressible any more: `EntityFilter` is `{ ids, search }`
                and `EntityOrder` is `{ createdAt, id }` — the `matches` /
                `hasProperty` filters and `property` ordering asked about a *drawn
                vertex's* derived properties, which exist only where the view has
                drawn the node and change when the projection is rebuilt. A list
                that narrows by what happens to be cached is a wrong answer that
                looks right, so the server refuses the question rather than
                answering it approximately.

                `search` survives, and means something narrower and true: a
                substring of the claim's own word (`Term.key` / `Term.label`),
                which is a column of the log.
              */}

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
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    {/*
                      Properties are derived, so adding one means writing a
                      derivation rule — the schema builder is where that lives.
                      The old `addpropertydefinition` dialog offered a bare
                      key+type and re-sent every sibling definition stripped of
                      its rule, erasing them.
                    */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/kraph/entitycategories/${props.category.id}/schema`,
                        )
                      }
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={!rows || rows.length === 0}
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
                <TableHead key={"first"} className=" ">
                  <ChevronDown className="ml-2 h-4 w-4 opacity-0" />
                </TableHead>

                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="">
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (

                <EntityRow key={row.id} row={row} graphId={props.category.graph.id} />
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
      <div className="flex items-center justify-end space-x-2 py-4 flex-initial px-2 border-t">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              table.previousPage();
            }}
            disabled={!table.getCanPreviousPage() || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              table.nextPage();
            }}
            disabled={!table.getCanNextPage() || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
export default EntityList;
