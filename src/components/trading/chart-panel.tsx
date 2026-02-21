'use client'

/**
 * Chart panel — TradingView Advanced Chart + custom toolbar + UTC clock.
 *
 * Structure (flex column):
 *   1. Custom top toolbar   — timeframes, indicators (ALWAYS visible, never shifts)
 *   2. TradingView chart    — with native drawing-tools sidebar + margin-shift
 *   3. UTC time bar         — live UTC clock at the bottom
 *
 * The TradingView widget uses `hide_top_toolbar: true` so its built-in
 * toolbar is hidden. Our custom toolbar above the iframe replaces it and
 * is OUTSIDE the margin-shift — it never moves when the sidebar toggles.
 *
 * The real TradingView drawing-tools sidebar (left icons) is preserved.
 */

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Maximize2, Minimize2, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Lazy-load the chart component (no SSR — injects <script> into DOM) ───────

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

// ─── Timeframe config ────────────────────────────────────────────────────────

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
const TF_LABELS: Record<string, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '1h': '1H', '4h': '4H', '1d': '1D',
}

// ─── Live UTC clock ──────────────────────────────────────────────────────────

function UTCClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      setTime(
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
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
  showToolsSidebar: boolean
  onTimeframeChange?: (tf: string) => void
  accountId?: string
  onFullscreen?: () => void
  isFullscreen?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({
  symbol,
  timeframe,
  showToolsSidebar,
  onTimeframeChange,
  onFullscreen,
  isFullscreen,
}: ChartPanelProps) {
  return (
    <div className="h-full w-full bg-[#0a0a0a] overflow-hidden flex flex-col">

      {/* ── Custom top toolbar — ALWAYS visible, NEVER shifts with sidebar ── */}
      <div className="shrink-0 h-[38px] flex items-center gap-1 px-2 bg-[#131722] border-b border-[#2a2e39]">
        {/* Timeframe buttons */}
        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange?.(tf)}
              className={cn(
                'px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer',
                timeframe === tf
                  ? 'bg-[#2962ff] text-white'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]',
              )}
            >
              {TF_LABELS[tf] ?? tf}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[#2a2e39] mx-1" />

        {/* Indicators button */}
        <button
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded transition-colors cursor-pointer"
          title="Indicateurs"
        >
          <Activity className="size-3.5" />
          <span>Indicateurs</span>
        </button>
      </div>

      {/* ── Chart area — sidebar margin-shift applies inside here only ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <TradingChart
          symbol={symbol}
          timeframe={timeframe}
          showToolsSidebar={showToolsSidebar}
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
