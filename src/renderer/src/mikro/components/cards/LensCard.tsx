import React from "react";
import { CardTitle } from "@/core/ui/card";
import { HomeCard } from "@/core/ui/home-card";
import { MikroLens } from "@/core/linkers";
import { ListLensFragment } from "@/mikro/api/graphql";
import { lensLabel, lensTitle } from "../../lenses";
import { SnapshotBackdrop } from "./SnapshotBackdrop";

interface Props {
  item: ListLensFragment;
}

/**
 * A lens as a tile: the picture of the scene it opens on, what it is called
 * ("Whole array", its name, or its slices), and under that the dataset it
 * selects from and exactly what it selects.
 *
 * The picture is the lens' own once it nominates a scene and its dataset's
 * until then, so a cut nobody has staged yet is not a blank square.
 */
const TheCard = ({ item }: Props) => {
  return (
    <MikroLens.Smart object={item} menuButton>
      <HomeCard className="aspect-square h-auto p-0">
        <SnapshotBackdrop snapshot={item.latestSnapshot} className="h-full w-full">
          <div className="flex h-full flex-col justify-between gap-2 px-3 py-2">
            <CardTitle className="min-w-0 break-words text-sm leading-tight line-clamp-2">
              <MikroLens.DetailLink object={item}>{lensTitle(item)}</MikroLens.DetailLink>
            </CardTitle>
            <div className="flex flex-col gap-0.5">
              <div className="truncate text-[0.625rem] text-white/80">{item.dataset.name}</div>
              <div className="break-words font-mono text-[0.625rem] leading-snug text-white/70">
                {lensLabel(item)}
              </div>
            </div>
          </div>
        </SnapshotBackdrop>
      </HomeCard>
    </MikroLens.Smart>
  );
};

export default React.memo(TheCard);
