import React from "react";
import { HomeCard } from '@/core/ui/home-card'
import { MikroArrayDataset, MikroLens } from '@/core/linkers'
import { cn } from '@/core/util/utils'
import { ListArrayDatasetFragment } from '../../api/graphql'
import { ArrayDatasetReadout } from './ArrayDatasetReadout'
import { SnapshotBackdrop } from './SnapshotBackdrop'

interface Props {
  /** Named `item` because createList passes items in under that name. */
  item: ListArrayDatasetFragment
  /**
   * Fill the space given instead of claiming a square. Set by a justified list,
   * which sizes the tile itself from the dataset's x/y — the card must not then
   * insist on an aspect of its own.
   */
  fill?: boolean
}

/**
 * The dataset as a DATASET: its menu and its drag payload are the dataset's,
 * which is what filing and deleting need. Where data is listed to be worked
 * on (the home page) the tile is the whole lens instead — `LensCard`, same
 * readout.
 */
const TheCard = ({ item: arrayDataset, fill }: Props) => {
  // `h-full` down BOTH levels when filling: SmartModel puts its own div between
  // this card and whatever sized the tile, and a percentage height against an
  // auto-height parent resolves to auto — so without it the card collapses to
  // the height of its text and a 512x512 dataset comes out a letterbox instead
  // of the square its shape asked for.
  return (
    <MikroArrayDataset.Smart object={arrayDataset} menuButton className={fill ? 'h-full' : undefined}>
      <HomeCard className={cn('p-0', fill ? 'h-full w-full' : 'h-auto aspect-square')}>
        <SnapshotBackdrop snapshot={arrayDataset.latestSnapshot} className="h-full w-full">
          <ArrayDatasetReadout
            spec={arrayDataset.spec}
            axisNames={arrayDataset.axisNames}
            shape={arrayDataset.shape}
            multiscale={arrayDataset.multiscale}
            defaultScene={arrayDataset.defaultScene}
            title={
              <>
                {/* A dataset is opened by opening the lens that selects all of
                    it — the viewer is a lens' page. The tile itself is still
                    the DATASET (its menu, its drag payload), and its own page,
                    with every lens cut from it, is one step up from the
                    viewer. Only a dataset with no pixel grid has no such lens. */}
                {arrayDataset.fullLens ? (
                  <MikroLens.DetailLink object={arrayDataset.fullLens}>
                    {arrayDataset.name}
                  </MikroLens.DetailLink>
                ) : (
                  <MikroArrayDataset.DetailLink object={arrayDataset}>
                    {arrayDataset.name}
                  </MikroArrayDataset.DetailLink>
                )}
              </>
            }
          />
        </SnapshotBackdrop>
      </HomeCard>
    </MikroArrayDataset.Smart>
  )
}

export default React.memo(TheCard);
