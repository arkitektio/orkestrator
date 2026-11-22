import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { MikroFolder } from "@/core/linkers";
import { FolderChildKind, useGetFolderSummaryQuery } from "@/mikro/api/graphql";

export const FolderDisplay = (props: DisplayWidgetProps) => {
  // Counted on the server: a chip has no business listing the folder.
  const { data } = useGetFolderSummaryQuery({
    variables: {
      id: props.id,
    },
  });

  if (!data?.folder) {
    return <div className="text-xs text-muted-foreground">Folder not found</div>;
  }

  const folder = data.folder;
  const countOf = (kind: FolderChildKind) =>
    data.childrenCounts.kinds.find((entry) => entry.kind === kind)?.count ?? 0;
  const fileCount = countOf(FolderChildKind.File);
  const childCount = countOf(FolderChildKind.Folder);

  if (props.context === "command") {
    return (
      <MikroFolder.DetailLink object={folder}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{folder.name}</span>
          {fileCount > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {fileCount} {fileCount === 1 ? "file" : "files"}
            </span>
          )}
          {childCount > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {childCount} sub-folders
            </span>
          )}
        </div>
      </MikroFolder.DetailLink>
    );
  }

  return (
    <MikroFolder.DetailLink object={folder}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{folder.name}</div>
            {folder.description && (
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {folder.description}
              </div>
            )}
          </div>
          {folder.isDefault && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
              Default
            </span>
          )}
        </div>

        <div className="flex gap-3 text-xs text-muted-foreground">
          {fileCount > 0 && (
            <span>{fileCount} {fileCount === 1 ? "file" : "files"}</span>
          )}
          {childCount > 0 && <span>{childCount} sub-folders</span>}
        </div>
      </div>
    </MikroFolder.DetailLink>
  );
};
