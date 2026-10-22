import { Button } from '@/core/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/core/ui/select'
import { Star } from 'lucide-react'
import { INVERTED, InvertedText } from '../lens/InvertedText'

/**
 * The title card's scene line: which scene is drawn, and "Make default" to
 * open on it from now on. Inverted against the canvas like the rest of the
 * card (see `LensTitleOverlay`). The caller owns the nomination: a lens and a
 * dataset nominate through different mutations.
 */
export const SceneSwitcher = ({
  scenes,
  activeSceneId,
  defaultSceneId,
  onSelectScene,
  onMakeDefault,
  nominating
}: {
  scenes: readonly { id: string; name: string }[]
  activeSceneId: string | undefined
  defaultSceneId: string | undefined
  onSelectScene: (id: string) => void
  onMakeDefault: (sceneId: string) => void
  nominating: boolean
}) => {
  if (scenes.length === 0) return <InvertedText className="text-xs">No scenes yet</InvertedText>

  return (
    <div className={`flex flex-row items-center gap-2 ${INVERTED}`}>
      <Select value={activeSceneId} onValueChange={onSelectScene}>
        <SelectTrigger className="h-7 w-[20%] border-white/60 bg-transparent dark:bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {scenes.map((scene) => (
            <SelectItem key={scene.id} value={scene.id}>
              {scene.name}
              {/* Which one the page opens on and takes its tile from —
                  otherwise the nomination is invisible and "Make default"
                  beside it reads as a toggle with no state. A star rather
                  than the word: `SelectItem` children are cloned into the
                  trigger, and the trigger is narrow enough that a second
                  word in it would truncate the scene's name. */}
              {scene.id === defaultSceneId && (
                <Star className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="default scene" />
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Offered for whatever is on screen, because that is the picture
          someone just decided they want to be the default. Hidden for the
          nominated scene itself rather than disabled: there is nothing to
          undo here — clearing a nomination is not a thing this page asks for. */}
      {activeSceneId && activeSceneId !== defaultSceneId && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 px-2 text-xs text-white hover:text-white"
          disabled={nominating}
          onClick={() => onMakeDefault(activeSceneId)}
        >
          <Star className="h-3.5 w-3.5" />
          {nominating ? 'Setting…' : 'Make default'}
        </Button>
      )}
    </div>
  )
}
