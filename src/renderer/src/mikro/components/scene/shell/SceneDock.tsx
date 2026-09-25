import { cn } from '@/lib/utils'
import { createContext, useContext, type ReactNode } from 'react'

/**
 * An edge-anchored, centred tray for the scene's scrubbers — the counterpart to
 * SceneColumn, which owns the corner-anchored panel stack. Behaviour only: it
 * positions, and it tells its children which way to lay themselves out.
 *
 * Orientation is derived from the side rather than passed separately: a slider
 * docked to a vertical edge is a vertical slider, and letting a caller ask for a
 * horizontal slider up the left edge would only produce a broken tray.
 */
export type SceneDockSide = 'left' | 'right' | 'top' | 'bottom'
export type SceneDockOrientation = 'vertical' | 'horizontal'

export const orientationForSide = (side: SceneDockSide): SceneDockOrientation =>
  side === 'left' || side === 'right' ? 'vertical' : 'horizontal'

const SIDE_CLASSES: Record<SceneDockSide, string> = {
  left: 'left-2 top-1/2 -translate-y-1/2',
  right: 'right-2 top-1/2 -translate-y-1/2',
  top: 'top-2 left-1/2 -translate-x-1/2',
  bottom: 'bottom-2 left-1/2 -translate-x-1/2'
}

type SceneDockContextValue = {
  side: SceneDockSide
  orientation: SceneDockOrientation
}

const SceneDockContext = createContext<SceneDockContextValue | null>(null)

/**
 * The dock a panel is in, or null when it is rendered standalone. Nullable by
 * design — unlike a column panel, a scrubber has a sensible natural orientation
 * of its own, so it can be dropped anywhere and still render.
 */
export const useSceneDock = () => useContext(SceneDockContext)

export const useSceneDockOrientation = (fallback: SceneDockOrientation): SceneDockOrientation =>
  useContext(SceneDockContext)?.orientation ?? fallback

export const SceneDock = ({
  side = 'bottom',
  className,
  children
}: {
  side?: SceneDockSide
  className?: string
  children: ReactNode
}) => {
  const orientation = orientationForSide(side)

  return (
    <SceneDockContext.Provider value={{ side, orientation }}>
      {/* Trays stack across the dock's edge: side by side up a vertical edge,
          one above the other along a horizontal one. */}
      <div
        className={cn(
          'pointer-events-none absolute z-30 flex gap-1.5',
          SIDE_CLASSES[side],
          orientation === 'vertical' ? 'flex-row' : 'flex-col',
          className
        )}
      >
        {children}
      </div>
    </SceneDockContext.Provider>
  )
}
