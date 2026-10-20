import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { Badge } from "@/core/ui/badge";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { useMikroBigFileDownload } from "@/mikro/datalayer/useMikroBigFileDownload";
import { MikroFile, RekuestTask } from "@/core/linkers";
import { useDownload } from "@/core/modules/download/DownloadProvider";
import { DownloadIcon, FileIcon, GitBranch } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { GetFileQuery, HistoryKind, LineageNodeKind, useGetFileQuery } from "../api/graphql";
import { lineageLink } from "../components/lineage/lineageGraph";
import { MoveToFolderButton } from "../components/folder/MoveToFolderButton";
import { FileOutcomes } from "../components/file/FileOutcomes";
import { FileInfoSidebar } from "../components/sidebars/FileInfoSidebar";
import { formatBytes } from "../specs";
import { MIKRO_HELP } from "../help";

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



type PageFile = GetFileQuery["file"];

/**
 * When the file came to be. The creating task's `createdAt` when there is one;
 * otherwise the date of the Create entry in its provenance, which the page
 * query already carries. A file has no `createdAt` of its own.
 */
const createdAt = (file: PageFile): string | null =>
  file.createdThrough?.createdAt ??
  file.provenanceEntries.find((entry) => entry.kind === HistoryKind.Create)?.date ??
  null;

/** Absolute date for the `title` of the relative one. */
const absolute = (date: string): string => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
};

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
    <dd className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm font-medium">{children}</dd>
  </div>
);

/**
 * What a reader wants first: how big, of what kind, who made it, when, through
 * what. A cell whose answer is unknown is left out rather than filled with
 * "Unknown". The folder is the header's folder button; the storage internals
 * (bucket, key, ids) are the Info rail's.
 */
const FileFacts = ({ file }: { file: PageFile }) => {
  const created = createdAt(file);
  const task = file.createdThrough;
  const assigner = task?.assigner?.sub;
  const stored = file.store.sizeBytes;

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      <Fact label="Size">
        <span>{formatSize(file.size)}</span>
        {/* The declared size is what the uploader said; the stored one what
            the store measured. They only both earn a place when they differ. */}
        {stored != null && file.size != null && stored !== file.size && (
          <span className="text-xs font-normal text-muted-foreground">
            ({formatBytes(stored)} stored)
          </span>
        )}
      </Fact>

      {file.contentType && (
        <Fact label="Type">
          <span className="truncate font-mono text-xs" title={file.contentType}>
            {file.contentType}
          </span>
        </Fact>
      )}

      <Fact label="Created by">
        <StructureDisplay identifier="@lok/user" id={file.creator.sub} />
      </Fact>

      {created && (
        <Fact label="Created">
          <span title={absolute(created)}>
            <Timestamp date={created} relative />
          </span>
        </Fact>
      )}

      {task && (
        <Fact label="Through task">
          <RekuestTask.DetailLink
            object={{ id: task.taskId }}
            className="truncate font-mono text-xs underline-offset-2 hover:underline"
          >
            {task.taskId}
          </RekuestTask.DetailLink>
          {/* Who asked for the run, when that is someone other than the user
              the file was recorded as (an app acting for them). */}
          {assigner && assigner !== file.creator.sub && (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              assigned by <StructureDisplay identifier="@lok/user" id={assigner} />
            </span>
          )}
        </Fact>
      )}

      {file.store.originalFileName && file.store.originalFileName !== file.name && (
        <Fact label="Uploaded as">
          <span className="break-all">{file.store.originalFileName}</span>
        </Fact>
      )}
    </dl>
  );
};

export const FilePage = asDetailQueryRoute(useGetFileQuery, ({ data }) => {
  const download = useMikroBigFileDownload();
  const { startDownload } = useDownload();

  const file = data?.file;

  if (!file) return null;


  const fileExtension = getFileExtension(file.name);
  const fileTypeColorClass = getFileTypeColor(file.name);
  const created = createdAt(file);

  return (
    <MikroFile.ModelPage
      actions={<MikroFile.Actions object={file} />}
      object={file}
      help={MIKRO_HELP.file}
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

          {/* What these bytes became, and what was made of that, step by step. */}
          <PageAction
            asChild
            collapse="icon"
            icon={<GitBranch className="h-4 w-4" />}
            className="shadow-sm"
          >
            <Link to={lineageLink(LineageNodeKind.File, file.id)}>Lineage</Link>
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
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <div className={`rounded-xl border p-3 shadow-sm ${fileTypeColorClass}`}>
            <FileIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
              {file.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span>{formatSize(file.size)}</span>
              {file.contentType && (
                <>
                  <span>•</span>
                  <span>{file.contentType}</span>
                </>
              )}
              {created && (
                <>
                  <span>•</span>
                  <span title={absolute(created)}>
                    created <Timestamp date={created} relative />
                  </span>
                </>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="px-2.5 py-1 font-mono text-xs">
            {fileExtension}
          </Badge>
        </div>

        <FileFacts file={file} />

        {/* The "Origin Images" section used to sit here. `File.origins` was
            removed from the mikro schema: what a file came from is told by its
            provenance (Info rail), and what it became is below. */}
        <FileOutcomes fileId={file.id} />
      </div>
    </MikroFile.ModelPage>
  );
});

export default FilePage;
