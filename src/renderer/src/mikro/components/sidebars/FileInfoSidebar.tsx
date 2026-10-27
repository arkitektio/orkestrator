import { Badge } from "@/core/ui/badge";
import { CopyButton } from "@/core/ui/copy-button";
import { GetFileQuery, LineageNodeKind } from "../../api/graphql";
import { formatBytes } from "../../specs";
import { LineageLink } from "../lineage/LineageLink";
import { ProvenanceSection } from "./ProvenanceSection";

type PageFile = GetFileQuery["file"];

/**
 * Everything about a file that is not its bytes — the counterpart of
 * `DatasetInfoSidebar` and `TableDatasetInfoSidebar`, so the detail pages read
 * the same way.
 *
 * A file structurally IS only a few things: how many bytes, of what content
 * type, in whose organization, kept where. Those are here, with the storage
 * internals (bucket, key, ids) a person copies into a script or a bug report.
 *
 * What the bytes became and what they were exported from used to be listed
 * here too; they are the page body's "What it became" now, where every kind of
 * container has room. The rail keeps the way into the lineage graph and the
 * edit history, which rides on the page's own query.
 */
export const FileInfoSidebar = ({ file }: { file: PageFile }) => {
  const extension = file.name.split(".").pop()?.toUpperCase();

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        {/* `break-all` like the other rails: a file name is one long token that
            word-wrap would not break at all. */}
        <h2 className="break-all text-lg font-semibold">{file.name}</h2>
        {file.contentType && (
          <p className="break-all font-mono text-xs text-muted-foreground">
            {file.contentType}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Bytes</div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">Size</span>
          {/* `size` is nullable and the null is meaningful — a store that has
              not reported yet is not a zero-byte file. */}
          <span className="font-mono text-xs">
            {file.size == null ? "Unknown Size" : formatBytes(file.size)}
          </span>
        </div>
        {extension && (
          <div>
            {/* The badge slot the array rail gives multiscale depth: for a file
                the one structural fact worth a glance is what kind it is. */}
            <Badge variant="outline" className="font-mono text-[0.625rem]">
              {extension}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Organization</div>
        <div className="break-all font-mono text-xs text-muted-foreground">
          {file.organization?.id || "Global"}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold">Storage</div>
        <StorageRow label="File ID" value={file.id} />
        <StorageRow label="Bucket" value={file.store.bucket} />
        <StorageRow label="Key" value={file.store.key} />
        {file.store.originalFileName && file.store.originalFileName !== file.name && (
          <StorageRow label="Uploaded as" value={file.store.originalFileName} />
        )}
        {/* Null while the upload is unfinished, and for stores written before
            the size was recorded: then there is no row rather than a guess. */}
        {file.store.sizeBytes != null && (
          <StorageRow label="Stored" value={formatBytes(file.store.sizeBytes)} copy={false} />
        )}
        {file.store.contentType && file.store.contentType !== file.contentType && (
          <StorageRow label="Stored as" value={file.store.contentType} copy={false} />
        )}
      </div>

      <LineageLink kind={LineageNodeKind.File} id={file.id} />

      <ProvenanceSection entries={file.provenanceEntries} />
    </div>
  );
};

const StorageRow = ({
  label,
  value,
  copy = true,
}: {
  label: string;
  value: string;
  copy?: boolean;
}) => (
  <div className="flex items-start gap-2">
    <span className="w-20 shrink-0 pt-0.5 text-xs text-muted-foreground">{label}</span>
    <span className="min-w-0 flex-1 break-all pt-0.5 font-mono text-xs">{value}</span>
    {copy && <CopyButton value={value} title={`Copy ${label.toLowerCase()}`} />}
  </div>
);
