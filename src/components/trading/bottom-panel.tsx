'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn, formatCurrency, formatPercent, formatTimestamp } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useTradingData } from '@/lib/hooks'
import type { Position } from '@/types'

type BottomTab = 'positions' | 'orders' | 'history' | 'assets' | 'notifications'

interface BottomPanelProps {
  accountId: string
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = targetMs - Date.now()
      if (diff <= 0) { setRemaining('00:00:00'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setRemaining(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [targetMs])
  return remaining
}

// ─── P&L flash hook (same as price flash, but for unrealized PnL) ─────────────
function usePnlFlash(pnl: number): 'up' | 'down' | null {
  const prevRef = useRef<number>(pnl)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (Math.abs(pnl - prevRef.current) < 0.001) return
    const dir = pnl > prevRef.current ? 'up' : 'down'
    prevRef.current = pnl
    if (timerRef.current) clearTimeout(timerRef.current)
    setFlash(dir)
    timerRef.current = setTimeout(() => setFlash(null), 500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [pnl])

  return flash
}

// ─── Single live position row ─────────────────────────────────────────────────
function LivePositionRow({
  pos,
  markPrice,
  onClose,
}: {
  pos: Position
  markPrice: number
  onClose?: (id: string) => void
}) {
  const priceDiff = pos.direction === 'long'
    ? markPrice - pos.entry_price
    : pos.entry_price - markPrice

  const unrealizedPnl = priceDiff * pos.quantity * pos.leverage
  const roePct = pos.isolated_margin > 0 ? (unrealizedPnl / pos.isolated_margin) * 100 : 0

  const flash = usePnlFlash(unrealizedPnl)

  const durationMs = Date.now() - pos.entry_timestamp
  const durationStr = durationMs < 3_600_000
    ? `${Math.floor(durationMs / 60_000)}m`
    : durationMs < 86_400_000
    ? `${Math.floor(durationMs / 3_600_000)}h`
    : `${Math.floor(durationMs / 86_400_000)}d`

  return (
    <div className="grid grid-cols-8 px-3 py-2 text-xs border-b border-border/20 hover:bg-muted/20 min-w-[720px] transition-colors group">
      <span className="font-semibold">{pos.symbol}</span>
      <Badge variant={pos.direction as 'long' | 'short'} className="text-[10px] px-1.5 py-0 h-4 w-fit">
        {pos.direction}
      </Badge>
      <span className="tabular-nums text-muted-foreground">{pos.quantity} @ {pos.leverage}x</span>
      <span className="tabular-nums">${pos.entry_price.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
      <span className="tabular-nums text-foreground">${markPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
      <span className="tabular-nums text-muted-foreground/60">${pos.liquidation_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      {/* Animated P&L cell */}
      <span className={cn(
        'tabular-nums font-semibold rounded px-0.5 transition-colors duration-100',
        unrealizedPnl >= 0 ? 'text-profit' : 'text-loss',
        flash === 'up'   && 'bg-profit/15',
        flash === 'down' && 'bg-loss/15',
      )}>
        {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
        <span className="text-[10px] ml-1 opacity-60">({roePct >= 0 ? '+' : ''}{roePct.toFixed(1)}%)</span>
      </span>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground/60">{durationStr}</span>
        {onClose && (
          <button
            onClick={() => onClose(pos.id)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-loss/20 hover:text-loss text-muted-foreground transition-all"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Closed position row ──────────────────────────────────────────────────────
function ClosedPositionRow({ pos }: { pos: Position }) {
  const pnl = pos.realized_pnl
  const pnlPct = pos.isolated_margin > 0 ? (pnl / pos.isolated_margin) * 100 : 0

  return (
    <div className="grid grid-cols-7 px-3 py-2 text-xs border-b border-border/20 hover:bg-muted/20 min-w-[620px]">
      <span className="font-medium">{pos.symbol}</span>
      <Badge variant={pos.direction as 'long' | 'short'} className="text-[10px] px-1 py-0 w-fit">{pos.direction}</Badge>
      <span className="tabular-nums text-muted-foreground">{pos.quantity.toLocaleString()}</span>
      <span className="tabular-nums">${pos.entry_price.toFixed(5)}</span>
      <span className="tabular-nums">${(pos.exit_price ?? 0).toFixed(5)}</span>
      <span className={cn('tabular-nums font-medium', pnl >= 0 ? 'text-profit' : 'text-loss')}>
        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
        <span className="text-[10px] ml-1 opacity-60">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
      </span>
      <span className="text-muted-foreground text-[10px] tabular-nums">
        {pos.exit_timestamp ? formatTimestamp(pos.exit_timestamp) : '—'}
      </span>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1.5 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/60">{sub}</p>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function BottomPanel({ accountId }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<BottomTab>('positions')
  const [collapsed, setCollapsed] = useState(false)

  const { data: tradingData } = useTradingData(accountId)

  const account = tradingData?.account
  const prices = tradingData?.prices ?? {}
  const openPositions = tradingData?.positions?.filter(p => p.status === 'open') ?? []
  const closedPositions = tradingData?.positions?.filter(p => p.status === 'closed') ?? []

  const nextFundingMs = tradingData?.instruments?.[0]?.next_funding_time ?? (Date.now() + 4 * 60 * 60 * 1000)
  const nextFunding = useCountdown(nextFundingMs)

  const equity = account?.net_worth ?? 0

  // Compute total live unrealized PnL from open positions + live prices
  const totalUnrealizedPnl = openPositions.reduce((sum, pos) => {
    const mp = prices[pos.symbol] ?? pos.entry_price
    const diff = pos.direction === 'long' ? mp - pos.entry_price : pos.entry_price - mp
    return sum + diff * pos.quantity * pos.leverage
  }, 0)

  const marginUsed = account?.total_margin_required ?? 0
  const fundingRate = tradingData?.instruments?.[0]?.funding_rate ?? -0.000175

  const tabs: { id: BottomTab; label: string; count?: number }[] = [
    { id: 'positions',     label: 'Positions',     count: openPositions.length },
    { id: 'orders',        label: 'Orders',        count: 0 },
    { id: 'history',       label: 'History',       count: closedPositions.length },
    { id: 'assets',        label: 'Assets' },
    { id: 'notifications', label: 'Notifications' },
  ]

  return (
    <div className="flex flex-col h-full bg-card border-t border-border/50 overflow-hidden">
      {/* Tabs + stats bar */}
      <div className="flex items-center justify-between px-2 border-b border-border/50 shrink-0 h-10">
        <div className="flex items-center">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1 px-3 h-10 text-xs font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'text-[10px] px-1 rounded-full',
                  tab.count > 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pr-1 shrink-0">
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-muted-foreground hidden xl:inline">
              EQUITY <span className="text-foreground font-medium tabular-nums">{formatCurrency(equity)}</span>
            </span>
            <span className="text-muted-foreground hidden lg:inline">
              UNREALIZED{' '}
              <span className={cn('font-medium tabular-nums', totalUnrealizedPnl >= 0 ? 'text-profit' : 'text-loss')}>
                {totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnl)}
              </span>
            </span>
            <span className="text-muted-foreground hidden md:inline">
              MARGIN <span className="text-foreground font-medium tabular-nums">{formatCurrency(marginUsed)}</span>
            </span>
            <span className="text-muted-foreground">
              FUNDING <span className={cn('font-medium tabular-nums', fundingRate < 0 ? 'text-loss' : 'text-profit')}>
                {(fundingRate * 100).toFixed(4)}%
              </span>
            </span>
            <span className="text-muted-foreground">
              ⏱ <span className="text-foreground font-medium tabular-nums">{nextFunding}</span>
            </span>
          </div>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* POSITIONS tab */}
          {activeTab === 'positions' && (
            openPositions.length === 0
              ? <EmptyState message="No open positions" sub="Place a trade to see your positions here" />
              : (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-8 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 min-w-[720px]">
                    <span>Symbol</span><span>Side</span><span>Size</span>
                    <span>Entry</span><span>Mark</span><span>Liq.</span>
                    <span>Unrealized P&L</span><span>Age</span>
                  </div>
                  {openPositions.map(pos => (
                    <LivePositionRow
                      key={pos.id}
                      pos={pos}
                      markPrice={prices[pos.symbol] ?? pos.entry_price}
                    />
                  ))}
                </div>
              )
          )}

          {/* ORDERS tab */}
          {activeTab === 'orders' && (
            <EmptyState message="No pending orders" sub="Limit and stop orders will appear here" />
          )}

          {/* HISTORY tab */}
          {activeTab === 'history' && (
            closedPositions.length === 0
              ? <EmptyState message="No history" sub="Closed trades will appear here" />
              : (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-7 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 min-w-[620px]">
                    <span>Symbol</span><span>Side</span><span>Size</span>
                    <span>Entry</span><span>Exit</span><span>Realized P&L</span><span>Closed At</span>
                  </div>
                  {closedPositions.map(pos => <ClosedPositionRow key={pos.id} pos={pos} />)}
                </div>
              )
          )}

          {/* ASSETS tab */}
          {activeTab === 'assets' && account && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Account Type',      value: account.account_type },
                { label: 'Net Worth',         value: formatCurrency(account.net_worth) },
                { label: 'Available Margin',  value: formatCurrency(account.available_margin) },
                { label: 'Unrealized P&L',    value: formatCurrency(totalUnrealizedPnl), color: totalUnrealizedPnl >= 0 ? 'text-profit' : 'text-loss' },
                { label: 'Realized P&L',      value: formatCurrency(account.total_pnl), color: account.total_pnl >= 0 ? 'text-profit' : 'text-loss' },
                { label: 'Margin Mode',       value: account.default_margin_mode },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
                  <span className={cn('text-sm font-medium tabular-nums capitalize', item.color ?? '')}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* NOTIFICATIONS tab */}
          {activeTab === 'notifications' && (
            <EmptyState message="No notifications" sub="Account notifications will appear here" />
          )}

        </div>
      )}
    </div>
  )
}
