import { Badge } from "@/components/ui/badge";
import { MikroFile } from "@/linkers";
import { Object } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { FileIcon } from "lucide-react";
import { useGetFolderQuery } from "../../api/graphql";
import {
  HoverRow,
  HoverSectionLabel,
  HoverShell,
  HoverSkeleton,
} from "./HoverShell";

export const FolderHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useGetFolderQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load folder details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const folder = data.folder;

  const files = folder.files.slice(0, 6);

  return (
    <HoverShell
      title={folder.name}
      subtitle={folder.isDefault ? "Default folder" : "Folder"}
    >
      {folder.description && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {folder.description}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <HoverRow label="Files" value={folder.files.length} />
        {folder.children.length > 0 && (
          <HoverRow label="Sub-folders" value={folder.children.length} />
        )}
        <HoverRow
          label="Created"
          value={
            folder.createdAt
              ? formatDistanceToNow(new Date(folder.createdAt), {
                  addSuffix: true,
                })
              : "—"
          }
        />
      </div>
      {files.length > 0 && (
        <div className="flex flex-col gap-1">
          <HoverSectionLabel>Contains</HoverSectionLabel>
          <div className="flex flex-col gap-0.5">
            {files.map((file) => (
              <MikroFile.DetailLink
                key={`file-${file.id}`}
                object={file}
                className="flex flex-row items-center gap-2 rounded px-1 py-0.5 hover:bg-muted transition-colors"
              >
                <div className="h-6 w-6 rounded shrink-0 bg-muted flex items-center justify-center">
                  <FileIcon className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs line-clamp-1">{file.name}</span>
              </MikroFile.DetailLink>
            ))}
          </div>
        </div>
      )}

      {folder.tags.length > 0 && (
        <div className="flex flex-row flex-wrap gap-1 pt-1">
          {folder.tags.slice(0, 6).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </HoverShell>
  );
};

export default FolderHoverCard;
