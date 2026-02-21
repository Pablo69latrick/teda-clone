'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronRight, Monitor, BarChart3, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WatchlistPanel } from '@/components/trading/watchlist-panel'
import { OrderFormPanel } from '@/components/trading/order-form-panel'
import { ChartPanel } from '@/components/trading/chart-panel'
import { BottomPanel } from '@/components/trading/bottom-panel'
import { ChallengeStatusBar } from '@/components/trading/challenge-status-bar'
import { useAccounts } from '@/lib/hooks'
import { usePriceStream } from '@/lib/use-price-stream'

// Fallback used only in mock / dev mode (no Supabase configured)
const MOCK_ACCOUNT_ID = 'f2538dee-cfb0-422a-bf7b-c6b247145b3a'


const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
type Timeframe = typeof TIMEFRAMES[number]

/** Resolve a keyboard buffer like "1", "5", "15", "1h", "4h", "1d" to a valid timeframe */
function resolveTimeframe(buf: string): Timeframe | null {
  const b = buf.toLowerCase().trim()
  if ((TIMEFRAMES as readonly string[]).includes(b)) return b as Timeframe
  if (/^\d+$/.test(b)) {
    const candidate = `${b}m`
    if ((TIMEFRAMES as readonly string[]).includes(candidate)) return candidate as Timeframe
  }
  return null
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TradePage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USD')
  const [chartFullscreen, setChartFullscreen] = useState(false)
  const [timeframe, setTimeframe] = useState<string>('1h')

  // ── TradingView tools sidebar (left-side drawing tools) ───────────────────
  const [showToolsSidebar, setShowToolsSidebar] = useState(true)

  // ── Right panel state ─────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'watchlist' | 'orders'>('watchlist')

  // ── Timeframe keyboard buffer ─────────────────────────────────────────────
  const [tfBuffer, setTfBuffer] = useState('')
  const tfTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Restore persisted preferences from localStorage ───────────────────────
  useEffect(() => {
    try {
      const sym = localStorage.getItem('vp-symbol')
      if (sym) setSelectedSymbol(sym)
      const po = localStorage.getItem('vp-panel')
      if (po !== null) setPanelOpen(po === '1')
      const tab = localStorage.getItem('vp-tab')
      if (tab === 'watchlist' || tab === 'orders') setActiveTab(tab)
      const tf = localStorage.getItem('vp-timeframe')
      if (tf) setTimeframe(tf)
      const ts = localStorage.getItem('vp-tools-sidebar')
      if (ts !== null) setShowToolsSidebar(ts === '1')
    } catch { /* SSR / storage unavailable */ }
  }, [])

  // ── Persist preferences to localStorage ───────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('vp-symbol', selectedSymbol) } catch {}
  }, [selectedSymbol])
  useEffect(() => {
    try { localStorage.setItem('vp-panel', panelOpen ? '1' : '0') } catch {}
  }, [panelOpen])
  useEffect(() => {
    try { localStorage.setItem('vp-tab', activeTab) } catch {}
  }, [activeTab])
  useEffect(() => {
    try { localStorage.setItem('vp-timeframe', timeframe) } catch {}
  }, [timeframe])
  useEffect(() => {
    try { localStorage.setItem('vp-tools-sidebar', showToolsSidebar ? '1' : '0') } catch {}
  }, [showToolsSidebar])

  // Use the first active account from the session.
  const { data: accounts } = useAccounts()
  const account     = accounts?.[0]
  const accountId   = account?.id ?? MOCK_ACCOUNT_ID

  // Connect SSE price stream
  usePriceStream(accountId)

  // ── Toggle TradingView sidebar (CSS margin-shift — no API needed) ────────
  const toggleTVSidebar = useCallback(() => {
    setShowToolsSidebar(v => !v)
  }, [])

  // ── Macro key handler (shared between keydown + postMessage) ──────────────
  const handleMacroKey = useCallback((key: string) => {
    switch (key) {
      case 'f':
      case 'F':
        setChartFullscreen(v => !v)
        break
      case 'b':
      case 'B':
        document.querySelector<HTMLButtonElement>('[data-action="long"]')?.click()
        break
      case 's':
      case 'S':
        document.querySelector<HTMLButtonElement>('[data-action="short"]')?.click()
        break
      case 'w':
      case 'W':
        toggleTVSidebar()
        break
      case 'a':
      case 'A':
        setPanelOpen(v => !v)
        break
      case 'q':
      case 'Q':
        setActiveTab(v => v === 'watchlist' ? 'orders' : 'watchlist')
        setPanelOpen(true)
        break
      case 'Escape':
        setChartFullscreen(false)
        setTfBuffer('')
        break
    }
  }, [toggleTVSidebar])

  // ── Keyboard shortcuts (window-level) ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // ── Timeframe buffer input ────────────────────────────────────────
      const isDigit   = /^[0-9]$/.test(e.key)
      const isTfChar  = /^[hdmHDM]$/.test(e.key)

      if (isDigit || isTfChar) {
        e.preventDefault()
        setTfBuffer(prev => {
          const next = prev + e.key.toLowerCase()
          if (tfTimeout.current) clearTimeout(tfTimeout.current)
          tfTimeout.current = setTimeout(() => setTfBuffer(''), 2000)
          return next
        })
        return
      }

      if (e.key === 'Enter' && tfBuffer) {
        e.preventDefault()
        const resolved = resolveTimeframe(tfBuffer)
        if (resolved) setTimeframe(resolved)
        setTfBuffer('')
        if (tfTimeout.current) clearTimeout(tfTimeout.current)
        return
      }

      // ── Regular macro keys (only when buffer is empty) ────────────────
      if (!tfBuffer) {
        handleMacroKey(e.key)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleMacroKey, tfBuffer])

  // ── PostMessage from TradingView iframes ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'tv-keydown' && typeof e.data.key === 'string') {
        handleMacroKey(e.data.key)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [handleMacroKey])

  return (
    <div className="trading-theme h-full w-full">
      {/* ── Mobile fallback ────────────────────────────────────────────────── */}
      <div className="sm:hidden h-full w-full flex flex-col items-center justify-center gap-4 p-8 bg-background text-center">
        <Monitor className="size-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">Desktop Required</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          The trading platform requires a screen width of at least 640px for the best experience.
          Please use a desktop or tablet in landscape mode.
        </p>
      </div>

      {/* ── Desktop layout ─────────────────────────────────────────────────── */}
      <div className="h-full w-full overflow-hidden flex flex-col max-sm:hidden bg-background">
        {/* ── Challenge status bar ────────────────────────────────────────── */}
        <ChallengeStatusBar accountId={accountId} />

        {/* ── Main trading layout ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden p-2 pt-1 pb-4">
          <div className="h-full w-full rounded-lg overflow-hidden flex flex-col">

            {/* ── Chart + right panel — FLEX (chart resizes with panel) ──── */}
            <div className="flex-1 min-h-0 flex">

              {/* CHART — fills remaining space, resizes when panel toggles */}
              <div className={cn(
                'flex-1 min-w-0 relative',
                chartFullscreen && 'fixed inset-0 z-50',
              )}>
                <div className="absolute inset-0">
                  <ChartPanel
                    symbol={selectedSymbol}
                    timeframe={timeframe}
                    showToolsSidebar={showToolsSidebar}
                    onToggleToolsSidebar={toggleTVSidebar}
                    onFullscreen={() => setChartFullscreen(v => !v)}
                    isFullscreen={chartFullscreen}
                  />
                </div>

                {/* Panel toggle (A) — right edge of chart */}
                <button
                  onClick={() => setPanelOpen(v => !v)}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 right-0 z-30',
                    'w-5 h-10 flex items-center justify-center',
                    'bg-[#1a1a1a]/80 hover:bg-[#2a2a2a] border border-[#333] rounded-l-md',
                    'text-[#888] hover:text-white',
                    'transition-all duration-300 ease-in-out',
                    'shadow-lg shadow-black/40 cursor-pointer',
                  )}
                  title={panelOpen ? 'Replier le panneau (A)' : 'Ouvrir le panneau (A)'}
                >
                  <ChevronRight className={cn(
                    'size-3.5 transition-transform duration-300',
                    !panelOpen && 'rotate-180',
                  )} />
                </button>
              </div>

              {/* ─── RIGHT PANEL — flex item, chart resizes around it ────── */}
              <div
                className={cn(
                  'shrink-0 h-full',
                  'bg-card border-l border-border',
                  'transition-[width] duration-300 ease-in-out overflow-hidden',
                )}
                style={{ width: panelOpen ? '280px' : '0px' }}
              >
                <div className="h-full w-[280px] flex flex-col">

                  {/* ── Timeframe selector ───────────────────────────────── */}
                  <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border/50">
                    <div className="flex gap-1">
                      {TIMEFRAMES.map(tf => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={cn(
                            'flex-1 py-1 text-[10px] font-medium rounded transition-colors',
                            timeframe === tf
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                          )}
                        >
                          {tf === '1h' ? '1H' : tf === '4h' ? '4H' : tf === '1d' ? '1D' : tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Tab toggle: Watchlist / Orders ───────────────────── */}
                  <div className="shrink-0 flex border-b border-border/50">
                    <button
                      onClick={() => setActiveTab('watchlist')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors relative',
                        activeTab === 'watchlist'
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground/70',
                      )}
                    >
                      <BarChart3 className="size-3" />
                      Watchlist
                      {activeTab === 'watchlist' && (
                        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors relative',
                        activeTab === 'orders'
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground/70',
                      )}
                    >
                      <ShoppingCart className="size-3" />
                      Orders
                      {activeTab === 'orders' && (
                        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* ── Tab content ──────────────────────────────────────── */}
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {activeTab === 'watchlist' ? (
                      <WatchlistPanel
                        selectedSymbol={selectedSymbol}
                        onSelectSymbol={setSelectedSymbol}
                      />
                    ) : (
                      <OrderFormPanel
                        symbol={selectedSymbol}
                        accountId={accountId}
                      />
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* ── Bottom panel (snap toggle, unchanged) ────────────────────── */}
            <BottomPanel accountId={accountId} />
          </div>
        </div>
      </div>

      {/* ── Timeframe keyboard HUD ─────────────────────────────────────────── */}
      {tfBuffer && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-in fade-in duration-150">
          <div className="bg-[#1a1a1a]/95 border border-[#333] rounded-lg px-4 py-2 shadow-2xl shadow-black/60 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Timeframe</span>
            <span className="text-sm font-mono font-bold text-white tracking-wide">
              {tfBuffer}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {resolveTimeframe(tfBuffer) ? '↵' : '...'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
