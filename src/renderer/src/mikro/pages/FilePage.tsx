import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { Badge } from "@/core/components/ui/badge";
import { PageAction } from "@/core/components/ui/page-action";
import { useMikroBigFileDownload } from "@/mikro/datalayer/useMikroBigFileDownload";
import { MikroFile } from "@/core/linkers";
import { useDownload } from "@/core/providers/download/DownloadProvider";
import { DownloadIcon, FileIcon, Grid3x3 } from "lucide-react";
import { useGetFileQuery } from "../api/graphql";
import { MoveToFolderButton } from "../components/folder/MoveToFolderButton";
import ArrayDatasetList from "../components/lists/ArrayDatasetList";
import { FileInfoSidebar } from "../components/sidebars/FileInfoSidebar";
import { formatBytes } from "../specs";

// The shared `specs.formatBytes` does the arithmetic — identical 1024 steps and
// units to the copy that used to live here — so the body and the Info rail
// cannot render the same byte count two different ways a few hundred pixels
// apart. Only the null wording is this page's: `size` is nullable and the null
// is meaningful, since a store that has not reported yet is not a zero-byte
// file.
const formatSize = (bytes: number | null | undefined): string =>
  bytes == null ? "Unknown Size" : formatBytes(bytes);

// Helper for getting clean file extension
const getFileExtension = (filename: string) => {
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
};

// Helper for determining color based on extension
const getFileTypeColor = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf': return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'doc':
    case 'docx': return 'bg-chart-3/10 text-chart-3 border-chart-3/20';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'tiff':
    case 'tif': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'mp4':
    case 'avi':
    case 'mov': return 'bg-chart-4/10 text-chart-4 border-chart-4/20';
    case 'zip':
    case 'tar':
    case 'gz': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'json':
    case 'xml':
    case 'csv':
    case 'txt': return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};



export const FilePage = asDetailQueryRoute(useGetFileQuery, ({ data }) => {
  const download = useMikroBigFileDownload();
  const { startDownload } = useDownload();

  const file = data?.file;

  if (!file) return null;


  const fileExtension = getFileExtension(file.name);
  const fileTypeColorClass = getFileTypeColor(file.name);

  return (
    <MikroFile.ModelPage
      actions={<MikroFile.Actions object={file} />}
      object={file}
      title={file.name}
      pageActions={
        <>
          {/* `folder` is nullable and the null is meaningful: unfiled, or its
              folder was deleted. Either way the badge says "Unfiled". */}
          <MoveToFolderButton
            subject={{ kind: "file", ids: [file.id] }}
            currentFolder={file.folder ?? null}
          />
          <PageAction
            collapse="icon"
            icon={<DownloadIcon className="h-4 w-4" />}
            onClick={() => {
              startDownload(file.name, async ({ id, signal }) => {
                return await download(file.store.id, file.name, { id, signal });
              }).catch((e) => {
                console.error("Download error:", e);
              });
            }}
            className="shadow-sm"
          >
            Download
          </PageAction>

          <MikroFile.ObjectButton alwaysShow object={file} />
        </>
      }
      // `additionalSidebars` rather than an explicit `sidebars`: passing the
      // latter takes over the whole rail, so Knowledge and Chat would have to be
      // rebuilt here to keep them. The standalone Provenance tab is gone with
      // it — the history is a section of Info now, next to the links it
      // explains, exactly as on the array and table pages.
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <FileInfoSidebar file={file} />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      {/* Enhanced File Header / Title Area */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl border shadow-sm ${fileTypeColorClass}`}>
            <FileIcon className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {file.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>ID: {file.id}</span>
              <span>•</span>
              <span className="font-medium text-foreground">{file.contentType || "Unknown Content Type"}</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-mono px-2.5 py-1">
            {fileExtension}
          </Badge>
        </div>
      </div>

      {/* File Metadata */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs mb-1">File Size</dt>
            <dd className="font-medium text-base">{formatSize(file.size)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">MIME Type</dt>
            <dd className="font-medium text-base truncate" title={file.contentType || "Unknown"}>
              {file.contentType || "Unknown Type"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">Organization</dt>
            <dd className="font-medium text-base">{file.organization?.slug || "Global"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs mb-1">File ID</dt>
            <dd className="font-mono text-xs mt-1 bg-muted/50 p-1 rounded max-w-fit">{file.id}</dd>
          </div>
        </dl>

      {/* The "Origin Images" section used to sit here. `File.origins` was
          removed from the mikro schema, so there is nothing left to render:
          what a file came from is now told by its provenance entries. */}

      {/* Derived Datasets — the array datasets a converter wrote out of these
          bytes. Filtered server-side with `sourceFile` rather than walking
          `file.derivedContainers`: that field is kind-blind (tables, meshes and
          annotation collections come back on it too), and going through the
          list keeps the same card, pagination and empty state as every other
          dataset list. */}
      <div className="space-y-4 mt-4">
        <ArrayDatasetList
          filters={{ sourceFile: file.id }}
          title={
            <div className="flex items-center pb-2">
              <Grid3x3 className="h-4 w-4 text-chart-2" />
              <h2 className="text-lg font-bold tracking-tight">
                Derived Datasets
              </h2>
            </div>
          }
          emptyTitle="No datasets from this file"
          emptyDescription="Nothing has been converted out of these bytes yet."
          defaultLimit={10}
        />
      </div>

    </MikroFile.ModelPage>
  );
});

export default FilePage;
