'use client'

/**
 * Chart panel — embeds the official TradingView Advanced Chart Widget.
 *
 * This gives us the EXACT TradingView experience:
 *   • Left sidebar with all drawing tools (trend lines, fib, shapes, etc.)
 *   • Top toolbar with timeframes, indicators, chart types
 *   • Real-time candlestick data from Binance / FX
 *   • Crosshair, OHLC, volume, everything
 *
 * We map our internal symbols (BTC-USD) to TradingView format (BINANCE:BTCUSDT).
 * The widget is recreated whenever the selected symbol changes.
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
  'ASTER-USD': 'BINANCE:BTCUSDT', // not on TradingView → fallback to BTC
  'EUR-USD':   'FX:EURUSD',
  'GBP-USD':   'FX:GBPUSD',
  'AUD-USD':   'FX:AUDUSD',
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

  const tvSymbol = TV_SYMBOLS[symbol] ?? 'BINANCE:BTCUSDT'

  // ── Embed TradingView Advanced Chart Widget ──────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    setReady(false)

    // Clear any previous widget
    el.innerHTML = ''

    // TradingView's required DOM structure:
    //   <div class="tradingview-widget-container">
    //     <div class="tradingview-widget-container__widget"></div>
    //     <script src="...embed-widget-advanced-chart.js">{ config JSON }</script>
    //   </div>

    const wrap = document.createElement('div')
    wrap.className = 'tradingview-widget-container'
    wrap.style.cssText = 'height:100%;width:100%'

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.cssText = 'height:100%;width:100%'
    wrap.appendChild(inner)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'fr',
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      withdateranges: true,
      support_host: 'https://www.tradingview.com',
    })
    wrap.appendChild(script)
    el.appendChild(wrap)

    // Detect when the iframe actually loads
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLIFrameElement) {
            node.addEventListener('load', () => setReady(true))
            observer.disconnect()
            return
          }
        }
      }
    })
    observer.observe(el, { childList: true, subtree: true })

    // Fallback — mark ready after 5s even if we couldn't detect iframe load
    const fallback = setTimeout(() => {
      setReady(true)
      observer.disconnect()
    }, 5000)

    return () => {
      clearTimeout(fallback)
      observer.disconnect()
      el.innerHTML = ''
    }
  }, [tvSymbol])

  return (
    <div className="relative flex flex-col h-full bg-[#131722]">
      {/* TradingView widget fills this container */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full" />

      {/* Loading overlay while widget loads */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#131722] z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2962ff]/30 border-t-[#2962ff] rounded-full animate-spin" />
            <span className="text-xs text-[#787b86]">Loading TradingView…</span>
          </div>
        </div>
      )}

      {/* Fullscreen toggle (floats above TradingView iframe) */}
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
