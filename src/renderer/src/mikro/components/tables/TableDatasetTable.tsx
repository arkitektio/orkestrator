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
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Copy,
  Equal,
  EqualApproximately,
  EqualNot,
  FilterX,
  ListFilter,
  SquareCheck,
  Tags,
  X,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/core/ui/button";
import { Checkbox } from "@/core/ui/checkbox";
import { Skeleton } from "@/core/ui/skeleton";
import { FilterClear, FilterSearchField, FilterTrigger } from "@/core/ui/filter-bar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/core/ui/context-menu";
import { reportErrorAs, toast } from "@/core/notify";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/ui/table";
import {
  type TableDatasetFragment,
  useGetTableDatasetAnchorsQuery,
} from "@/mikro/api/graphql";
import { cn } from "@/core/util/utils";
import { MikroMeshObject } from "@/core/linkers";

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
  rowsToCsv,
  useDuckDbTable,
} from "./useDuckDbTable";
import {
  cellFilterActions,
  clearFilter,
  describeFilter,
  hasActiveFilters,
  setFilter,
  type TableColumnFilter,
  type TableColumnFilters,
} from "./tableFilters";
import { formatUnit } from "@/core/util/units";

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

// The checkbox and row-number columns are the sheet's gutter, not data: a
// faint fill and a rule on the right set them apart from the first column,
// as a spreadsheet's row headers are.
/** A button in the filter row, shaped like its pills (`core/ui/filter-bar`). */
const PILL_BUTTON = "h-8 gap-1.5 rounded-full font-normal";

const GUTTER_COLUMNS = new Set(["select", "index"]);
const GUTTER_CLASSES = "bg-muted/40 group-hover/row:bg-muted/60";
const gutterClasses = (columnId: string) =>
  GUTTER_COLUMNS.has(columnId) ? cn(GUTTER_CLASSES, columnId === "index" && "border-r") : undefined;

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
  header: () => <div className="pr-3 text-right font-medium">#</div>,
  cell: ({ row }) => {
    // `row.id` is already the value key (`getRowId`), so no second hash here.
    const labels = anchorLabelsForRow(row.id);

    return (
      <div className="flex items-center justify-end gap-0.5 text-xs tabular-nums text-muted-foreground">
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
  filter?: TableColumnFilter;
  onFilter: (filter: TableColumnFilter | null) => void;
}) => {
  const { column, store, sortDirection, onSort, onHide, filter, onFilter } = props;

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
        actions={{ sortDirection, onSort, onHide, filter, onFilter }}
      >
        <button
          type="button"
          title={`${column.dtype}${formatUnit(column.unit as string | null) ? ` · ${formatUnit(column.unit as string | null)}` : ""}`}
          className={cn(
            "flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-center font-semibold text-foreground/90 transition-colors hover:bg-accent",
            // A filtered column says so where it is named, like the filter row's pills.
            filter && "bg-primary/10 text-foreground ring-1 ring-primary/40",
          )}
        >
          <ColumnAxisGlyph column={column} />
          {filter && <ListFilter className="h-3 w-3 shrink-0 text-primary" aria-label="filtered" />}
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

/** How many skeleton rows the first load shows: about a screenful. */
const SKELETON_ROWS = 14;

/** Bar widths a skeleton cell cycles through, so the rows read as values, not stripes. */
const SKELETON_WIDTHS = ["w-10", "w-16", "w-12", "w-20", "w-14"] as const;

/**
 * The first page, before it arrives: one row per row to come, laid out like
 * the real ones (the gutter's number on the right, values centred) and fading
 * towards the bottom. Bars are narrow and fixed so they never set a column's
 * width; the columns are fitted once the real rows are in.
 */
const SkeletonRows = ({ columnIds, count }: { columnIds: string[]; count: number }) => (
  <>
    {Array.from({ length: count }, (_, rowIndex) => (
      <TableRow
        key={rowIndex}
        aria-hidden
        className="hover:bg-transparent"
        style={{ opacity: 1 - (rowIndex / count) * 0.7 }}
      >
        {columnIds.map((columnId, columnIndex) => (
          <TableCell key={columnId} className={gutterClasses(columnId)}>
            {columnId === "select" ? null : columnId === "index" ? (
              <Skeleton className="ml-auto h-3 w-5" />
            ) : (
              <Skeleton
                className={cn(
                  "mx-auto h-3",
                  SKELETON_WIDTHS[(rowIndex * 3 + columnIndex * 7) % SKELETON_WIDTHS.length],
                )}
              />
            )}
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

const CELL_ACTION_ICON = {
  same: Equal,
  similar: EqualApproximately,
  atLeast: ChevronsRight,
  atMost: ChevronsLeft,
  exclude: EqualNot,
} as const;

/**
 * What a right-click on a cell offers: keep rows like it (the same value, a
 * similar one, at least or at most it), drop rows like it, copy it, or tick
 * its row. The filters land in the filter row as chips.
 */
const CellMenu = ({
  cell,
  label,
  current,
  onFilter,
  onClearFilter,
  selected,
  onToggleRow,
}: {
  cell: { column: string; value: unknown };
  label: string;
  current: TableColumnFilter | undefined;
  onFilter: (filter: TableColumnFilter) => void;
  onClearFilter: () => void;
  selected: boolean;
  onToggleRow: () => void;
}) => {
  const actions = cellFilterActions(cell.column, cell.value, current, label);
  const text = formatCellValue(cell.value);
  return (
    <ContextMenuContent className="w-64">
      <ContextMenuLabel className="flex min-w-0 items-baseline gap-1.5 text-xs font-normal">
        <span className="shrink-0 text-muted-foreground">{label}</span>
        <span className="min-w-0 truncate font-mono">{text === "" ? "empty" : text}</span>
      </ContextMenuLabel>
      <ContextMenuSeparator />
      {actions.map((action) => {
        const Icon = CELL_ACTION_ICON[action.key];
        return (
          <ContextMenuItem key={action.key} onSelect={() => onFilter(action.filter)}>
            <Icon className="h-4 w-4" />
            <span className="min-w-0 truncate">{action.label}</span>
          </ContextMenuItem>
        );
      })}
      {current && (
        <ContextMenuItem onSelect={onClearFilter}>
          <FilterX className="h-4 w-4" />
          <span className="min-w-0 truncate">Clear the {label} filter</span>
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem
        onSelect={() => {
          void navigator.clipboard
            .writeText(text)
            .then(() => toast.success("Copied the value"))
            .catch(reportErrorAs("Couldn't copy the value"));
        }}
      >
        <Copy className="h-4 w-4" />
        Copy value
      </ContextMenuItem>
      <ContextMenuItem onSelect={onToggleRow}>
        <SquareCheck className="h-4 w-4" />
        {selected ? "Unselect row" : "Select row"}
      </ContextMenuItem>
    </ContextMenuContent>
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
    columnFilters: TableColumnFilters;
    onColumnFilterChange: (columnName: string, filter: TableColumnFilter | null) => void;
    anchorLabelsForRow: (rowKey: string) => readonly string[];
    meshLinks?: ReadonlyMap<string, string>;
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
            filter={options.columnFilters[column.name]}
            onFilter={(filter) => options.onColumnFilterChange(column.name, filter)}
          />
        ),
        cell: ({ row }) => {
          const text = formatCellValue(row.getValue(column.name));
          // An id column a mesh collection keys: each value is a mesh, and
          // the mesh has a page.
          const collectionId = options.meshLinks?.get(column.name);
          if (collectionId && text !== "") {
            return (
              <div className="truncate text-center font-mono text-sm">
                <MikroMeshObject.DetailLink
                  object={{ id: `${collectionId}:${text}` }}
                  className="text-primary hover:underline"
                  title={`Open mesh ${text}`}
                >
                  {text}
                </MikroMeshObject.DetailLink>
              </div>
            );
          }
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

export const TableDatasetTable = (props: {
  table: TableDatasetFragment;
  /**
   * Id columns whose values are meshes: column name → the mesh collection
   * keying it (`TableDataset.keyedBy`). Their cells link to each mesh's page.
   */
  meshLinks?: ReadonlyMap<string, string>;
  /** The table's own row count (no search, no filter), once a page has answered it. */
  onRowCount?: (rows: number) => void;
}) => {
  "use no memo";

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<TableColumnFilters>({});
  // The cell a right-click landed on, for the context menu to act on.
  const [menuCell, setMenuCell] = React.useState<{ column: string; rowKey: string; value: unknown } | null>(null);
  const handleColumnFilterChange = React.useCallback(
    (columnName: string, filter: TableColumnFilter | null) =>
      setColumnFilters((current) => (filter ? setFilter(current, filter) : clearFilter(current, columnName))),
    [],
  );
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

  // What the table holds, whatever is searched for: the count a page with no
  // search answered with. Reported, not shown here — the page header says it.
  const { onRowCount } = props;
  const unfiltered = search.trim() === "" && !hasActiveFilters(columnFilters);
  React.useEffect(() => {
    if (unfiltered && !loading && !error) onRowCount?.(totalRowCount);
  }, [unfiltered, loading, error, totalRowCount, onRowCount]);

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
        columnFilters,
        onColumnFilterChange: handleColumnFilterChange,
        anchorLabelsForRow,
        meshLinks: props.meshLinks,
      }),
    [
      props.meshLinks,
      anchorLabelsForRow,
      handleColumnSortingChange,
      handleHideColumn,
      columnFilters,
      handleColumnFilterChange,
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
  }, [props.table.id, search, columnFilters]);

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

  // A column as people read it, for the filter chips and the cell menu.
  const columnLabels = new Map(props.table.columns.map((column) => [column.name, column.longName ?? column.name]));

  // What the Columns pill counts: data columns only (the gutter cannot hide).
  const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide());
  const hiddenColumnCount = hideableColumns.filter((column) => !column.getIsVisible()).length;

  return (
    <div className="flex h-full w-full flex-col">
      {/* The same quiet row of pills as the Mikro home's filters
          (`core/ui/filter-bar`): what narrows is tinted, what does not is
          muted, and Clear shows once something narrows. */}
      <div className="flex flex-initial flex-wrap items-center gap-2 pb-3">
        <FilterSearchField value={search} onChange={setSearch} placeholder="Search all columns…" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterTrigger active={hiddenColumnCount > 0} icon={Columns3} aria-label="Columns">
              {hiddenColumnCount > 0
                ? `${hideableColumns.length - hiddenColumnCount} of ${hideableColumns.length} columns`
                : "All columns"}
            </FilterTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
            {hideableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="font-mono text-xs"
                checked={column.getIsVisible()}
                // Keep the menu open: hiding several columns is one errand.
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* What narrows the rows, one chip per column, in the order set. */}
        {Object.values(columnFilters).map((filter) => (
          <span
            key={filter.column}
            className={cn(PILL_BUTTON, "inline-flex items-center border border-primary/40 bg-primary/10 pl-2.5 pr-1 text-xs text-foreground")}
          >
            <ListFilter className="h-3.5 w-3.5 text-primary" />
            <span className="max-w-56 truncate">{describeFilter(filter, columnLabels.get(filter.column))}</span>
            <button
              type="button"
              aria-label={`Remove the ${filter.column} filter`}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
              onClick={() => handleColumnFilterChange(filter.column, null)}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {(search || hiddenColumnCount > 0 || hasActiveFilters(columnFilters)) && (
          <FilterClear
            onClear={() => {
              clearGlobalSearch();
              setColumnFilters({});
              table.resetColumnVisibility();
            }}
          />
        )}

        {error && <div className="text-xs text-destructive">{error.message}</div>}

        {/* Exports trail the filters: they act on what the filters leave. */}
        <div className="ml-auto flex items-center gap-2">
          {/* Only worth a control once there is a selection to export — an
              always visible button that is disabled most of the time reads as
              broken. */}
          {selectedRowList.length ? (
            <Button
              variant="outline"
              size="sm"
              className={cn(PILL_BUTTON, "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15")}
              onClick={handleExportSelectionCsv}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Export {selectedRowList.length} selected
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className={cn(PILL_BUTTON, "text-muted-foreground")}
            onClick={handleExportCsv}
            disabled={loading || exporting || totalRowCount === 0}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : selectedRowList.length ? "Export all rows" : "Export as CSV"}
          </Button>
        </div>
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
        {/* One box scrolls the rows both ways, framed like a sheet, so the
            header row can stick to its top (see `containerClassName`). */}
        {/* One menu for the whole grid, not one per cell: a right-click
            records which cell it landed on, and the menu acts on that. */}
        <ContextMenu onOpenChange={(open) => !open && setMenuCell(null)}>
        <ContextMenuTrigger asChild>
        <div
          ref={gridRef}
          className="flex min-h-0 flex-grow flex-col overflow-auto rounded-lg border bg-background"
          onContextMenu={(event) => {
            const cell = (event.target as HTMLElement).closest<HTMLElement>("td[data-column-id]");
            const column = cell?.dataset.columnId;
            const rowKey = cell?.dataset.rowKey;
            // Not on a data cell (a header, the gutter, the empty space under
            // the rows): no menu.
            if (!column || !rowKey || GUTTER_COLUMNS.has(column) || !(rowKey in pageRowsByKey)) {
              event.preventDefault();
              return;
            }
            setMenuCell({ column, rowKey, value: pageRowsByKey[rowKey][column] });
          }}
        >
          {/* The table's width is the SUM of its columns, not the container's:
              in a fixed layout a 100% table hands its spare width out to the
              columns and quietly undoes what the reader just dragged. */}
          <Table
            className="flex-grow"
            containerClassName="overflow-visible"
            style={
              fitting
                ? undefined
                : { width: table.getTotalSize(), tableLayout: "fixed" }
            }
          >
            {/* Sticks to the top of the scroll box while the rows pass under
                it; opaque enough that a row behind it does not read through. */}
            <TableHeader className="sticky top-0 z-20 bg-muted/90 backdrop-blur-sm [&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="group/row hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      data-column-id={header.column.id}
                      className={cn(
                        "relative h-9 text-xs text-muted-foreground",
                        gutterClasses(header.column.id),
                      )}
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
                the reader. The skeleton is for the very first load only (and
                for a filter that emptied the page while the next answer runs). */}
            <TableBody
              className={cn("transition-opacity", loading && rows.length > 0 && "opacity-50")}
            >
              {loading && rows.length === 0 ? (
                <SkeletonRows
                  columnIds={table.getVisibleLeafColumns().map((column) => column.id)}
                  count={Math.min(pagination.pageSize, SKELETON_ROWS)}
                />
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group/row"
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        data-column-id={cell.column.id}
                        data-row-key={row.id}
                        className={cn(
                          gutterClasses(cell.column.id),
                          menuCell?.rowKey === row.id && menuCell.column === cell.column.id && "bg-primary/10",
                        )}
                      >
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
        </ContextMenuTrigger>
        {menuCell && (
          <CellMenu
            cell={menuCell}
            label={columnLabels.get(menuCell.column) ?? menuCell.column}
            current={columnFilters[menuCell.column]}
            onFilter={(filter) => handleColumnFilterChange(filter.column, filter)}
            onClearFilter={() => handleColumnFilterChange(menuCell.column, null)}
            selected={menuCell.rowKey in selectedRows}
            onToggleRow={() => {
              // The page may have moved on while the menu was open; then the
              // row is gone and there is nothing to tick.
              try {
                table.getRow(menuCell.rowKey).toggleSelected();
              } catch {
                /* not on this page any more */
              }
            }}
          />
        )}
        </ContextMenu>
        {loading && rows.length > 0 && (
          // Says "working" while the dimmed page waits for the next one,
          // under the sticky header so it is seen wherever the rows are scrolled.
          <div className="pointer-events-none absolute inset-x-px top-9 z-30 h-0.5 overflow-hidden rounded-full">
            <div className="h-full w-1/3 animate-task-sweep rounded-full bg-primary/70" />
          </div>
        )}
        <TableAnchorsOverlay
          tableId={props.table.id}
          anchors={anchors}
          partition={anchorPartition}
        />
      </div>

      <div className="flex flex-initial items-center justify-end space-x-2 pt-3">
        <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
          {loading && rows.length === 0 ? (
            <Skeleton className="h-4 w-44" />
          ) : (
            <span>
              Showing {pageStart}-{pageEnd} of {totalRowCount} rows.
            </span>
          )}
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
