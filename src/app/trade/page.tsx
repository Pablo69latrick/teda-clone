'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { WatchlistPanel } from '@/components/trading/watchlist-panel'
import { OrderFormPanel } from '@/components/trading/order-form-panel'
import { ChartPanel } from '@/components/trading/chart-panel'
import { BottomPanel } from '@/components/trading/bottom-panel'
import { ChallengeStatusBar } from '@/components/trading/challenge-status-bar'
import { EquityCurvePanel } from '@/components/trading/equity-curve-panel'
import { useAccounts } from '@/lib/hooks'
import { usePriceStream } from '@/lib/use-price-stream'

// Fallback used only in mock / dev mode (no Supabase configured)
const MOCK_ACCOUNT_ID = 'f2538dee-cfb0-422a-bf7b-c6b247145b3a'

export default function TradePage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USD')
  const [chartFullscreen, setChartFullscreen] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  // Use the first active account from the session.
  // Falls back to the mock ID so the app still works without Supabase.
  const { data: accounts } = useAccounts()
  const account     = accounts?.[0]
  const accountId   = account?.id ?? MOCK_ACCOUNT_ID
  const startingBal = account?.injected_funds ?? undefined

  // Connect SSE price stream — pushes live prices into SWR cache every 500ms
  usePriceStream(accountId)

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      switch (e.key) {
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
        case 'Escape':
          setChartFullscreen(false)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="h-full w-full overflow-hidden flex flex-col max-sm:hidden">
      {/* ── Fullscreen chart overlay ───────────────────────────────────────── */}
      {chartFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#0d0f13]">
          <ChartPanel
            symbol={selectedSymbol}
            accountId={accountId}
            onFullscreen={() => setChartFullscreen(false)}
            isFullscreen
          />
        </div>
      )}

      {/* ── Challenge status bar (CRM wire) ──────────────────────────────── */}
      <ChallengeStatusBar accountId={accountId} />

      {/* ── Main trading layout ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden p-2 pt-1">
        {/* Note: react-resizable-panels v4 treats number defaultSize as px.
            Pass strings like "72%" for percentage-based sizing. */}
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full rounded-lg overflow-hidden">
          {/* Left: Chart + Bottom panel */}
          <ResizablePanel defaultSize="72%" minSize="45%">
            <ResizablePanelGroup orientation="vertical" className="h-full">
              {/* Chart (68%) */}
              <ResizablePanel defaultSize="68%" minSize="30%">
                <ChartPanel
                  symbol={selectedSymbol}
                  accountId={accountId}
                  onFullscreen={() => setChartFullscreen(true)}
                  isFullscreen={false}
                />
              </ResizablePanel>

              <ResizableHandle />

              {/* Bottom: Positions/Orders/History (32%) */}
              <ResizablePanel defaultSize="32%" minSize="18%">
                <BottomPanel accountId={accountId} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right: Watchlist + Equity mini + Order form — collapsible */}
          <ResizablePanel
            defaultSize="28%"
            minSize="4%"
            maxSize="45%"
            collapsible
            collapsedSize="3%"
            onResize={(size) => {
              // size.asPercentage is the panel width as a percentage of the group
              setRightCollapsed(size.asPercentage <= 4)
            }}
          >
            {rightCollapsed ? (
              /* Collapsed state: show only a re-open button */
              <div className="h-full flex items-center justify-center bg-card border-l border-border/50">
                <button
                  onClick={() => {
                    // Expanding the panel must be done by the user dragging, but we can hint
                    setRightCollapsed(false)
                  }}
                  className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                  title="Expand panel"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden bg-card border-l border-border/50">
                {/* Watchlist (scrollable, takes remaining space) */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <WatchlistPanel
                    selectedSymbol={selectedSymbol}
                    onSelectSymbol={setSelectedSymbol}
                  />
                </div>

                {/* Equity mini-chart (fixed height, CRM wire) */}
                <div className="h-[88px] shrink-0 border-t border-border/50">
                  <EquityCurvePanel
                    accountId={accountId}
                    startingBalance={startingBal}
                  />
                </div>

                {/* Order form (fixed at bottom) */}
                <div className="shrink-0 border-t border-border/50">
                  <OrderFormPanel
                    symbol={selectedSymbol}
                    accountId={accountId}
                  />
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
