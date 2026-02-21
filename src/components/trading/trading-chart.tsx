'use client'

/**
 * TradingChart — TradingView Advanced Charts embed via tv.js.
 *
 * Uses `new TradingView.widget()` (the free embed widget) which provides:
 *   - Native drawing-tools sidebar
 *   - Native header toolbar (timeframes, indicators, chart type)
 *   - Dark theme, overrides, enabled/disabled features
 *   - Local storage persistence for chart settings
 *
 * Important: tv.js is the **embed widget** wrapper, NOT the charting library.
 * It does NOT have .chart(), .setSymbol(), .setResolution(), etc.
 * Symbol/timeframe changes require widget recreation (fast — just a new iframe).
 *
 * The sidebar is toggled via CSS margin-shift (the iframe is a single unit,
 * we shift it left to hide the 53px sidebar off-screen).
 */

import { useEffect, useRef, memo } from 'react'

// ─── Global type for the tv.js library ──────────────────────────────────────

declare global {
  interface Window {
    TradingView: any
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Width of TradingView's native drawing-tools sidebar (px) */
export const SIDEBAR_WIDTH = 53

const CONTAINER_ID = 'tradingview-widget-container'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TradingChartProps {
  symbol: string
  timeframe?: string
  showToolsSidebar?: boolean
  /** Called once when the widget is ready */
  onWidgetReady?: (widget: any) => void
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

function TradingChart({
  symbol,
  timeframe = '1h',
  showToolsSidebar = true,
  onWidgetReady,
}: TradingChartProps) {
  const widgetRef  = useRef<any>(null)
  const onReadyRef = useRef(onWidgetReady)
  onReadyRef.current = onWidgetReady

  // ── Create / recreate widget when symbol or timeframe changes ───────────
  useEffect(() => {
    let cancelled = false
    const SCRIPT_ID = 'tradingview-tv-js'

    function createWidget() {
      if (cancelled) return
      if (!window.TradingView?.widget) {
        console.error('[TV] window.TradingView.widget not available')
        return
      }

      console.log('[TV] Creating widget —', symbol, timeframe)

      // TradingView.widget() clears the container (innerHTML = "") before
      // inserting the new iframe, so no manual cleanup needed.
      const w = new window.TradingView.widget({
        container_id: CONTAINER_ID,
        autosize:     true,
        symbol:       toTVSymbol(symbol),
        interval:     TV_INTERVALS[timeframe] ?? '60',
        timezone:     'Etc/UTC',
        theme:        'dark',
        style:        '1',
        locale:       'fr',

        toolbar_bg: '#131722',

        // ✅ Native drawing toolbar — the real TradingView tools
        hide_side_toolbar: false,

        enable_publishing:   false,
        allow_symbol_change: false,
        save_image:          false,

        enabled_features: [
          'use_localstorage_for_settings',
          'save_chart_properties_to_local_storage',
          'side_toolbar_in_fullscreen_mode',
          'header_in_fullscreen_mode',
        ],

        disabled_features: [
          'header_symbol_search',
          'header_compare',
          'display_market_status',
          'popup_hints',
          'create_volume_indicator_by_default',
        ],

        overrides: {
          'paneProperties.background':               '#0a0a0a',
          'paneProperties.backgroundType':           'solid',
          'paneProperties.vertGridProperties.color': 'rgba(10,10,10,0)',
          'paneProperties.horzGridProperties.color': 'rgba(10,10,10,0)',
        },

        loading_screen: { backgroundColor: '#0a0a0a' },
      })

      widgetRef.current = w

      // tv.js uses .ready(), NOT .onChartReady()
      w.ready(() => {
        if (cancelled) return
        console.log('[TV] ✅ Chart ready')
        onReadyRef.current?.(w)
      })
    }

    // Load tv.js script once, then create widget
    const existing = document.getElementById(SCRIPT_ID)
    if (!existing) {
      const s  = document.createElement('script')
      s.id     = SCRIPT_ID
      s.src    = 'https://s3.tradingview.com/tv.js'
      s.async  = true
      s.onload = () => { console.log('[TV] Script loaded'); createWidget() }
      s.onerror = () => console.error('[TV] ❌ Failed to load tv.js')
      document.head.appendChild(s)
    } else if (window.TradingView?.widget) {
      createWidget()
    } else {
      existing.addEventListener('load', createWidget, { once: true })
    }

    return () => {
      cancelled = true
      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch {}
        widgetRef.current = null
      }
    }
  }, [symbol, timeframe])

  // ── CSS margin-shift to toggle the native sidebar ──────────────────────
  // When showToolsSidebar is false, shift the iframe left by 53px so the
  // drawing toolbar slides off-screen. The parent must have overflow:hidden.
  const shiftStyle = showToolsSidebar
    ? { marginLeft: 0, width: '100%' }
    : { marginLeft: -SIDEBAR_WIDTH, width: `calc(100% + ${SIDEBAR_WIDTH}px)` }

  return (
    <div
      id={CONTAINER_ID}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
        transition: 'margin-left 0.3s ease, width 0.3s ease',
        ...shiftStyle,
      }}
    />
  )
}

export default memo(TradingChart)
