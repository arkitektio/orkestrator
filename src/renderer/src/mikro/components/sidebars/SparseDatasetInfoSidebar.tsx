import { Badge } from "@/components/ui/badge";
import { MikroCoordinateSystem, MikroFolder, MikroSparseDataset } from "@/linkers";
import {
  GetSparseDatasetQuery,
  useGetSparseDatasetDerivedQuery,
} from "../../api/graphql";
import { residentLabel } from "../coordinates/residents";
import { describeShape, sparseDatasetTitle } from "../sparse/sparseFacts";
import { DerivedFromSection } from "./DerivedFromSection";
import { FileLinksSection } from "./FileLinksSection";
import { ProvenanceSection } from "./ProvenanceSection";

type PageDataset = GetSparseDatasetQuery["sparseDataset"];

/** A `provenanceMetadata` worth a section: an object with at least one entry. */
const hasEntries = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value as object).length > 0;

/**
 * Everything about a sparse dataset that is not its structure — the counterpart
 * of `TableDatasetInfoSidebar`, section for section: the container's identity
 * and where it sits in the rail, the matrix itself in the middle.
 *
 * The static facts come from the page's own query; the lineage and the history
 * are one extra round trip made here, exactly as on the other two pages — the
 * tab is unmounted while inactive so it costs nothing until someone opens it.
 * One file section fewer than the table's: nothing exports a sparse matrix to
 * a file held here, and the schema has no `exports` to ask.
 */
export const SparseDatasetInfoSidebar = ({ dataset }: { dataset: PageDataset }) => {
  // cache-and-network so reopening the tab after a task ran shows what it
  // recorded rather than the answer from before it started.
  const { data, error, loading } = useGetSparseDatasetDerivedQuery({
    variables: { id: dataset.id },
    fetchPolicy: "cache-and-network",
  });

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        {/* `break-all` like the other rails: a dataset name is usually one long
            token, which word-wrap would not break at all. */}
        <MikroSparseDataset.DetailLink
          object={dataset}
          className="break-all text-lg font-semibold"
        >
          {sparseDatasetTitle(dataset.name)}
        </MikroSparseDataset.DetailLink>
        {dataset.description && (
          <p className="text-sm text-muted-foreground">{dataset.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Axes</div>
        <div className="font-mono text-xs text-muted-foreground">
          {describeShape(dataset.axisNames, dataset.shape)}
        </div>
        {dataset.indexableAxes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {/* The property that decides what this matrix can be asked, in
                the place the table rail badges its coordinate columns. */}
            {dataset.indexableAxes.map((axis) => (
              <Badge key={axis} variant="outline" className="text-[0.625rem]">
                indexed on {axis}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Coordinate system</div>
        <MikroCoordinateSystem.DetailLink
          object={dataset.coordinateSystem}
          className="break-all text-2xs ellipsis font-mono text-muted-foreground"
        >
          {dataset.coordinateSystem.name}
        </MikroCoordinateSystem.DetailLink>
        <div>
          <Badge variant="outline" className="text-[0.625rem]">
            {residentLabel(dataset.coordinateSystem)}
          </Badge>
        </div>
      </div>

      {/* `folder` is nullable and the null is meaningful — a matrix nobody
          filed reads "Unfiled", which is not the same as not knowing. */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Folder</div>
        {dataset.folder ? (
          <MikroFolder.DetailLink
            object={dataset.folder}
            className="break-all text-xs"
          >
            {dataset.folder.name}
          </MikroFolder.DetailLink>
        ) : (
          <span className="text-xs text-muted-foreground">Unfiled</span>
        )}
      </div>

      {/* Lineage and history. One failure message for both: they come from one
          query, so a partial rendering would be a lie about which part is
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
          <DerivedFromSection
            edges={data.sparseDataset.derivedFrom}
            // Not "acquired": nothing measures a matrix off an instrument. A
            // matrix with no parent edge is one that claims no data underneath
            // it at all.
            emptyTitle="Freestanding matrix"
            emptyDescription="This matrix names no parent, so its cells are not recorded as computed over any other data."
          />

          {/* Which BYTES this matrix came out of, next to which DATA it was
              computed from — two different questions, and both can have an
              answer. */}
          <FileLinksSection
            title="Loaded from"
            links={data.sparseDataset.sourceFiles}
            emptyTitle="No source file"
            emptyDescription="These cells were written directly rather than converted out of a file held here."
          />

          {/* The run that produced it, as the document the server holds it as:
              its parameters and inputs are whatever the producing task wrote,
              so there are no fields to pretend it into. Folded by default —
              it is reference material, not the first thing to read. */}
          {hasEntries(data.sparseDataset.provenanceMetadata) && (
            <details className="flex flex-col gap-1">
              <summary className="cursor-pointer text-xs font-semibold">
                Run
              </summary>
              <pre className="mt-1 max-h-64 overflow-auto rounded bg-muted/40 p-2 font-mono text-[0.625rem] leading-snug text-muted-foreground">
                {JSON.stringify(data.sparseDataset.provenanceMetadata, null, 2)}
              </pre>
            </details>
          )}

          <ProvenanceSection entries={data.sparseDataset.provenanceEntries} />
        </>
      )}
    </div>
  );
};
