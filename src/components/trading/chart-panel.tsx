'use client'

/**
 * Chart Panel — TradingView Advanced Charts (Charting Library).
 *
 * Everything (header, drawing-tools sidebar, chart) is rendered natively
 * inside the TradingView iframe. This component simply wraps it with a
 * fullscreen toggle overlay.
 */

import dynamic from 'next/dynamic'
import { Maximize2, Minimize2 } from 'lucide-react'

// ── Lazy-load the chart component (no SSR — needs browser DOM) ───────────────

const TradingChart = dynamic(
  () => import('@/components/trading/trading-chart'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-black">
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
  accountId: string
  onFullscreen?: () => void
  isFullscreen?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({
  symbol,
  timeframe,
  accountId,
  onFullscreen,
  isFullscreen,
}: ChartPanelProps) {
  return (
    <div className="h-full w-full bg-black overflow-hidden flex flex-col">

      <div className="flex-1 min-h-0 overflow-hidden" style={{ position: 'relative', minHeight: '400px' }}>

        {/* TradingView iframe — native header + sidebar + chart */}
        <TradingChart
          symbol={symbol}
          timeframe={timeframe}
          accountId={accountId}
        />

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

    </div>
  )
}
