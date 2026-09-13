import { Card } from '@/components/ui/card'
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import { NodeResizeControl } from '@xyflow/react'
import { motion } from 'framer-motion'
import React from 'react'
import { useEditNodeErrors, EditFlowStoreContext, useEditFlowStore } from '../edit/context'

type NodeProps = {
  children: React.ReactNode
  className?: string
  id: string
  selected?: boolean
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  contextMenu?: React.ReactNode
  showResizeControl?: boolean
}

const controlStyle = {
  background: 'transparent',
  border: 'none'
}

const BaseNodeShowLayout: React.FC<NodeProps & { showNodeErrors?: boolean; errors?: any[] }> = ({
  id,
  children,
  className,
  selected,
  contextMenu,
  minWidth = 100,
  minHeight = 30,
  maxWidth = 800,
  maxHeight = 900,
  showResizeControl = true,
  showNodeErrors = false,
  errors = []
}) => {
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key={id}
            className={cn(
              'rounded-xl border bg-card text-card-foreground shadow border-primary/80 w-full h-full group',
              'custom-drag-handle h-full z-10 group shadow relative border bg-sidebar ',
              'w-full',
              className
            )}
            style={{
              minWidth: minWidth,
              minHeight: minHeight
            }}
          >
            {children}

            {errors.length > 0 && showNodeErrors && (
              <div className="absolute translate-y-[-100%] top-0 left-[50%] translate-x-[-50%] pb-3 flex flex-col gap-2 min-w-[200px]">
                {errors.map((e: any) => (
                  <Card
                    key={e.id || e.message}
                    className="p-2 border-destructive text-xs max-w-md animate-pulse"
                  >
                    {e.message}
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent>{contextMenu}</ContextMenuContent>
      </ContextMenu>
      {showResizeControl && (
        <NodeResizeControl
          style={controlStyle}
          minWidth={minWidth}
          minHeight={minHeight}
          maxHeight={maxHeight}
          maxWidth={maxWidth}
          className="nodrag nopan nowheel"
        >
          <div
            className={cn(
              'absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-md border border-border/70 bg-background/95 text-muted-foreground shadow-md backdrop-blur-sm transition-opacity',
              'nodrag nopan nowheel',
              !selected && 'pointer-events-none opacity-0',
              selected && 'opacity-100'
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.3536 11.3536C11.5488 11.1583 11.5488 10.8417 11.3536 10.6465L4.70711 4L9 4C9.27614 4 9.5 3.77614 9.5 3.5C9.5 3.22386 9.27614 3 9 3L3.5 3C3.36739 3 3.24021 3.05268 3.14645 3.14645C3.05268 3.24022 3 3.36739 3 3.5L3 9.00001C3 9.27615 3.22386 9.50001 3.5 9.50001C3.77614 9.50001 4 9.27615 4 9.00001V4.70711L10.6464 11.3536C10.8417 11.5488 11.1583 11.5488 11.3536 11.3536Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
        </NodeResizeControl>
      )}
    </>
  )
}

const EditNodeShowLayout: React.FC<NodeProps> = (props) => {
  const showNodeErrors = useEditFlowStore((s) => s.showNodeErrors);
  const errors = useEditNodeErrors(props.id)
  return <BaseNodeShowLayout {...props} showNodeErrors={showNodeErrors} errors={errors} />
}

export const NodeShowLayout: React.FC<NodeProps> = (props) => {
  const storeContext = React.useContext(EditFlowStoreContext)
  if (storeContext) {
    return <EditNodeShowLayout {...props} />
  }
  return <BaseNodeShowLayout {...props} />
}
