import type { LayerState } from '../stores/sceneStore'
import { resolveLayerDataRange } from '../model/dataRange'

const FALLBACK_RANGE: [number, number] = [0, 1]

export function getLayerDtypeRange(layer: LayerState): [number, number] {
  const dtype = layer.lens.dataset.dataArrays[0]?.store.dtype
  if (!dtype) return FALLBACK_RANGE

  try {
    return resolveLayerDataRange(layer, dtype)
  } catch {
    return FALLBACK_RANGE
  }
}

export function formatContrastValue(value: number): string {
  const absValue = Math.abs(value)

  if (absValue >= 1000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
  }

  if (absValue >= 1) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value)
  }

  if (absValue >= 0.01) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value)
}

