'use client'

/**
 * TradingSidebar — Custom floating sidebar that overlays the chart.
 *
 * Positioned absolutely (z-40) on the left edge. Slides in/out with
 * CSS transform so the chart underneath never moves or resizes.
 *
 * Replicates the look of TradingView's left drawing-tools sidebar.
 * Actual drawing tools are available via TradingView's top toolbar.
 */

import { memo } from 'react'
import { cn } from '@/lib/utils'
import {
  MousePointer2,
  Crosshair,
  TrendingUp,
  Minus,
  PenTool,
  Square,
  Type,
  Ruler,
  Magnet,
  Eye,
  Lock,
  Trash2,
} from 'lucide-react'

/** Width of the custom sidebar — matches TradingView's native sidebar */
export const SIDEBAR_WIDTH = 53

// ─── Tool definitions ────────────────────────────────────────────────────────

type ToolEntry =
  | { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string }
  | { divider: true }

const tools: ToolEntry[] = [
  { icon: MousePointer2, label: 'Curseur' },
  { icon: Crosshair, label: 'Réticule' },
  { divider: true },
  { icon: TrendingUp, label: 'Ligne de tendance' },
  { icon: Minus, label: 'Ligne horizontale' },
  { icon: PenTool, label: 'Dessin libre' },
  { icon: Square, label: 'Formes' },
  { icon: Type, label: 'Texte' },
  { icon: Ruler, label: 'Mesure' },
  { divider: true },
  { icon: Magnet, label: 'Mode aimant' },
  { icon: Eye, label: 'Visibilité' },
  { icon: Lock, label: 'Verrouiller' },
  { icon: Trash2, label: 'Supprimer' },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface TradingSidebarProps {
  open: boolean
}

function TradingSidebar({ open }: TradingSidebarProps) {
  return (
    <div
      className={cn(
        'absolute top-0 left-0 bottom-0 z-40',
        'flex flex-col items-center pt-2 gap-0.5',
        'bg-[#131722] border-r border-[#2a2e39]',
        'transition-transform duration-300 ease-in-out',
      )}
      style={{
        width: SIDEBAR_WIDTH,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      {tools.map((tool, i) => {
        if ('divider' in tool) {
          return <div key={`d-${i}`} className="w-8 border-t border-[#2a2e39] my-1.5" />
        }
        const Icon = tool.icon
        return (
          <button
            key={i}
            className={cn(
              'w-[38px] h-[34px] flex items-center justify-center rounded-[3px]',
              'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]',
              'transition-colors duration-150 cursor-pointer',
            )}
            title={tool.label}
          >
            <Icon className="size-[18px]" strokeWidth={1.5} />
          </button>
        )
      })}
    </div>
  )
}

export default memo(TradingSidebar)
