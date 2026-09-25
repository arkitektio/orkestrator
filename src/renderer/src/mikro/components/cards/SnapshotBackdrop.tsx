import { WithMikroMediaUrl } from '@/lib/datalayer/mikroAccess'
import { cn } from '@/lib/utils'
import { SceneSnapshotFragment } from '../../api/graphql'

/**
 * The scene's/dataset's latest snapshot as a card backdrop, with the card's own
 * content laid over it.
 *
 * The card is black whether or not a picture ever arrives — which is what lets
 * the content above be unconditionally white. A snapshot needs credentials plus
 * a signed S3 fetch before it can resolve, and both `Scene.latestSnapshot` and
 * `ArrayDataset.latestSnapshot` are nullable (nothing snapshots a scene on creation;
 * a dataset borrows the newest picture of the scene it NOMINATES, and nominates
 * none until something sets one), so "no image" is the common case rather than
 * the exception. Painting black from the start means those cards read as
 * deliberate rather than broken.
 *
 * The scrim is likewise unconditional: it is what the title sits on. Snapshots
 * are arbitrary pictures with no contrast guarantee, so the text needs its own
 * darkening rather than trusting the image under it — and over a plain black
 * card it simply costs nothing.
 */
export const SnapshotBackdrop = ({
  snapshot,
  className,
  children,
}: {
  snapshot?: SceneSnapshotFragment | null
  className?: string
  children?: React.ReactNode
}) => (
  <div className={cn('relative overflow-hidden bg-black text-white', className)}>
    <WithMikroMediaUrl media={snapshot?.store}>
      {(url) => (
        <img
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
        />
      )}
    </WithMikroMediaUrl>

    {/* Darkens top and bottom and leaves the middle of the picture alone: the
        two edges are where every card puts its text. */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/80" />

    <div className="relative h-full w-full">{children}</div>
  </div>
)
