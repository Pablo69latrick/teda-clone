'use client'

/**
 * Chart panel — composes three independent layers:
 *
 *   1. TradingChart  — the TradingView iframe (chart + native sidebar)
 *   2. TradingToolbar — isolated overlay for the drawing-tools sidebar
 *   3. UTC clock bar  — always visible at the bottom
 *
 * The toolbar is a **separate component** that floats over the chart.
 * It controls visibility of the native TradingView drawing-tools sidebar
 * via CSS margin-shift on the iframe — the chart itself never moves.
 */

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Maximize2, Minimize2 } from 'lucide-react'
import { TradingToolbar } from './trading-toolbar'

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
  showToolsSidebar?: boolean
  onToggleToolsSidebar?: () => void
  onWidgetReady?: (widget: any) => void
  accountId?: string
  onFullscreen?: () => void
  isFullscreen?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({
  symbol,
  timeframe,
  showToolsSidebar = true,
  onToggleToolsSidebar,
  onWidgetReady,
  onFullscreen,
  isFullscreen,
}: ChartPanelProps) {
  return (
    <div className="h-full w-full bg-[#0a0a0a] overflow-hidden flex flex-col">
      {/* ── Chart area — contains chart + toolbar as independent layers ── */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ position: 'relative', minHeight: '400px' }}>

        {/* Layer 1: TradingView chart (iframe) — fills the full area */}
        <TradingChart
          symbol={symbol}
          timeframe={timeframe}
          showToolsSidebar={showToolsSidebar}
          onWidgetReady={onWidgetReady}
        />

        {/* Layer 2: Toolbar overlay — floats independently over the chart */}
        {onToggleToolsSidebar && (
          <TradingToolbar
            isOpen={showToolsSidebar}
            onToggle={onToggleToolsSidebar}
          />
        )}

        {/* Layer 3: Fullscreen button — top-right */}
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
