import { Badge } from "@/core/components/ui/badge";
import { MikroSparseDataset, MikroTableDataset } from "@/core/linkers";
import { GetSparseDatasetQuery } from "../../api/graphql";
import { SparseAnchorsOverlay } from "./SparseAnchorsOverlay";
import {
  cellCount,
  density,
  describeChunks,
  describeShape,
  formatDensity,
  layoutOfArray,
  nonZeroCount,
  sparseDatasetTitle,
} from "./sparseFacts";

type PageDataset = GetSparseDatasetQuery["sparseDataset"];

/**
 * The matrix itself, as far as a page can show one without reading it: what
 * its two enumerations are and how big, which table names the positions of
 * each, and the stored layouts — one per axis a store's `indptr` walks, each
 * with the facts that decide what a read costs.
 *
 * Fills the middle the way a table's rows do. No cells are drawn: a sparse
 * matrix is mostly the zeros it does not store, and a colouring reads the one
 * slice it needs through the layout that indexes its axis (see
 * `SparseColouringSource`), which is the read this page describes rather than
 * performs. The anchors dock bottom-right, where the array and table pages
 * keep theirs.
 */
export const SparseDatasetOverview = ({ dataset }: { dataset: PageDataset }) => {
  const nnz = nonZeroCount(dataset.arrays);
  const cells = cellCount(dataset.shape);
  const fraction = nnz === null ? null : density(nnz, cells);

  return (
    // `relative` so the anchors overlay docks to this area rather than the
    // page; `min-h-0` + own scroll so a long layout list scrolls here and the
    // title stays put.
    <div className="relative flex h-full w-full min-h-0 flex-col gap-6 overflow-y-auto pr-1">
      {/* The same title treatment the table page keeps in flow. */}
      <div className="flex flex-col gap-0.5">
        <MikroSparseDataset.DetailLink
          object={dataset}
          className="ellipsis truncate break-all text-3xl font-semibold leading-tight text-ellipsis"
        >
          {sparseDatasetTitle(dataset.name)}
        </MikroSparseDataset.DetailLink>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="truncate">
            {describeShape(dataset.axisNames, dataset.shape)}
          </span>
          {nnz !== null && (
            <Badge variant="outline" className="font-sans text-[0.625rem]">
              {nnz.toLocaleString()} stored
            </Badge>
          )}
          {fraction !== null && (
            <Badge variant="outline" className="font-sans text-[0.625rem]">
              {formatDensity(fraction)} dense
            </Badge>
          )}
        </div>
      </div>

      {/* One row per axis: its extent, whether a layout indexes it, and the
          table (if any) whose rows are its positions. An axis with no such
          table still has positions — they are just numbers — and saying so
          is more useful than leaving the row out. */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xs font-semibold">Axes</div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {dataset.axisNames.length}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {dataset.axisNames.map((axis, index) => {
            const reference = dataset.axisReferences.find(
              (entry) => entry.axis === axis,
            );
            const indexed = dataset.indexableAxes.includes(axis);
            return (
              <div
                key={axis}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs"
              >
                <span className="font-mono font-semibold">{axis}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {dataset.shape[index] !== undefined
                    ? dataset.shape[index].toLocaleString()
                    : "?"}
                </span>
                {indexed && (
                  <Badge variant="outline" className="text-[0.625rem]">
                    indexed
                  </Badge>
                )}
                {reference ? (
                  <span className="text-muted-foreground">
                    named by{" "}
                    <MikroTableDataset.DetailLink
                      object={reference.references}
                      className="font-mono text-foreground"
                    >
                      {reference.references.name}
                    </MikroTableDataset.DetailLink>
                  </span>
                ) : (
                  <span className="text-muted-foreground">positions unnamed</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* The stored layouts. What a reader wants to know before opening one:
          which axis it can select along in one read, its dtype and chunking,
          and whether a range read is possible at all — a byte-addressable
          store is one chunk per array, so its "range" is the whole thing. */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xs font-semibold">Layouts</div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {dataset.arrays.length}
          </span>
        </div>
        {dataset.arrays.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            No layout stored yet.
          </span>
        ) : (
          <div className="flex flex-col gap-2">
            {dataset.arrays.map((array) => {
              const layout = layoutOfArray(array);
              const axisName =
                array.indexedAxisName ??
                dataset.axisNames[array.indexedAxis] ??
                `axis ${array.indexedAxis}`;
              const chunks = layout ? describeChunks(layout.chunks) : "";
              return (
                <div key={array.id} className="flex flex-col gap-0.5 text-xs">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span>
                      indexed on{" "}
                      <span className="font-mono font-semibold">{axisName}</span>
                    </span>
                    {layout ? (
                      <>
                        <span className="font-mono text-muted-foreground">
                          {layout.dtype}
                        </span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          nnz {layout.nnz.toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-[0.625rem]">
                          {layout.rangeReadable
                            ? "range reads"
                            : "whole-array reads only"}
                        </Badge>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        not found in its store
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 font-mono text-[0.625rem] text-muted-foreground">
                    <span className="break-all">{array.path}</span>
                    {chunks && <span>chunks {chunks}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SparseAnchorsOverlay datasetId={dataset.id} />
    </div>
  );
};
