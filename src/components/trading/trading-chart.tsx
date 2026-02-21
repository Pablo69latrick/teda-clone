'use client'

/**
 * TradingChart — TradingView Advanced Chart widget embed.
 *
 * Renders TradingView's full chart with toolbar (drawing tools,
 * indicators, timeframe selector, crosshair, etc.).
 *
 * The widget is recreated only when symbol or timeframe changes.
 * The drawing-tools sidebar is toggled via CSS clip-path (L-shape mask)
 * so the top toolbar always stays in place. No reload needed.
 * Symbol mapping: VP format (BTC-USD) → TradingView (BINANCE:BTCUSDT).
 */

import { useEffect, useRef, memo } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TradingChartProps {
  symbol: string
  timeframe?: string
  /** Show/hide the left-side drawing tools sidebar (W key) */
  showToolsSidebar?: boolean
}

// ─── Symbol mapping ─────────────────────────────────────────────────────────

function toTVSymbol(vpSymbol: string): string {
  // BTC-USD → BINANCE:BTCUSDT
  const mapped = vpSymbol.replace(/-USD$/, 'USDT').replace(/-/g, '')
  return `BINANCE:${mapped}`
}

// ─── Timeframe → TradingView interval ───────────────────────────────────────

const TV_INTERVALS: Record<string, string> = {
  '1m':  '1',
  '5m':  '5',
  '15m': '15',
  '1h':  '60',
  '4h':  '240',
  '1d':  'D',
}

// ─── TradingView layout constants (px) ──────────────────────────────────────
/** Left-side drawing tools sidebar width */
export const TV_SIDEBAR_WIDTH = 53
/** Top toolbar height (timeframes, indicators, chart type…) */
export const TV_TOP_BAR_HEIGHT = 38

// ─── Component ──────────────────────────────────────────────────────────────

function TradingChart({ symbol, timeframe = '1h', showToolsSidebar = true }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Widget is only recreated when symbol or timeframe changes — NOT showToolsSidebar
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clean previous widget
    container.innerHTML = ''

    // Widget container structure (TradingView requires this)
    const wrapper = document.createElement('div')
    wrapper.className = 'tradingview-widget-container'
    wrapper.style.width = '100%'
    wrapper.style.height = '100%'

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.width = '100%'
    inner.style.height = '100%'
    wrapper.appendChild(inner)

    // Inject TradingView embed script with config
    // Always create with sidebar visible — CSS clip-path handles hide/show
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: toTVSymbol(symbol),
      interval: TV_INTERVALS[timeframe] ?? '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'fr',
      backgroundColor: 'rgba(10, 10, 10, 1)',
      gridColor: 'rgba(10, 10, 10, 0)',
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      support_host: 'https://www.tradingview.com',
    })
    wrapper.appendChild(script)
    container.appendChild(wrapper)

    return () => {
      container.innerHTML = ''
    }
  }, [symbol, timeframe])

  // L-shaped clip-path: when hiding the sidebar, clip only the sidebar area
  // (left strip below the top toolbar) while keeping the top toolbar at full width.
  // Both states use 6 polygon points so the clip-path transition animates smoothly.
  const clipVisible = `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${TV_TOP_BAR_HEIGHT}px, 0 ${TV_TOP_BAR_HEIGHT}px)`
  const clipHidden  = `polygon(0 0, 100% 0, 100% 100%, ${TV_SIDEBAR_WIDTH}px 100%, ${TV_SIDEBAR_WIDTH}px ${TV_TOP_BAR_HEIGHT}px, 0 ${TV_TOP_BAR_HEIGHT}px)`

  return (
    <div className="w-full h-full overflow-hidden" style={{ minHeight: 300 }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          clipPath: showToolsSidebar ? clipVisible : clipHidden,
          transition: 'clip-path 0.3s ease-in-out',
        }}
      />
    </div>
  )
}

export default memo(TradingChart)
