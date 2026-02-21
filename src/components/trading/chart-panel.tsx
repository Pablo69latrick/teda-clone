'use client'

/**
 * Chart panel — Lightweight Charts v5 (no toolbar, pure chart).
 *
 * The timeframe selector lives in the right-side overlay panel (trade/page.tsx).
 * This component only renders the chart canvas + a fullscreen overlay button.
 */

import dynamic from 'next/dynamic'
import { Maximize2, Minimize2 } from 'lucide-react'

// ── Lazy-load the chart component (no SSR — uses Canvas 2D) ──────────────────

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
  accountId?: string
  onFullscreen?: () => void
  isFullscreen?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({
  symbol,
  timeframe,
  onFullscreen,
  isFullscreen,
}: ChartPanelProps) {
  return (
    <div className="relative h-full w-full bg-[#0a0a0a] overflow-hidden">
      {/* Chart — fills entire container */}
      <TradingChart symbol={symbol} timeframe={timeframe} />

      {/* Fullscreen overlay button — top-right corner, hover-reveal */}
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
  )
}
