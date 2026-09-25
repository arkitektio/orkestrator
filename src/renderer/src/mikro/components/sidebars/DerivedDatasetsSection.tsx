import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { MikroArrayDataset } from "@/linkers";
import { Grid3x3 } from "lucide-react";
import { GetArrayDatasetDerivedQuery } from "../../api/graphql";
import { modifierSpecsOf, spatialSpecOf, splitAxesBySpec } from "../../specs";
import { groupDerived } from "./derivedGrouping";

/**
 * What came OUT of this dataset — the deconvolutions, segmentations, projections
 * and fusions that named one of its spaces as a parent.
 *
 * `ArrayDataset.derivedDatasets` is already the union this promises: a child is
 * listed there whether it was computed from the dataset's intrinsic grid or from
 * the space a slicing lens cuts out, because a lens' space IS a space of the
 * dataset. The lenses are fetched alongside only to LABEL the groups.
 *
 * A section rather than a tab of its own: it is one half of the dataset's
 * lineage, and it reads next to the other half (`derivedFrom`) and the edit
 * history in the Info tab. The query lives with that tab, so this takes data.
 */

type QueryLens = GetArrayDatasetDerivedQuery["lenses"][number];
type QueryDerived =
  GetArrayDatasetDerivedQuery["arrayDataset"]["derivedDatasets"][number];

/**
 * Compact enough for the rail — deliberately not `ArrayDatasetCard`, which is an
 * aspect-square grid tile. Same vocabulary though: the spec's icon, the spatial
 * extent, then the acquisition modifiers.
 */
const DerivedRow = ({
  dataset,
  otherParents,
}: {
  dataset: QueryDerived;
  otherParents: number;
}) => {
  const spatial = spatialSpecOf(dataset.spec);
  const modifiers = modifierSpecsOf(dataset.spec);
  const axes = splitAxesBySpec(dataset.axisNames, dataset.shape, dataset.spec);
  const Icon = spatial?.icon ?? Grid3x3;

  const primary = dataset.derivedFrom.at(0);
  // Only UnmappableTransformation carries a reason; the rest of the union does
  // not, so this is narrowed structurally rather than on __typename.
  const reason =
    primary && "reason" in primary ? (primary.reason ?? undefined) : undefined;

  return (
    <MikroArrayDataset.Smart object={dataset}>
      <div className="flex flex-row items-start gap-2 rounded-md border border-border/60 p-2 transition-colors hover:bg-accent/50">
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-label={spatial?.label}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <MikroArrayDataset.DetailLink
            object={dataset}
            className="break-all text-sm font-medium"
          >
            {dataset.name}
          </MikroArrayDataset.DetailLink>

          <div className="flex flex-row flex-wrap items-baseline gap-x-2 font-mono text-[0.625rem] text-muted-foreground">
            {axes.spatial.map((axis, index) => (
              <span key={index}>
                {axis.extent} {axis.name}
              </span>
            ))}
            {axes.acquisition.map((axis, index) => (
              <span key={`a${index}`} className="opacity-70">
                {axis.extent} {axis.name}
              </span>
            ))}
          </div>

          <div className="flex flex-row flex-wrap items-center gap-1">
            {primary && (
              <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                {primary.kind}
                {primary.valueRelation ? ` · ${primary.valueRelation}` : ""}
              </span>
            )}
            {modifiers.map((modifier) => (
              <Badge
                key={modifier.spec}
                variant="secondary"
                className="px-1 py-0 text-[10px] font-normal"
              >
                {modifier.short}
              </Badge>
            ))}
            {dataset.multiscale && (
              <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
                multiscale
              </Badge>
            )}
            {otherParents > 0 && (
              <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
                +{otherParents} parent{otherParents > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {reason && (
            <div className="text-[0.625rem] text-muted-foreground">{reason}</div>
          )}
        </div>
      </div>
    </MikroArrayDataset.Smart>
  );
};

export const DerivedDatasetsSection = ({
  intrinsicSystem,
  lenses,
  derived,
}: {
  intrinsicSystem: GetArrayDatasetDerivedQuery["arrayDataset"]["intrinsicSystem"];
  lenses: readonly QueryLens[];
  derived: readonly QueryDerived[];
}) => {
  const groups = groupDerived<QueryLens, QueryDerived>(
    intrinsicSystem?.id,
    intrinsicSystem?.name,
    lenses,
    derived,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row items-baseline justify-between gap-2">
        <div className="text-xs font-semibold">Derived to</div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {derived.length}
        </span>
      </div>

      {derived.length === 0 ? (
        <Empty>
          <EmptyTitle>Nothing derived yet</EmptyTitle>
          <EmptyDescription>
            Datasets computed from this one — a deconvolution, a segmentation, a
            projection — will show up here, grouped by the lens they came through.
          </EmptyDescription>
        </Empty>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                {group.title}
              </div>
              {group.subtitle && (
                <div className="break-all font-mono text-[0.625rem] text-muted-foreground">
                  {group.subtitle}
                </div>
              )}
            </div>
            {group.items.map((item) => (
              <DerivedRow
                key={item.dataset.id}
                dataset={item.dataset}
                otherParents={item.otherParents}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
};
