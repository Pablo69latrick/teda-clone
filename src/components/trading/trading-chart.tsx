'use client'

/**
 * TradingChart — TradingView Advanced Charts widget (tv.js).
 *
 * Uses `new TradingView.widget()` for a full-featured chart with:
 *   - Native drawing-tools sidebar (real TradingView tools)
 *   - Native header toolbar (timeframes, indicators, chart type)
 *   - API for symbol/timeframe changes (no widget recreation)
 *   - Local storage persistence for drawings and settings
 *
 * The widget is created ONCE on mount. Subsequent symbol/timeframe
 * changes are applied via the TradingView API — zero reload.
 *
 * The native drawing-tools sidebar can be toggled via:
 *   widget.chart().executeActionById("drawingToolbarAction")
 *
 * Symbol mapping: VP format (BTC-USD) → TradingView (BINANCE:BTCUSDT).
 */

import { useEffect, useRef, memo } from 'react'

// ─── Global type for the tv.js library ──────────────────────────────────────

declare global {
  interface Window {
    TradingView: any
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface TradingChartProps {
  symbol: string
  timeframe?: string
  /** Called once when the widget is ready, with the widget instance */
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

function TradingChart({ symbol, timeframe = '1h', onWidgetReady }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef    = useRef<any>(null)
  const readyRef     = useRef(false)

  // Mutable refs so the init closure always reads the latest values
  const onReadyRef   = useRef(onWidgetReady)
  const symbolRef    = useRef(symbol)
  const tfRef        = useRef(timeframe)

  onReadyRef.current = onWidgetReady
  symbolRef.current  = symbol
  tfRef.current      = timeframe

  // ── Create widget ONCE on mount ────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    const SCRIPT_ID = 'tradingview-tv-js'

    function init() {
      if (!mounted || !containerRef.current || widgetRef.current) return
      if (!window.TradingView?.widget) return

      widgetRef.current = new window.TradingView.widget({
        container: containerRef.current,
        autosize: true,
        symbol:   toTVSymbol(symbolRef.current),
        interval: TV_INTERVALS[tfRef.current] ?? '60',
        timezone: 'Etc/UTC',
        theme:    'dark',
        style:    '1',
        locale:   'fr',

        toolbar_bg: '#131722',

        // ✅ Native drawing toolbar — the real TradingView tools
        hide_side_toolbar: false,

        enable_publishing:  false,
        allow_symbol_change: false,
        save_image: false,

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
      })

      widgetRef.current.onChartReady(() => {
        if (!mounted) return
        readyRef.current = true

        // Sync with current props (they may have changed while widget loaded)
        try { widgetRef.current.chart().setSymbol(toTVSymbol(symbolRef.current)) } catch {}
        try { widgetRef.current.chart().setResolution(TV_INTERVALS[tfRef.current] ?? '60') } catch {}

        onReadyRef.current?.(widgetRef.current)
      })
    }

    // Load tv.js once, then initialise
    const existing = document.getElementById(SCRIPT_ID)
    if (!existing) {
      const s  = document.createElement('script')
      s.id     = SCRIPT_ID
      s.src    = 'https://s3.tradingview.com/tv.js'
      s.async  = true
      s.onload = init
      document.head.appendChild(s)
    } else if (window.TradingView?.widget) {
      init()
    } else {
      existing.addEventListener('load', init, { once: true })
    }

    return () => {
      mounted = false
      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch {}
        widgetRef.current = null
        readyRef.current  = false
      }
    }
  }, [])

  // ── Update symbol via API (no recreation) ──────────────────────────────
  useEffect(() => {
    if (readyRef.current && widgetRef.current) {
      try { widgetRef.current.chart().setSymbol(toTVSymbol(symbol)) } catch {}
    }
  }, [symbol])

  // ── Update timeframe via API (no recreation) ──────────────────────────
  useEffect(() => {
    if (readyRef.current && widgetRef.current) {
      try { widgetRef.current.chart().setResolution(TV_INTERVALS[timeframe] ?? '60') } catch {}
    }
  }, [timeframe])

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: 300 }} />
}

export default memo(TradingChart)
