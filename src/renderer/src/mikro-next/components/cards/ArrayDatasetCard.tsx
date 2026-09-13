import React from "react";
import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
import { MikroArrayDataset, MikroScene } from '@/linkers'
import { cn } from '@/lib/utils'
import { Clapperboard, Grid3x3 } from 'lucide-react'
import { ListArrayDatasetFragment } from '../../api/graphql'
import { modifierSpecsOf, spatialSpecOf, splitAxesBySpec, type ArrayDatasetAxis } from '../../specs'
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
 * `512 y` — extent leads, axis name annotates it.
 *
 * Dims against the backdrop, not against the card: everything here sits on the
 * snapshot's scrim, so `muted-foreground` would be the wrong grey.
 */
const AxisChip = ({ axis, muted }: { axis: ArrayDatasetAxis; muted?: boolean }) => (
  <span className="flex items-baseline gap-0.5">
    <span
      className={
        muted
          ? 'text-xs font-medium tabular-nums text-white/70'
          : 'text-base font-semibold tabular-nums'
      }
    >
      {axis.extent}
    </span>
    <span className="text-[10px] font-light uppercase text-white/70">{axis.name}</span>
  </span>
)

/**
 * Leads with what the dataset structurally IS (its spatial spec), then its
 * spatial extent, then everything stacked on top of it. The spec drives the
 * split: the acquisition axes (t, c, …) are demoted to a second row rather than
 * run together with the spatial ones, which is what made the old single
 * `t × c × z × y × x (1, 3, 8, 512, 512)` line unreadable.
 *
 * The snapshot, where one exists, goes BEHIND all of that rather than replacing
 * it: a dataset only borrows a picture from a scene that places it alone, so
 * most datasets have none and the spec/extent readout has to carry the card on
 * its own regardless.
 */
const TheCard = ({ item: arrayDataset, fill }: Props) => {
  const spatial = spatialSpecOf(arrayDataset.spec)
  const modifiers = modifierSpecsOf(arrayDataset.spec)
  const axes = splitAxesBySpec(arrayDataset.axisNames, arrayDataset.shape, arrayDataset.spec)

  const Icon = spatial?.icon ?? Grid3x3

  // `h-full` down BOTH levels when filling: SmartModel puts its own div between
  // this card and whatever sized the tile, and a percentage height against an
  // auto-height parent resolves to auto — so without it the card collapses to
  // the height of its text and a 512x512 dataset comes out a letterbox instead
  // of the square its shape asked for.
  return (
    <MikroArrayDataset.Smart object={arrayDataset} className={fill ? 'h-full' : undefined}>
      <Card className={cn('overflow-hidden p-0', fill ? 'h-full w-full' : 'aspect-square')}>
        <SnapshotBackdrop snapshot={arrayDataset.latestSnapshot} className="h-full w-full">
          <div className="flex h-full flex-col justify-between gap-2 px-3 py-2">
            <div className="flex min-w-0 flex-row items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-label={spatial?.label} />
              <CardTitle className="min-w-0 break-words text-sm leading-tight line-clamp-2">
                <MikroArrayDataset.DetailLink object={arrayDataset}>
                  {arrayDataset.name}
                </MikroArrayDataset.DetailLink>
              </CardTitle>

              {/* What the tile is a picture OF. The backdrop is the newest
                  snapshot of the scene this dataset nominates, so that scene is
                  where the picture leads — the name still leads to the dataset.
                  Absent for a dataset that nominates nothing, which is also
                  exactly the case with no picture to explain. */}
              {arrayDataset.defaultScene && (
                <MikroScene.DetailLink
                  object={arrayDataset.defaultScene}
                  className="shrink-0"
                  title={arrayDataset.defaultScene.name}
                >
                  <Badge
                    variant="outline"
                    className="max-w-24 gap-1 border-white/40 px-1 py-0 text-[10px] font-normal text-white"
                  >
                    <Clapperboard className="h-3 w-3 shrink-0" />
                    <span className="truncate">{arrayDataset.defaultScene.name}</span>
                  </Badge>
                </MikroScene.DetailLink>
              )}
            </div>

            <div className="flex flex-col gap-1">
              {/* A SCALAR has no spatial row at all — the point of the spec is that
                  there is no extent to show, so say that rather than print "()". */}
              {axes.spatial.length > 0 ? (
                <div className="flex flex-row flex-wrap items-baseline gap-x-2">
                  {axes.spatial.map((axis, index) => (
                    <AxisChip key={index} axis={axis} />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-white/70">no spatial extent</span>
              )}

              <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
                {axes.acquisition.map((axis, index) => (
                  <AxisChip key={index} axis={axis} muted />
                ))}
                {modifiers.map((modifier) => (
                  <Badge
                    key={modifier.spec}
                    variant="secondary"
                    className="px-1 py-0 text-[10px] font-normal"
                  >
                    {modifier.short}
                  </Badge>
                ))}
                {arrayDataset.multiscale && (
                  <Badge
                    variant="outline"
                    className="px-1 py-0 text-[10px] font-normal border-white/40 text-white"
                  >
                    multiscale
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SnapshotBackdrop>
      </Card>
    </MikroArrayDataset.Smart>
  )
}

export default React.memo(TheCard);