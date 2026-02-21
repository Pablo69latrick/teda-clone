'use client'

/**
 * Chart Panel — composes the TradingView integration from 3 blocks:
 *
 * ┌─────────────────────────────────────────────────┐
 * │  BLOCK 2: TradingView native header (iframe)    │  ← inside trading-chart iframe
 * │  Timeframes · Indicateurs · Chart type · Screenshot │
 * ├───┬─────────────────────────────────────────────┤
 * │ B │                                             │
 * │ L │         TradingView Advanced Chart          │  ← trading-chart.tsx (iframe)
 * │ O │              (iframe)                       │
 * │ C │                                             │
 * │ K │                                             │
 * │   │                                             │
 * │ 1 │                                             │
 * ├───┴─────────────────────────────────────────────┤
 * │  BLOCK 3: TradingStatusBar                      │  ← trading-status-bar.tsx
 * │                              2026-02-21 UTC     │
 * └─────────────────────────────────────────────────┘
 *
 * BLOCK 1: TradingToolbar (sidebar) floats as an overlay on the left edge.
 * BLOCK 2: TradingView's native header — configured via hide_top_toolbar:false
 *          in trading-chart.tsx. Rendered inside the iframe, NOT a React component.
 * BLOCK 3: TradingStatusBar — our own component below the chart.
 *
 * Each block maps to a separate file for independent modifications.
 */

import dynamic from 'next/dynamic'
import { Maximize2, Minimize2 } from 'lucide-react'
import { TradingToolbar } from './trading-toolbar'
import { TradingStatusBar } from './trading-status-bar'

// ── Lazy-load the chart component (no SSR — loads tv.js into DOM) ────────────

const TradingChart = dynamic(
  () => import('@/components/trading/trading-chart'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Loading chart…</span>
        </div>
      </div>
    ),
  }
)

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChartPanelProps {
  symbol: string
  timeframe: string
  showToolsSidebar?: boolean
  onToggleToolsSidebar?: () => void
  onFullscreen?: () => void
  isFullscreen?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({
  symbol,
  timeframe,
  showToolsSidebar = true,
  onToggleToolsSidebar,
  onFullscreen,
  isFullscreen,
}: ChartPanelProps) {
  return (
    <div className="h-full w-full bg-[#0a0a0a] overflow-hidden flex flex-col">

      {/* ── BLOCK 2 (native TradingView header) + Chart + BLOCK 1 (sidebar) ── */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ position: 'relative', minHeight: '400px' }}>

        {/* TradingView iframe — includes native header (Block 2) + chart */}
        <TradingChart
          symbol={symbol}
          timeframe={timeframe}
          showToolsSidebar={showToolsSidebar}
        />

        {/* BLOCK 1: Drawing-tools sidebar overlay */}
        {onToggleToolsSidebar && (
          <TradingToolbar
            isOpen={showToolsSidebar}
            onToggle={onToggleToolsSidebar}
          />
        )}

        {/* Fullscreen button — top-right */}
        {onFullscreen && (
          <div className="absolute top-2 right-2 z-30 group/fs">
            <button
              onClick={(e) => { e.stopPropagation(); onFullscreen() }}
              className="p-1.5 rounded text-[#787b86]/0 group-hover/fs:text-[#787b86] hover:!text-white hover:bg-[#2a2e39]/80 transition-all duration-200"
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* ── BLOCK 3: Status bar (UTC clock) ────────────────────────────────── */}
      <TradingStatusBar />
    </div>
  )
}
