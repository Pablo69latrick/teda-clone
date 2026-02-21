'use client'

/**
 * Chart panel — Lightweight Charts v5 with timeframe selector + fullscreen.
 *
 * ARCHITECTURE:
 *   - TradingChart loaded via next/dynamic (ssr: false) — Canvas 2D, ~35KB
 *   - Historical candles fetched from /api/market-data/candles (Binance proxy)
 *   - Live updates via Zustand price store subscription (no re-renders)
 *   - Timeframe selector bar at top
 *   - Fullscreen toggle via parent CSS
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

// ─── Timeframes ──────────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
] as const

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChartPanelProps {
  symbol: string
  accountId?: string
  onFullscreen?: () => void
  isFullscreen?: boolean
  showToolsSidebar?: boolean
  onToggleToolsSidebar?: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({
  symbol,
  onFullscreen,
  isFullscreen,
}: ChartPanelProps) {
  const [timeframe, setTimeframe] = useState('1h')

  return (
    <div className="relative flex flex-col h-full bg-[#0a0a0a] overflow-hidden">

      {/* ── Top toolbar: symbol + timeframe selector ─────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 px-2 h-8 bg-[#0a0a0a] border-b border-[#1a1a2e]">

        {/* Symbol label */}
        <span className="text-[11px] font-semibold text-[#d1d4dc] mr-2 tracking-wide">
          {symbol}
        </span>

        {/* Separator */}
        <div className="w-px h-4 bg-[#1a1a2e] mr-1" />

        {/* Timeframe buttons */}
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={cn(
              'px-2 py-0.5 text-[10px] font-medium rounded transition-colors duration-150',
              timeframe === tf.value
                ? 'bg-[#2962ff] text-white'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1a1a2e]',
            )}
          >
            {tf.label}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Fullscreen button */}
        {onFullscreen && (
          <button
            onClick={onFullscreen}
            className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39]/80 transition-colors"
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        )}
      </div>

      {/* ── Chart area ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <TradingChart symbol={symbol} timeframe={timeframe} />
      </div>
    </div>
  )
}
