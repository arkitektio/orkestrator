import { Badge } from "@/components/ui/badge";
import { DisplayWidgetProps } from "@/lib/display/registry";
import { MikroArrayDataset } from "@/linkers";
import { Grid3x3 } from "lucide-react";
import { SnapshotBackdrop } from "../components/cards/SnapshotBackdrop";
import { useGetListArrayDatasetQuery } from "../api/graphql";
import {
  formatAxes,
  modifierSpecsOf,
  spatialSpecOf,
  splitAxesBySpec,
} from "../specs";

/**
 * The registry display for `@mikro/arraydataset` — what a task return, a
 * command-palette row, or a structure widget shows when it holds a dataset.
 *
 * Reads the same `GetListArrayDataset` as the hover card, so the two share a
 * cache entry with the datasets page rather than each fetching the dataset.
 */
export const ArrayDatasetDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetListArrayDatasetQuery({
    variables: { id: props.object },
  });

  if (!data?.arrayDataset) {
    return (
      <div className="text-xs text-muted-foreground">Dataset not found</div>
    );
  }

  const arrayDataset = data.arrayDataset;
  const spatial = spatialSpecOf(arrayDataset.spec);
  const modifiers = modifierSpecsOf(arrayDataset.spec);
  const axes = splitAxesBySpec(
    arrayDataset.axisNames,
    arrayDataset.shape,
    arrayDataset.spec,
  );
  const Icon = spatial?.icon ?? Grid3x3;

  const extent =
    axes.spatial.length > 0 ? formatAxes(axes.spatial) : "no spatial extent";

  /* A palette row is one line inside someone else's list: no border, no
     picture, and the extent demoted to the annotation it is there. */
  if (props.context === "command") {
    return (
      <MikroArrayDataset.DetailLink object={arrayDataset}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-label={spatial?.label}
          />
          <span className="font-medium text-sm truncate">
            {arrayDataset.name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {extent}
          </span>
        </div>
      </MikroArrayDataset.DetailLink>
    );
  }

  /* The widget form gets the render, on the same reasoning as the card: the
     snapshot goes BEHIND the readout rather than replacing it, because a
     dataset only borrows a picture from the scene it nominates and most
     nominate none — so the spec and extent have to carry the widget alone. */
  return (
    <MikroArrayDataset.DetailLink object={arrayDataset}>
      <SnapshotBackdrop
        snapshot={arrayDataset.latestSnapshot}
        className="w-full rounded-lg"
      >
        <div className="flex flex-col gap-2 p-3">
          <div className="flex min-w-0 flex-row items-start gap-2">
            <Icon
              className="mt-0.5 h-4 w-4 shrink-0 text-white/70"
              aria-label={spatial?.label}
            />
            <span className="min-w-0 break-words text-sm font-semibold leading-tight line-clamp-2">
              {arrayDataset.name}
            </span>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs tabular-nums text-white/90">{extent}</span>
            {axes.acquisition.length > 0 && (
              <span className="text-xs tabular-nums text-white/70">
                {formatAxes(axes.acquisition)}
              </span>
            )}
            {modifiers.map((modifier) => (
              <Badge
                key={modifier.spec}
                variant="outline"
                className="border-white/40 px-1 py-0 text-[10px] font-normal text-white"
              >
                {modifier.short}
              </Badge>
            ))}
            {arrayDataset.multiscale && (
              <Badge
                variant="outline"
                className="border-white/40 px-1 py-0 text-[10px] font-normal text-white"
              >
                multiscale
              </Badge>
            )}
          </div>
        </div>
      </SnapshotBackdrop>
    </MikroArrayDataset.DetailLink>
  );
};

export default ArrayDatasetDisplay;
