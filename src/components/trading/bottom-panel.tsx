'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp, X, Minus, Plus, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { cn, formatCurrency, formatTimestamp } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useTradingData, useOrders, useActivity, type ActivityItem } from '@/lib/hooks'
import { useSWRConfig } from 'swr'
import type { Position, Order } from '@/types'

type BottomTab = 'positions' | 'orders' | 'history' | 'assets' | 'activity'

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

// ─── P&L flash hook ───────────────────────────────────────────────────────────
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

// ─── Partial Close Modal ──────────────────────────────────────────────────────
function PartialCloseModal({
  pos,
  markPrice,
  onClose,
  onConfirm,
  loading,
}: {
  pos: Position
  markPrice: number
  onClose: () => void
  onConfirm: (qty: number) => void
  loading: boolean
}) {
  const [pct, setPct] = useState(50)
  const maxQty  = pos.quantity
  const closeQty = Math.max(0.01, +(maxQty * (pct / 100)).toFixed(4))

  const priceDiff   = pos.direction === 'long' ? markPrice - pos.entry_price : pos.entry_price - markPrice
  const unitPnl     = priceDiff * pos.leverage
  const estimatedPnl = unitPnl * closeQty
  const estimatedFee = markPrice * closeQty * 0.0007

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-[340px] p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Partial Close</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <Badge variant={pos.direction as 'long' | 'short'} className="text-[9px] px-1.5 py-0 h-4 mr-1">
                {pos.direction}
              </Badge>
              {pos.symbol} · {pos.quantity} lots @ {pos.leverage}x
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted/60 text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Percentage slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Close</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{pct}%</span>
          </div>
          <input
            type="range" min={1} max={99} value={pct}
            onChange={e => setPct(Number(e.target.value))}
            className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            {[25, 50, 75].map(p => (
              <button key={p} onClick={() => setPct(p)}
                className={cn('px-2 py-0.5 rounded border transition-colors text-[10px]',
                  pct === p ? 'border-primary text-primary bg-primary/10' : 'border-border/50 hover:border-border'
                )}>
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Quantity step buttons */}
        <div className="flex items-center gap-2 bg-muted/30 rounded-lg border border-border/50 px-3 py-2">
          <button onClick={() => setPct(p => Math.max(1, p - 5))}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground">
            <Minus className="size-3.5" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold tabular-nums text-foreground">{closeQty.toFixed(4)}</span>
            <span className="text-[10px] text-muted-foreground ml-1">lots</span>
          </div>
          <button onClick={() => setPct(p => Math.min(99, p + 5))}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground">
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* P&L preview */}
        <div className="bg-muted/20 rounded-lg p-3 space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. P&L</span>
            <span className={cn('font-semibold tabular-nums', estimatedPnl >= 0 ? 'text-profit' : 'text-loss')}>
              {estimatedPnl >= 0 ? '+' : ''}{formatCurrency(estimatedPnl)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Close fee</span>
            <span className="tabular-nums text-muted-foreground">−{formatCurrency(estimatedFee)}</span>
          </div>
          <div className="flex justify-between border-t border-border/30 pt-1.5 mt-1.5">
            <span className="text-muted-foreground">Remaining</span>
            <span className="tabular-nums text-foreground">{(maxQty - closeQty).toFixed(4)} lots</span>
          </div>
        </div>

        {/* Confirm */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(closeQty)}
            disabled={loading}
            className={cn(
              'flex-1 h-9 rounded-lg text-xs font-semibold transition-colors',
              pos.direction === 'long'
                ? 'bg-profit/90 hover:bg-profit text-white'
                : 'bg-loss/90 hover:bg-loss text-white',
              loading && 'opacity-60 pointer-events-none'
            )}>
            {loading
              ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              : `Close ${pct}%`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Risk bar (liquidation distance) ─────────────────────────────────────────
function RiskBar({ pos, markPrice }: { pos: Position; markPrice: number }) {
  const liqPrice = pos.liquidation_price
  const entryPrice = pos.entry_price
  const totalRange = Math.abs(entryPrice - liqPrice)
  if (totalRange <= 0) return null

  const distanceToLiq = Math.abs(markPrice - liqPrice)
  const pct = Math.min(100, (distanceToLiq / totalRange) * 100)
  const danger = pct < 20

  return (
    <div className="w-full h-1 bg-muted/40 rounded-full overflow-hidden" title={`Liq. distance: ${pct.toFixed(0)}%`}>
      <div
        className={cn('h-full rounded-full transition-all duration-500',
          danger ? 'bg-loss' : pct < 50 ? 'bg-amber-400' : 'bg-profit/60')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Live position row ────────────────────────────────────────────────────────
function LivePositionRow({
  pos,
  markPrice,
  onClose,
  onPartialClose,
  closing = false,
}: {
  pos: Position
  markPrice: number
  onClose?: (id: string) => void
  onPartialClose?: (pos: Position) => void
  closing?: boolean
}) {
  const priceDiff      = pos.direction === 'long'
    ? markPrice - pos.entry_price
    : pos.entry_price - markPrice

  const unrealizedPnl  = priceDiff * pos.quantity * pos.leverage
  const roePct         = pos.isolated_margin > 0 ? (unrealizedPnl / pos.isolated_margin) * 100 : 0
  const flash          = usePnlFlash(unrealizedPnl)

  // Liquidation distance %
  const liqDist        = Math.abs(markPrice - pos.liquidation_price)
  const liqDistPct     = pos.entry_price > 0 ? (liqDist / pos.entry_price) * 100 : 0
  const nearLiq        = liqDistPct < 5

  const durationMs  = Date.now() - pos.entry_timestamp
  const durationStr = durationMs < 3_600_000
    ? `${Math.floor(durationMs / 60_000)}m`
    : durationMs < 86_400_000
    ? `${Math.floor(durationMs / 3_600_000)}h`
    : `${Math.floor(durationMs / 86_400_000)}d`

  const marginUsePct = pos.isolated_margin > 0
    ? Math.min(100, (Math.abs(unrealizedPnl) / pos.isolated_margin) * 100)
    : 0

  return (
    <div className={cn(
      'group border-b border-border/20 transition-colors',
      closing ? 'opacity-50 pointer-events-none' : 'hover:bg-muted/10'
    )}>
      {/* Main row */}
      <div className="grid px-3 py-2 text-xs min-w-[800px]"
        style={{ gridTemplateColumns: '100px 60px 90px 90px 90px 90px 120px 70px 90px' }}>
        <span className="font-semibold">{pos.symbol}</span>
        <Badge variant={pos.direction as 'long' | 'short'} className="text-[10px] px-1.5 py-0 h-4 w-fit">
          {pos.direction}
        </Badge>
        <span className="tabular-nums text-muted-foreground">{pos.quantity} <span className="opacity-60">lots</span> · {pos.leverage}x</span>
        <span className="tabular-nums">${pos.entry_price.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
        <span className="tabular-nums text-foreground">${markPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
        {/* Liquidation with risk indicator */}
        <span className={cn('tabular-nums flex items-center gap-1', nearLiq && 'text-loss font-semibold')}>
          {nearLiq && <AlertTriangle className="size-2.5 shrink-0" />}
          ${pos.liquidation_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        {/* Animated P&L cell */}
        <span className={cn(
          'tabular-nums font-semibold rounded px-0.5 transition-colors duration-100',
          unrealizedPnl >= 0 ? 'text-profit' : 'text-loss',
          flash === 'up'   && 'bg-profit/15',
          flash === 'down' && 'bg-loss/15',
        )}>
          {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
          <span className="text-[10px] ml-1 opacity-70">
            ({roePct >= 0 ? '+' : ''}{roePct.toFixed(1)}%)
          </span>
        </span>
        <span className="text-muted-foreground/60 tabular-nums">{durationStr}</span>
        {/* Action buttons */}
        <div className="flex items-center gap-1 justify-end">
          {closing ? (
            <div className="size-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          ) : (
            <>
              {onPartialClose && (
                <button
                  onClick={() => onPartialClose(pos)}
                  title="Partial close"
                  className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded text-[9px] font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                >
                  Partial
                </button>
              )}
              {onClose && (
                <button
                  onClick={() => onClose(pos.id)}
                  title="Close position at market"
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-loss/20 hover:text-loss text-muted-foreground transition-all"
                >
                  <X className="size-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {/* Risk bar */}
      <div className="px-3 pb-1.5 min-w-[800px]">
        <div className="flex items-center gap-2">
          <RiskBar pos={pos} markPrice={markPrice} />
          <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap shrink-0">
            Liq. {liqDistPct.toFixed(1)}% away · Margin {marginUsePct.toFixed(0)}% used
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Closed position row ──────────────────────────────────────────────────────
function ClosedPositionRow({ pos }: { pos: Position }) {
  const pnl    = pos.realized_pnl
  const pnlPct = pos.isolated_margin > 0 ? (pnl / pos.isolated_margin) * 100 : 0

  return (
    <div className="grid grid-cols-7 px-3 py-2 text-xs border-b border-border/20 hover:bg-muted/20 min-w-[640px]">
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

// ─── Order row ────────────────────────────────────────────────────────────────
function OrderRow({
  order,
  onCancel,
  cancelling,
}: {
  order: Order
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const typeLabel = order.order_type === 'stop' ? 'Stop' : order.order_type === 'limit' ? 'Limit' : order.order_type
  const price     = order.price ?? order.stop_price

  return (
    <div className={cn(
      'group grid px-3 py-2 text-xs border-b border-border/20 hover:bg-muted/10 transition-colors min-w-[640px]',
      cancelling && 'opacity-40 pointer-events-none'
    )}
      style={{ gridTemplateColumns: '90px 60px 70px 80px 80px 80px 60px 60px' }}>
      <span className="font-semibold">{order.symbol}</span>
      <Badge variant={order.direction as 'long' | 'short'} className="text-[10px] px-1.5 py-0 h-4 w-fit">
        {order.direction}
      </Badge>
      <span className="text-muted-foreground capitalize">{typeLabel}</span>
      <span className="tabular-nums">{price ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 5 })}` : '—'}</span>
      <span className="tabular-nums text-muted-foreground">{order.quantity} lots</span>
      <span className="tabular-nums text-muted-foreground">{order.leverage}x</span>
      <span className={cn(
        'text-[10px] font-medium px-1.5 rounded-full h-4 flex items-center w-fit',
        order.status === 'pending' ? 'bg-amber-400/15 text-amber-400' : 'bg-primary/10 text-primary'
      )}>
        {order.status}
      </span>
      {cancelling ? (
        <div className="size-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      ) : (
        <button
          onClick={() => onCancel(order.id)}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-end text-muted-foreground hover:text-loss transition-all"
          title="Cancel order"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

// ─── Activity item row ────────────────────────────────────────────────────────
function ActivityRow({ item }: { item: ActivityItem }) {
  const isPos    = item.type === 'position'
  const isClosed = item.type === 'closed'

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-border/20 hover:bg-muted/10 transition-colors">
      <div className={cn(
        'mt-0.5 flex items-center justify-center size-5 rounded-full shrink-0 text-[9px]',
        isPos    && 'bg-profit/15',
        isClosed && (item.pnl !== null && item.pnl >= 0 ? 'bg-profit/15' : 'bg-loss/15'),
        !isPos && !isClosed && 'bg-muted/40',
      )}>
        {isPos  ? <TrendingUp className="size-2.5 text-profit" />
         : isClosed ? (item.pnl !== null && item.pnl >= 0
            ? <TrendingUp className="size-2.5 text-profit" />
            : <TrendingDown className="size-2.5 text-loss" />)
         : <span className="text-muted-foreground">•</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.sub}</p>
      </div>
      <div className="text-right shrink-0">
        {item.pnl !== null && (
          <p className={cn('text-xs font-semibold tabular-nums',
            item.pnl >= 0 ? 'text-profit' : 'text-loss')}>
            {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl)}
          </p>
        )}
        <p className="text-[9px] text-muted-foreground/60 tabular-nums mt-0.5">
          {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
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
  const [activeTab, setActiveTab]     = useState<BottomTab>('positions')
  const [collapsed, setCollapsed]     = useState(false)
  const [closingId, setClosingId]     = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [closeError, setCloseError]   = useState<string | null>(null)
  const [partialPos, setPartialPos]   = useState<Position | null>(null)
  const [partialLoading, setPartialLoading] = useState(false)

  const { mutate }                      = useSWRConfig()
  const { data: tradingData }           = useTradingData(accountId)
  const { data: pendingOrders }         = useOrders(accountId)
  const { data: activityFeed }          = useActivity(accountId)

  // ── Full close ────────────────────────────────────────────────────────────
  const handleClose = useCallback(async (positionId: string) => {
    if (closingId) return
    setClosingId(positionId)
    setCloseError(null)
    let success = false
    try {
      const res = await fetch('/api/proxy/engine/close-position', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_id: positionId }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        setCloseError(errJson?.error ?? `Close failed (${res.status})`)
      } else {
        success = true
      }
    } catch (e) {
      setCloseError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setClosingId(null)
      if (success) {
        mutate(`/api/proxy/engine/trading-data?account_id=${accountId}`)
        mutate(`/api/proxy/engine/positions?account_id=${accountId}`)
        mutate(`/api/proxy/engine/activity?account_id=${accountId}`)
        mutate(`/api/proxy/engine/challenge-status?account_id=${accountId}`)
        mutate('/api/proxy/actions/accounts')
      }
    }
  }, [accountId, closingId, mutate])

  // ── Partial close ─────────────────────────────────────────────────────────
  const handlePartialClose = useCallback(async (pos: Position, qty: number) => {
    setPartialLoading(true)
    setCloseError(null)
    let success = false
    try {
      const res = await fetch('/api/proxy/engine/partial-close', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_id: pos.id, quantity: qty }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        setCloseError(errJson?.error ?? `Partial close failed (${res.status})`)
      } else {
        success = true
        setPartialPos(null)
      }
    } catch (e) {
      setCloseError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setPartialLoading(false)
      if (success) {
        mutate(`/api/proxy/engine/trading-data?account_id=${accountId}`)
        mutate(`/api/proxy/engine/positions?account_id=${accountId}`)
        mutate(`/api/proxy/engine/activity?account_id=${accountId}`)
        mutate(`/api/proxy/engine/challenge-status?account_id=${accountId}`)
        mutate('/api/proxy/actions/accounts')
      }
    }
  }, [accountId, mutate])

  // ── Cancel order ──────────────────────────────────────────────────────────
  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (cancellingId) return
    setCancellingId(orderId)
    setCloseError(null)
    try {
      const res = await fetch('/api/proxy/engine/cancel-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        setCloseError(errJson?.error ?? `Cancel failed (${res.status})`)
      } else {
        mutate(`/api/proxy/engine/orders?account_id=${accountId}`)
        mutate(`/api/proxy/engine/trading-data?account_id=${accountId}`)
      }
    } catch (e) {
      setCloseError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setCancellingId(null)
    }
  }, [accountId, cancellingId, mutate])

  const account          = tradingData?.account
  const prices           = tradingData?.prices ?? {}
  const openPositions    = tradingData?.positions?.filter(p => p.status === 'open') ?? []
  const closedPositions  = tradingData?.positions?.filter(p => p.status === 'closed') ?? []
  const orders           = pendingOrders ?? []
  const activity         = activityFeed ?? []

  const nextFundingMs    = tradingData?.instruments?.[0]?.next_funding_time ?? (Date.now() + 4 * 60 * 60 * 1000)
  const nextFunding      = useCountdown(nextFundingMs)

  const equity           = account?.net_worth ?? 0
  const totalUnrealizedPnl = openPositions.reduce((sum, pos) => {
    const mp   = prices[pos.symbol] ?? pos.entry_price
    const diff = pos.direction === 'long' ? mp - pos.entry_price : pos.entry_price - mp
    return sum + diff * pos.quantity * pos.leverage
  }, 0)

  const marginUsed       = account?.total_margin_required ?? 0
  const fundingRate      = tradingData?.instruments?.[0]?.funding_rate ?? -0.000175

  const tabs: { id: BottomTab; label: string; count?: number }[] = [
    { id: 'positions', label: 'Positions',  count: openPositions.length },
    { id: 'orders',    label: 'Orders',     count: orders.length },
    { id: 'history',   label: 'History',    count: closedPositions.length },
    { id: 'activity',  label: 'Activity',   count: activity.length > 0 ? undefined : 0 },
    { id: 'assets',    label: 'Assets' },
  ]

  return (
    <>
      {/* Partial close modal (portal-like, rendered outside the panel flow) */}
      {partialPos && (
        <PartialCloseModal
          pos={partialPos}
          markPrice={prices[partialPos.symbol] ?? partialPos.entry_price}
          onClose={() => setPartialPos(null)}
          onConfirm={(qty) => handlePartialClose(partialPos, qty)}
          loading={partialLoading}
        />
      )}

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
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] px-1 rounded-full bg-primary/10 text-primary">
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

        {/* Error banner */}
        {closeError && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-loss/10 border-b border-loss/30 text-xs text-loss shrink-0">
            <span className="truncate">⚠ {closeError}</span>
            <button onClick={() => setCloseError(null)} className="shrink-0 opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {!collapsed && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">

            {/* ── POSITIONS tab ── */}
            {activeTab === 'positions' && (
              openPositions.length === 0
                ? <EmptyState message="No open positions" sub="Place a trade to see your positions here" />
                : (
                  <div className="overflow-x-auto">
                    <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 min-w-[800px]"
                      style={{ display: 'grid', gridTemplateColumns: '100px 60px 90px 90px 90px 90px 120px 70px 90px' }}>
                      <span>Symbol</span><span>Side</span><span>Size</span>
                      <span>Entry</span><span>Mark</span>
                      <span className="flex items-center gap-1">
                        Liq.
                        <span className="text-[8px] text-muted-foreground/60 normal-case">(risk)</span>
                      </span>
                      <span>Unrealized P&L</span><span>Age</span><span></span>
                    </div>
                    {openPositions.map(pos => (
                      <LivePositionRow
                        key={pos.id}
                        pos={pos}
                        markPrice={prices[pos.symbol] ?? pos.entry_price}
                        onClose={closingId === pos.id ? undefined : handleClose}
                        onPartialClose={closingId === pos.id ? undefined : setPartialPos}
                        closing={closingId === pos.id}
                      />
                    ))}
                  </div>
                )
            )}

            {/* ── ORDERS tab ── */}
            {activeTab === 'orders' && (
              orders.length === 0
                ? <EmptyState message="No pending orders" sub="Limit and stop orders will appear here" />
                : (
                  <div className="overflow-x-auto">
                    <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 min-w-[640px]"
                      style={{ display: 'grid', gridTemplateColumns: '90px 60px 70px 80px 80px 80px 60px 60px' }}>
                      <span>Symbol</span><span>Side</span><span>Type</span>
                      <span>Price</span><span>Qty</span><span>Leverage</span>
                      <span>Status</span><span></span>
                    </div>
                    {orders.map(order => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onCancel={handleCancelOrder}
                        cancelling={cancellingId === order.id}
                      />
                    ))}
                  </div>
                )
            )}

            {/* ── HISTORY tab ── */}
            {activeTab === 'history' && (
              closedPositions.length === 0
                ? <EmptyState message="No history" sub="Closed trades will appear here" />
                : (
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-7 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 min-w-[640px]">
                      <span>Symbol</span><span>Side</span><span>Size</span>
                      <span>Entry</span><span>Exit</span><span>Realized P&L</span><span>Closed At</span>
                    </div>
                    {closedPositions.map(pos => <ClosedPositionRow key={pos.id} pos={pos} />)}
                  </div>
                )
            )}

            {/* ── ACTIVITY tab ── */}
            {activeTab === 'activity' && (
              activity.length === 0
                ? <EmptyState message="No activity yet" sub="Trade events will appear here in real time" />
                : (
                  <div>
                    {activity.map(item => <ActivityRow key={item.id} item={item} />)}
                  </div>
                )
            )}

            {/* ── ASSETS tab ── */}
            {activeTab === 'assets' && account && (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Account Type',      value: account.account_type },
                  { label: 'Net Worth',          value: formatCurrency(account.net_worth) },
                  { label: 'Available Margin',   value: formatCurrency(account.available_margin) },
                  { label: 'Unrealized P&L',     value: formatCurrency(totalUnrealizedPnl), color: totalUnrealizedPnl >= 0 ? 'text-profit' : 'text-loss' },
                  { label: 'Realized P&L',       value: formatCurrency(account.total_pnl), color: account.total_pnl >= 0 ? 'text-profit' : 'text-loss' },
                  { label: 'Margin Required',    value: formatCurrency(account.total_margin_required) },
                  { label: 'Margin Mode',        value: account.default_margin_mode },
                  { label: 'Open Positions',     value: String(openPositions.length) },
                  { label: 'Pending Orders',     value: String(orders.length) },
                ].map(item => (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
                    <span className={cn('text-sm font-medium tabular-nums capitalize', item.color ?? '')}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </>
  )
}
