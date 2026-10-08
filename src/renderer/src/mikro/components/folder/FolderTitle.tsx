import { MikroFolder } from "@/core/linkers";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { FolderFragment, GetFoldersDocument, usePinFolderMutation, useUpdateFolderMutation } from "../../api/graphql";
import { PinToggle } from "../ui/PinToggle";

const TITLE = "text-3xl font-semibold leading-tight";

/**
 * The folder page's title, renamable in place: the pencil (or a double click)
 * swaps the name for an input in the same type, Enter or leaving the field
 * saves, Escape puts the old name back. The mutation answers with `id` and
 * `name`, so the cache — and with it every card showing this folder — follows.
 *
 * The pin sits next to it: per user, shown while the folder is pinned and on
 * hover otherwise.
 */
export const FolderTitle = ({ folder }: { folder: Pick<FolderFragment, "id" | "name" | "pinned"> }) => {
  const [updateFolder] = useUpdateFolderMutation();
  // The pin moves the folder in or out of every "pinned" list, which the
  // returned folder alone cannot tell the cache.
  const [pinFolder] = usePinFolderMutation({ refetchQueries: [GetFoldersDocument] });
  const [draft, setDraft] = useState<string | null>(null);
  // Escape unmounts the input, and a blur on the way out must not save.
  const cancelled = useRef(false);

  const start = () => {
    cancelled.current = false;
    setDraft(folder.name);
  };

  const commit = async () => {
    if (cancelled.current || draft === null) return;
    const name = draft.trim();
    setDraft(null);
    if (!name || name === folder.name) return;
    try {
      await updateFolder({ variables: { id: folder.id, name } });
    } catch (error) {
      toast.error(`Could not rename the folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const pin = async (pin: boolean) => {
    try {
      await pinFolder({ variables: { id: folder.id, pin } });
    } catch (error) {
      toast.error(`Could not ${pin ? "pin" : "unpin"} the folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (draft !== null) {
    return (
      <input
        autoFocus
        aria-label="Folder name"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            cancelled.current = true;
            setDraft(null);
          }
        }}
        className={`${TITLE} w-full rounded-sm bg-transparent outline-none ring-1 ring-border focus:ring-ring`}
      />
    );
  }

  return (
    <div className="group flex min-w-0 items-center gap-1">
      <MikroFolder.DetailLink
        object={folder}
        onDoubleClick={start}
        className={`${TITLE} ellipsis truncate break-all text-ellipsis`}
      >
        {folder.name}
      </MikroFolder.DetailLink>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Rename folder"
        title="Rename folder"
        onClick={start}
        className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <PinToggle
        size="sm"
        pinned={folder.pinned}
        onPin={pin}
        aria-label={folder.pinned ? "Unpin folder" : "Pin folder"}
        title={folder.pinned ? "Unpin folder" : "Pin folder"}
        className={`h-7 w-7 shrink-0 p-0 text-muted-foreground transition-opacity focus-visible:opacity-100 group-hover:opacity-100 ${folder.pinned ? "" : "opacity-0"}`}
      />
    </div>
  );
};
