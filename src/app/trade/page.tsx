'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Monitor } from 'lucide-react'
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

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TradePage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USD')
  const [chartFullscreen, setChartFullscreen] = useState(false)
  const [showToolsSidebar, setShowToolsSidebar] = useState(true)

  // ── Snap-toggle right panel ──────────────────────────────────────────────
  const [rightPanelOpen, setRightPanelOpen] = useState(true)  // starts OPEN
  const [orderExpanded, setOrderExpanded] = useState(false)   // order section starts COLLAPSED

  // ── Restore persisted preferences from localStorage ───────────────────────
  useEffect(() => {
    try {
      const sym = localStorage.getItem('vp-symbol')
      if (sym) setSelectedSymbol(sym)
      const sb = localStorage.getItem('vp-sidebar')
      if (sb !== null) setShowToolsSidebar(sb === '1')
      const rp = localStorage.getItem('vp-right-panel')
      if (rp !== null) setRightPanelOpen(rp === '1')
      const oe = localStorage.getItem('vp-order-expanded')
      if (oe !== null) setOrderExpanded(oe === '1')
    } catch { /* SSR / storage unavailable */ }
  }, [])

  // ── Persist preferences to localStorage ───────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('vp-symbol', selectedSymbol) } catch {}
  }, [selectedSymbol])
  useEffect(() => {
    try { localStorage.setItem('vp-sidebar', showToolsSidebar ? '1' : '0') } catch {}
  }, [showToolsSidebar])
  useEffect(() => {
    try { localStorage.setItem('vp-right-panel', rightPanelOpen ? '1' : '0') } catch {}
  }, [rightPanelOpen])
  useEffect(() => {
    try { localStorage.setItem('vp-order-expanded', orderExpanded ? '1' : '0') } catch {}
  }, [orderExpanded])

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
      case 'w':
      case 'W':
        setShowToolsSidebar(v => !v)
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
        setRightPanelOpen(v => !v)
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

            {/* ── Chart + right panel (flex — chart resizes with panel) ──── */}
            <div className="flex-1 min-h-0 flex">

              {/* CHART — flex-1, resizes when right panel opens/closes */}
              <div className={cn(
                'flex-1 min-w-0 relative transition-all duration-300 ease-in-out',
                chartFullscreen && 'fixed inset-0 z-50',
              )}>
                <ChartPanel
                  symbol={selectedSymbol}
                  accountId={accountId}
                  onFullscreen={() => setChartFullscreen(v => !v)}
                  isFullscreen={chartFullscreen}
                  showToolsSidebar={showToolsSidebar}
                  onToggleToolsSidebar={() => setShowToolsSidebar(v => !v)}
                />
              </div>

              {/* ═══ RIGHT PANEL — toggle arrow + Watchlist + Order form ═══ */}
              <div className="relative shrink-0 flex transition-[width] duration-300 ease-in-out"
                style={{ width: rightPanelOpen ? '20%' : '0px' }}
              >
                {/* Toggle arrow — always visible on the left edge */}
                <button
                  onClick={() => setRightPanelOpen(v => !v)}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 -left-5 z-30',
                    'w-5 h-10 flex items-center justify-center',
                    'bg-card/90 hover:bg-card border border-border/60 rounded-l-md',
                    'text-muted-foreground hover:text-foreground',
                    'transition-colors duration-200',
                    'shadow-md',
                  )}
                  title={rightPanelOpen ? 'Replier le panel (A)' : 'Ouvrir le panel (A)'}
                >
                  <ChevronRight className={cn(
                    'size-3.5 transition-transform duration-300',
                    !rightPanelOpen && 'rotate-180',
                  )} />
                </button>

                {/* Panel content */}
                <div className={cn(
                  'flex flex-col h-full w-full min-w-[220px] overflow-hidden',
                  'bg-card border-l border-border',
                )}>
                  {/* Watchlist — fills remaining space */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <WatchlistPanel
                      selectedSymbol={selectedSymbol}
                      onSelectSymbol={setSelectedSymbol}
                    />
                  </div>

                  {/* Order section — collapsible at bottom */}
                  <div className="shrink-0 border-t border-border">
                    <button
                      onClick={() => setOrderExpanded(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-[5px] text-[10px] font-semibold text-muted-foreground hover:text-foreground/80 transition-colors uppercase tracking-wider bg-light-dark/40"
                    >
                      <span>Order</span>
                      <ChevronDown className={cn('size-3 transition-transform duration-200', orderExpanded && 'rotate-180')} />
                    </button>
                    {orderExpanded && (
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        <OrderFormPanel
                          symbol={selectedSymbol}
                          accountId={accountId}
                        />
                      </div>
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
    </div>
  )
}
