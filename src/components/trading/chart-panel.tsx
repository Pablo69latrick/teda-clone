'use client'

/**
 * Chart panel — embeds TradingView's full charting widget via tv.js.
 *
 * Uses the `TradingView.widget` constructor (loaded from tv.js CDN)
 * which is more reliable in Next.js than the embed-widget-advanced-chart.js
 * script approach (which depends on reading its own innerHTML for config).
 *
 * This gives us the EXACT TradingView experience:
 *   • Left sidebar with all drawing tools
 *   • Top toolbar with timeframes, indicators, chart types
 *   • Real-time candlestick data from Binance / FX
 *   • Crosshair, OHLC, volume, everything
 */

import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

// ─── Symbol mapping: VerticalProp → TradingView ─────────────────────────────

const TV_SYMBOLS: Record<string, string> = {
  'BTC-USD':   'BINANCE:BTCUSDT',
  'ETH-USD':   'BINANCE:ETHUSDT',
  'SOL-USD':   'BINANCE:SOLUSDT',
  'XRP-USD':   'BINANCE:XRPUSDT',
  'ADA-USD':   'BINANCE:ADAUSDT',
  'DOGE-USD':  'BINANCE:DOGEUSDT',
  'LINK-USD':  'BINANCE:LINKUSDT',
  'ARB-USD':   'BINANCE:ARBUSDT',
  '1INCH-USD': 'BINANCE:1INCHUSDT',
  'AAVE-USD':  'BINANCE:AAVEUSDT',
  'ASTER-USD': 'BINANCE:BTCUSDT',
  'EUR-USD':   'FX:EURUSD',
  'GBP-USD':   'FX:GBPUSD',
  'AUD-USD':   'FX:AUDUSD',
}

// Extend Window to avoid TS errors for TradingView global
declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown
    }
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChartPanelProps {
  symbol: string
  accountId?: string
  onFullscreen?: () => void
  isFullscreen?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({ symbol, onFullscreen, isFullscreen }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const widgetIdRef = useRef(`tv_${Date.now()}_${Math.random().toString(36).slice(2)}`)

  const tvSymbol = TV_SYMBOLS[symbol] ?? 'BINANCE:BTCUSDT'

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    setReady(false)

    // Fresh unique ID for this widget instance
    const widgetId = `tv_${Date.now()}_${Math.random().toString(36).slice(2)}`
    widgetIdRef.current = widgetId

    // Clear previous content
    el.innerHTML = ''

    // Create the container div that TradingView.widget will mount into
    const widgetDiv = document.createElement('div')
    widgetDiv.id = widgetId
    widgetDiv.style.cssText = 'width:100%;height:100%'
    el.appendChild(widgetDiv)

    let fallbackTimer: ReturnType<typeof setTimeout>
    let observer: MutationObserver | null = null

    function createWidget() {
      if (!window.TradingView) {
        console.error('[ChartPanel] TradingView not available on window')
        setReady(true)
        return
      }

      try {
        new window.TradingView.widget({
          container_id: widgetId,
          autosize: true,
          symbol: tvSymbol,
          interval: '60',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'fr',
          toolbar_bg: '#131722',
          enable_publishing: false,
          allow_symbol_change: false,
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          withdateranges: true,
          save_image: true,
          details: false,
          hotlist: false,
          calendar: false,
          show_popup_button: false,
          popup_width: '1000',
          popup_height: '650',
        })
      } catch (err) {
        console.error('[ChartPanel] Failed to create TradingView widget:', err)
        setReady(true)
        return
      }

      // Detect when the iframe loads
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLIFrameElement) {
              node.addEventListener('load', () => setReady(true))
              observer?.disconnect()
              observer = null
              return
            }
          }
        }
      })
      observer.observe(widgetDiv, { childList: true, subtree: true })

      // Fallback: mark ready after 5s even if we couldn't detect iframe
      fallbackTimer = setTimeout(() => {
        setReady(true)
        observer?.disconnect()
        observer = null
      }, 5000)
    }

    // Load tv.js from CDN if not already loaded
    if (window.TradingView) {
      createWidget()
    } else {
      // Check if script is already being loaded by another instance
      const existingScript = document.querySelector('script[src="https://s.tradingview.com/tv.js"]')
      if (existingScript) {
        // Script exists but TradingView not ready yet — wait for it
        const waitInterval = setInterval(() => {
          if (window.TradingView) {
            clearInterval(waitInterval)
            createWidget()
          }
        }, 100)
        fallbackTimer = setTimeout(() => {
          clearInterval(waitInterval)
          setReady(true)
        }, 10000)
      } else {
        const script = document.createElement('script')
        script.src = 'https://s.tradingview.com/tv.js'
        script.async = true
        script.onload = () => createWidget()
        script.onerror = () => {
          console.error('[ChartPanel] Failed to load tv.js')
          setReady(true)
        }
        document.head.appendChild(script)
      }
    }

    return () => {
      clearTimeout(fallbackTimer)
      observer?.disconnect()
      el.innerHTML = ''
    }
  }, [tvSymbol])

  return (
    <div className="relative flex flex-col h-full bg-[#131722]">
      {/* TradingView widget mounts here */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full" />

      {/* Loading spinner */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#131722] z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2962ff]/30 border-t-[#2962ff] rounded-full animate-spin" />
            <span className="text-xs text-[#787b86]">Loading TradingView…</span>
          </div>
        </div>
      )}

      {/* Fullscreen toggle overlay */}
      {onFullscreen && (
        <button
          onClick={onFullscreen}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-md bg-[#131722]/80 hover:bg-[#1e222d] border border-white/[0.06] text-[#787b86] hover:text-[#d1d4dc] transition-colors backdrop-blur-sm"
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      )}
    </div>
  )
}
