import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * The floating column of scene panels — behaviour only. It owns *where* the
 * stack sits and *whether* it is expanded, and nothing about what is in it: the
 * host composes that. See Scene.tsx for the default composition, and
 * ArrayDatasetPage for one that adds a card of its own.
 *
 * Collapse state is per-column via `storageKey`, so a page that stacks two
 * columns does not have them fold in unison.
 */
export type SceneColumnSide = 'left' | 'right'

type SceneColumnContextValue = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  side: SceneColumnSide
}

const SceneColumnContext = createContext<SceneColumnContextValue | null>(null)

/**
 * The column's state, for a panel that wants to react to it (hide a detail when
 * narrow, render its own trigger). Throws outside a column so a misplaced panel
 * fails loudly rather than silently rendering unpositioned.
 */
export const useSceneColumn = () => {
  const context = useContext(SceneColumnContext)
  if (!context) {
    throw new Error('useSceneColumn must be used within a <Scene.Column>')
  }
  return context
}

export const SceneColumn = ({
  side = 'left',
  storageKey = 'scene-column-collapsed',
  className,
  children
}: {
  side?: SceneColumnSide
  storageKey?: string
  className?: string
  children: ReactNode
}) => {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === 'true')

  useEffect(() => {
    localStorage.setItem(storageKey, String(collapsed))
  }, [collapsed, storageKey])

  return (
    <SceneColumnContext.Provider value={{ collapsed, setCollapsed, side }}>
      {/* pointer-events-none so the scene stays draggable through the column's
          gaps; each panel opts back in. Collapsed it shrinks to its trigger
          rather than reserving the full w-72 gutter. */}
      <div
        className={cn(
          'pointer-events-none absolute top-3 bottom-3 z-30 flex flex-col gap-2',
          side === 'left' ? 'left-3' : 'right-3',
          collapsed ? 'w-auto' : 'w-72',
          className
        )}
      >
        {children}
      </div>
    </SceneColumnContext.Provider>
  )
}

/**
 * Folds the column away. Icon follows the column's side and state; pass
 * children to replace it entirely.
 */
export const SceneColumnTrigger = ({
  className,
  children
}: {
  className?: string
  children?: ReactNode
}) => {
  const { collapsed, setCollapsed, side } = useSceneColumn()

  const Icon = collapsed
    ? side === 'left'
      ? PanelLeftOpen
      : PanelRightOpen
    : side === 'left'
      ? PanelLeftClose
      : PanelRightClose

  return (
    <Button
      variant="outline"
      size="xs"
      className={cn(
        'pointer-events-auto h-7 w-7 bg-black',
        side === 'left' ? 'self-start' : 'self-end',
        className
      )}
      onClick={() => setCollapsed(!collapsed)}
      title={collapsed ? 'Show scene panels' : 'Hide scene panels'}
    >
      {children ?? <Icon className="h-3.5 w-3.5" />}
    </Button>
  )
}

/**
 * The collapsible body. `flex-1 min-h-0` so a panel that wants the remaining
 * height (the layer list) still gets it, exactly as when the panels were direct
 * children of the column.
 */
export const SceneColumnPanels = ({
  className,
  children
}: {
  className?: string
  children: ReactNode
}) => {
  const { collapsed } = useSceneColumn()

  if (collapsed) return null

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col items-stretch gap-2', className)}>
      {children}
    </div>
  )
}
