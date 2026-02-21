'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Monitor } from 'lucide-react'
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

  // ── Overlay snap-toggle panels ────────────────────────────────────────────
  const [watchlistOpen, setWatchlistOpen] = useState(true)   // starts OPEN (left)
  const [orderOpen, setOrderOpen] = useState(false)          // starts CLOSED (right)

  // ── Restore persisted preferences from localStorage ───────────────────────
  useEffect(() => {
    try {
      const sym = localStorage.getItem('vp-symbol')
      if (sym) setSelectedSymbol(sym)
      const sb = localStorage.getItem('vp-sidebar')
      if (sb !== null) setShowToolsSidebar(sb === '1')
      const wl = localStorage.getItem('vp-watchlist')
      if (wl !== null) setWatchlistOpen(wl === '1')
      const od = localStorage.getItem('vp-order')
      if (od !== null) setOrderOpen(od === '1')
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
    try { localStorage.setItem('vp-watchlist', watchlistOpen ? '1' : '0') } catch {}
  }, [watchlistOpen])
  useEffect(() => {
    try { localStorage.setItem('vp-order', orderOpen ? '1' : '0') } catch {}
  }, [orderOpen])

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
        setOrderOpen(v => !v)
        break
      case 'q':
      case 'Q':
        setWatchlistOpen(v => !v)
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

            {/* ── Chart + side overlays container ────────────────────────── */}
            <div className="flex-1 min-h-0 relative">

              {/* CHART — always 100% underneath */}
              <div className={cn(
                'absolute inset-0',
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

              {/* ─── WATCHLIST overlay (left) ─────────────────────────────── */}
              <div
                className={cn(
                  'absolute top-0 left-0 h-full z-20',
                  'bg-card border-r border-border',
                  'transition-[width] duration-300 ease-in-out overflow-hidden',
                )}
                style={{ width: watchlistOpen ? '20%' : '0px' }}
              >
                <div className="h-full w-full min-w-[200px]">
                  <WatchlistPanel
                    selectedSymbol={selectedSymbol}
                    onSelectSymbol={setSelectedSymbol}
                  />
                </div>
              </div>

              {/* Watchlist toggle button — left edge */}
              <button
                onClick={() => setWatchlistOpen(v => !v)}
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 z-30',
                  'w-5 h-10 flex items-center justify-center',
                  'bg-[#1a1a1a]/80 hover:bg-[#2a2a2a] border border-[#333] rounded-r-md',
                  'text-[#888] hover:text-white',
                  'transition-all duration-300 ease-in-out',
                  'shadow-lg shadow-black/40 cursor-pointer',
                )}
                style={{
                  left: watchlistOpen ? '20%' : '0px',
                  transition: 'left 300ms ease-in-out, background-color 200ms, color 200ms',
                }}
                title={watchlistOpen ? 'Replier la watchlist (Q)' : 'Ouvrir la watchlist (Q)'}
              >
                <ChevronLeft className={cn(
                  'size-3.5 transition-transform duration-300',
                  !watchlistOpen && 'rotate-180',
                )} />
              </button>

              {/* ─── ORDER FORM overlay (right) ──────────────────────────── */}
              <div
                className={cn(
                  'absolute top-0 right-0 h-full z-20',
                  'bg-card border-l border-border',
                  'transition-[width] duration-300 ease-in-out overflow-hidden',
                )}
                style={{ width: orderOpen ? '280px' : '0px' }}
              >
                <div className="h-full w-[280px] overflow-y-auto custom-scrollbar">
                  <OrderFormPanel
                    symbol={selectedSymbol}
                    accountId={accountId}
                  />
                </div>
              </div>

              {/* Order toggle button — right edge */}
              <button
                onClick={() => setOrderOpen(v => !v)}
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 z-30',
                  'w-5 h-10 flex items-center justify-center',
                  'bg-[#1a1a1a]/80 hover:bg-[#2a2a2a] border border-[#333] rounded-l-md',
                  'text-[#888] hover:text-white',
                  'transition-all duration-300 ease-in-out',
                  'shadow-lg shadow-black/40 cursor-pointer',
                )}
                style={{
                  right: orderOpen ? '280px' : '0px',
                  transition: 'right 300ms ease-in-out, background-color 200ms, color 200ms',
                }}
                title={orderOpen ? 'Replier le trading (A)' : 'Ouvrir le trading (A)'}
              >
                <ChevronRight className={cn(
                  'size-3.5 transition-transform duration-300',
                  !orderOpen && 'rotate-180',
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
