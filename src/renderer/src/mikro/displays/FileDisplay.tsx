import { DisplayWidgetProps } from "@/lib/display/registry";
import { MikroFile } from "@/linkers";
import { useGetFileQuery } from "@/mikro/api/graphql";

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export const FileDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetFileQuery({
    variables: {
      id: props.object,
    },
  });

  if (!data?.file) {
    return <div className="text-xs text-muted-foreground">File not found</div>;
  }

  if (props.context === "command") {
    return (
      <MikroFile.DetailLink object={data.file}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{data.file.name}</span>
          {data.file.size != null && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatBytes(data.file.size)}
            </span>
          )}
          {data.file.contentType && (
            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">
              {data.file.contentType.split("/").pop()}
            </span>
          )}
        </div>
      </MikroFile.DetailLink>
    );
  }

  return (
    <MikroFile.DetailLink object={data.file}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-2">
        <div className="font-semibold text-sm truncate">{data.file.name}</div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {data.file.size != null && (
            <span>{formatBytes(data.file.size)}</span>
          )}
          {data.file.contentType && (
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
              {data.file.contentType}
            </span>
          )}
        </div>
      </div>
    </MikroFile.DetailLink>
  );
};
