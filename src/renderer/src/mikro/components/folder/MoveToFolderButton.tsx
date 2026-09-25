import { useDialog } from "@/core/dialogs/registry";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { Ordering, useGetFoldersQuery } from "@/mikro/api/graphql";
import { Check, FolderInput, FolderPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { describeSubject, useFolderMove, type FolderMoveSubject } from "./useFolderMove";

/** How many folders the quick list offers before "Browse all folders…". */
const RECENT_LIMIT = 5;

export type MoveToFolderButtonProps = {
  /** What this button files. */
  subject: FolderMoveSubject;
  /**
   * The folder it sits in now, shown as a badge on the trigger.
   *
   * `undefined` means *unknown* and draws no badge — which is what a file page
   * passes, because mikro exposes no folder field on `File` (only
   * `FileFilter.folder`, so the relation exists but cannot be read back).
   * `null` is the different, knowable claim "in no folder".
   */
  currentFolder?: { id: string; name: string } | null;
};

/**
 * Move something into a folder, in one click for the common case.
 *
 * The dropdown lists the newest folders — most work happens in something made
 * recently — and hands off to the searchable picker dialog for everything else.
 * It is the same mutation and the same refetching either way; see
 * {@link useFolderMove}.
 */
export const MoveToFolderButton = ({
  subject,
  currentFolder,
}: MoveToFolderButtonProps) => {
  const { openDialog } = useDialog();
  const { move, loading } = useFolderMove();

  // Newest first. Not scoped to the current user: mikro filters `owner` by the
  // creator's *sub*, which nothing in the client can supply — lok's `me` carries
  // an id and a username, and the two are different keys (see the note in
  // ArrayDatasetFilterBar).
  const { data } = useGetFoldersQuery({
    variables: {
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: RECENT_LIMIT },
    },
  });

  const moveTo = (folder: { id: string; name: string }) => {
    move(subject, folder.id)
      .then(() => toast.success(`Moved to ${folder.name}`))
      .catch((e: Error) => toast.error("Could not move: " + e.message));
  };

  const folders = data?.folders ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={loading || subject.ids.length === 0}
          className="flex items-center gap-2 shadow-sm"
        >
          <FolderInput className="h-4 w-4" />
          Move to Folder
          {currentFolder !== undefined && (
            <Badge variant="secondary" className="max-w-40 truncate">
              {currentFolder?.name ?? "Unfiled"}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Move {describeSubject(subject)} to
        </DropdownMenuLabel>
        {folders.map((folder) => {
          const isCurrent = folder.id === currentFolder?.id;
          return (
            <DropdownMenuItem
              key={folder.id}
              disabled={isCurrent}
              onSelect={() => moveTo({ id: folder.id, name: folder.name })}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate">{folder.name}</span>
              {isCurrent && <Check className="h-4 w-4 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        {!folders.length && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No folders yet
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            openDialog(
              "movetofolder",
              { subject, currentFolder: currentFolder?.id ?? null },
              { className: "max-w-lg" },
            )
          }
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Browse all folders…
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            openDialog(
              "movetofolder",
              { subject, currentFolder: currentFolder?.id ?? null, startCreating: true },
              { className: "max-w-lg" },
            )
          }
          className="flex items-center gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          New folder…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
