import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ordering, useGetFoldersQuery } from "@/mikro-next/api/graphql";
import { cn } from "@/lib/utils";
import { ChevronRight, Folder, FolderPlus } from "lucide-react";
import { useState } from "react";

/** One folder as the tree shows it: the `ListFolder` fragment. */
export type TreeFolder = {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
};

/**
 * Where a new folder is being typed: nowhere, at the root (`null`), or under
 * the folder with this id.
 */
export type CreatingAt = undefined | null | string;

export type FolderTreeProps = {
  /** The folder the subject sits in now — marked and unclickable. */
  currentFolder?: string | null;
  /** The folder a move is in flight to, if any; every row disables meanwhile. */
  pending?: string;
  /** Where the inline "new folder" row is open, if anywhere. */
  creating: CreatingAt;
  onCreatingChange: (at: CreatingAt) => void;
  /** A folder was chosen as the destination. */
  onPick: (folder: TreeFolder) => void;
  /** A name was entered in the new-folder row; resolves when it is done. */
  onCreate: (name: string, parent: string | null) => Promise<unknown>;
};

/** Per level. Folders are filing, not data: a level this deep is a search job. */
const LEVEL_LIMIT = 200;
const INDENT = 16;

const levelVariables = (parent: string | null) => ({
  filters: parent === null ? { parentless: true } : { parent },
  ordering: [{ name: Ordering.Asc }],
  pagination: { limit: LEVEL_LIMIT },
});

/**
 * The folder hierarchy, one lazily loaded level at a time.
 *
 * Roots are `parentless` folders; a node's children are the folders whose
 * `parent` it is. Every level is the same `GetFolders` query with a different
 * filter, so a `refetchQueries: ["GetFolders"]` after creating a folder
 * refreshes whichever levels are open without the tree knowing about it.
 *
 * `ListFolder` does not say whether a folder has children, so every node gets
 * a chevron and answers "No subfolders" on opening instead — one round trip on
 * demand beats a `children { id }` on every row of every list in the app.
 */
export const FolderTree = (props: FolderTreeProps) => (
  <div role="tree" className="flex flex-col gap-0.5">
    <FolderLevel parent={null} depth={0} {...props} />
  </div>
);

type LevelProps = FolderTreeProps & { parent: string | null; depth: number };

const FolderLevel = ({ parent, depth, ...props }: LevelProps) => {
  const { data, loading } = useGetFoldersQuery({ variables: levelVariables(parent) });
  const folders = data?.folders ?? [];
  const creatingHere = props.creating === parent;

  return (
    <>
      {folders.map((folder) => (
        <FolderNode key={folder.id} folder={folder} depth={depth} {...props} />
      ))}
      {creatingHere && (
        <NewFolderRow
          depth={depth}
          onSubmit={(name) => props.onCreate(name, parent)}
          onCancel={() => props.onCreatingChange(undefined)}
        />
      )}
      {!loading && !folders.length && !creatingHere && (
        <div
          className="py-1 text-xs text-muted-foreground"
          style={{ paddingLeft: depth * INDENT + 28 }}
        >
          {parent === null ? "No folders yet" : "No subfolders"}
        </div>
      )}
      {folders.length === LEVEL_LIMIT && (
        <div className="pt-1 text-xs text-muted-foreground" style={{ paddingLeft: depth * INDENT + 28 }}>
          Showing the first {LEVEL_LIMIT} — search to narrow.
        </div>
      )}
    </>
  );
};

type NodeProps = FolderTreeProps & { folder: TreeFolder; depth: number };

const FolderNode = ({ folder, depth, ...props }: NodeProps) => {
  const [open, setOpen] = useState(false);
  const isCurrent = folder.id === props.currentFolder;
  const isPending = props.pending === folder.id;
  const disabled = props.pending !== undefined || isCurrent;

  const startCreating = () => {
    setOpen(true);
    props.onCreatingChange(folder.id);
  };

  return (
    <div role="treeitem" aria-expanded={open}>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 transition-colors hover:bg-accent",
          isCurrent && "bg-muted/50",
        )}
        style={{ paddingLeft: depth * INDENT }}
      >
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((o) => !o)}
          className="flex h-7 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => props.onPick(folder)}
          title={isCurrent ? "Already here" : `Move into ${folder.name}`}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm disabled:cursor-default disabled:opacity-60"
        >
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{folder.name}</span>
          {folder.description && (
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
              {folder.description}
            </span>
          )}
        </button>
        {isPending ? (
          <Badge variant="outline">Moving…</Badge>
        ) : isCurrent ? (
          <Badge variant="outline">Current</Badge>
        ) : (
          folder.isDefault && <Badge variant="outline">Default</Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`New folder in ${folder.name}`}
          title="New subfolder"
          disabled={props.pending !== undefined}
          onClick={startCreating}
          className="h-6 w-6 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {open && (
        <div role="group" className="flex flex-col gap-0.5">
          <FolderLevel parent={folder.id} depth={depth + 1} {...props} />
        </div>
      )}
    </div>
  );
};

/**
 * The inline row a new folder is named in. Enter creates, Escape backs out;
 * nothing is created for an empty name.
 */
const NewFolderRow = ({
  depth,
  onSubmit,
  onCancel,
}: {
  depth: number;
  onSubmit: (name: string) => Promise<unknown>;
  onCancel: () => void;
}) => {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    onSubmit(trimmed).finally(() => setBusy(false));
  };

  return (
    <div className="flex items-center gap-1 pr-1" style={{ paddingLeft: depth * INDENT + 24 }}>
      <FolderPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Input
        autoFocus
        aria-label="New folder name"
        placeholder="Folder name"
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className="h-7 text-sm"
      />
      <Button type="button" size="sm" variant="secondary" disabled={busy || !name.trim()} onClick={submit}>
        {busy ? "Creating…" : "Create & move"}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
};
