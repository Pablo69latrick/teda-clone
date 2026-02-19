'use client'

import { useState } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { WatchlistPanel } from '@/components/trading/watchlist-panel'
import { OrderFormPanel } from '@/components/trading/order-form-panel'
import { ChartPanel } from '@/components/trading/chart-panel'
import { BottomPanel } from '@/components/trading/bottom-panel'
import { ChallengeStatusBar } from '@/components/trading/challenge-status-bar'
import { EquityCurvePanel } from '@/components/trading/equity-curve-panel'
import { useAccounts } from '@/lib/hooks'

// Fallback used only in mock / dev mode (no Supabase configured)
const MOCK_ACCOUNT_ID = 'f2538dee-cfb0-422a-bf7b-c6b247145b3a'

export default function TradePage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USD')

  // Use the first active account from the session.
  // Falls back to the mock ID so the app still works without Supabase.
  const { data: accounts } = useAccounts()
  const account     = accounts?.[0]
  const accountId   = account?.id ?? MOCK_ACCOUNT_ID
  const startingBal = account?.injected_funds ?? undefined

  return (
    <div className="h-full w-full overflow-hidden flex flex-col max-sm:hidden">
      {/* ── Challenge status bar (CRM wire) ──────────────────────────────── */}
      <ChallengeStatusBar accountId={accountId} />

      {/* ── Main trading layout ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden p-2 pt-1">
        {/* Note: react-resizable-panels v4 treats number defaultSize as px.
            Pass strings like "72%" for percentage-based sizing. */}
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full rounded-lg overflow-hidden">
          {/* Left: Chart + Bottom panel (72%) */}
          <ResizablePanel defaultSize="72%" minSize="45%">
            <ResizablePanelGroup orientation="vertical" className="h-full">
              {/* Chart (68%) */}
              <ResizablePanel defaultSize="68%" minSize="30%">
                <ChartPanel symbol={selectedSymbol} />
              </ResizablePanel>

              <ResizableHandle />

              {/* Bottom: Positions/Orders/History (32%) */}
              <ResizablePanel defaultSize="32%" minSize="18%">
                <BottomPanel accountId={accountId} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right: Watchlist + Equity mini + Order form (28%) */}
          <ResizablePanel defaultSize="28%" minSize="20%" maxSize="45%">
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
