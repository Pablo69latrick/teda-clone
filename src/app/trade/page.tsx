'use client'

import { useState, useEffect, useCallback } from 'react'
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

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TradePage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USD')
  const [chartFullscreen, setChartFullscreen] = useState(false)
  const [timeframe, setTimeframe] = useState('1h')

  // ── Right panel state ───────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(true)                         // starts OPEN
  const [activeTab, setActiveTab] = useState<'watchlist' | 'orders'>('watchlist')

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

  // Use the first active account from the session.
  // Falls back to the mock ID so the app still works without Supabase.
  const { data: accounts } = useAccounts()
  const account     = accounts?.[0]
  const accountId   = account?.id ?? MOCK_ACCOUNT_ID

  // Connect SSE price stream — pushes live prices into SWR cache every 500ms
  usePriceStream(accountId)

  // ── Macro key handler (shared between keydown + postMessage) ─────────────
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
      case 'a':
      case 'A':
        setPanelOpen(v => !v)
        break
      case 'q':
      case 'Q':
        // Switch tab (and open panel if closed)
        setActiveTab(v => v === 'watchlist' ? 'orders' : 'watchlist')
        setPanelOpen(true)
        break
      case 'Escape':
        setChartFullscreen(false)
        break
    }
  }, [])

  // ── Keyboard shortcuts (window-level) ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      handleMacroKey(e.key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleMacroKey])

  // ── PostMessage from TradingView iframes ─────────────────────────────────
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
        {/* ── Challenge status bar (CRM wire) ──────────────────────────────── */}
        <ChallengeStatusBar accountId={accountId} />

        {/* ── Main trading layout ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden p-2 pt-1 pb-4">
          <div className="h-full w-full rounded-lg overflow-hidden flex flex-col">

            {/* ── Chart + right overlay container ──────────────────────────── */}
            <div className="flex-1 min-h-0 relative">

              {/* CHART — always 100% underneath */}
              <div className={cn(
                'absolute inset-0',
                chartFullscreen && 'fixed inset-0 z-50',
              )}>
                <ChartPanel
                  symbol={selectedSymbol}
                  timeframe={timeframe}
                  accountId={accountId}
                  onFullscreen={() => setChartFullscreen(v => !v)}
                  isFullscreen={chartFullscreen}
                />
              </div>

              {/* ─── RIGHT PANEL overlay ────────────────────────────────────── */}
              <div
                className={cn(
                  'absolute top-0 right-0 h-full z-20',
                  'bg-card border-l border-border',
                  'transition-[width] duration-300 ease-in-out overflow-hidden',
                )}
                style={{ width: panelOpen ? '280px' : '0px' }}
              >
                <div className="h-full w-[280px] flex flex-col">

                  {/* ── Timeframe selector ─────────────────────────────────── */}
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

                  {/* ── Tab toggle: Watchlist / Orders ─────────────────────── */}
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

                  {/* ── Tab content ────────────────────────────────────────── */}
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

              {/* Panel toggle button — right edge */}
              <button
                onClick={() => setPanelOpen(v => !v)}
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 z-30',
                  'w-5 h-10 flex items-center justify-center',
                  'bg-[#1a1a1a]/80 hover:bg-[#2a2a2a] border border-[#333] rounded-l-md',
                  'text-[#888] hover:text-white',
                  'transition-all duration-300 ease-in-out',
                  'shadow-lg shadow-black/40 cursor-pointer',
                )}
                style={{
                  right: panelOpen ? '280px' : '0px',
                  transition: 'right 300ms ease-in-out, background-color 200ms, color 200ms',
                }}
                title={panelOpen ? 'Replier le panneau (A)' : 'Ouvrir le panneau (A)'}
              >
                <ChevronRight className={cn(
                  'size-3.5 transition-transform duration-300',
                  !panelOpen && 'rotate-180',
                )} />
              </button>

            </div>

            {/* ── Bottom panel (snap toggle, unchanged) ────────────────────── */}
            <BottomPanel accountId={accountId} />
          </div>
        </div>
      </div>
    </div>
  )
}
