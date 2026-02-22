'use client'

/**
 * TradingChart — TradingView Advanced Charts (Charting Library).
 *
 * Uses the REAL charting library from charting-library.tradingview-widget.com,
 * NOT the free embed widget (tv.js).
 *
 * All TradingView files are proxied via /tv/* → charting-library.tradingview-widget.com/*
 * This is REQUIRED because the charting library iframe needs window.parent access (same-origin).
 */

import { useEffect, useRef, useMemo, memo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { isBrowserSupabaseConfigured } from '@/lib/supabase/config'
import { createChartSaveAdapter } from '@/lib/chart-save-adapter'

// ─── Global types ────────────────────────────────────────────────────────────

declare global {
  interface Window {
    TradingView: any
    TradingViewDatafeed: any
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CONTAINER_ID = 'tradingview-chart-container'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TradingChartProps {
  symbol: string
  timeframe?: string
  accountId: string
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

// ─── Script loader ──────────────────────────────────────────────────────────

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id)
    if (existing) {
      if (
        (id === 'tv-charting-lib' && window.TradingView?.widget) ||
        (id === 'tv-datafeed' && window.TradingViewDatafeed?.TradingViewDatafeed)
      ) {
        resolve()
      } else {
        existing.addEventListener('load', () => resolve(), { once: true })
      }
      return
    }
    const s = document.createElement('script')
    s.id = id
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

// ─── Component ──────────────────────────────────────────────────────────────

function TradingChart({
  symbol,
  timeframe = '1h',
  accountId,
  onWidgetReady,
}: TradingChartProps) {
  const widgetRef  = useRef<any>(null)
  const readyRef   = useRef(false)
  const onReadyRef = useRef(onWidgetReady)
  onReadyRef.current = onWidgetReady

  // Track current prop values for sync after onChartReady
  const currentSymbolRef    = useRef(symbol)
  const currentTimeframeRef = useRef(timeframe)
  currentSymbolRef.current    = symbol
  currentTimeframeRef.current = timeframe

  // ── Supabase save/load adapter (recreated when account changes) ──────────
  const saveLoadAdapter = useMemo(() => {
    if (!isBrowserSupabaseConfigured()) return null
    const supabase = createSupabaseBrowserClient()
    return createChartSaveAdapter(supabase, accountId)
  }, [accountId])

  // ── Create widget ONCE on mount ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const initSymbol    = currentSymbolRef.current
    const initTimeframe = currentTimeframeRef.current

    async function init() {
      try {
        await loadScript(
          `/tv/charting_library/charting_library.standalone.js`,
          'tv-charting-lib'
        )
        await loadScript(
          `/tv/datafeeds/tv-datafeed.js`,
          'tv-datafeed'
        )

        if (cancelled) return

        if (!window.TradingView?.widget || !window.TradingViewDatafeed?.TradingViewDatafeed) {
          console.error('[TV] Libraries not available after loading')
          return
        }

        console.log('[TV] Creating Advanced Charts widget —', initSymbol, initTimeframe)

        const datafeed = new window.TradingViewDatafeed.TradingViewDatafeed()

        const w = new window.TradingView.widget({
          container:    CONTAINER_ID,
          datafeed:     datafeed,
          library_path: `/tv/charting_library/`,
          symbol:       toTVSymbol(initSymbol),
          interval:     TV_INTERVALS[initTimeframe] ?? '60',
          timezone:     'Etc/UTC',
          theme:        'dark',
          locale:       'fr',
          autosize:     true,

          toolbar_bg: '#000000',

          // Native drawing toolbar + header
          hide_side_toolbar: false,
          hide_top_toolbar: false,

          enable_publishing:   false,
          allow_symbol_change: false,
          save_image:          false,

          // ── Server-side chart persistence ──────────────────────────────
          ...(saveLoadAdapter && {
            save_load_adapter: saveLoadAdapter,
            auto_save_delay: 5,
          }),

          enabled_features: [
            'use_localstorage_for_settings',
            'save_chart_properties_to_local_storage',
            'side_toolbar_in_fullscreen_mode',
            'header_in_fullscreen_mode',
            'show_symbol_logos',
            'show_exchange_logos',
            'items_favoriting',
            'study_templates',
            'drawing_templates',
            'disable_resolution_rebuild',
            ...(saveLoadAdapter ? ['load_last_chart'] : []),
          ],

          disabled_features: [
            'header_symbol_search',
            'header_compare',
            'display_market_status',
            'popup_hints',
            'create_volume_indicator_by_default',
          ],

          overrides: {
            'paneProperties.background':               '#000000',
            'paneProperties.backgroundType':           'solid',
            'paneProperties.vertGridProperties.color': 'rgba(0,0,0,0)',
            'paneProperties.horzGridProperties.color': 'rgba(0,0,0,0)',
          },

          loading_screen: { backgroundColor: '#000000' },
        })

        widgetRef.current = w

        w.onChartReady(() => {
          if (cancelled) return
          readyRef.current = true
          console.log('[TV] Advanced Charts ready')

          const curSym = toTVSymbol(currentSymbolRef.current)
          const curTf  = TV_INTERVALS[currentTimeframeRef.current] ?? '60'
          if (curSym !== toTVSymbol(initSymbol)) {
            try { w.chart().setSymbol(curSym) } catch {}
          }
          if (curTf !== (TV_INTERVALS[initTimeframe] ?? '60')) {
            try { w.chart().setResolution(curTf) } catch {}
          }

          // Bridge keyboard events from the iframe to the parent window.
          // The iframe is same-origin (proxied), so we can access its contentDocument.
          // This ensures macros (F, B, S, W, A, Q, Escape) work even when the iframe has focus.
          try {
            const iframe = document.querySelector(`#${CONTAINER_ID} iframe`) as HTMLIFrameElement
            if (iframe?.contentDocument) {
              iframe.contentDocument.addEventListener('keydown', (e: KeyboardEvent) => {
                const tag = (e.target as HTMLElement)?.tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
                window.postMessage({ type: 'tv-keydown', key: e.key }, '*')
              })
            }
          } catch {}

          onReadyRef.current?.(w)
        })
      } catch (err) {
        console.error('[TV] Init error:', err)
      }
    }

    init()

    return () => {
      cancelled = true
      readyRef.current = false
      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch {}
        widgetRef.current = null
      }
    }
  }, [accountId, saveLoadAdapter]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Symbol changes via API ────────────────────────────────────────────────
  useEffect(() => {
    if (readyRef.current && widgetRef.current) {
      try {
        widgetRef.current.chart().setSymbol(toTVSymbol(symbol))
      } catch (err) {
        console.error('[TV] setSymbol error:', err)
      }
    }
  }, [symbol])

  // ── Timeframe changes via API ─────────────────────────────────────────────
  useEffect(() => {
    if (readyRef.current && widgetRef.current) {
      try {
        widgetRef.current.chart().setResolution(TV_INTERVALS[timeframe] ?? '60')
      } catch (err) {
        console.error('[TV] setResolution error:', err)
      }
    }
  }, [timeframe])

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
      }}
    />
  )
}

export default memo(TradingChart)
