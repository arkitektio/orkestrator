import { FormDialog } from "@/components/dialog/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
  PageActionGroup,
} from "@/components/ui/page-action";
import { cn } from "@/lib/utils";
import { MikroArrayDataset, MikroFile, MikroFolder, MikroTableDataset } from "@/linkers";

import { useTabActions } from "@/command/tabs/TabsProvider";
import { SmartObjectButtonProps } from "@/providers/smart/buildSmartAdapters";
import { useDebounce } from "@/hooks/use-debounce";
import {
  ChildrenQuery,
  FolderFragment,
  useChildrenQuery,
  usePutArrayDatasetsInFolderMutation,
  usePutFilesInFolderMutation,
  usePutFoldersInFolderMutation,
  usePutTableDatasetsInFolderMutation,
} from "@/mikro/api/graphql";
import { ViewType } from "@/mikro/pages/FolderPage";
import { DragSession } from "@/lib/dnd/engine";
import { useSelection } from "@/providers/selection/SelectionContext";
import { smartDragStructures } from "@/providers/smart/dragPayload";
import { useSmartCanDrop, useSmartDrop } from "@/providers/smart/hooks";
import { Structure } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  ChevronDown,
  Columns2,
  Filter,
  File as FileIcon,
  Folder,
  LayoutGrid,
  List,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Shapes,
  SortAsc,
  SortDesc,
  Table,
  Table2,
  X
} from "lucide-react";
import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CreateFolderForm } from "../../forms/CreateFolderForm";
import { datasetStoredBytes } from "../../specs";
import { DatasetStoredSize } from "./DatasetStoredSize";


type ViewMode = "grid" | "list" | "table";
// No "created" option: nothing in the `children` union carries a date —
// `File`, `ArrayDataset` and `TableDataset` have no `createdAt` at all — so
// offering it would silently sort by name instead.
type SortField = "name" | "kind" | "size";
type SortDirection = "asc" | "desc";
type FilterType = "all" | "folders" | "datasets" | "tables" | "files";

interface ExplorerFilters {
  type: FilterType;
  sortField: SortField;
  sortDirection: SortDirection;
}

/**
 * Everything the folder's header row shows: search, type, sort, new folder,
 * view mode, refresh and paging. None of it lives in the explorer — the list
 * is only the list.
 */
interface FolderActionsProps {
  folder: FolderFragment;
  explorerState: ReturnType<typeof useFolderExplorer>;
}



interface FolderListExplorerProps {
  folder: FolderFragment;
  setView: (type: ViewType) => void;
  explorerState: ReturnType<typeof useFolderExplorer>;
}

type RawChild = ChildrenQuery["children"][number];

/**
 * The child kinds the explorer renders. The union still carries the legacy
 * `Image`, which the UI no longer knows — narrowing here is what makes the
 * explorer skip it (and any future member) instead of drawing a nameless row.
 */
const RENDERABLE_KINDS = [
  "Folder",
  "File",
  "ArrayDataset",
  "TableDataset",
  "MeshCollection",
  "AnnotationCollection",
] as const;

type ExplorerKind = (typeof RENDERABLE_KINDS)[number];
type ExplorerItem = Extract<RawChild, { __typename?: ExplorerKind }> & {
  __typename: ExplorerKind;
};

const isRenderable = (item: RawChild): item is ExplorerItem =>
  RENDERABLE_KINDS.includes(item.__typename as ExplorerKind);

/**
 * The order "sort by kind" uses. Not the type labels alphabetically — a file
 * manager puts containers first and loose files last, and `RENDERABLE_KINDS`
 * already reads in an arbitrary order — so the ranking is spelled out.
 */
const KIND_ORDER: Record<ExplorerKind, number> = {
  Folder: 0,
  ArrayDataset: 1,
  TableDataset: 2,
  MeshCollection: 3,
  AnnotationCollection: 4,
  File: 5,
};

/** A mesh collection has no name of its own, only a version. */
const itemName = (item: ExplorerItem) =>
  item.__typename === "MeshCollection" ? `Meshes ${item.version}` : item.name;

const formatFileSize = (fileSizeInBytes?: number | null) => {
  if (!fileSizeInBytes) return "-";

  let size = fileSizeInBytes;
  let unitIndex = -1;
  const byteUnits = ["kB", "MB", "GB", "TB", "PB"];

  do {
    size /= 1024;
    unitIndex++;
  } while (size > 1024 && unitIndex < byteUnits.length - 1);

  return `${Math.max(size, 0.1).toFixed(1)} ${byteUnits[unitIndex]}`;
};

/** What an item holds on disk, where the API says: a file's size, a dataset's measured stores. */
const itemBytes = (item: ExplorerItem): number | undefined => {
  switch (item.__typename) {
    case "File":
      return item.size ?? undefined;
    case "ArrayDataset":
      return datasetStoredBytes(item.dataArrays);
    default:
      return undefined;
  }
};

const getItemTypeLabel = (item: ExplorerItem) => {
  switch (item.__typename) {
    case "Folder":
      return "Folder";
    case "ArrayDataset":
      return "Dataset";
    case "TableDataset":
      return "Table";
    case "MeshCollection":
      return "Meshes";
    case "AnnotationCollection":
      return "Annotations";
    case "File":
      return "File";
  }
};

const getItemMeta = (item: ExplorerItem): React.ReactNode => {
  switch (item.__typename) {
    case "Folder":
      return item.description || "Nested folder";
    case "ArrayDataset": {
      const shape = item.shape.map((extent, index) => `${extent}${item.axisNames[index] ?? "?"}`).join(" ");
      if (datasetStoredBytes(item.dataArrays) === undefined) return shape;
      return (
        <>
          {shape} · <DatasetStoredSize dataArrays={item.dataArrays} axisNames={item.axisNames} />
        </>
      );
    }
    case "TableDataset":
      return item.description || item.axisNames.join(" × ");
    case "MeshCollection":
      return `Mesh collection ${item.version}`;
    case "AnnotationCollection":
      return "Annotation collection";
    case "File":
      return item.contentType || formatFileSize(item.size);
  }
};

const ITEM_ICONS: Record<ExplorerKind, typeof Folder> = {
  Folder,
  ArrayDataset: Boxes,
  TableDataset: Table2,
  MeshCollection: Shapes,
  AnnotationCollection: PenLine,
  File: FileIcon,
};

/**
 * The structure identifier each kind drags as. Only the four the folder can
 * file are listed — a mesh or annotation collection has no smart model, so
 * neither drags nor is ever recognised in a drop.
 */
const KIND_IDENTIFIERS: Partial<Record<ExplorerKind, string>> = {
  Folder: "@mikro/folder",
  File: "@mikro/file",
  ArrayDataset: "@mikro/arraydataset",
  TableDataset: "@mikro/tabledataset",
};

const structureKey = (identifier: string, id: string) => `${identifier}:${id}`;

/** Where each kind's detail page lives, for the kinds that have one. */
const KIND_LINKS: Partial<Record<ExplorerKind, (id: string) => string>> = {
  Folder: MikroFolder.linkBuilder,
  File: MikroFile.linkBuilder,
  ArrayDataset: MikroArrayDataset.linkBuilder,
  TableDataset: MikroTableDataset.linkBuilder,
};

const KIND_OBJECT_BUTTONS: Partial<
  Record<ExplorerKind, React.FC<SmartObjectButtonProps>>
> = {
  Folder: MikroFolder.ObjectButton,
  File: MikroFile.ObjectButton,
  ArrayDataset: MikroArrayDataset.ObjectButton,
  TableDataset: MikroTableDataset.ObjectButton,
};

/**
 * The row's own actions, revealed on hover: "open to the side" as a button of
 * its own — the one thing a file manager is asked for constantly — and the
 * ObjectButton for everything else, which is the same smart menu the row's
 * right-click gives. Nothing model-specific is hand-placed here; new actions
 * arrive as local actions and show up in both (see CLAUDE.md §3).
 *
 * `opacity-0` rather than unmounted: the ObjectButton's popover must survive
 * the pointer leaving the row, and a popover whose trigger unmounts closes.
 */
const ExplorerItemActions = (props: { item: ExplorerItem; className?: string }) => {
  const { openBeside } = useTabActions();
  const to = KIND_LINKS[props.item.__typename]?.(props.item.id);
  const ObjectButton = KIND_OBJECT_BUTTONS[props.item.__typename];

  if (!to && !ObjectButton) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border/60 bg-background/95 p-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity",
        "group-hover:opacity-100 focus-within:opacity-100 [&:has([data-state=open])]:opacity-100",
        props.className,
      )}
      // The row is a drag source and a link; the actions are neither.
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
    >
      {to ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Open to the side"
          aria-label="Open to the side"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openBeside(to, { label: itemName(props.item), evict: true });
          }}
        >
          <Columns2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {ObjectButton ? (
        <ObjectButton object={props.item} variant="ghost" className="h-7 w-7" />
      ) : null}
    </div>
  );
};

const ExplorerItemIcon = (props: { item: ExplorerItem; className?: string }) => {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground",
        props.className,
      )}
    >
      {createElement(ITEM_ICONS[props.item.__typename], { className: "h-4 w-4" })}
    </span>
  );
};

const ExplorerItemSmart = (props: {
  item: ExplorerItem;
  children: React.ReactNode;
}) => {
  switch (props.item.__typename) {
    case "Folder":
      return <MikroFolder.Smart object={props.item}>{props.children}</MikroFolder.Smart>;
    case "ArrayDataset":
      return <MikroArrayDataset.Smart object={props.item}>{props.children}</MikroArrayDataset.Smart>;
    case "TableDataset":
      return <MikroTableDataset.Smart object={props.item}>{props.children}</MikroTableDataset.Smart>;
    case "File":
      return <MikroFile.Smart object={props.item}>{props.children}</MikroFile.Smart>;
    // Mesh and annotation collections have no smart model yet.
    default:
      return <>{props.children}</>;
  }
};

const ExplorerItemLink = (props: {
  item: ExplorerItem;
  className?: string;
  children: React.ReactNode;
}) => {
  switch (props.item.__typename) {
    case "Folder":
      return (
        <MikroFolder.DetailLink object={props.item} className={props.className}>
          {props.children}
        </MikroFolder.DetailLink>
      );
    case "ArrayDataset":
      return (
        <MikroArrayDataset.DetailLink object={props.item} className={props.className}>
          {props.children}
        </MikroArrayDataset.DetailLink>
      );
    case "TableDataset":
      return (
        <MikroTableDataset.DetailLink object={props.item} className={props.className}>
          {props.children}
        </MikroTableDataset.DetailLink>
      );
    case "File":
      return (
        <MikroFile.DetailLink object={props.item} className={props.className}>
          {props.children}
        </MikroFile.DetailLink>
      );
    // No detail route for these yet — show the label, unlinked.
    default:
      return <span className={props.className}>{props.children}</span>;
  }
};

const ExplorerGridItem = (props: { item: ExplorerItem }) => {
  return (
    <ExplorerItemSmart item={props.item}>
      <div className="group relative rounded-xl border border-border/60 bg-background/70 p-3 transition-colors hover:bg-muted/30">
        <ExplorerItemActions item={props.item} className="absolute right-2 top-2 z-10" />
        <div className="flex flex-col items-start gap-3">
          <ExplorerItemIcon item={props.item} className="h-12 w-12 rounded-xl" />
          <div className="min-w-0">
            <ExplorerItemLink
              item={props.item}
              className="line-clamp-2 text-sm font-medium text-foreground"
            >
              {itemName(props.item)}
            </ExplorerItemLink>
            <p className="mt-1 text-xs text-muted-foreground">
              {getItemTypeLabel(props.item)}
            </p>
          </div>
        </div>
      </div>
    </ExplorerItemSmart>
  );
};

const ExplorerListItem = (props: { item: ExplorerItem; detailed?: boolean }) => {
  return (
    <ExplorerItemSmart item={props.item}>
      <div
        className={cn(
          "group relative grid items-center gap-3 border-b border-border/50 px-3 py-2 transition-colors hover:bg-muted/30",
          props.detailed
            ? "grid-cols-[minmax(0,1.6fr)_120px_minmax(0,0.9fr)]"
            : "grid-cols-[minmax(0,1fr)_120px]",
        )}
      >
        <ExplorerItemActions
          item={props.item}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2"
        />
        <div className="flex min-w-0 items-center gap-3">
          <ExplorerItemIcon item={props.item} />
          <div className="min-w-0">
            <ExplorerItemLink
              item={props.item}
              className="block truncate text-sm font-medium text-foreground"
            >
              {itemName(props.item)}
            </ExplorerItemLink>
            <p className="truncate text-xs text-muted-foreground">
              {getItemMeta(props.item)}
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{getItemTypeLabel(props.item)}</div>
        {props.detailed ? (
          <div className="truncate text-xs text-muted-foreground">
            {props.item.__typename === "File"
              ? formatFileSize(props.item.size)
              : getItemMeta(props.item)}
          </div>
        ) : null}
      </div>
    </ExplorerItemSmart>
  );
};

/**
 * A clickable column heading: the column IS the control. Clicking it opens the
 * sort directions for that column, and the Type column carries the type filter
 * as well — so narrowing the list happens over the list, not in the page's
 * action row where you cannot see what you are narrowing.
 */
const ExplorerColumnHeader = (props: {
  label: string;
  field: SortField;
  directions: { value: SortDirection; label: string }[];
  filters: ExplorerFilters;
  updateFilters: (updates: Partial<ExplorerFilters>) => void;
  className?: string;
  /**
   * The narrowing this column is applying, when it is applying one. The
   * heading then reads as the filter rather than as the column ("Folders",
   * not "Type") and grows a clear button, so a list that is hiding rows never
   * looks like a list that simply has none.
   */
  filter?: { label: string; onClear: () => void } | null;
  /** Extra menu rows under the sort block — the Type column's filter. */
  children?: React.ReactNode;
}) => {
  const sorted = props.filters.sortField === props.field;
  const filter = props.filter;

  return (
    <div className={cn("flex min-w-0 items-center gap-1", props.className)}>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors",
            "hover:text-foreground data-[state=open]:text-foreground",
            filter
              ? "bg-primary/10 text-primary hover:text-primary"
              : sorted
                ? "text-foreground"
                : "text-muted-foreground",
          )}
        >
          {filter ? <Filter className="h-3 w-3 shrink-0" /> : null}
          <span className="truncate">{filter ? filter.label : props.label}</span>
          {sorted ? (
            props.filters.sortDirection === "asc" ? (
              <SortAsc className="h-3 w-3 shrink-0" />
            ) : (
              <SortDesc className="h-3 w-3 shrink-0" />
            )
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0 opacity-40" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Sort by {props.label.toLowerCase()}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          // Empty while another column holds the sort, so neither direction
          // reads as checked on a column that is not sorting anything.
          value={sorted ? props.filters.sortDirection : ""}
          onValueChange={(value) =>
            props.updateFilters({
              sortField: props.field,
              sortDirection: value as SortDirection,
            })
          }
        >
          {props.directions.map((direction) => (
            <DropdownMenuRadioItem key={direction.value} value={direction.value}>
              {direction.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {props.children}
      </DropdownMenuContent>
    </DropdownMenu>
    {/* A sibling of the trigger, not a child: a button inside a button is
        invalid, and Radix would hand it the trigger's click anyway. */}
    {filter ? (
      <button
        type="button"
        onClick={filter.onClear}
        title={`Clear ${props.label.toLowerCase()} filter`}
        aria-label={`Clear ${props.label.toLowerCase()} filter`}
        className="shrink-0 rounded p-0.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <X className="h-3 w-3" />
      </button>
    ) : null}
    </div>
  );
};

/** One narrowing in force, with the button that lifts it. */
const ExplorerFilterChip = (props: { label: string; onClear: () => void }) => (
  <span className="flex min-w-0 items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2 pr-1 text-primary">
    <Filter className="h-3 w-3 shrink-0" />
    <span className="truncate">{props.label}</span>
    <button
      type="button"
      onClick={props.onClear}
      title={`Clear ${props.label}`}
      aria-label={`Clear ${props.label}`}
      className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-primary/20"
    >
      <X className="h-3 w-3" />
    </button>
  </span>
);

const TYPE_FILTERS: { value: FilterType; label: string; icon?: typeof Folder }[] = [
  { value: "all", label: "Everything" },
  { value: "folders", label: "Folders", icon: Folder },
  { value: "datasets", label: "Datasets", icon: Boxes },
  { value: "tables", label: "Tables", icon: Table2 },
  { value: "files", label: "Files", icon: FileIcon },
];

/**
 * The header row over the contents. It replaces the old "Large icons / List /
 * Details" label — which only said what you could already see — and, in the
 * list and table views, lines its cells up with the columns beneath: `px-5` is
 * the scroll container's `p-2` plus each row's `px-3`.
 */
const ExplorerColumns = (props: {
  viewMode: ViewMode;
  filters: ExplorerFilters;
  updateFilters: (updates: Partial<ExplorerFilters>) => void;
  getTypeCount: (type: FilterType) => number;
}) => {
  const shared = { filters: props.filters, updateFilters: props.updateFilters };

  const name = (
    <ExplorerColumnHeader
      {...shared}
      label="Name"
      field="name"
      directions={[
        { value: "asc", label: "A → Z" },
        { value: "desc", label: "Z → A" },
      ]}
    />
  );

  const type = (
    <ExplorerColumnHeader
      {...shared}
      label="Type"
      field="kind"
      directions={[
        { value: "asc", label: "Folders first" },
        { value: "desc", label: "Files first" },
      ]}
      filter={
        props.filters.type === "all"
          ? null
          : {
              label:
                TYPE_FILTERS.find(({ value }) => value === props.filters.type)?.label ??
                props.filters.type,
              onClear: () => props.updateFilters({ type: "all" }),
            }
      }
    >
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-muted-foreground">Show</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={props.filters.type}
        onValueChange={(value) => props.updateFilters({ type: value as FilterType })}
      >
        {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
              <span className="truncate">{label}</span>
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              {props.getTypeCount(value)}
            </span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </ExplorerColumnHeader>
  );

  const details = (
    <ExplorerColumnHeader
      {...shared}
      label="Details"
      field="size"
      directions={[
        { value: "desc", label: "Largest first" },
        { value: "asc", label: "Smallest first" },
      ]}
    />
  );

  // No columns to line up with in the grid: the two controls sit together.
  if (props.viewMode === "grid") {
    return (
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2">
        {name}
        {type}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid items-center gap-3 border-b border-border/70 px-5 py-2",
        props.viewMode === "table"
          ? "grid-cols-[minmax(0,1.6fr)_120px_minmax(0,0.9fr)]"
          : "grid-cols-[minmax(0,1fr)_120px]",
      )}
    >
      {name}
      {type}
      {props.viewMode === "table" ? details : null}
    </div>
  );
};

export const FolderListExplorer = (props: FolderListExplorerProps) => {
  const refetchChildren = {
    refetchQueries: ['Children'],
    awaitRefetchQueries: true,
  };
  const [putFolders] = usePutFoldersInFolderMutation(refetchChildren);
  const [putFiles] = usePutFilesInFolderMutation(refetchChildren);
  const [putArrayDatasets] = usePutArrayDatasetsInFolderMutation(refetchChildren);
  const [putTableDatasets] = usePutTableDatasetsInFolderMutation(refetchChildren);

  // Use the explorer state passed from parent
  const {
    filters,
    updateFilters,
    getTypeCount,
    setSearchInput,
    viewMode,
    loading,
    error,
    filteredAndSortedData,
    renderableChildren,
    refetch,
    debouncedSearch,
  } = props.explorerState;

  const totalItems = filteredAndSortedData.length;
  // Only the type filter is applied here: the search runs on the backend, so
  // `renderableChildren` is already the matches and "5 of 5" would be a lie.
  const hiddenByType = renderableChildren.length - totalItems;

  /**
   * What this folder already holds, by structure key — plus the folder
   * itself, which can never be filed into itself.
   */
  const members = useMemo(() => {
    const keys = new Set<string>([structureKey("@mikro/folder", props.folder.id)]);
    for (const child of renderableChildren) {
      const identifier = KIND_IDENTIFIERS[child.__typename];
      if (identifier) keys.add(structureKey(identifier, child.id));
    }
    return keys;
  }, [renderableChildren, props.folder.id]);

  const isMember = useCallback(
    (structure: Structure) =>
      members.has(structureKey(structure.identifier, structure.object.id)),
    [members],
  );

  /**
   * A drag that only moves things already in this folder is a drag *within*
   * the list — dropping a row on a nested folder, say. Filing them here again
   * would be a no-op, so the explorer turns the drag down entirely: no drop,
   * and (since `canDrop` is gated too) no overlay flashing over the rows while
   * the pointer travels between them. The row underneath keeps the drop, as
   * the innermost target always does.
   *
   * An external drag is accepted on sight: what it carries is unreadable until
   * it lands.
   */
  const acceptsDrop = useCallback(
    (session: DragSession) => {
      const structures = smartDragStructures(session);
      return structures === null || structures.some((item) => !isMember(item));
    },
    [isMember],
  );

  const canDrop = useSmartCanDrop(acceptsDrop);
  const [{ isOver }, dropRef] = useSmartDrop(
    async (structures: Structure[]) => {
      const idsFor = (identifier: string) =>
        structures
          .filter((item) => item.identifier === identifier && !isMember(item))
          .map((item) => item.object.id);

      // One mutation per kind — the backend files each kind separately.
      const filings = [
        [idsFor("@mikro/folder"), putFolders],
        [idsFor("@mikro/file"), putFiles],
        [idsFor("@mikro/arraydataset"), putArrayDatasets],
        [idsFor("@mikro/tabledataset"), putTableDatasets],
      ] as const;

      try {
        let filed = false;
        for (const [selfs, mutate] of filings) {
          if (selfs.length === 0) continue;
          await mutate({ variables: { selfs, other: props.folder.id } });
          filed = true;
        }

        if (filed) refetch?.();
      } catch (dropError) {
        console.error("Failed to add dropped items to folder:", dropError);
      }
    },
    { accepts: acceptsDrop },
  );

  const explorerDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      dropRef(node);
    },
    [dropRef],
  );

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/80 shadow-sm">
      <div
        className="relative flex min-h-0 w-full flex-1 flex-col"
        ref={explorerDropRef}
      >
        {canDrop ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-3 z-20 rounded-2xl border border-dashed border-emerald-500/60 bg-emerald-500/8 transition-opacity",
              isOver ? "opacity-100" : "opacity-70",
            )}
          >
            <div className="absolute inset-x-6 top-6 rounded-xl border border-emerald-500/40 bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Folder className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {isOver ? "Release to file items in this folder" : "Drop datasets, files or folders here"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Supported: datasets, tables, files and nested folders
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 w-full flex-1 flex-col">
          <ExplorerColumns
            viewMode={viewMode}
            filters={filters}
            updateFilters={updateFilters}
            getTypeCount={getTypeCount}
          />

          <div className="flex-1 overflow-auto p-2">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {filteredAndSortedData.map((child) => (
                  <ExplorerGridItem key={child.id} item={child} />
                ))}
              </div>
            ) : null}

            {viewMode === "list" ? (
              <div>
                {filteredAndSortedData.map((child) => (
                  <ExplorerListItem key={child.id} item={child} />
                ))}
              </div>
            ) : null}

            {viewMode === "table" ? (
              <div>
                {filteredAndSortedData.map((child) => (
                  <ExplorerListItem key={child.id} item={child} detailed />
                ))}
              </div>
            ) : null}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-12 text-red-500">
                {error.message}
              </div>
            )}

            {filteredAndSortedData.length === 0 && !loading && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Folder className="mb-3 h-12 w-12" />
                <div className="text-lg font-medium">This folder is empty</div>
                <div className="mt-1 text-sm">
                  {debouncedSearch || filters.type !== "all"
                    ? "Try adjusting the search or active filter"
                    : "Drag datasets, tables or folders here, or drop files from your computer to upload them"}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-2 text-xs text-muted-foreground">
            <span>
              {totalItems} item{totalItems === 1 ? "" : "s"}
              {hiddenByType > 0 ? ` of ${renderableChildren.length}` : ""}
            </span>
            {/* Every narrowing in force, each one clearable. The type filter
                also shows on its own column; the search has no column to show
                on, and a search typed into the page's action row can be
                collapsed into the burger — without this, a list hiding most of
                its rows would look like a list that just has few. */}
            <div className="flex min-w-0 items-center gap-1">
              {debouncedSearch ? (
                <ExplorerFilterChip
                  label={`“${debouncedSearch}”`}
                  onClear={() => setSearchInput("")}
                />
              ) : null}
              {filters.type !== "all" ? (
                <ExplorerFilterChip
                  label={
                    TYPE_FILTERS.find(({ value }) => value === filters.type)?.label ??
                    filters.type
                  }
                  onClear={() => updateFilters({ type: "all" })}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * The folder's page actions, for `PageLayout`'s action row. Each is a separate
 * child of that row so `PageActionBar` can plan them one by one — hence the
 * flat fragment rather than one wrapping div — and each says, through its
 * policy props, what it gives up when the row runs short.
 */
export const FolderExplorerActions = ({ folder, explorerState }: FolderActionsProps) => {
  const {
    searchInput,
    setSearchInput,
    debouncedSearch,
    viewMode,
    setViewMode,
    pagination,
    setPagination,
    data,
    refetch,
  } = explorerState;
  const { selection, bselection } = useSelection();

  return (
    <>
      {/* Search. Behind a glyph once the row is tight rather than gone: a
          filtered list with no visible filter is a puzzle. */}
      <PageAction.Slot
        priority={10}
        collapse="icon"
        icon={<Search className="h-4 w-4" />}
        label="Search"
      >
        <div className="relative w-44">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 w-full border-border/70 bg-background/80 pl-8"
          />
          {searchInput !== debouncedSearch && (
            <RefreshCw className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </PageAction.Slot>

      {/* New Folder */}
      <PageAction.Slot alwaysShow collapse="icon">
        <FormDialog
          trigger={
            <ActionTrigger size="sm" aria-label="New Folder" className="border-border/70 bg-background/80">
              <Plus className="w-4 h-4" />
              <ActionLabel>New Folder</ActionLabel>
            </ActionTrigger>
          }
          onSubmit={() => {
            // Refetch will be handled by the mutation
          }}
        >
          <CreateFolderForm parentFolderId={folder.id} />
        </FormDialog>
      </PageAction.Slot>

      {/* Selection Info: a readout, not an action — it goes rather than
          taking a row in the burger. */}
      {(selection.length > 0 || bselection.length > 0) && (
        <PageAction.Slot collapse="hide" priority={-10}>
          <Badge variant="secondary">{selection.length} selected</Badge>
          {bselection.length > 0 && <Badge variant="destructive">+{bselection.length}</Badge>}
        </PageAction.Slot>
      )}

      {/* Bulk Actions */}
      {selection.length > 0 && (
        <PageAction
          priority={15}
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log("Bulk actions for:", selection);
          }}
        >
          Actions <ChevronDown className="w-4 h-4 ml-1" />
        </PageAction>
      )}

      {/* View Mode Toggles: one control — a picker missing half its options
          is a trap — and already the width of three glyphs. */}
      <PageActionGroup
        priority={5}
        className="gap-0 rounded-lg border border-border/70 bg-background/80 p-1"
      >
        <PageAction
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="sm"
          icon={<LayoutGrid className="w-4 h-4" />}
          menuLabel="Grid view"
          aria-label="Grid view"
          onClick={() => setViewMode("grid")}
        />
        <PageAction
          variant={viewMode === "list" ? "default" : "ghost"}
          size="sm"
          icon={<List className="w-4 h-4" />}
          menuLabel="List view"
          aria-label="List view"
          onClick={() => setViewMode("list")}
        />
        <PageAction
          variant={viewMode === "table" ? "default" : "ghost"}
          size="sm"
          icon={<Table className="w-4 h-4" />}
          menuLabel="Table view"
          aria-label="Table view"
          onClick={() => setViewMode("table")}
        />
      </PageActionGroup>

      {/* Refresh */}
      <PageAction
        priority={-5}
        variant="ghost"
        size="sm"
        icon={<RefreshCw className="w-4 h-4" />}
        menuLabel="Refresh"
        aria-label="Refresh"
        className="border border-transparent bg-background/80 hover:border-border/70"
        onClick={() => refetch?.()}
      />

      {/* Pagination: paging away from the first page and losing the way back
          is worse than a crowded row, so the pair stays together. */}
      <PageActionGroup priority={15}>
        <PageAction
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          menuLabel="Previous page"
          aria-label="Previous page"
          className="border-border/70 bg-background/80"
          onClick={() =>
            setPagination({
              limit: pagination.limit,
              offset: Math.max(0, pagination.offset - pagination.limit),
            })
          }
          disabled={pagination.offset <= 0}
        />
        <PageAction
          size="sm"
          icon={<ArrowRight className="w-4 h-4" />}
          menuLabel="Next page"
          aria-label="Next page"
          className="border-border/70 bg-background/80"
          onClick={() =>
            setPagination({
              limit: pagination.limit,
              offset: pagination.offset + pagination.limit,
            })
          }
          disabled={data?.children && data.children.length < pagination.limit}
        />
      </PageActionGroup>

      {/* The folder's own smart menu. `ModelPageLayout` renders this by default
          when a page passes no `pageActions`; this page does, so it has to
          carry it, or the folder itself would be the one thing on the page
          with no actions. */}
      <MikroFolder.ObjectButton alwaysShow object={folder} />
    </>
  );
};


const MATCHES_FILTER: Record<Exclude<FilterType, "all">, ExplorerKind[]> = {
  folders: ["Folder"],
  datasets: ["ArrayDataset"],
  tables: ["TableDataset"],
  files: ["File"],
};

// Hook to manage folder explorer state
export const useFolderExplorer = (folder: FolderFragment) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize all states from URL params or defaults
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || ''
  );

  const [filters, setFilters] = useState<ExplorerFilters>({
    type: (searchParams.get('type') as FilterType) || 'all',
    sortField: (searchParams.get('sortField') as SortField) || 'name',
    sortDirection: (searchParams.get('sortDirection') as SortDirection) || 'asc',
  });

  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get('viewMode') as ViewMode) || 'table'
  );

  const [pagination, setPagination] = useState({
    limit: parseInt(searchParams.get('limit') || '30'),
    offset: parseInt(searchParams.get('offset') || '0'),
  });

  const debouncedSearch = useDebounce(searchInput, 300);

  const { data, loading, error, refetch } = useChildrenQuery({
    variables: {
      id: folder.id,
      pagination: pagination,
      filters: {
        search: debouncedSearch || undefined,
      },
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  // Sync state to URL parameters
  useEffect(() => {
    const newParams = new URLSearchParams();

    if (searchInput) newParams.set('search', searchInput);
    if (filters.type !== 'all') newParams.set('type', filters.type);
    if (filters.sortField !== 'name') newParams.set('sortField', filters.sortField);
    if (filters.sortDirection !== 'asc') newParams.set('sortDirection', filters.sortDirection);
    if (viewMode !== 'table') newParams.set('viewMode', viewMode);
    if (pagination.limit !== 30) newParams.set('limit', pagination.limit.toString());
    if (pagination.offset !== 0) newParams.set('offset', pagination.offset.toString());

    setSearchParams(newParams, { replace: true });
  }, [searchInput, filters, viewMode, pagination, setSearchParams]);

  const children = data?.children;
  const renderableChildren = useMemo(
    () => (children ?? []).filter(isRenderable),
    [children],
  );

  const { type: filterType, sortField, sortDirection } = filters;
  const filteredAndSortedData = useMemo(() => {
    let items = [...renderableChildren];

    // Filter by type (client-side for now)
    if (filterType !== "all") {
      const allowed = MATCHES_FILTER[filterType];
      items = items.filter((item) => allowed.includes(item.__typename));
    }

    // Sort items (client-side for now)
    items.sort((a, b) => {
      const aName = itemName(a).toLowerCase();
      const bName = itemName(b).toLowerCase();

      let aValue: string | number = aName;
      let bValue: string | number = bName;

      if (sortField === "size") {
        aValue = itemBytes(a) ?? 0;
        bValue = itemBytes(b) ?? 0;
      }

      if (sortField === "kind") {
        aValue = KIND_ORDER[a.__typename];
        bValue = KIND_ORDER[b.__typename];
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      // Within one kind (and for equally sized files) the name decides, always
      // ascending: a secondary key that flipped with the primary would shuffle
      // each group for no reason anyone asked for.
      return aName < bName ? -1 : aName > bName ? 1 : 0;
    });

    return items;
  }, [renderableChildren, filterType, sortField, sortDirection]);

  const setSearchInputValue = useCallback((value: string) => {
    setSearchInput(value);
    setPagination((previous) =>
      previous.offset === 0 ? previous : { ...previous, offset: 0 },
    );
  }, []);

  const updateFilters = useCallback((updates: Partial<ExplorerFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
    // Reset pagination when filters change
    setPagination({ limit: 30, offset: 0 });
  }, []);

  const getTypeCount = (type: FilterType) => {
    if (type === "all") return renderableChildren.length;
    const allowed = MATCHES_FILTER[type];
    return renderableChildren.filter((item) => allowed.includes(item.__typename)).length;
  };

  return {
    // State
    searchInput,
    filters,
    viewMode,
    pagination,
    debouncedSearch,
    data,
    loading,
    error,
    filteredAndSortedData,
    // Everything the folder holds, before the client-side type filter — what
    // the drop target checks a drag against.
    renderableChildren,

    // Actions
    setSearchInput: setSearchInputValue,
    setFilters,
    setViewMode,
    setPagination,
    updateFilters,
    getTypeCount,
    refetch,
  };
};
