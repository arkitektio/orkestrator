import { useEffect, useMemo } from 'react'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useSceneDockOrientation, type SceneDockOrientation } from '../SceneDock'
import { useModeStore } from '../../platform/stores/modeStore'
import { layersPlanKey } from '../../platform/model/layerPlanKey'
import { useSceneStore, useSceneStoreApi } from '../../platform/stores/sceneStore'
import { useViewerStore } from '../../platform/stores/viewerStore'
import {
  buildAffineMatrix,
  getLayerZSize,
  voxelToPhysicalZ,
  physicalToVoxelZ
} from '../../platform/coords/worldTransform'

/**
 * Follows its dock's orientation, falling back to vertical — the shape it has
 * had since it lived hardcoded on the left edge. Pass `orientation` to override
 * a dock, or to place it outside one.
 */
export const ZSliderPanel = ({
  orientation: orientationProp
}: {
  orientation?: SceneDockOrientation
} = {}) => {
  const dockOrientation = useSceneDockOrientation('vertical')
  const orientation = orientationProp ?? dockOrientation
  const displayMode = useModeStore((s) => s.displayMode)
  const sceneStoreApi = useSceneStoreApi()
  // A SCALAR key, not the array (P9c/P17): the Z math below reads only fields
  // `layerPlanSignature` captures (zAxis, lens shape, affine), so a contrast
  // drag's per-tick layer replacement must not re-render the slider.
  const layersKey = useSceneStore((s) => layersPlanKey(s.layers))
  const layers = useMemo(
    () => sceneStoreApi.getState().layers,
    // The key STANDS FOR the array the getState() read returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layersKey, sceneStoreApi]
  )
  const currentZ = useViewerStore((s) => s.currentZ)
  const setCurrentZ = useViewerStore((s) => s.setCurrentZ)

  // Compute the physical Z range across all layers that have a Z dimension
  const zRange = useMemo(() => {
    let minZ = Infinity
    let maxZ = -Infinity
    let hasZ = false

    for (const layer of layers) {
      const zSize = getLayerZSize(layer)
      if (zSize === null || zSize <= 1) continue
      hasZ = true
      const affine = buildAffineMatrix(layer)
      const z0 = voxelToPhysicalZ(affine, 0)
      const zEnd = voxelToPhysicalZ(affine, zSize - 1)
      minZ = Math.min(minZ, Math.min(z0, zEnd))
      maxZ = Math.max(maxZ, Math.max(z0, zEnd))
    }

    if (!hasZ) return null
    return { min: minZ, max: maxZ }
  }, [layers])

  // Snap currentZ into range on first render or when range changes
  useEffect(() => {
    if (!zRange) return
    if (currentZ < zRange.min || currentZ > zRange.max) {
      setCurrentZ(zRange.min)
    }
  }, [zRange, currentZ, setCurrentZ])

  // Compute per-layer voxel Z for display
  const layerSlices = useMemo(() => {
    if (!zRange) return []
    return layers
      .filter((l) => getLayerZSize(l) !== null && (getLayerZSize(l) ?? 0) > 1)
      .map((l) => {
        const affine = buildAffineMatrix(l)
        const maxVoxel = (getLayerZSize(l) ?? 1) - 1
        const voxelZ = physicalToVoxelZ(affine, currentZ, maxVoxel)
        return { id: l.id, voxelZ, maxVoxel }
      })
  }, [layers, zRange, currentZ])

  if (displayMode !== '2D' || !zRange) return null

  const { min, max } = zRange
  const range = max - min
  const step = range > 0 ? range / Math.max(...layerSlices.map((s) => s.maxVoxel), 1) : 1

  const vertical = orientation === 'vertical'

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center bg-background/80 backdrop-blur-sm rounded-md shadow-md',
        vertical ? 'flex-col gap-1 px-1.5 py-2' : 'flex-row gap-2 px-2 py-1.5'
      )}
    >
      <span className="text-[10px] font-medium text-muted-foreground select-none">Z</span>
      <div className={vertical ? 'h-48' : 'w-48'}>
        <Slider
          orientation={orientation}
          min={min}
          max={max}
          step={step}
          value={[currentZ]}
          onValueChange={([v]) => setCurrentZ(v)}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground select-none">
        {currentZ.toFixed(1)}
      </span>
      {layerSlices.length > 0 && (
        // The per-layer readouts divide off along the tray's long axis, so the
        // rule stays perpendicular to the slider either way round.
        <div
          className={cn(
            'flex items-center gap-0.5 border-border',
            vertical ? 'flex-col mt-0.5 border-t pt-1' : 'flex-row ml-0.5 border-l pl-1.5'
          )}
        >
          {layerSlices.map((ls) => (
            <span key={ls.id} className="text-[9px] tabular-nums text-muted-foreground">
              {ls.voxelZ}/{ls.maxVoxel}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
