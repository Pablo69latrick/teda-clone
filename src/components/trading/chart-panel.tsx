'use client'

/**
 * Chart panel — TradingView Advanced Charts widget + UTC clock.
 *
 * The widget uses tv.js (TradingView.widget()) and includes natively:
 *   - Header toolbar (timeframes, indicators, chart type)
 *   - Drawing-tools sidebar (line, fibonacci, rectangle, text, etc.)
 *   - Real-time chart from TradingView's data
 *
 * Below the chart, a live UTC clock bar is always visible.
 * No custom toolbar needed — TradingView's native header has everything.
 */

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Maximize2, Minimize2 } from 'lucide-react'

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

// ─── Live UTC clock ──────────────────────────────────────────────────────────

function UTCClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      setTime(
        `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
        `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return <span className="text-[10px] font-mono text-[#787b86]">{time}</span>
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChartPanelProps {
  symbol: string
  timeframe: string
  onWidgetReady?: (widget: any) => void
  accountId?: string
  onFullscreen?: () => void
  isFullscreen?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({
  symbol,
  timeframe,
  onWidgetReady,
  onFullscreen,
  isFullscreen,
}: ChartPanelProps) {
  return (
    <div className="h-full w-full bg-[#0a0a0a] overflow-hidden flex flex-col">
      {/* ── Chart area — TradingView widget with native toolbar + sidebar ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <TradingChart
          symbol={symbol}
          timeframe={timeframe}
          onWidgetReady={onWidgetReady}
        />

        {/* Fullscreen overlay button — top-right of chart area */}
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

      {/* ── UTC time bar — always visible at bottom ── */}
      <div className="shrink-0 h-6 flex items-center justify-end px-3 bg-[#131722] border-t border-[#2a2e39]">
        <UTCClock />
      </div>
    </div>
  )
}
