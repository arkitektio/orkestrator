import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { MikroArrayDataset, MikroCoordinateSystem } from "@/linkers";
import { CornerDownRight } from "lucide-react";
import { ParentEdge, parentDatasetOfEdge } from "./derivedGrouping";

/**
 * The narrowest shape this section needs, rather than one query's generated type:
 * `derivedFrom` is the same relation on an array dataset and on a table dataset,
 * and both pages select it identically, so typing it structurally lets one
 * component serve both instead of the two diverging. Same reasoning as
 * `ParentEdge`, which this builds on.
 *
 * `reason` is optional because only UnmappableTransformation carries one.
 */
export type QueryEdge = ParentEdge & {
  id: string;
  kind: string;
  valueRelation?: string | null;
  output?: { id: string; name: string } | null;
  reason?: string | null;
};

/**
 * Where this dataset came FROM — the other half of its lineage.
 *
 * One edge for a deconvolution or a resample, several for a fusion of channels
 * or tiles, none at all for anything acquired rather than computed. The order is
 * the priority its creator declared, so the first edge is the primary parent:
 * the one that places it. That ordering is the query's, and is preserved here.
 *
 * Each row names the parent DATASET where one can be found and the SPACE
 * otherwise — the edge lands in a space, and a space without a dataset resident
 * is still a true answer, just a less useful one.
 */
export const DerivedFromSection = ({
  edges,
  emptyTitle = "Acquired, not computed",
  emptyDescription = "This dataset names no parent, so it came off an instrument rather than out of a task.",
}: {
  edges: readonly QueryEdge[];
  /**
   * What "no parents" MEANS, which is container-specific: an array dataset with
   * no derivation edge was acquired, while a table with none is freestanding —
   * nothing measures a feature table off an instrument.
   */
  emptyTitle?: string;
  emptyDescription?: string;
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row items-baseline justify-between gap-2">
        <div className="text-xs font-semibold">Derived from</div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {edges.length}
        </span>
      </div>

      {edges.length === 0 ? (
        <Empty>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </Empty>
      ) : (
        edges.map((edge, index) => {
          const parent = parentDatasetOfEdge(edge);
          // Only UnmappableTransformation carries a reason; the rest of the
          // union does not, so this is narrowed structurally rather than on
          // __typename — the same read `DerivedRow` uses.
          const reason =
            "reason" in edge ? (edge.reason ?? undefined) : undefined;

          return (
            <div
              key={edge.id}
              className="flex flex-row items-start gap-2 rounded-md border border-border/60 p-2"
            >
              <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col gap-1">
                {parent ? (
                  <MikroArrayDataset.DetailLink
                    object={parent}
                    className="break-all text-sm font-medium"
                  >
                    {parent.name}
                  </MikroArrayDataset.DetailLink>
                ) : edge.output ? (
                  <MikroCoordinateSystem.DetailLink
                    // Just the identity, not the whole edge target: the link
                    // needs an id, and `output.residents` is a readonly array
                    // the smart object's JSON-ish shape does not accept.
                    object={{ id: edge.output.id, name: edge.output.name }}
                    className="break-all text-sm font-medium"
                  >
                    {edge.output.name}
                  </MikroCoordinateSystem.DetailLink>
                ) : (
                  <span className="break-all text-sm text-muted-foreground">
                    Unknown parent
                  </span>
                )}

                <div className="flex flex-row flex-wrap items-center gap-x-2 text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                  <span>{edge.kind}</span>
                  {edge.valueRelation && <span>· {edge.valueRelation}</span>}
                  {index === 0 && edges.length > 1 && <span>· primary</span>}
                </div>

                {reason && (
                  <div className="text-[0.625rem] text-muted-foreground">
                    {reason}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
