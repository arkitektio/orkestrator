import { MikroFolder } from "@/core/linkers";
import { Folder } from "lucide-react";
import { BsPinFill } from "react-icons/bs";
import { Ordering, useGetFoldersQuery } from "../../api/graphql";

/**
 * The folders the user pinned, as a strip of shortcuts. Pins are per user and
 * not a filtered list, so the page's search, date range and sort leave it
 * alone. Nothing pinned (or nothing known yet) draws nothing.
 */
export const PinnedFolders = ({ className }: { className?: string }) => {
  const { data } = useGetFoldersQuery({
    variables: {
      filters: { pinned: true },
      ordering: [{ name: Ordering.Asc }],
      pagination: { limit: 30 },
    },
  });

  const folders = data?.folders ?? [];
  if (folders.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      <BsPinFill className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Pinned folders" />
      {folders.map((folder) => (
        // `Smart` is a size container (`@container`), which has no intrinsic
        // width: a pill sized by its own name collapses to its padding. Opt
        // out, the pill has no container queries to answer.
        <MikroFolder.Smart key={folder.id} object={folder} className="shrink-0 [container-type:normal]!">
          <MikroFolder.DetailLink
            object={folder}
            className="flex max-w-48 items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Folder className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{folder.name}</span>
          </MikroFolder.DetailLink>
        </MikroFolder.Smart>
      ))}
    </div>
  );
};
