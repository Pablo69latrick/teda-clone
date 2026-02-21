'use client'

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  BLOCK 2 — Trading Header Bar                           ║
 * ║                                                         ║
 * ║  Top bar above the chart. Replaces TradingView's native ║
 * ║  header (hide_top_toolbar: true) with our own controls: ║
 * ║                                                         ║
 * ║  • Timeframe selector (1m, 5m, 15m, 1H, 4H, 1D)       ║
 * ║  • Indicators button (future: dropdown of studies)      ║
 * ║  • Screenshot button                                    ║
 * ║  • Fullscreen toggle                                    ║
 * ║                                                         ║
 * ║  This bar is OUTSIDE the TradingView iframe — we fully  ║
 * ║  control its content, styling and behaviour.             ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { Camera, Maximize2, Minimize2, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Constants ──────────────────────────────────────────────────────────────

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D'] as const

/** Map display label → internal key used by the chart */
const TF_MAP: Record<string, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '1H': '1h', '4H': '4h', '1D': '1d',
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TradingHeaderBarProps {
  timeframe: string
  onTimeframeChange: (tf: string) => void
  onScreenshot?: () => void
  onFullscreen?: () => void
  isFullscreen?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TradingHeaderBar({
  timeframe,
  onTimeframeChange,
  onScreenshot,
  onFullscreen,
  isFullscreen,
}: TradingHeaderBarProps) {
  return (
    <div className="shrink-0 h-9 flex items-center gap-1 px-2 bg-[#131722] border-b border-[#2a2e39]">

      {/* ── Timeframe selector ────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5">
        {TIMEFRAMES.map(label => {
          const tfKey = TF_MAP[label]
          const isActive = timeframe === tfKey
          return (
            <button
              key={label}
              onClick={() => onTimeframeChange(tfKey)}
              className={cn(
                'px-2 py-1 text-[11px] font-medium rounded transition-colors',
                isActive
                  ? 'bg-[#2962ff] text-white'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Separator ─────────────────────────────────────────────────────── */}
      <div className="w-px h-4 bg-[#2a2e39] mx-1" />

      {/* ── Indicators button (placeholder — future: dropdown) ────────────── */}
      <button
        className="flex items-center gap-1 px-2 py-1 text-[11px] text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d] rounded transition-colors"
        title="Indicateurs"
      >
        <BarChart2 className="size-3.5" />
        <span>Indicateurs</span>
      </button>

      {/* ── Spacer ────────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Screenshot button ──────────────────────────────────────────────── */}
      {onScreenshot && (
        <button
          onClick={onScreenshot}
          className="p-1.5 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d] rounded transition-colors"
          title="Screenshot"
        >
          <Camera className="size-3.5" />
        </button>
      )}

      {/* ── Fullscreen button ──────────────────────────────────────────────── */}
      {onFullscreen && (
        <button
          onClick={onFullscreen}
          className="p-1.5 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d] rounded transition-colors"
          title={isFullscreen ? 'Quitter plein écran (Esc)' : 'Plein écran (F)'}
        >
          {isFullscreen
            ? <Minimize2 className="size-3.5" />
            : <Maximize2 className="size-3.5" />
          }
        </button>
      )}
    </div>
  )
}
