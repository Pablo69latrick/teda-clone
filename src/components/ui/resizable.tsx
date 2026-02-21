'use client'

import * as React from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { cn } from '@/lib/utils'

// react-resizable-panels v4:
//   Group     → uses "orientation" prop (not "direction")
//   Panel     → same
//   Separator → same as PanelResizeHandle
// data attributes: data-orientation="horizontal|vertical"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn(
      'flex h-full w-full data-[orientation=vertical]:flex-col',
      className
    )}
    {...props}
  />
)

const ResizablePanel = Panel

const ResizableHandle = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Separator>) => (
  <Separator
    className={cn(
      'relative flex items-center justify-center shrink-0',
      'bg-border/40 hover:bg-border/70 transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      // horizontal separator = vertical drag bar
      'data-[orientation=horizontal]:w-1 data-[orientation=horizontal]:cursor-col-resize data-[orientation=horizontal]:h-full',
      // vertical separator = horizontal drag bar
      'data-[orientation=vertical]:h-1 data-[orientation=vertical]:w-full data-[orientation=vertical]:cursor-row-resize',
      className
    )}
    {...props}
  >
    {children ?? (
      <div
        className={cn(
          'z-10 rounded-full bg-border/60',
          'data-[orientation=horizontal]:h-8 data-[orientation=horizontal]:w-0.5',
          'data-[orientation=vertical]:h-0.5 data-[orientation=vertical]:w-8'
        )}
      />
    )}
  </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
