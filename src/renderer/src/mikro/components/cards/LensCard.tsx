import React from "react";
import { CardTitle } from "@/core/ui/card";
import { HomeCard } from "@/core/ui/home-card";
import { MikroLens } from "@/core/linkers";
import { ListLensFragment } from "@/mikro/api/graphql";
import { Database } from "lucide-react";
import { describeLens, isWholeLens, lensHeadline, lensSnapshot } from "../../lenses";
import { LensContainerLink } from "../lens/LensContainerLink";
import { ArrayDatasetReadout } from "./ArrayDatasetReadout";
import { SnapshotBackdrop } from "./SnapshotBackdrop";

interface Props {
  item: ListLensFragment;
}

/**
 * A lens as a tile, whatever it selects over. The tile IS the lens: selecting,
 * dragging or right-clicking it hands over `@mikro/lens`, which is what a task
 * is started from. The container's own page (filing, deleting) is the small
 * link on the tile.
 *
 * - The whole lens of an array is drawn as the dataset it shows all of: the
 *   same readout as the dataset's tile (spec, extents), headed by its name.
 * - Any other whole lens is headed by its container, with "Whole table"
 *   underneath.
 * - A cut lens is headed by its name or its selection, with the container and
 *   exactly what it selects underneath.
 *
 * An array lens' picture is its own once it nominates a scene and its
 * dataset's until then, so a cut nobody has staged yet is not a blank square;
 * the other kinds show their nominated scene's, or nothing.
 */
const TheCard = ({ item }: Props) => {
  const { info, label, selection } = describeLens(item);
  const { title, subline } = lensHeadline(item);
  const Icon = info.icon;

  return (
    <MikroLens.Smart object={item} menuButton>
      <HomeCard className="aspect-square h-auto p-0">
        <SnapshotBackdrop snapshot={lensSnapshot(item)} className="h-full w-full">
          {item.__typename === "ArrayLens" && isWholeLens(item) ? (
            <ArrayDatasetReadout
              spec={item.dataset.spec}
              axisNames={item.dataset.axisNames}
              shape={item.dataset.shape}
              multiscale={item.dataset.multiscale}
              defaultScene={item.defaultScene}
              title={<MikroLens.DetailLink object={item}>{title}</MikroLens.DetailLink>}
              aside={
                <LensContainerLink
                  lens={item}
                  className="mt-0.5 shrink-0 text-white/60 hover:text-white"
                >
                  <Database className="h-3.5 w-3.5" aria-label="Open the dataset" />
                </LensContainerLink>
              }
            />
          ) : (
            <div className="flex h-full flex-col justify-between gap-2 px-3 py-2">
              <CardTitle className="min-w-0 break-words text-sm leading-tight line-clamp-2">
                <MikroLens.DetailLink object={item}>{title}</MikroLens.DetailLink>
              </CardTitle>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1 text-[0.625rem] text-white/80">
                  <Icon className="h-3 w-3 shrink-0" aria-label={info.label} />
                  <LensContainerLink lens={item} className="truncate">
                    {subline}
                  </LensContainerLink>
                </div>
                {selection && (
                  <div className="break-words font-mono text-[0.625rem] leading-snug text-white/70">
                    {label}
                  </div>
                )}
                <div className="text-[0.625rem] text-white/60">
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </SnapshotBackdrop>
      </HomeCard>
    </MikroLens.Smart>
  );
};

export default React.memo(TheCard);
