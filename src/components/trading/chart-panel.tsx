'use client'

/**
 * Chart panel — embeds TradingView via a static HTML page in /public.
 *
 * PERFORMANCE ARCHITECTURE:
 *
 *   1. DUAL-IFRAME (sidebar toggle — instant, zero reload):
 *      Two iframes loaded ONCE at mount: one with sidebar, one without.
 *      Pressing W flips z-index. No DOM changes, no reloads.
 *
 *   2. POSTMESSAGE SYMBOL CHANGE (zero iframe reload):
 *      Symbol changes are sent via postMessage to tv-chart.html.
 *      tv-chart.html creates a new TradingView widget ON TOP of the old one,
 *      swaps when ready. Old chart stays visible = zero flash.
 *      Iframes are NEVER remounted or navigated.
 *
 *   3. FULLSCREEN (instant CSS toggle):
 *      Same component, same iframes. Parent wraps in `fixed inset-0 z-50`.
 *
 *   4. KEYBOARD BRIDGE (postMessage from iframes):
 *      Macro keys (F/W/A/B/S/Esc) are forwarded from iframe to parent
 *      via postMessage, so shortcuts work even when chart has focus.
 */

import { useState, useEffect, useRef } from 'react'
import { Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  showToolsSidebar = true,
  onToggleToolsSidebar,
}: ChartPanelProps) {
  const tvSymbol = TV_SYMBOLS[symbol] ?? 'BINANCE:BTCUSDT'

  // ── Refs for the two iframes (never remounted) ────────────────────────────
  const iframeWithRef    = useRef<HTMLIFrameElement>(null)
  const iframeWithoutRef = useRef<HTMLIFrameElement>(null)

  // ── Initial symbol captured once — iframes load this URL and never change ─
  const [initialSymbol] = useState(tvSymbol)
  const srcWith    = `/tv-chart.html?symbol=${encodeURIComponent(initialSymbol)}&interval=60`
  const srcWithout = `/tv-chart.html?symbol=${encodeURIComponent(initialSymbol)}&interval=60&hideTools=1`

  // ── Loading state — only for initial load ─────────────────────────────────
  const [loadedWith, setLoadedWith]       = useState(false)
  const [loadedWithout, setLoadedWithout] = useState(false)
  const activeLoaded = showToolsSidebar ? loadedWith : loadedWithout

  // ── Forward symbol changes via postMessage (zero reload) ──────────────────
  const prevSymbolRef = useRef(tvSymbol)
  useEffect(() => {
    if (tvSymbol === prevSymbolRef.current) return
    prevSymbolRef.current = tvSymbol
    const msg = { type: 'set-symbol', symbol: tvSymbol }
    iframeWithRef.current?.contentWindow?.postMessage(msg, '*')
    iframeWithoutRef.current?.contentWindow?.postMessage(msg, '*')
  }, [tvSymbol])

  return (
    <div className="relative flex flex-col h-full bg-card overflow-hidden">
      {/*
       * Dual-iframe container — both stacked, active one on top.
       * Iframes are loaded ONCE and NEVER remounted.
       */}
      <div className="flex-1 min-h-0 relative">
        {/* Iframe WITH sidebar (drawing tools visible) */}
        <iframe
          ref={iframeWithRef}
          src={srcWith}
          className="absolute inset-0 w-full h-full border-0"
          style={{ zIndex: showToolsSidebar ? 2 : 1 }}
          allowFullScreen
          onLoad={() => setLoadedWith(true)}
        />

        {/* Iframe WITHOUT sidebar (drawing tools hidden) */}
        <iframe
          ref={iframeWithoutRef}
          src={srcWithout}
          className="absolute inset-0 w-full h-full border-0"
          style={{ zIndex: showToolsSidebar ? 1 : 2 }}
          allowFullScreen
          onLoad={() => setLoadedWithout(true)}
        />
      </div>

      {/* Loading spinner — only until the ACTIVE iframe has loaded initially */}
      {!activeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Loading TradingView…</span>
          </div>
        </div>
      )}

      {/* ── Overlay buttons — hover-reveal, TradingView-style ────────────── */}

      {/* Fullscreen toggle */}
      {onFullscreen && (
        <div className="absolute top-[38px] right-0 z-30 w-12 h-12 flex items-start justify-end pr-2 pt-1 group/fs">
          <button
            onClick={(e) => { e.stopPropagation(); onFullscreen() }}
            className={cn(
              'p-1 rounded transition-all duration-200',
              isFullscreen
                ? 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]/80'
                : 'text-[#787b86]/0 group-hover/fs:text-[#787b86] hover:!text-white hover:bg-[#2a2e39]/80',
            )}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      )}

      {/* Tools sidebar toggle */}
      {onToggleToolsSidebar && (
        <div
          className={cn(
            'absolute bottom-0 z-30 flex items-end pb-3 group/sidebar',
            showToolsSidebar ? 'left-[40px] w-16 h-16' : 'left-0 w-8 h-24',
          )}
        >
          {showToolsSidebar ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleToolsSidebar() }}
              className="ml-3 p-1 rounded-md text-[#787b86]/0 group-hover/sidebar:text-[#787b86] hover:!text-white hover:bg-[#2a2e39] transition-all duration-200"
              title="Hide tools (W)"
            >
              <PanelLeftClose className="size-3.5" />
            </button>
          ) : (
            <div className="flex items-center h-full pl-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleToolsSidebar() }}
                className="w-[3px] group-hover/sidebar:w-auto group-hover/sidebar:px-1.5 group-hover/sidebar:py-1 h-10 group-hover/sidebar:h-auto rounded-full group-hover/sidebar:rounded-md bg-[#787b86]/20 group-hover/sidebar:bg-[#2a2e39] hover:!bg-[#363a45] transition-all duration-200 overflow-hidden flex items-center justify-center"
                title="Show tools (W)"
              >
                <PanelLeftOpen className="size-3.5 text-transparent group-hover/sidebar:text-[#787b86] hover:!text-white transition-colors duration-200" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
