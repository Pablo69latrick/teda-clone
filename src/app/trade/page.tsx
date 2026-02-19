'use client'

import { useState } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { WatchlistPanel } from '@/components/trading/watchlist-panel'
import { OrderFormPanel } from '@/components/trading/order-form-panel'
import { ChartPanel } from '@/components/trading/chart-panel'
import { BottomPanel } from '@/components/trading/bottom-panel'

export default function TradePage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USD')

  return (
    <div className="h-full w-full overflow-hidden p-2 max-sm:hidden">
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
              <BottomPanel accountId="f2538dee-cfb0-422a-bf7b-c6b247145b3a" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right: Watchlist + Order form (28%) */}
        <ResizablePanel defaultSize="28%" minSize="20%" maxSize="45%">
          <div className="flex flex-col h-full overflow-hidden bg-card border-l border-border/50">
            {/* Watchlist (scrollable, takes remaining space) */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <WatchlistPanel
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
              />
            </div>
            {/* Order form (fixed at bottom) */}
            <div className="shrink-0 border-t border-border/50">
              <OrderFormPanel
                symbol={selectedSymbol}
                accountId="f2538dee-cfb0-422a-bf7b-c6b247145b3a"
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
