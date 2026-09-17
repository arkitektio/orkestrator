import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { ListRender } from "@/components/layout/ListRender";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useElektroBigFileDownload } from "@/datalayer/hooks/useElektroBigFileDownload";
import { ElektroFile } from "@/linkers";
import { useDownload } from "@/providers/download/DownloadProvider";
import { DownloadIcon, FileIcon, LineChartIcon, LinkIcon } from "lucide-react";
import { useGetFileQuery } from "../api/graphql";
import TraceCard from "../components/cards/TraceCard";

// Helper for formatting file size
const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes == null) return "Unknown Size";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const FilePage = asDetailQueryRoute(useGetFileQuery, ({ data }) => {
  const download = useElektroBigFileDownload();
  const { startDownload } = useDownload();

  const file = data?.file;
  if (!file) return null;

  return (
    <ElektroFile.ModelPage
      actions={<ElektroFile.Actions object={file} />}
      object={file}
      title={file.name}
      pageActions={
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              startDownload(file.name, async ({ id, signal }) => {
                return await download(file.store.id, file.name, { id, signal });
              }).catch((e) => {
                console.error("Download error:", e);
              });
            }}
            variant="outline"
            className="flex items-center gap-2 shadow-sm"
          >
            <DownloadIcon className="h-4 w-4" />
            Download
          </Button>

          <ElektroFile.ObjectButton object={file} />
        </div>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <ElektroFile.Knowledge object={file} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      {/* File Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl border shadow-sm bg-muted text-muted-foreground border-border">
            <FileIcon className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {file.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>ID: {file.id}</span>
              <span>•</span>
              <span className="font-medium text-foreground">
                {file.contentType || "Unknown Content Type"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* File Metadata */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs mb-1">File Size</dt>
          <dd className="font-medium text-base">{formatBytes(file.size)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs mb-1">MIME Type</dt>
          <dd
            className="font-medium text-base truncate"
            title={file.contentType || "Unknown"}
          >
            {file.contentType || "Unknown Type"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs mb-1">Bucket</dt>
          <dd
            className="font-medium text-base truncate"
            title={file.store?.bucket}
          >
            {file.store?.bucket || "Unknown"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs mb-1">File ID</dt>
          <dd className="font-mono text-xs mt-1 bg-muted/50 p-1 rounded max-w-fit">
            {file.id}
          </dd>
        </div>
      </dl>

      {/* Origin Traces (Lineage) */}
      {file.origins && file.origins.length > 0 && (
        <div className="space-y-4 mb-8 mt-3">
          <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-2">
            <LinkIcon className="h-4 w-4 text-chart-5" />
            <h2 className="text-lg font-bold tracking-tight">Origin Traces</h2>
            <Badge
              variant="outline"
              className="bg-chart-5/10 text-chart-5 border-chart-5/20 font-semibold text-xs ml-auto"
            >
              {file.origins.length} Total
            </Badge>
          </div>

          <ListRender array={file.origins} fit>
            {(origin) => <TraceCard item={origin} key={origin.id} />}
          </ListRender>
        </div>
      )}

      {file.origins?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 mt-8 text-muted-foreground">
          <LineChartIcon className="h-8 w-8 text-muted-foreground/40" />
          <span className="text-sm">
            This file has not produced any traces yet.
          </span>
        </div>
      )}
    </ElektroFile.ModelPage>
  );
});

export default FilePage;
