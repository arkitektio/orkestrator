import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { MikroArrayDataset } from '@/linkers'
import { Star } from 'lucide-react'
import { GetArrayDatasetQuery, useSetDefaultSceneMutation } from '../../api/graphql'
import { baseDtypeOf, formatShape } from '../../specs'

type PageDataset = GetArrayDatasetQuery['arrayDataset']

/**
 * What the page is *about*, said once and quietly: the dataset's name, the scene
 * currently on screen, and the shape underneath. Deliberately NOT a scene panel —
 * it is positioned by the page rather than composed into a scene panel column,
 * so it neither folds away with the renderer's chrome nor has to be duplicated
 * when there is no scene to host a column. The technical detail (arrays,
 * intrinsic system) lives in the Info sidebar tab instead.
 *
 * `z-40` clears the viewport's own overlays at `z-30`; the card opts into
 * pointer events on its own, so the canvas stays draggable all around it.
 */
export const DatasetTitleOverlay = ({
  dataset,
  activeSceneId,
  onSelectScene,
  sceneLoading
}: {
  dataset: PageDataset
  activeSceneId: string | undefined
  onSelectScene: (id: string) => void
  sceneLoading: boolean
}) => {
  const dtype = baseDtypeOf(dataset.dataArrays)

  // The nomination the page landed on. Selecting `latestSnapshot` in the
  // mutation is what makes this cheap: Apollo writes the new nomination AND the
  // tile it implies into the normalized ArrayDataset, so this control needs no
  // refetch and every card already showing the dataset re-tiles itself.
  const [setDefaultScene, { loading: nominating }] = useSetDefaultSceneMutation()
  const defaultSceneId = dataset.defaultScene?.id

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-40 flex w-[50%] flex-col gap-2 rounded-lg ">
      {/* The name leads, at heading weight — this is the page's title, and the
          page has no other. */}
      <div className="flex flex-col gap-0.5">
        {/* `break-all`, not `truncate` or `break-words`: a dataset name is
            usually one long token with no spaces in it, so wrapping only at
            spaces would not wrap at all and an ellipsis would hide the part
            that tells them apart — the tail. Breaking mid-token shows all of
            it. */}
        <MikroArrayDataset.DetailLink
          object={dataset}
          className="text-3xl font-semibold leading-tight text-ellipsis truncate ellipsis break-all"
        >
          {dataset.name}
        </MikroArrayDataset.DetailLink>
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground w-[50%]">
          <span className="truncate">{formatShape(dataset.axisNames, dataset.shape)}</span>
          {dtype && <span className="shrink-0">{dtype}</span>}
          {dataset.multiscale && (
            <Badge variant="outline" className="font-sans text-[0.625rem]">
              multiscale
            </Badge>
          )}
        </div>
      </div>

      {/* Below the title, full width: with the old panel gone this is the page's
          only way to change which scene is drawn, so it gets the room to show a
          whole scene name rather than being squeezed alongside the heading. */}
      {dataset.scenes.length > 0 ? (
        <div className="flex flex-row items-center gap-2">
          <Select value={activeSceneId} onValueChange={onSelectScene}>
            <SelectTrigger className="h-7 w-[20%] bg-black">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dataset.scenes.map((scene) => (
                <SelectItem key={scene.id} value={scene.id}>
                  {scene.name}
                  {/* Which one the dataset opens on and takes its tile from —
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
              someone just decided they want to be the dataset's. Hidden for the
              nominated scene itself rather than disabled: there is nothing to
              undo here — clearing a nomination is not a thing this page asks for. */}
          {activeSceneId && activeSceneId !== defaultSceneId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              disabled={nominating}
              onClick={() =>
                setDefaultScene({
                  variables: { dataset: dataset.id, scene: activeSceneId }
                })
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
