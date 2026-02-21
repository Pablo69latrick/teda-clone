'use client'

/**
 * TradingChart — TradingView Advanced Chart widget embed.
 *
 * Renders TradingView's full chart at 100% width. The built-in side
 * toolbar is hidden (`hide_side_toolbar: true`) — a custom floating
 * sidebar (TradingSidebar) overlays the chart independently so the
 * chart NEVER moves or resizes when the sidebar toggles.
 *
 * Drawing tools remain accessible from TradingView's top toolbar.
 *
 * The widget is recreated only when symbol or timeframe changes.
 * Symbol mapping: VP format (BTC-USD) → TradingView (BINANCE:BTCUSDT).
 */

import { useEffect, useRef, memo } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TradingChartProps {
  symbol: string
  timeframe?: string
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

// ─── Component ──────────────────────────────────────────────────────────────

function TradingChart({ symbol, timeframe = '1h' }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

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
      hide_side_toolbar: true,
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

  return (
    <div className="w-full h-full" style={{ minHeight: 300 }}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}

export default memo(TradingChart)
