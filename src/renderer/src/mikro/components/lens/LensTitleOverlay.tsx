import { useDialog } from '@/core/dialogs/registry'
import { Badge } from '@/core/ui/badge'
import { Button } from '@/core/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/core/ui/select'
import { ChevronLeft, Pencil, Star } from 'lucide-react'
import {
  DetailLensFragment,
  GetArrayDatasetQuery,
  useSetLensDefaultSceneMutation
} from '../../api/graphql'
import { describeLens, isWholeLens } from '../../lenses'
import { baseDtypeOf } from '../../specs'
import { LensContainerLink } from './LensContainerLink'

type PageDataset = GetArrayDatasetQuery['arrayDataset']

/**
 * What the page is *about*, said once and as the ladder it sits on: the
 * container it belongs to (small, and the way back up), the LENS it is (the
 * title), and the scene it is drawn in. The same card for every kind of lens;
 * only an array lens has a dataset to read a dtype and a pyramid off.
 *
 * Deliberately NOT a scene panel — it is positioned by the page rather than
 * composed into a scene panel column, so it neither folds away with the
 * renderer's chrome nor has to be duplicated when there is no scene to host a
 * column. The technical detail lives in the Info sidebar tab instead.
 *
 * `z-40` clears the viewport's own overlays at `z-30`; the card opts into
 * pointer events on its own, so the canvas stays draggable all around it.
 */
export const LensTitleOverlay = ({
  dataset,
  lens,
  scenes,
  activeSceneId,
  onSelectScene,
  sceneLoading
}: {
  /** The array lens' dataset. Absent for every other kind. */
  dataset?: PageDataset
  lens: DetailLensFragment
  /** The scenes the page can switch between: see `LensWorkspace`. */
  scenes: readonly { id: string; name: string }[]
  activeSceneId: string | undefined
  onSelectScene: (id: string) => void
  sceneLoading: boolean
}) => {
  const { openDialog } = useDialog()
  const dtype = dataset ? baseDtypeOf(dataset.dataArrays) : null
  const defaultSceneId = lens.defaultScene?.id
  const { info, title, label, container } = describeLens(lens)
  // A whole lens of anything but an array answers with its container's
  // nomination, and only an array dataset nominates: there is nothing for
  // "Make default" to write.
  const canNominate = lens.__typename === 'ArrayLens' || !isWholeLens(lens)

  // The nomination the page landed on. Selecting `latestSnapshot` in the
  // mutation is what makes this cheap: Apollo writes the new nomination AND the
  // tile it implies into the normalized lens (and, for the whole array, its
  // dataset — the server writes that one), so this control needs no refetch and
  // every card already showing either re-tiles itself.
  const [setDefaultScene, { loading: nominating }] = useSetLensDefaultSceneMutation()

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-40 flex w-[50%] flex-col gap-2 rounded-lg ">
      <div className="flex flex-col gap-0.5">
        {/* Up: the container this lens was cut from, where its siblings, its
            files and its lineage are. Small on purpose — the page is not about
            the dataset. */}
        <LensContainerLink
          lens={lens}
          className="flex w-fit max-w-full items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{container.name}</span>
        </LensContainerLink>

        {/* The lens leads, at heading weight — this is the page's title, and the
            page has no other. Its name if someone gave it one, else "Whole
            array" or its slices. */}
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-3xl font-semibold leading-tight">{title}</h1>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Rename lens"
            title="Rename lens"
            onClick={() => openDialog('renamelens', { lens: lens.id }, { size: 'small' })}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* What it selects, spelled out — always, whatever it is called. */}
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground w-[50%]">
          <span className="truncate">{label}</span>
          {dtype && <span className="shrink-0">{dtype}</span>}
          {!dataset && <span className="shrink-0 font-sans">{info.label}</span>}
          {dataset?.multiscale && (
            <Badge variant="outline" className="font-sans text-[0.625rem]">
              multiscale
            </Badge>
          )}
        </div>
      </div>

      {/* Below the title, full width: this is the page's only way to change
          which scene is drawn, so it gets the room to show a whole scene name
          rather than being squeezed alongside the heading. */}
      {scenes.length > 0 ? (
        <div className="flex flex-row items-center gap-2">
          <Select value={activeSceneId} onValueChange={onSelectScene}>
            <SelectTrigger className="h-7 w-[20%] bg-black">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scenes.map((scene) => (
                <SelectItem key={scene.id} value={scene.id}>
                  {scene.name}
                  {/* Which one the lens opens on and takes its tile from —
                      otherwise the nomination is invisible and "Make default"
                      beside it reads as a toggle with no state. A star rather
                      than the word: `SelectItem` children are cloned into the
                      trigger, and the trigger is narrow enough that a second
                      word in it would truncate the scene's name. */}
                  {scene.id === defaultSceneId && (
                    <Star
                      className="h-3 w-3 shrink-0 text-muted-foreground"
                      aria-label="default scene"
                    />
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Offered for whatever is on screen, because that is the picture
              someone just decided they want to be the lens'. Hidden for the
              nominated scene itself rather than disabled: there is nothing to
              undo here — clearing a nomination is not a thing this page asks for. */}
          {canNominate && activeSceneId && activeSceneId !== defaultSceneId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              disabled={nominating}
              onClick={() =>
                setDefaultScene({ variables: { lens: lens.id, scene: activeSceneId } })
              }
            >
              <Star className="h-3.5 w-3.5" />
              {nominating ? 'Setting…' : 'Make default'}
            </Button>
          )}
        </div>
      ) : (
        <span className="truncate text-xs text-muted-foreground">No scenes yet</span>
      )}

      {sceneLoading && <span className="text-xs text-muted-foreground">Loading scene…</span>}
    </div>
  )
}
