import { Badge } from "@/core/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/components/ui/popover";
import { MikroCoordinateSystem } from "@/core/linkers";
import { GetArrayDatasetQuery, useGetArrayDatasetDerivedQuery } from "../../api/graphql";
import {
  ADATASET_SPEC_INFO,
  arrayNbytes,
  baseDtypeOf,
  datasetNbytes,
  datasetStoredBytes,
  formatBytes,
  formatShape,
} from "../../specs";
import { DatasetCalibrationSection } from "./DatasetCalibrationSection";
import { DerivedDatasetsSection } from "./DerivedDatasetsSection";
import { DerivedFromSection } from "./DerivedFromSection";
import { FileLinksSection } from "./FileLinksSection";
import { ProvenanceSection } from "./ProvenanceSection";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

/**
 * Everything about the dataset that is not the picture: what it IS, where it
 * came from, what came out of it, and how it has been edited since.
 *
 * The four read as one story, which is why they are one tab rather than a tab
 * each — a lineage split across two rails is a lineage nobody follows. The
 * static facts come from the page's own query; the lineage and the history are
 * one extra round trip made here, because the tab is unmounted while inactive
 * (Radix `TabsContent`) and so costs nothing until someone opens it.
 */
export const DatasetInfoSidebar = ({ dataset }: { dataset: PageDataset }) => {
  const dtype = baseDtypeOf(dataset.dataArrays);
  const nbytes = datasetNbytes(dataset.dataArrays);
  const storedNbytes = datasetStoredBytes(dataset.dataArrays);
  // `level` is a field, not a position — the API does not promise order.
  const levels = [...dataset.dataArrays].sort((a, b) => a.level - b.level);
  // Storage layout off the base level, like the dtype: `store.chunks` is the
  // effective INNER chunk shape (the fetch/brick unit), `store.shards` the
  // outer storage object for a sharding_indexed array — null when unsharded.
  const baseArray =
    dataset.dataArrays.find((array) => array.level === 0) ?? dataset.dataArrays[0];
  const chunkShape = baseArray?.store.chunks;
  const shardShape = baseArray?.store.shards;

  // cache-and-network so reopening the tab after a task ran shows what it
  // produced rather than the answer from before it started.
  const { data, error, loading } = useGetArrayDatasetDerivedQuery({
    variables: { id: dataset.id },
    fetchPolicy: "cache-and-network",
  });

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        {/* `break-all` like the page title: a name is usually one long token, so
            the default word-wrap would not wrap it and it would run out of the
            rail. The description below is prose and keeps wrapping at spaces. */}
        <h2 className="break-all text-lg font-semibold">{dataset.name}</h2>
        {dataset.description && (
          <p className="text-sm text-muted-foreground">{dataset.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Shape</div>
        <div className="font-mono text-xs text-muted-foreground">
          {formatShape(dataset.axisNames, dataset.shape)}
        </div>
        {dtype && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Dtype</span>
            <span className="font-mono text-xs">{dtype}</span>
          </div>
        )}
        {chunkShape && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Chunks</span>
            <span className="font-mono text-xs">
              {formatShape(dataset.axisNames, chunkShape)}
            </span>
          </div>
        )}
        {/* Only when sharded: no row is "unsharded", not a missing fact. */}
        {shardShape && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Shards</span>
            <span className="font-mono text-xs">
              {formatShape(dataset.axisNames, shardShape)}
            </span>
          </div>
        )}
        {nbytes !== undefined && (
          <Popover>
            <PopoverTrigger asChild>
              {/* The total is the fact the rail carries; the per-level split it
                  sums over lives behind the click, so the deliberately-removed
                  level listing does not creep back into the panel itself. */}
              <button
                type="button"
                className="flex w-fit items-baseline gap-2"
                title="Show per-level arrays"
              >
                <span className="text-xs text-muted-foreground">Size</span>
                <span className="font-mono text-xs underline decoration-dotted underline-offset-2">
                  {formatBytes(nbytes)}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-96 gap-1.5">
              <div className="text-xs font-semibold">
                Data arrays
                {dataset.multiscale && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {levels.length} levels
                  </span>
                )}
              </div>
              {/* Two sizes per level: what it is (shape × dtype) and what it
                  costs on disk (the store's measured sizeBytes, after
                  compression). "–" where a store was never measured. */}
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-baseline gap-x-3 gap-y-1">
                <span />
                <span />
                <span className="text-right text-[0.625rem] text-muted-foreground">
                  Uncompressed
                </span>
                <span className="text-right text-[0.625rem] text-muted-foreground">
                  On disk
                </span>
                {levels.map((array) => {
                  const levelBytes = arrayNbytes(array);
                  const storedBytes = datasetStoredBytes([array]);
                  return (
                    <div key={array.id} className="contents">
                      <span className="text-muted-foreground">L{array.level}</span>
                      <span className="min-w-0 break-all font-mono">
                        {formatShape(dataset.axisNames, array.shape)}
                      </span>
                      <span className="text-right font-mono text-muted-foreground">
                        {levelBytes === undefined ? "?" : formatBytes(levelBytes)}
                      </span>
                      <span className="text-right font-mono">
                        {storedBytes === undefined ? "–" : formatBytes(storedBytes)}
                      </span>
                    </div>
                  );
                })}
                {levels.length > 1 && (
                  <>
                    <span className="col-span-2 border-t border-border pt-1 text-muted-foreground">
                      Total
                    </span>
                    <span className="border-t border-border pt-1 text-right font-mono text-muted-foreground">
                      {formatBytes(nbytes)}
                    </span>
                    <span className="border-t border-border pt-1 text-right font-mono font-medium">
                      {storedNbytes === undefined ? "–" : formatBytes(storedNbytes)}
                    </span>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {dataset.multiscale && (
          <div>
            {/* Carries the DEPTH, not just the fact: it is what survives of the
                per-level listing this panel used to end with. */}
            <Badge variant="outline" className="text-[0.625rem]">
              {dataset.dataArrays.length} levels
            </Badge>
          </div>
        )}
      </div>

      {dataset.intrinsicSystem && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Coordinate system</div>
          <MikroCoordinateSystem.DetailLink
            object={dataset.intrinsicSystem}
            className="break-all text-2xs ellipsis font-mono text-muted-foreground"
          >
            {dataset.intrinsicSystem.name}
          </MikroCoordinateSystem.DetailLink>
        </div>
      )}

      {/* What the dataset structurally IS, in place of the per-level array
          listing that used to sit here: the levels are the same array at
          different resolutions, so listing every one said a single fact many
          times over. Their count moved onto the multiscale badge above. */}
      {dataset.spec.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Tags</div>
          <div className="flex flex-row flex-wrap gap-1">
            {dataset.spec.map((spec) => {
              const entry = ADATASET_SPEC_INFO[spec];
              if (!entry) return null;
              const Icon = entry.icon;
              return (
                <Badge
                  key={spec}
                  variant="secondary"
                  className="gap-1 px-1.5 py-0 text-[0.625rem] font-normal"
                  title={entry.description}
                >
                  <Icon className="h-3 w-3" />
                  {entry.short}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      <DatasetCalibrationSection dataset={dataset} />

      {/* Lineage and history. One failure message for all three: they come from
          one query, so a partial rendering would be a lie about which part is
          missing. */}
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
          <DerivedFromSection edges={data.arrayDataset.derivedFrom} />

          <DerivedDatasetsSection
            intrinsicSystem={data.arrayDataset.intrinsicSystem}
            lenses={data.lenses}
            derived={data.arrayDataset.derivedDatasets}
          />

          {/* Which BYTES this dataset came out of, next to which DATA it was
              computed from — two different questions, and both can have an
              answer. A file has no coordinate system, so these links place
              nothing, which is why they are their own section rather than more
              rows in `DerivedFromSection`. The other end of the same links is
              what the file's own Info rail lists. */}
          <FileLinksSection
            title="Converted from"
            links={data.arrayDataset.sourceFiles}
            emptyTitle="No source file"
            emptyDescription="These arrays were written directly rather than converted out of a file held here."
          />

          <FileLinksSection
            title="Exported to"
            links={data.arrayDataset.exports}
            emptyTitle="Never exported"
            emptyDescription="No file has been written out of this dataset."
          />

          <ProvenanceSection entries={data.arrayDataset.provenanceEntries} />
        </>
      )}
    </div>
  );
};
