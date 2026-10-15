import { HomeSection } from "@/core/layout/ModuleHome";
import { MikroFolder } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { Folder } from "lucide-react";
import { BsPinFill } from "react-icons/bs";
import { Ordering, useGetFoldersQuery } from "../../api/graphql";

/**
 * The folders the user pinned, as a row of shortcuts under their own heading.
 * Pins are per user and not a filtered list, so nothing on the page narrows
 * them. Nothing pinned (or nothing known yet) draws nothing, heading included.
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
    <HomeSection
      className={className}
      title={
        <>
          <BsPinFill className="h-3 w-3" aria-hidden />
          Pinned folders
        </>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
        {folders.map((folder) => (
          // `Smart` is a size container (`@container`), which has no intrinsic
          // width; the tile answers no container queries, so opt out.
          <MikroFolder.Smart key={folder.id} object={folder} className="[container-type:normal]!">
            <MikroFolder.DetailLink
              object={folder}
              className={cn(
                "group/folder flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-2.5 transition-colors",
                "hover:border-primary/30 hover:bg-muted/50",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Folder className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-tight text-foreground">
                  {folder.name}
                </span>
                {folder.description && (
                  <span className="block truncate text-xs text-muted-foreground">{folder.description}</span>
                )}
              </span>
            </MikroFolder.DetailLink>
          </MikroFolder.Smart>
        ))}
      </div>
    </HomeSection>
  );
};
