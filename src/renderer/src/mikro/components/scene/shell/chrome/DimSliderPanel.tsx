import { useMemo } from 'react'
import { Slider } from '@/core/ui/slider'
import { cn } from '@/core/util/utils'
import { useSceneDockOrientation, type SceneDockOrientation } from '../SceneDock'
import {
  declaredDimExtents,
  foldDimExtents,
  lensDimExtents,
  type DimContribution
} from '../../platform/model/dimExtents'
import { layersPlanKey } from '../../platform/model/layerPlanKey'
import { useSceneStore, useSceneStoreApi } from '../../platform/stores/sceneStore'
import { useViewerStore } from '../../platform/stores/viewerStore'
import { DimPlayButton } from './DimPlayButton'
import {
  foldWorldScrubbers,
  formatClock,
  nearestSnap,
  wallClockAt,
  type AxisInstants,
  type WorldScrubber
} from '@/core/data/scene/coords/axisTime'
import { selectionsFor, worldTimedDims } from '../../platform/model/worldSelections'

/**
 * Scene-wide scrubbers for the COLLAPSIBLE dims (t, tau, ... - everything not
 * mapped to x/y/z/intensity), one slider per dim NAME, in BOTH display modes
 * (unlike the 2D-only z-slider: z is a spatial brick axis, these select which
 * data to fetch). Where they sit is the host's call - see Scene.Dock; the
 * default composition keeps them bottom-centred, napari-style.
 *
 * Scrubbing writes `viewerStore.dimSelections[dim]`, which enters the slice
 * SIGNATURE of every layer carrying that dim -> debounced replan -> wholesale
 * pool flush + refetch (by design: a different t is different data in every
 * brick). Layers without the dim are untouched. Scrubbing back to a recently
 * visited index re-repacks from the decoded-chunk LRU without refetching.
 *
 * THREE SOURCES, folded into one scrubber per dim by `foldDimExtents`. The
 * split is DECLARED vs OBSERVED, not brick vs non-brick:
 *
 *  1. Brick layers, declared - asked of their normalized `LayerState`, because
 *     their intensity and phasor axes are resolved from the RENDER GRAPH during
 *     normalization; re-deriving those from `renderAxes` here would disagree
 *     with the pool the layer actually built.
 *  2. Other lens-backed layers, declared - a vector field is a Lens over an
 *     array exactly as an image is, but it is a typed carve-out from the brick
 *     path (`layerGuards.NonBrickLensTypename`) and so never reaches
 *     `sceneStore.layers`. Read off the fragment via `declaredDimExtents`.
 *  3. Table-backed layers, observed - a track's time is a parquet COLUMN, not
 *     an axis, and its timeline is unknowable until the scan returns. Those
 *     renderers publish into `sceneStore.layerDimExtents` once their read lands.
 *
 * Why 1 and 2 are derived here rather than published like 3: `LayerRenderer`
 * culls layers by GPU budget and remounts them on a mode toggle, so a slider
 * that depended on a renderer effect would vanish under budget pressure and
 * flicker on a 2D/3D switch - for a fact that never changed. Declared extents
 * exist at first paint; only observed ones have to wait for data.
 *
 * A dim whose frames reach the WORLD (a time row in `asAffine`, or a lookup of
 * instants) is not scrubbed by index at all: it gets one slider per world axis,
 * in world units, snapping to the union of every layer's frame instants
 * (`WorldTimeHost` publishes them, `selectionsFor` reads the value back per
 * layer). An event-triggered movie and a 20 Hz one then show what was on screen
 * at the same moment, which no shared index can say. Index sliders remain for
 * the dims that never reach the world (a channel, an unplaced index axis).
 */

/**
 * Follows its dock's orientation, falling back to horizontal — the shape it has
 * had since it lived hardcoded, bottom-centred. Pass `orientation` to override a
 * dock, or to place it outside one.
 */
export const DimSliderPanel = ({
  orientation: orientationProp
}: {
  orientation?: SceneDockOrientation
} = {}) => {
  const dockOrientation = useSceneDockOrientation('horizontal')
  const orientation = orientationProp ?? dockOrientation
  const sceneStoreApi = useSceneStoreApi()
  // A SCALAR key, not the array (P9c/P17): the scrubbers read only fields
  // `layerPlanSignature` captures (visibility, lens axis names/shape/slices),
  // so a contrast drag's per-tick layer replacement must not re-render here.
  const layersKey = useSceneStore((s) => layersPlanKey(s.layers))
  const layers = useMemo(
    () => sceneStoreApi.getState().layers,
    // The key STANDS FOR the array the getState() read returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layersKey, sceneStoreApi]
  )
  // The non-brick DECLARED half. A second scalar key over `sceneLayers`, the
  // `LayerRenderer.dispatchKey` idiom: the extents read only a layer's id, kind,
  // visibility and lens identity, so a mesh card's palette edit (which
  // republishes `sceneLayers`) must not re-render here.
  const declaredKey = useSceneStore((s) =>
    s.sceneLayers
      .map(
        (layer) =>
          `${layer.id}:${layer.__typename}:${layer.visible === false ? 0 : 1}:${
            (layer as { lens?: { id: string } }).lens?.id ?? ''
          }`
      )
      .join('|')
  )
  const sceneLayers = useMemo(
    () => sceneStoreApi.getState().sceneLayers,
    // The key STANDS FOR the array the getState() read returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [declaredKey, sceneStoreApi]
  )
  const layerDimExtents = useSceneStore((s) => s.layerDimExtents)
  const dimSelections = useViewerStore((s) => s.dimSelections)
  const setDimSelection = useViewerStore((s) => s.setDimSelection)
  const layerAxisInstants = useViewerStore((s) => s.layerAxisInstants)
  const worldSelections = useViewerStore((s) => s.worldSelections)
  const setWorldSelection = useViewerStore((s) => s.setWorldSelection)
  const worldAxes = useSceneStore((s) => s.transformContext.worldCoordinateSystem?.axes)
  const worldEpoch = useSceneStore((s) => s.transformContext.worldCoordinateSystem?.epoch ?? null)

  const scrubbers = useMemo(() => {
    const contributions: DimContribution[] = []

    // 1. Brick layers, from their normalized state.
    // A world-timed dim is scrubbed by the world slider, never by index.
    const indexOnly = (layerId: string, extents: ReturnType<typeof lensDimExtents>) => {
      const timed = worldTimedDims(layerAxisInstants, layerId)
      return extents.filter((extent) => !timed.has(extent.dim))
    }

    for (const layer of layers) {
      if (layer.visible === false) continue
      contributions.push({
        layerId: layer.id,
        declared: true,
        extents: indexOnly(
          layer.id,
          lensDimExtents(layer.lens, [
            layer.xAxis,
            layer.yAxis,
            layer.zAxis,
            layer.intensityAxis,
            layer.phasorAxis
          ])
        )
      })
    }

    // 2. Lens-backed layers off the brick path, from their fragment.
    for (const layer of sceneLayers) {
      if (layer.visible === false) continue
      const extents = indexOnly(layer.id, declaredDimExtents(layer))
      if (extents.length > 0) {
        contributions.push({ layerId: layer.id, declared: true, extents })
      }
    }

    // 3. Table-backed layers, from what their read observed. The publisher
    //    clears its entry while hidden, so no visibility check is needed here.
    for (const [layerId, extents] of Object.entries(layerDimExtents)) {
      contributions.push({ layerId, declared: false, extents })
    }

    return foldDimExtents(contributions, dimSelections)
  }, [layers, sceneLayers, layerDimExtents, dimSelections, layerAxisInstants])

  const worldScrubbers = useMemo(
    () =>
      foldWorldScrubbers(
        Object.entries(layerAxisInstants).map(([layerId, instants]) => ({ layerId, instants }))
      ),
    [layerAxisInstants]
  )

  if (scrubbers.length === 0 && worldScrubbers.length === 0) return null

  const vertical = orientation === 'vertical'

  // One tray per dim, stacked across the dock's short axis so the sliders stay
  // parallel to each other whichever edge they are on.
  return (
    <div className={cn('flex gap-1.5', vertical ? 'flex-row' : 'flex-col')}>
      {worldScrubbers.map((scrubber) => (
        <WorldScrubberTray
          key={`world:${scrubber.axis}`}
          scrubber={scrubber}
          unit={worldAxes?.find((axis) => axis.name === scrubber.axis)?.unit ?? null}
          epoch={worldEpoch}
          startOf={(layerId) => layerAxisInstants[layerId]?.find((entry) => entry.worldAxis === scrubber.axis)}
          value={worldSelections[scrubber.axis]}
          onChange={(value) => setWorldSelection(scrubber.axis, nearestSnap(scrubber.snaps, value))}
          frameOf={(layerId) =>
            selectionsFor({ dimSelections, worldSelections, layerAxisInstants }, layerId)[
              scrubber.layers.find((layer) => layer.id === layerId)?.dim ?? ''
            ]
          }
          orientation={orientation}
        />
      ))}
      {scrubbers.map((scrubber) => {
        const value = dimSelections[scrubber.dim] ?? scrubber.defaultIndex
        return (
          <div
            key={scrubber.dim}
            className={cn(
              'pointer-events-auto flex items-center bg-background/80 backdrop-blur-sm rounded-md shadow-md',
              vertical ? 'flex-col gap-1 px-1.5 py-2' : 'flex-row gap-2 px-2 py-1.5'
            )}
          >
            <span
              className={cn(
                'text-[10px] font-medium uppercase text-muted-foreground select-none',
                !vertical && 'w-8 text-right'
              )}
            >
              {scrubber.dim}
            </span>
            <DimPlayButton
              dim={scrubber.dim}
              maxIndex={scrubber.maxIndex}
              defaultIndex={scrubber.defaultIndex}
            />
            <div className={vertical ? 'h-48' : 'w-56'}>
              <Slider
                orientation={orientation}
                min={0}
                max={scrubber.maxIndex}
                step={1}
                value={[value]}
                onValueChange={([v]) => setDimSelection(scrubber.dim, v)}
              />
            </div>
            <span
              className={cn(
                'text-[10px] tabular-nums text-muted-foreground select-none',
                !vertical && 'w-14'
              )}
            >
              {value}/{scrubber.maxIndex}
            </span>
            {scrubber.perLayer.length > 1 && (
              <span
                className={cn(
                  'tabular-nums text-muted-foreground select-none text-[9px]',
                  vertical && 'flex flex-col items-center'
                )}
              >
                {vertical
                  ? scrubber.perLayer.map((entry) => (
                      <span key={entry.id}>
                        {entry.index}/{entry.maxIndex}
                      </span>
                    ))
                  : scrubber.perLayer
                      .map((entry) => `${entry.index}/${entry.maxIndex}`)
                      .join(' · ')}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * One world-axis scrubber: a continuous slider over the union of every layer's
 * frame instants, snapping to them, read out in the world axis' unit. The value
 * is a world COORDINATE; each layer's frame is what `selectionsFor` makes of it.
 *
 * Unset reads as the earliest instant — which is also what every layer shows
 * before anything is scrubbed (an unsliced lens' collapsed default is frame 0).
 */
const WorldScrubberTray = ({
  scrubber,
  unit,
  epoch,
  startOf,
  value,
  onChange,
  frameOf,
  orientation
}: {
  scrubber: WorldScrubber
  unit: unknown
  /** The world space's own reference instant, set when it was created: `wall_clock = epoch + t * unit`. */
  epoch: string | null
  startOf: (layerId: string) => AxisInstants | undefined
  value: number | undefined
  onChange: (value: number) => void
  frameOf: (layerId: string) => number | undefined
  orientation: SceneDockOrientation
}) => {
  const vertical = orientation === 'vertical'
  const shown = value ?? scrubber.min
  const span = scrubber.max - scrubber.min
  const unitLabel = String(unit ?? '').trim()
  // With an epoch, a time coordinate IS a wall-clock reading; without one it stays a
  // coordinate in the axis' unit.
  const clock = wallClockAt(epoch, shown, unitLabel)
  // Where each series sits on the timeline: its first frame's coordinate, and what
  // that is on the wall clock. This is the offset between series, made visible.
  const starts = scrubber.layers.map((layer) => {
    const first = startOf(layer.id)?.times[0]
    const at = first === undefined ? null : wallClockAt(epoch, first, unitLabel)
    return { ...layer, first, at }
  })
  const step = (direction: 1 | -1) => {
    const index = scrubber.snaps.indexOf(nearestSnap(scrubber.snaps, shown))
    const next = scrubber.snaps[Math.max(0, Math.min(scrubber.snaps.length - 1, index + direction))]
    onChange(next)
  }

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center bg-background/80 backdrop-blur-sm rounded-md shadow-md',
        vertical ? 'flex-col gap-1 px-1.5 py-2' : 'flex-row gap-2 px-2 py-1.5'
      )}
    >
      <span
        className={cn(
          'text-[10px] font-medium uppercase text-muted-foreground select-none',
          !vertical && 'w-8 text-right'
        )}
        title={`World ${scrubber.axis}: each layer shows its last frame at or before this ${scrubber.axis}`}
      >
        {scrubber.axis}
      </span>
      <button
        type="button"
        className="text-[10px] text-muted-foreground hover:text-foreground px-0.5"
        onClick={() => step(-1)}
        title="Previous frame of any layer"
      >
        ‹
      </button>
      <div className={vertical ? 'h-48' : 'w-56'}>
        <Slider
          orientation={orientation}
          min={scrubber.min}
          max={scrubber.max}
          step={span > 0 ? span / 1000 : 1}
          value={[shown]}
          onValueChange={([v]) => onChange(v)}
        />
      </div>
      <button
        type="button"
        className="text-[10px] text-muted-foreground hover:text-foreground px-0.5"
        onClick={() => step(1)}
        title="Next frame of any layer"
      >
        ›
      </button>
      <span
        className={cn('text-[10px] tabular-nums text-muted-foreground select-none', !vertical && 'w-24')}
        title={
          clock
            ? `${clock.toISOString()} — ${formatCoordinate(shown, span)} ${unitLabel} after the space's epoch`
            : undefined
        }
      >
        {clock ? formatClock(clock) : `${formatCoordinate(shown, span)}${unitLabel ? ` ${unitLabel}` : ''}`}
      </span>
      <span
        className={cn(
          'tabular-nums text-muted-foreground select-none text-[9px]',
          vertical && 'flex flex-col items-center'
        )}
      >
        {starts.map((layer, index) => (
          <span
            key={layer.id}
            title={
              layer.first === undefined
                ? undefined
                : `starts at ${formatCoordinate(layer.first, span)} ${unitLabel}${layer.at ? ` (${layer.at.toISOString()})` : ''}`
            }
          >
            {index > 0 && !vertical ? ' · ' : ''}
            {frameOf(layer.id) ?? '–'}/{layer.count - 1}
            {layer.first === undefined ? '' : ` @${layer.at ? formatClock(layer.at) : `+${formatCoordinate(layer.first, span)}`}`}
          </span>
        ))}
      </span>
    </div>
  )
}

/** Enough digits to tell neighbouring instants apart across this span. */
const formatCoordinate = (value: number, span: number): string => {
  const digits = span > 0 ? Math.min(6, Math.max(0, 3 - Math.floor(Math.log10(span)))) : 2
  return value.toFixed(digits)
}
