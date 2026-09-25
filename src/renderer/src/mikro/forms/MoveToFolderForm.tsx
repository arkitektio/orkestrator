import { useDialog } from "@/core/app/dialog";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Input } from "@/core/components/ui/input";
import {
  FolderTree,
  type CreatingAt,
  type TreeFolder,
} from "@/mikro/components/folder/FolderTree";
import {
  describeSubject,
  useFolderMove,
  type FolderMoveSubject,
} from "@/mikro/components/folder/useFolderMove";
import { FolderPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateFolderMutation, useGetFoldersQuery } from "../api/graphql";

/** Pick the folder to file files or array datasets into. */
export type MoveToFolderFormProps = {
  /** What is being moved. */
  subject: FolderMoveSubject;
  /** The folder it sits in now, when known — marked and unclickable. */
  currentFolder?: string | null;
  /** Open with the new-folder row already showing, at the root. */
  startCreating?: boolean;
};

const SEARCH_LIMIT = 20;
/** The `pending` marker while the destination is a folder that does not exist yet. */
const PENDING_NEW = "__new__";

/**
 * Two views over the same folders: the tree while browsing, so a folder can be
 * found by where it hangs, and a flat search-result list once something is
 * typed, so it can be found by name from anywhere in the hierarchy.
 *
 * "New folder" is not a detour through the create dialog: the folder is made
 * and the subject moved into it in one go, since that is what wanting a new
 * folder here means.
 */
export const MoveToFolderForm = (props: MoveToFolderFormProps) => {
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<string>();
  const [creating, setCreating] = useState<CreatingAt>(props.startCreating ? null : undefined);
  const { closeDialog } = useDialog();
  const { move: moveTo } = useFolderMove();
  const [createFolder] = useCreateFolderMutation({ refetchQueries: ["GetFolders"] });

  const { data, loading } = useGetFoldersQuery({
    variables: {
      filters: { search },
      pagination: { limit: SEARCH_LIMIT },
    },
    skip: !search,
  });

  const move = (folder: TreeFolder) => {
    setPending(folder.id);
    return moveTo(props.subject, folder.id)
      .then(() => {
        toast.success(`Moved to ${folder.name}`);
        closeDialog();
      })
      .catch((e: Error) => toast.error("Could not move: " + e.message))
      .finally(() => setPending(undefined));
  };

  const createAndMove = (name: string, parent: string | null) => {
    setPending(PENDING_NEW);
    return createFolder({ variables: { input: { name, parent } } })
      .then((result) => {
        const folder = result.data?.createFolder;
        if (!folder) throw new Error("the folder was not created");
        return moveTo(props.subject, folder.id).then(() => {
          toast.success(`Created ${folder.name} and moved ${describeSubject(props.subject)} into it`);
          closeDialog();
        });
      })
      .catch((e: Error) => toast.error("Could not create folder: " + e.message))
      .finally(() => setPending(undefined));
  };

  const results = data?.folders ?? [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Move to Folder</DialogTitle>
        <DialogDescription>
          Move {describeSubject(props.subject)} into a folder
        </DialogDescription>
      </DialogHeader>
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search folders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending !== undefined}
            onClick={() => {
              setSearch("");
              setCreating(null);
            }}
            className="shrink-0 gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            New folder
          </Button>
        </div>
        <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
          {search ? (
            <>
              {results.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  disabled={pending !== undefined || folder.id === props.currentFolder}
                  onClick={() => move(folder)}
                  className="flex w-full items-center justify-between gap-2 rounded border border-input p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{folder.name}</div>
                    {folder.description && (
                      <div className="truncate text-xs text-muted-foreground">
                        {folder.description}
                      </div>
                    )}
                  </div>
                  {pending === folder.id ? (
                    <Badge variant="outline">Moving…</Badge>
                  ) : folder.id === props.currentFolder ? (
                    <Badge variant="outline">Current</Badge>
                  ) : (
                    folder.isDefault && <Badge variant="outline">Default</Badge>
                  )}
                </button>
              ))}
              {!loading && !results.length && (
                <div className="text-xs text-muted-foreground">No folders found</div>
              )}
              {/* The list is capped, so a full page is indistinguishable from
                  "your folder does not exist" unless it says so. */}
              {results.length === SEARCH_LIMIT && (
                <div className="pt-1 text-xs text-muted-foreground">
                  Showing the first {SEARCH_LIMIT} folders — keep typing to narrow.
                </div>
              )}
            </>
          ) : (
            <FolderTree
              currentFolder={props.currentFolder}
              pending={pending}
              creating={creating}
              onCreatingChange={setCreating}
              onPick={move}
              onCreate={createAndMove}
            />
          )}
        </div>
      </div>
    </>
  );
};
