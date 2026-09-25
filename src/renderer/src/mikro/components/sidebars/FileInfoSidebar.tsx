import { Badge } from "@/components/ui/badge";
import { GetFileQuery, useGetFileDerivedQuery } from "../../api/graphql";
import { formatBytes } from "../../specs";
import { FileLinksSection } from "./FileLinksSection";
import { ProvenanceSection } from "./ProvenanceSection";

type PageFile = GetFileQuery["file"];

/**
 * Everything about a file that is not its bytes — the counterpart of
 * `DatasetInfoSidebar` and `TableDatasetInfoSidebar`, section for section, so
 * the three detail pages read the same way.
 *
 * Where the array rail says shape/dtype/levels and the table rail says its
 * declared columns, a file says the only things it structurally IS: how many
 * bytes, of what content type, in whose organization. There is nothing else to
 * know about a file until something has read it.
 *
 * The lineage is the interesting half, and it is deliberately NOT called a
 * derivation: a file has no coordinate system, so `derivedContainers` and
 * `exportedFrom` claim no geometry and place nothing. They say which containers
 * these bytes became and which container these bytes were written from — the
 * same relation in its two directions. That is also why there is no
 * `DerivedFromSection` here: nothing computes a file from other data in a way
 * this schema records as a transformation.
 *
 * The static facts come from the page's own query; the links are one extra round
 * trip made here, exactly as on the array and table pages — the tab is unmounted
 * while inactive (Radix `TabsContent`) so it costs nothing until someone opens
 * it.
 */
export const FileInfoSidebar = ({ file }: { file: PageFile }) => {
  const extension = file.name.split(".").pop()?.toUpperCase();

  // cache-and-network so reopening the tab after a converter ran shows what it
  // wrote rather than the answer from before it started.
  const { data, error, loading } = useGetFileDerivedQuery({
    variables: { id: file.id },
    fetchPolicy: "cache-and-network",
  });

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
          {file.organization?.slug || "Global"}
        </div>
      </div>

      {/* The links, with one failure message for both directions: they come from
          one query, so a partial rendering would be a lie about which one is
          missing. The history below stays outside the branch — it rides on the
          page's own query, so it is there whether or not this round trip
          lands. */}
      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">
            Could not load lineage: {error.message}
          </p>
        </div>
      ) : !data ? (
        <div className="text-xs text-muted-foreground">
          {loading ? "Loading lineage…" : null}
        </div>
      ) : (
        <>
          <FileLinksSection
            title="Converted into"
            links={data.file.derivedContainers}
            emptyTitle="Nothing read out of it"
            emptyDescription="No converter has written a dataset, table, mesh collection or annotation collection from these bytes."
          />

          <FileLinksSection
            title="Exported from"
            links={data.file.exportedFrom}
            emptyTitle="Not an export"
            emptyDescription="These bytes were uploaded rather than written out of data already held here."
          />
        </>
      )}

      <ProvenanceSection entries={file.provenanceEntries} />
    </div>
  );
};
