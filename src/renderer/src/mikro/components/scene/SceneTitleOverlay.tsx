import { MikroScene } from '@/core/linkers'
import { GetSceneQuery } from '../../api/graphql'

type PageScene = GetSceneQuery['scene']

/**
 * The scene page's title, placed the same way `DatasetTitleOverlay` places the
 * dataset's: top-left, over the viewport, at heading weight. `z-40` clears the
 * viewport's own overlays at `z-30`; the card opts into pointer events on its
 * own, so the canvas stays draggable around it.
 */
export const SceneTitleOverlay = ({ scene }: { scene: PageScene }) => {
  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-40 flex w-[50%] flex-col gap-0.5 rounded-lg">
      {/* `break-all` + `truncate` for the same reason as the dataset title: names
          are often one long token. */}
      <MikroScene.DetailLink
        object={scene}
        className="text-3xl font-semibold leading-tight truncate break-all"
      >
        {scene.name}
      </MikroScene.DetailLink>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {scene.layers.length} {scene.layers.length === 1 ? 'layer' : 'layers'}
        </span>
        {scene.preferredView && <span className="font-mono">{scene.preferredView}</span>}
      </div>
    </div>
  )
}
