'use client'

/**
 * TradingToolbar — Isolated toggle overlay for the TradingView drawing-tools
 * sidebar. This component is positioned **independently** of the chart:
 *
 *   - Floats as an absolute-positioned panel on the left edge
 *   - Slides in / out via translateX (the chart never moves)
 *   - Contains the toggle button (W key shortcut)
 *   - Adds a visual separator between the sidebar and the chart
 *
 * Under the hood, the drawing tools are rendered inside the TradingView
 * iframe (which is managed by TradingChart). This component simply controls
 * the CSS margin-shift on that iframe to reveal or hide the 53 px sidebar.
 */

import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SIDEBAR_WIDTH } from './trading-chart'

interface TradingToolbarProps {
  isOpen: boolean
  onToggle: () => void
}

export function TradingToolbar({ isOpen, onToggle }: TradingToolbarProps) {
  return (
    <>
      {/* ── Visual separator — thin border at the sidebar right edge ── */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-none transition-opacity duration-300"
        style={{
          left: SIDEBAR_WIDTH,
          width: 1,
          background: 'rgba(42, 46, 57, 0.6)',
          opacity: isOpen ? 1 : 0,
        }}
      />

      {/* ── Toggle button (W) — anchored to the sidebar edge ── */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-30',
          'w-5 h-10 flex items-center justify-center',
          'bg-[#1a1a1a]/80 hover:bg-[#2a2a2a] border border-[#333] rounded-r-md',
          'text-[#888] hover:text-white',
          'transition-all duration-300 ease-in-out',
          'shadow-lg shadow-black/40 cursor-pointer',
        )}
        style={{ left: isOpen ? SIDEBAR_WIDTH : 0 }}
        title={isOpen ? 'Masquer les outils (W)' : 'Afficher les outils (W)'}
      >
        <ChevronLeft
          className={cn(
            'size-3.5 transition-transform duration-300',
            !isOpen && 'rotate-180',
          )}
        />
      </button>
    </>
  )
}
