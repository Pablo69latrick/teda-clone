'use client'

/**
 * TradingChart — TradingView Advanced Chart widget embed.
 *
 * Renders TradingView's full chart with native drawing-tools sidebar.
 * The widget is recreated only when symbol or timeframe changes.
 *
 * The drawing-tools sidebar is toggled via CSS margin-shift so it
 * slides off-screen to the left (same pattern as the right panel).
 * No widget reload needed — only a CSS transition runs.
 *
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

// ─── Layout constant ────────────────────────────────────────────────────────
/** Width of TradingView's native left-side drawing tools sidebar (px) */
export const SIDEBAR_WIDTH = 53

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
    // Always create with sidebar visible — CSS margin-shift handles hide/show
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
      hide_top_toolbar: true,
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

  // CSS margin-shift: slides the entire widget left so the sidebar
  // disappears off-screen while the chart expands to fill the space.
  return (
    <div className="w-full h-full overflow-hidden relative" style={{ minHeight: 300 }}>
      <div
        ref={containerRef}
        className="h-full transition-[margin-left,width] duration-300 ease-in-out"
        style={{
          marginLeft: showToolsSidebar ? 0 : -SIDEBAR_WIDTH,
          width: showToolsSidebar ? '100%' : `calc(100% + ${SIDEBAR_WIDTH}px)`,
        }}
      />
    </div>
  )
}

export default memo(TradingChart)
