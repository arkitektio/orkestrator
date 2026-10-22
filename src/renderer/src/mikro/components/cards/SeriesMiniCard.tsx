import React from "react";
import { Grid3x3 } from "lucide-react";
import { HomeCard } from "@/core/ui/home-card";
import { MikroArrayDataset } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { LineageNodeKind, ListArrayDatasetFragment } from "../../api/graphql";
import { formatAxes, spatialSpecOf, splitAxesBySpec } from "../../specs";
import { SnapshotBackdrop } from "./SnapshotBackdrop";
import { useHomeResult } from "../home/homeResults";
import { ResultChips, ResultCount } from "../home/ResultChips";

interface Props {
  /** Named `item` because createList passes items in under that name. */
  item: ListArrayDatasetFragment;
  /** What to call it instead of its name: a file's series identifier, when
   *  the converter named every series after the file. */
  label?: string;
  /** Fill the space given instead of claiming a square: the home's file cards
   *  size each image themselves. */
  fill?: boolean;
  /** Draw the name and shape over the picture. Off where a frame around the
   *  tile already says them (the home's image card); the tile still opens. */
  caption?: boolean;
}

/**
 * An image as the home page lists it: its picture and its name. The tile is
 * the DATASET (its menu, its drag payload, its selection) and opens the
 * dataset's page; the full readout is `ArrayDatasetCard`'s. The shape line
 * only shows when the tile is wide enough to hold it (`Smart` is the size
 * container). On the home page it also shows what was computed from it
 * (`useHomeResult`; nothing elsewhere).
 */
const SeriesMiniCard = ({ item, label, fill, caption = true }: Props) => {
  const results = useHomeResult(LineageNodeKind.Dataset, item.id);
  const spatial = spatialSpecOf(item.spec);
  const Icon = spatial?.icon ?? Grid3x3;
  const axes = splitAxesBySpec(item.axisNames, item.shape, item.spec);

  return (
    <MikroArrayDataset.Smart object={item} menuButton className={fill ? "h-full w-full" : undefined}>
      <HomeCard className={cn("p-0", fill ? "h-full w-full rounded-xl" : "aspect-square h-auto")}>
        <SnapshotBackdrop snapshot={item.latestSnapshot} className="h-full w-full">
          <div className="flex h-full flex-col justify-between gap-1 px-2 py-1.5">
            <div className="flex min-w-0 items-start gap-1.5 text-xs font-medium leading-tight">
              {caption && (
                <Icon className="mt-px hidden h-3.5 w-3.5 shrink-0 text-white/70 @[7rem]:block" aria-label={spatial?.label} />
              )}
              {/* Stretched over the tile, as `HomeCardTitle` does; without a
                  caption the name is only for screen readers. */}
              <MikroArrayDataset.DetailLink
                object={item}
                className="line-clamp-2 min-w-0 break-words after:absolute after:inset-0"
                title={item.name}
              >
                <span className={caption ? undefined : "sr-only"}>{label ?? item.name}</span>
              </MikroArrayDataset.DetailLink>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              {/* The hover menu button owns the top right corner, so the
                  results sit at the bottom: chips when they fit, a count
                  when they do not. */}
              {results && (
                <>
                  <div className="hidden @[12rem]:block">
                    <ResultChips kind={LineageNodeKind.Dataset} id={item.id} results={results} />
                  </div>
                  <div className="flex @[12rem]:hidden">
                    <ResultCount kind={LineageNodeKind.Dataset} id={item.id} results={results} />
                  </div>
                </>
              )}
              {caption && axes.spatial.length > 0 && (
                <span className="hidden truncate text-[10px] tabular-nums text-white/70 @[8rem]:block">
                  {formatAxes([...axes.spatial, ...axes.acquisition])}
                </span>
              )}
            </div>
          </div>
        </SnapshotBackdrop>
      </HomeCard>
    </MikroArrayDataset.Smart>
  );
};

export default React.memo(SeriesMiniCard);
