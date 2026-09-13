import { Badge } from "@/components/ui/badge";
import { UserInfo } from "@/lok-next/components/protected/UserInfo";
import { MikroFolder } from "@/linkers";
import { FolderIcon } from "lucide-react";
import Timestamp from "@/components/ui/timestamp";
import { GetFolderQuery } from "../../api/graphql";
import { ProvenanceSection } from "./ProvenanceSection";

type PageFolder = GetFolderQuery["folder"];

/**
 * Everything about a folder that is not what is in it — the counterpart of
 * `DatasetInfoSidebar` and `TableDatasetInfoSidebar`, so the detail pages read
 * the same way: the contents fill the middle, everything *about* the container
 * lives in the rail.
 *
 * Deliberately shorter than the dataset rails, and the missing sections are the
 * schema's doing rather than a choice:
 *
 * - **No lineage.** `Folder` records no `derivedFrom` and nothing points back at
 *   it. A folder is organisational — it says where a user keeps things, never
 *   where anything sits in space — so there is no derivation to draw. What a
 *   dataset in here came from is on that dataset's own Info rail.
 * - **No contents count.** `files`, `arrayDatasets`, `tableDatasets`,
 *   `meshCollections` and `annotationCollections` are all paginated and the
 *   schema exposes no aggregate beside them, so `files.length` is the length of
 *   a PAGE. Rendering it as "12 files" would be a number this rail cannot back,
 *   and the explorer in the middle is the honest answer anyway.
 *
 * What is left is identity, placement and history — and all of it rides on the
 * page's own `GetFolder`, so unlike the dataset rails this makes no second round
 * trip.
 */
export const FolderInfoSidebar = ({ folder }: { folder: PageFolder }) => {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        {/* `break-all` like the other rails: folder names are usually one long
            token. The description below is prose and keeps wrapping at spaces. */}
        <h2 className="break-all text-lg font-semibold">{folder.name}</h2>
        {folder.description && (
          <p className="text-sm text-muted-foreground">{folder.description}</p>
        )}
        {(folder.isDefault || folder.pinned) && (
          <div className="flex flex-row flex-wrap gap-1">
            {folder.isDefault && (
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[0.625rem] font-normal"
                title="Where things land when nothing else is chosen"
              >
                Default
              </Badge>
            )}
            {folder.pinned && (
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-[0.625rem] font-normal"
              >
                Pinned
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Where this folder SITS. A folder reached by a link rather than by
          walking down to it has no breadcrumb behind it, so the parent is the
          only thing that places it — and a null parent means root, which is an
          answer rather than a gap. */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Parent</div>
        {folder.parent ? (
          <MikroFolder.DetailLink
            object={folder.parent}
            className="flex flex-row items-center gap-1.5 break-all text-xs text-muted-foreground"
          >
            <FolderIcon className="h-3 w-3 shrink-0" />
            {folder.parent.name}
          </MikroFolder.DetailLink>
        ) : (
          <span className="text-xs text-muted-foreground">
            Root folder — it hangs under nothing.
          </span>
        )}
      </div>

      {folder.tags.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Tags</div>
          <div className="flex flex-row flex-wrap gap-1">
            {folder.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="px-1.5 py-0 text-[0.625rem] font-normal"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Created</div>
        <div className="flex flex-row flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {/* Wrapped rather than passed a `title`: react-timestamp forwards no
              arbitrary props, so the exact date has to hang off the span. Same
              treatment as `ProvenanceEntryBody`. */}
          <span title={new Date(folder.createdAt).toLocaleString()}>
            <Timestamp date={folder.createdAt} relative />
          </span>
          {folder.creator && (
            <>
              <span>by</span>
              <UserInfo sub={folder.creator.sub} />
            </>
          )}
        </div>
      </div>

      <ProvenanceSection entries={folder.provenanceEntries} />
    </div>
  );
};
