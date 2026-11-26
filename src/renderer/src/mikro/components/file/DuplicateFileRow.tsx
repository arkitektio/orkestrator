import { MikroFile, MikroFolder } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { FileIcon } from "lucide-react";
import { DuplicateFileFragment } from "../../api/graphql";

/**
 * One file that holds the same bytes as another, as the duplicate prompt, the
 * File page and the Duplicates page list it: enough to recognise it — name,
 * where it is filed, who brought it and when.
 */
export const DuplicateFileRow = ({
  file,
  className,
  link = true,
}: {
  file: DuplicateFileFragment;
  className?: string;
  /** Off inside a dialog whose answer is the choice: a link would navigate away mid-question. */
  link?: boolean;
}) => (
  <div className={cn("flex min-w-0 items-center gap-2 text-sm", className)}>
    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
    <div className="flex min-w-0 flex-1 flex-col">
      {link ? (
        <MikroFile.DetailLink object={file} className="truncate font-medium hover:underline">
          {file.name}
        </MikroFile.DetailLink>
      ) : (
        <span className="truncate font-medium">{file.name}</span>
      )}
      <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        {file.folder ? (
          link ? (
            <MikroFolder.DetailLink object={file.folder} className="truncate hover:underline">
              {file.folder.name}
            </MikroFolder.DetailLink>
          ) : (
            <span className="truncate">{file.folder.name}</span>
          )
        ) : (
          <span>not in a folder</span>
        )}
        <span>·</span>
        <Timestamp date={file.createdAt} relative />
      </span>
    </div>
    <StructureDisplay identifier="@lok/user" id={file.creator.sub} variant="avatar" />
  </div>
);
