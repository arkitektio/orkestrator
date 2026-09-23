import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { MikroArrayDataset, MikroLens } from "@/linkers";
import { Aperture } from "lucide-react";
import { ListLensFragment } from "../../api/graphql";
import { lensLabel } from "../../lenses";
import { SnapshotBackdrop } from "./SnapshotBackdrop";

interface Props {
  /** Named `item` because createList passes items in under that name. */
  item: ListLensFragment;
}

/**
 * A lens leads with its selection, not its dataset: two lenses of one dataset
 * share a name and a picture (both borrowed from the dataset), so the slice line
 * is the one thing on the card that tells them apart. The dataset name sits
 * above it as the link back.
 */
const TheCard = ({ item: lens }: Props) => {
  const sliced = lens.slices.length > 0;

  return (
    <MikroLens.Smart object={lens}>
      <Card className="aspect-[5/3] overflow-hidden p-0">
        <SnapshotBackdrop snapshot={lens.latestSnapshot} className="h-full w-full">
          <div className="flex h-full flex-col justify-between gap-2 px-3 py-2">
            <div className="flex min-w-0 flex-row items-start gap-2">
              <Aperture className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
              <CardTitle className="min-w-0 break-words text-sm leading-tight line-clamp-2">
                <MikroArrayDataset.DetailLink object={lens.dataset}>
                  {lens.dataset.name}
                </MikroArrayDataset.DetailLink>
              </CardTitle>
              <Badge
                variant="outline"
                className="ml-auto shrink-0 border-white/40 px-1 py-0 text-[10px] font-normal text-white"
              >
                {sliced ? "crop" : "full"}
              </Badge>
            </div>

            <MikroLens.DetailLink
              object={lens}
              className="font-mono text-xs text-white/80 line-clamp-2 break-all"
            >
              {lensLabel(lens)}
            </MikroLens.DetailLink>
          </div>
        </SnapshotBackdrop>
      </Card>
    </MikroLens.Smart>
  );
};

export default React.memo(TheCard);
