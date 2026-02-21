'use client'

/**
 * Chart Panel — composes the TradingView integration from 3 independent blocks:
 *
 * ┌─────────────────────────────────────────────────┐
 * │  BLOCK 2: TradingHeaderBar                      │  ← trading-header-bar.tsx
 * │  Timeframes · Indicateurs · Screenshot · FS     │
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
 *
 * Each block is a separate component file — modify independently.
 */

import dynamic from 'next/dynamic'
import { TradingHeaderBar } from './trading-header-bar'
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
  onTimeframeChange: (tf: string) => void
  showToolsSidebar?: boolean
  onToggleToolsSidebar?: () => void
  onFullscreen?: () => void
  isFullscreen?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({
  symbol,
  timeframe,
  onTimeframeChange,
  showToolsSidebar = true,
  onToggleToolsSidebar,
  onFullscreen,
  isFullscreen,
}: ChartPanelProps) {
  return (
    <div className="h-full w-full bg-[#0a0a0a] overflow-hidden flex flex-col">

      {/* ── BLOCK 2: Header bar (timeframes, indicators, screenshot, fullscreen) ── */}
      <TradingHeaderBar
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        onFullscreen={onFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* ── Chart area — iframe + sidebar overlay ──────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ position: 'relative', minHeight: '400px' }}>

        {/* TradingView iframe — fills the full area */}
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
      </div>

      {/* ── BLOCK 3: Status bar (UTC clock) ────────────────────────────────── */}
      <TradingStatusBar />
    </div>
  )
}
