'use client'

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown, ChevronUp, X, Minus, Plus,
  TrendingUp, TrendingDown, AlertTriangle,
  Pencil, ArrowLeftRight, MoreHorizontal, Target,
} from 'lucide-react'
import { cn, formatCurrency, formatTimestamp } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useTradingData, useClosedPositions, useOrders, useActivity, type ActivityItem } from '@/lib/hooks'
import { useSWRConfig } from 'swr'
import type { Position, Order } from '@/types'

type BottomTab = 'positions' | 'orders' | 'history' | 'balance' | 'activity'

interface BottomPanelProps {
  accountId: string
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

// ─── Toast system ─────────────────────────────────────────────────────────────
interface Toast { type: 'success' | 'error'; msg: string; id: number }

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="absolute top-10 right-2 z-50 flex flex-col gap-1.5 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg border text-xs shadow-lg backdrop-blur-sm animate-in slide-in-from-right-3 fade-in duration-200',
            t.type === 'success' ? 'bg-profit/15 border-profit/30 text-profit' : 'bg-loss/15 border-loss/30 text-loss'
          )}>
          <span className="truncate max-w-[240px]">{t.msg}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 shrink-0">✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── Partial Close Modal ──────────────────────────────────────────────────────
function PartialCloseModal({
  pos, markPrice, onClose, onConfirm, loading,
}: {
  pos: Position; markPrice: number; onClose: () => void
  onConfirm: (qty: number) => void; loading: boolean
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

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Close</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{pct}%</span>
          </div>
          <input type="range" min={1} max={99} value={pct}
            onChange={e => setPct(Number(e.target.value))}
            className="w-full h-1.5 rounded-full accent-primary cursor-pointer" />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            {[25, 50, 75].map(p => (
              <button key={p} onClick={() => setPct(p)}
                className={cn('px-2 py-0.5 rounded border transition-colors text-[10px]',
                  pct === p ? 'border-primary text-primary bg-primary/10' : 'border-border/50 hover:border-border'
                )}>{p}%</button>
            ))}
          </div>
        </div>

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

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(closeQty)} disabled={loading}
            className={cn(
              'flex-1 h-9 rounded-lg text-xs font-semibold transition-colors',
              pos.direction === 'long' ? 'bg-profit/90 hover:bg-profit text-white' : 'bg-loss/90 hover:bg-loss text-white',
              loading && 'opacity-60 pointer-events-none'
            )}>
            {loading ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : `Close ${pct}%`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SL/TP Edit Modal ─────────────────────────────────────────────────────────
function SLTPModal({
  pos, currentSL, currentTP, markPrice, onClose, onConfirm, loading,
}: {
  pos: Position; currentSL: number | null; currentTP: number | null
  markPrice: number; onClose: () => void
  onConfirm: (sl: number | null, tp: number | null) => void; loading: boolean
}) {
  const [sl, setSl] = useState(currentSL?.toString() ?? '')
  const [tp, setTp] = useState(currentTP?.toString() ?? '')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    setError('')
    const slVal = sl.trim() === '' ? null : parseFloat(sl)
    const tpVal = tp.trim() === '' ? null : parseFloat(tp)

    // Client-side validation
    if (slVal !== null && isNaN(slVal)) { setError('Invalid SL price'); return }
    if (tpVal !== null && isNaN(tpVal)) { setError('Invalid TP price'); return }
    if (slVal !== null && slVal <= 0) { setError('SL must be positive'); return }
    if (tpVal !== null && tpVal <= 0) { setError('TP must be positive'); return }

    if (pos.direction === 'long') {
      if (slVal !== null && slVal >= markPrice) { setError(`SL must be below market ($${markPrice.toFixed(2)})`); return }
      if (tpVal !== null && tpVal <= markPrice) { setError(`TP must be above market ($${markPrice.toFixed(2)})`); return }
    } else {
      if (slVal !== null && slVal <= markPrice) { setError(`SL must be above market ($${markPrice.toFixed(2)})`); return }
      if (tpVal !== null && tpVal >= markPrice) { setError(`TP must be below market ($${markPrice.toFixed(2)})`); return }
    }

    // Only send changed values
    const slChanged = slVal !== currentSL
    const tpChanged = tpVal !== currentTP
    if (!slChanged && !tpChanged) { onClose(); return }

    onConfirm(
      slChanged ? slVal : undefined as unknown as null,
      tpChanged ? tpVal : undefined as unknown as null,
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-[320px] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Modify SL / TP</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <Badge variant={pos.direction as 'long' | 'short'} className="text-[9px] px-1.5 py-0 h-4 mr-1">
                {pos.direction}
              </Badge>
              {pos.symbol} · Entry @ {pos.entry_price.toLocaleString(undefined, { maximumFractionDigits: 5 })}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted/60 text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Stop Loss */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
              Stop Loss {pos.direction === 'long' ? '(below market)' : '(above market)'}
            </label>
            <input
              type="number"
              step="any"
              value={sl}
              onChange={e => setSl(e.target.value)}
              placeholder={currentSL ? `Current: ${currentSL}` : 'No SL set'}
              className="w-full h-9 px-3 text-sm bg-muted/30 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary tabular-nums"
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
              Take Profit {pos.direction === 'long' ? '(above market)' : '(below market)'}
            </label>
            <input
              type="number"
              step="any"
              value={tp}
              onChange={e => setTp(e.target.value)}
              placeholder={currentTP ? `Current: ${currentTP}` : 'No TP set'}
              className="w-full h-9 px-3 text-sm bg-muted/30 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary tabular-nums"
            />
          </div>

          {/* Market price reference */}
          <div className="text-[10px] text-muted-foreground text-center">
            Market: ${markPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}
          </div>
        </div>

        {error && (
          <p className="text-[11px] text-loss text-center">{error}</p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-9 rounded-lg bg-primary/90 hover:bg-primary text-xs font-semibold text-white transition-colors disabled:opacity-60">
            {loading ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Risk bar ─────────────────────────────────────────────────────────────────
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

// ─── Live position row (TradeLocker style) ────────────────────────────────────
const LivePositionRow = memo(function LivePositionRow({
  pos, markPrice, onClose, onPartialClose, onReverse, onEditSLTP, closing = false,
}: {
  pos: Position; markPrice: number
  onClose?: (id: string) => void
  onPartialClose?: (pos: Position) => void
  onReverse?: (pos: Position) => void
  onEditSLTP?: (pos: Position) => void
  closing?: boolean
}) {
  const priceDiff = pos.direction === 'long'
    ? markPrice - pos.entry_price
    : pos.entry_price - markPrice

  const unrealizedPnl  = priceDiff * pos.quantity * pos.leverage
  const roePct         = pos.isolated_margin > 0 ? (unrealizedPnl / pos.isolated_margin) * 100 : 0
  const flash          = usePnlFlash(unrealizedPnl)

  const margin         = pos.isolated_margin
  const exposure       = pos.quantity * markPrice

  const liqDist        = Math.abs(markPrice - pos.liquidation_price)
  const liqDistPct     = pos.entry_price > 0 ? (liqDist / pos.entry_price) * 100 : 0
  const nearLiq        = liqDistPct < 5

  return (
    <div className={cn(
      'group border-b border-border/20 transition-all duration-200',
      closing ? 'opacity-30 scale-[0.98] pointer-events-none' : 'hover:bg-muted/10'
    )}>
      <div className="grid px-3 py-2 text-xs min-w-[900px]"
        style={{ gridTemplateColumns: '90px 50px 80px 90px 90px 80px 80px 70px 80px 120px 70px' }}>
        {/* Instrument */}
        <span className="font-semibold">{pos.symbol}</span>
        {/* Side */}
        <Badge variant={pos.direction as 'long' | 'short'} className="text-[10px] px-1.5 py-0 h-4 w-fit">
          {pos.direction === 'long' ? 'Buy' : 'Sell'}
        </Badge>
        {/* Size */}
        <span className="tabular-nums text-muted-foreground">{pos.quantity} <span className="opacity-60">×</span> {pos.leverage}x</span>
        {/* Entry / Market */}
        <span className="tabular-nums">{pos.entry_price.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
        <span className="tabular-nums text-foreground">{markPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
        {/* Margin */}
        <span className="tabular-nums text-muted-foreground">{formatCurrency(margin)}</span>
        {/* Exposure */}
        <span className="tabular-nums text-muted-foreground">{formatCurrency(exposure)}</span>
        {/* Liq */}
        <span className={cn('tabular-nums flex items-center gap-1', nearLiq && 'text-loss font-semibold')}>
          {nearLiq && <AlertTriangle className="size-2.5 shrink-0" />}
          {pos.liquidation_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        {/* Fees */}
        <span className="tabular-nums text-muted-foreground">
          {formatCurrency(pos.total_fees)}
        </span>
        {/* P&L */}
        <span className={cn(
          'tabular-nums font-semibold rounded px-0.5 transition-colors duration-100',
          unrealizedPnl >= 0 ? 'text-profit' : 'text-loss',
          flash === 'up' && 'bg-profit/15',
          flash === 'down' && 'bg-loss/15',
        )}>
          {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
          <span className="text-[10px] ml-0.5 opacity-70">({roePct >= 0 ? '+' : ''}{roePct.toFixed(1)}%)</span>
        </span>
        {/* Actions */}
        <div className="flex items-center gap-1 justify-end">
          {closing ? (
            <div className="size-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          ) : (
            <>
              {/* Quick close button — always visible */}
              {onClose && (
                <button onClick={() => onClose(pos.id)} title="Close position"
                  className="p-1.5 rounded text-muted-foreground hover:text-loss hover:bg-loss/10 transition-all">
                  <X className="size-3.5" />
                </button>
              )}
              {/* Dropdown for more actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {onClose && (
                    <DropdownMenuItem onClick={() => onClose(pos.id)} className="text-loss focus:text-loss">
                      <X className="size-3.5 mr-2" /> Close position
                    </DropdownMenuItem>
                  )}
                  {onEditSLTP && (
                    <DropdownMenuItem onClick={() => onEditSLTP(pos)}>
                      <Target className="size-3.5 mr-2" /> Edit SL / TP
                    </DropdownMenuItem>
                  )}
                  {onPartialClose && (
                    <DropdownMenuItem onClick={() => onPartialClose(pos)}>
                      <Pencil className="size-3.5 mr-2" /> Partial close
                    </DropdownMenuItem>
                  )}
                  {onReverse && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onReverse(pos)}>
                        <ArrowLeftRight className="size-3.5 mr-2" /> Reverse position
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
      {/* Risk bar */}
      <div className="px-3 pb-1.5 min-w-[900px]">
        <div className="flex items-center gap-2">
          <RiskBar pos={pos} markPrice={markPrice} />
          <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap shrink-0">
            Liq. {liqDistPct.toFixed(1)}% away
          </span>
        </div>
      </div>
    </div>
  )
})

// ─── Closed position row ──────────────────────────────────────────────────────
const ClosedPositionRow = memo(function ClosedPositionRow({ pos }: { pos: Position }) {
  const pnl    = pos.realized_pnl
  const pnlPct = pos.isolated_margin > 0 ? (pnl / pos.isolated_margin) * 100 : 0

  return (
    <div className="grid px-3 py-2 text-xs border-b border-border/20 hover:bg-muted/20 min-w-[700px]"
      style={{ gridTemplateColumns: '90px 50px 70px 90px 90px 80px 120px 80px' }}>
      <span className="font-medium">{pos.symbol}</span>
      <Badge variant={pos.direction as 'long' | 'short'} className="text-[10px] px-1 py-0 w-fit">
        {pos.direction === 'long' ? 'Buy' : 'Sell'}
      </Badge>
      <span className="tabular-nums text-muted-foreground">{pos.quantity}</span>
      <span className="tabular-nums">{pos.entry_price.toFixed(5)}</span>
      <span className="tabular-nums">{(pos.exit_price ?? 0).toFixed(5)}</span>
      <span className="tabular-nums text-muted-foreground">{formatCurrency(pos.total_fees)}</span>
      <span className={cn('tabular-nums font-medium', pnl >= 0 ? 'text-profit' : 'text-loss')}>
        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
        <span className="text-[10px] ml-1 opacity-60">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
      </span>
      <span className="text-muted-foreground text-[10px] tabular-nums">
        {pos.exit_timestamp ? formatTimestamp(pos.exit_timestamp) : '—'}
      </span>
    </div>
  )
})

// ─── Order row ────────────────────────────────────────────────────────────────
const OrderRow = memo(function OrderRow({
  order, onCancel, cancelling,
}: {
  order: Order; onCancel: (id: string) => void; cancelling: boolean
}) {
  const typeLabel = order.order_type === 'stop' ? 'Stop' : order.order_type === 'limit' ? 'Limit' : order.order_type
  const price     = order.price ?? order.stop_price

  return (
    <div className={cn(
      'group grid px-3 py-2 text-xs border-b border-border/20 hover:bg-muted/10 transition-all duration-200 min-w-[640px]',
      cancelling && 'opacity-30 scale-[0.98] pointer-events-none'
    )} style={{ gridTemplateColumns: '90px 60px 70px 80px 80px 80px 60px 60px' }}>
      <span className="font-semibold">{order.symbol}</span>
      <Badge variant={order.direction as 'long' | 'short'} className="text-[10px] px-1.5 py-0 h-4 w-fit">
        {order.direction === 'long' ? 'Buy' : 'Sell'}
      </Badge>
      <span className="text-muted-foreground capitalize">{typeLabel}</span>
      <span className="tabular-nums">{price ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 5 })}` : '—'}</span>
      <span className="tabular-nums text-muted-foreground">{order.quantity} lots</span>
      <span className="tabular-nums text-muted-foreground">{order.leverage}x</span>
      <span className={cn(
        'text-[10px] font-medium px-1.5 rounded-full h-4 flex items-center w-fit',
        order.status === 'pending' ? 'bg-amber-400/15 text-amber-400' : 'bg-primary/10 text-primary'
      )}>{order.status}</span>
      {cancelling ? (
        <div className="size-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      ) : (
        <button onClick={() => onCancel(order.id)}
          className="flex items-center justify-end text-muted-foreground hover:text-loss transition-all" title="Cancel order">
          <X className="size-3" />
        </button>
      )}
    </div>
  )
})

// ─── Activity item row ────────────────────────────────────────────────────────
const ActivityRow = memo(function ActivityRow({ item }: { item: ActivityItem }) {
  const isPos    = item.type === 'position'
  const isClosed = item.type === 'closed'

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-border/20 hover:bg-muted/10 transition-colors">
      <div className={cn(
        'mt-0.5 flex items-center justify-center size-5 rounded-full shrink-0 text-[9px]',
        isPos && 'bg-profit/15',
        isClosed && (item.pnl !== null && item.pnl >= 0 ? 'bg-profit/15' : 'bg-loss/15'),
        !isPos && !isClosed && 'bg-muted/40',
      )}>
        {isPos ? <TrendingUp className="size-2.5 text-profit" />
         : isClosed ? (item.pnl !== null && item.pnl >= 0
            ? <TrendingUp className="size-2.5 text-profit" />
            : <TrendingDown className="size-2.5 text-loss" />)
         : <span className="text-muted-foreground">·</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.sub}</p>
      </div>
      <div className="text-right shrink-0">
        {item.pnl !== null && (
          <p className={cn('text-xs font-semibold tabular-nums', item.pnl >= 0 ? 'text-profit' : 'text-loss')}>
            {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl)}
          </p>
        )}
        <p className="text-[9px] text-muted-foreground/60 tabular-nums mt-0.5">
          {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
})

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1.5 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/60">{sub}</p>
    </div>
  )
}

// ─── Account Stats Bar (TradeLocker style) ────────────────────────────────────
const AccountStatsBar = memo(function AccountStatsBar({
  balance, pnl, equity, marginUsed, marginAvailable, marginLevel,
}: {
  balance: number; pnl: number; equity: number
  marginUsed: number; marginAvailable: number; marginLevel: number
}) {
  return (
    <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border bg-muted/10 shrink-0 overflow-x-auto no-scrollbar">
      {[
        { label: 'Balance', value: formatCurrency(balance), color: '' },
        { label: 'P&L', value: `${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)}`, color: pnl >= 0 ? 'text-profit' : 'text-loss' },
        { label: 'Equity', value: formatCurrency(equity), color: '' },
        { label: 'Margin Used', value: formatCurrency(marginUsed), color: '' },
        { label: 'Margin Available', value: formatCurrency(marginAvailable), color: marginAvailable < 100 ? 'text-loss' : '' },
        { label: 'Margin Level', value: marginLevel === Infinity || marginUsed === 0 ? '—' : `${marginLevel.toFixed(0)}%`, color: marginLevel < 150 && marginUsed > 0 ? 'text-loss' : '' },
      ].map(stat => (
        <div key={stat.label} className="flex items-center gap-1.5 shrink-0 text-[10px]">
          <span className="text-muted-foreground uppercase tracking-wider whitespace-nowrap">{stat.label}</span>
          <span className={cn('font-semibold tabular-nums text-foreground whitespace-nowrap', stat.color)}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  )
})

// ─── Revalidate all trading caches ────────────────────────────────────────────
function revalidateAll(mutate: ReturnType<typeof useSWRConfig>['mutate'], accountId: string) {
  // Force immediate re-fetch for all trading data endpoints
  const keys = [
    `/api/proxy/engine/trading-data?account_id=${accountId}`,
    `/api/proxy/engine/positions?account_id=${accountId}`,
    `/api/proxy/engine/closed-positions?account_id=${accountId}`,
    `/api/proxy/engine/orders?account_id=${accountId}`,
    `/api/proxy/engine/activity?account_id=${accountId}`,
    `/api/proxy/engine/challenge-status?account_id=${accountId}`,
    `/api/proxy/engine/equity-history?account_id=${accountId}`,
    '/api/proxy/actions/accounts',
  ]
  for (const key of keys) {
    mutate(key)
  }
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function BottomPanel({ accountId }: BottomPanelProps) {
  const [activeTab, setActiveTab]       = useState<BottomTab>('positions')
  const [collapsed, setCollapsed]       = useState(true)  // snap toggle: starts collapsed (tab bar only)
  const [closingId, setClosingId]       = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [partialPos, setPartialPos]     = useState<Position | null>(null)
  const [partialLoading, setPartialLoading] = useState(false)
  const [sltpPos, setSltpPos]           = useState<Position | null>(null)
  const [sltpLoading, setSltpLoading]   = useState(false)
  const [toasts, setToasts]             = useState<Toast[]>([])
  const toastIdRef                      = useRef(0)

  const { mutate }            = useSWRConfig()
  const { data: tradingData, mutate: mutateTradingData } = useTradingData(accountId)
  const { data: closedRaw, mutate: mutateClosed }   = useClosedPositions(accountId)
  const { data: pendingOrders } = useOrders(accountId)
  const { data: activityFeed } = useActivity(accountId)

  const addToast = useCallback((type: 'success' | 'error', msg: string) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev.slice(-3), { type, msg, id }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Close position (with optimistic update + safety timeout) ──
  const handleClose = useCallback(async (positionId: string) => {
    if (closingId) return
    setClosingId(positionId)

    // Safety: reset closingId after 10s if fetch hangs
    const safetyTimer = setTimeout(() => {
      setClosingId(null)
      addToast('error', 'Close request timed out — please retry')
    }, 10_000)

    // Optimistic: remove from open positions instantly
    const prevPositions = tradingData?.positions ?? []
    const closedPos = prevPositions.find(p => p.id === positionId)
    const optimisticPositions = prevPositions.filter(p => p.id !== positionId)

    // Optimistic update on trading data
    if (tradingData) {
      mutateTradingData(
        { ...tradingData, positions: optimisticPositions },
        false // don't revalidate yet
      )
    }

    try {
      const res = await fetch('/api/proxy/engine/close-position', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_id: positionId }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        addToast('error', errJson?.error ?? `Close failed (${res.status})`)
        // Rollback optimistic update
        if (tradingData) mutateTradingData({ ...tradingData, positions: prevPositions }, false)
      } else {
        const result = await res.json()
        const pnl = result.realized_pnl ?? 0
        const pnlStr = pnl >= 0 ? `+${formatCurrency(pnl)}` : formatCurrency(pnl)
        addToast('success', `${closedPos?.symbol ?? ''} closed · ${pnlStr}`)

        // Switch to closed positions tab to show the result
        setActiveTab('history')

        // Force revalidate all caches
        revalidateAll(mutate, accountId)
        mutateTradingData()
        mutateClosed()
      }
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Network error')
      // Rollback
      if (tradingData) mutateTradingData({ ...tradingData, positions: prevPositions }, false)
    } finally {
      clearTimeout(safetyTimer)
      setClosingId(null)
    }
  }, [accountId, closingId, mutate, tradingData, mutateTradingData, mutateClosed, addToast])

  // ── Partial close (with optimistic update) ──
  const handlePartialClose = useCallback(async (pos: Position, qty: number) => {
    setPartialLoading(true)

    // Optimistic: reduce quantity in the position
    const prevPositions = tradingData?.positions ?? []
    if (tradingData) {
      const optimisticPositions = prevPositions.map(p =>
        p.id === pos.id ? { ...p, quantity: p.quantity - qty } : p
      )
      mutateTradingData({ ...tradingData, positions: optimisticPositions }, false)
    }

    try {
      const res = await fetch('/api/proxy/engine/partial-close', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_id: pos.id, quantity: qty }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        addToast('error', errJson?.error ?? `Partial close failed (${res.status})`)
        // Rollback
        if (tradingData) mutateTradingData({ ...tradingData, positions: prevPositions }, false)
      } else {
        const result = await res.json()
        const pnl = result.realized_pnl ?? 0
        const pnlStr = pnl >= 0 ? `+${formatCurrency(pnl)}` : formatCurrency(pnl)
        addToast('success', `${pos.symbol} partial close ${qty} lots · ${pnlStr}`)
        setPartialPos(null)

        revalidateAll(mutate, accountId)
        mutateTradingData()
        mutateClosed()
      }
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Network error')
      if (tradingData) mutateTradingData({ ...tradingData, positions: prevPositions }, false)
    } finally {
      setPartialLoading(false)
    }
  }, [accountId, mutate, tradingData, mutateTradingData, mutateClosed, addToast])

  // ── Modify SL/TP ──
  const handleModifySLTP = useCallback(async (pos: Position, sl: number | null | undefined, tp: number | null | undefined) => {
    setSltpLoading(true)
    try {
      const body: Record<string, unknown> = { position_id: pos.id }
      if (sl !== undefined) body.sl_price = sl
      if (tp !== undefined) body.tp_price = tp

      const res = await fetch('/api/proxy/engine/modify-sltp', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        addToast('error', errJson?.error ?? `SL/TP update failed (${res.status})`)
      } else {
        addToast('success', `${pos.symbol} SL/TP updated`)
        setSltpPos(null)
        revalidateAll(mutate, accountId)
      }
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Network error')
    } finally {
      setSltpLoading(false)
    }
  }, [accountId, mutate, addToast])

  // ── Reverse position (close + open opposite, with optimistic) ──
  const handleReverse = useCallback(async (pos: Position) => {
    if (closingId) return
    setClosingId(pos.id)

    // Optimistic: remove from list (will be replaced by new opposite position)
    const prevPositions = tradingData?.positions ?? []
    if (tradingData) {
      mutateTradingData(
        { ...tradingData, positions: prevPositions.filter(p => p.id !== pos.id) },
        false
      )
    }

    try {
      // 1. Close
      const closeRes = await fetch('/api/proxy/engine/close-position', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_id: pos.id }),
      })
      if (!closeRes.ok) {
        const errJson = await closeRes.json().catch(() => null)
        addToast('error', errJson?.error ?? 'Reverse failed: could not close')
        if (tradingData) mutateTradingData({ ...tradingData, positions: prevPositions }, false)
        return
      }

      // 2. Open opposite
      const newDirection = pos.direction === 'long' ? 'short' : 'long'
      const openRes = await fetch('/api/proxy/engine/orders', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          symbol: pos.symbol,
          direction: newDirection,
          order_type: 'market',
          quantity: pos.quantity,
          leverage: pos.leverage,
          margin_mode: pos.margin_mode,
        }),
      })
      if (!openRes.ok) {
        const errJson = await openRes.json().catch(() => null)
        addToast('error', errJson?.message ?? 'Reverse: could not open opposite')
      } else {
        const sideLabel = newDirection === 'long' ? 'Buy' : 'Sell'
        addToast('success', `${pos.symbol} reversed → ${sideLabel}`)
      }
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Network error')
      if (tradingData) mutateTradingData({ ...tradingData, positions: prevPositions }, false)
    } finally {
      setClosingId(null)
      revalidateAll(mutate, accountId)
      mutateTradingData()
      mutateClosed()
    }
  }, [accountId, closingId, mutate, tradingData, mutateTradingData, mutateClosed, addToast])

  // ── Cancel order (with optimistic update) ──
  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (cancellingId) return
    setCancellingId(orderId)
    try {
      const res = await fetch('/api/proxy/engine/cancel-order', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        addToast('error', errJson?.error ?? `Cancel failed (${res.status})`)
      } else {
        addToast('success', 'Order cancelled')
        revalidateAll(mutate, accountId)
      }
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Network error')
    } finally {
      setCancellingId(null)
    }
  }, [accountId, cancellingId, mutate, addToast])

  const account          = tradingData?.account
  const prices           = tradingData?.prices ?? {}
  const openPositions    = useMemo(() => tradingData?.positions?.filter(p => p.status === 'open') ?? [], [tradingData?.positions])
  const closedPositions  = closedRaw ?? []
  const orders           = pendingOrders ?? []
  const activity         = activityFeed ?? []

  // Account stats calculations (memoised — only recomputes when inputs change)
  const { balance, totalUnrealizedPnl, equity, marginUsed, marginAvailable, marginLevel, totalRealizedPnl } = useMemo(() => {
    const bal          = account?.injected_funds ?? 0
    const realized     = account?.total_pnl ?? 0
    const mUsed        = account?.total_margin_required ?? 0
    const unrealized   = openPositions.reduce((sum, pos) => {
      const mp   = prices[pos.symbol] ?? pos.entry_price
      const diff = pos.direction === 'long' ? mp - pos.entry_price : pos.entry_price - mp
      return sum + diff * pos.quantity * pos.leverage
    }, 0)
    const eq           = (account?.net_worth ?? 0) + unrealized
    const mAvailable   = account?.available_margin ?? 0
    const mLevel       = mUsed > 0 ? (eq / mUsed) * 100 : Infinity
    return { balance: bal, totalUnrealizedPnl: unrealized, equity: eq, marginUsed: mUsed, marginAvailable: mAvailable, marginLevel: mLevel, totalRealizedPnl: realized }
  }, [account, openPositions, prices])

  const tabs: { id: BottomTab; label: string; count?: number }[] = useMemo(() => [
    { id: 'positions' as BottomTab, label: 'Positions',        count: openPositions.length },
    { id: 'orders' as BottomTab,    label: 'Pending',          count: orders.length },
    { id: 'history' as BottomTab,   label: 'Closed Positions', count: closedPositions.length },
    { id: 'balance' as BottomTab,   label: 'Balance' },
    { id: 'activity' as BottomTab,  label: 'Activity' },
  ], [openPositions.length, orders.length, closedPositions.length])

  // Auto-expand when a new position appears
  const prevPosCountRef = useRef(openPositions.length)
  useEffect(() => {
    if (openPositions.length > prevPosCountRef.current && collapsed) {
      setCollapsed(false)
    }
    prevPosCountRef.current = openPositions.length
  }, [openPositions.length, collapsed])

  return (
    <>
      {/* SL/TP edit modal (portal to body) */}
      {sltpPos && typeof document !== 'undefined' && createPortal(
        <SLTPModal
          pos={sltpPos}
          currentSL={(() => {
            const slOrder = orders.find(o => o.position_id === sltpPos.id && o.order_type === 'stop' && o.status === 'pending')
            return slOrder?.stop_price ?? null
          })()}
          currentTP={(() => {
            const tpOrder = orders.find(o => o.position_id === sltpPos.id && o.order_type === 'limit' && o.status === 'pending')
            return tpOrder?.price ?? null
          })()}
          markPrice={prices[sltpPos.symbol] ?? sltpPos.entry_price}
          onClose={() => setSltpPos(null)}
          onConfirm={(sl, tp) => handleModifySLTP(sltpPos, sl, tp)}
          loading={sltpLoading}
        />,
        document.body
      )}

      {/* Partial close modal (portal to body) */}
      {partialPos && typeof document !== 'undefined' && createPortal(
        <PartialCloseModal
          pos={partialPos}
          markPrice={prices[partialPos.symbol] ?? partialPos.entry_price}
          onClose={() => setPartialPos(null)}
          onConfirm={(qty) => handlePartialClose(partialPos, qty)}
          loading={partialLoading}
        />,
        document.body
      )}

      {/*
       * Snap toggle panel:
       * - Collapsed: just tabs bar (~36px) — shrink-0, no content
       * - Expanded:  25vh with scroll — smooth CSS transition
       */}
      <div
        className="relative flex flex-col bg-card border-t border-border shrink-0 transition-[height] duration-300 ease-in-out overflow-hidden"
        style={{ height: collapsed ? '64px' : '25vh' }}
      >
        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* Account Stats Bar — always visible (position 1) */}
        <AccountStatsBar
          balance={balance + totalRealizedPnl}
          pnl={totalUnrealizedPnl}
          equity={equity}
          marginUsed={marginUsed}
          marginAvailable={marginAvailable}
          marginLevel={marginLevel}
        />

        {/* Tabs bar — always visible (position 2) */}
        <div className="flex items-center justify-between px-2 border-b border-border shrink-0 h-9">
          <div className="flex items-center overflow-x-auto no-scrollbar min-w-0">
            {tabs.map(tab => (
              <button key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (collapsed) setCollapsed(false)  // click a tab = expand
                }}
                className={cn(
                  'flex items-center gap-1 px-2 sm:px-3 h-9 text-[11px] sm:text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0',
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] px-1 rounded-full bg-primary/10 text-primary">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
          <button onClick={() => setCollapsed(v => !v)}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1"
            title={collapsed ? 'Expand panel' : 'Collapse panel'}>
            {collapsed ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>

        {/* Content area — scroll vertically + horizontally */}
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar min-h-0">

          {/* POSITIONS tab */}
          {activeTab === 'positions' && (
            openPositions.length === 0
              ? <EmptyState message="No open positions" sub="Place a trade to see your positions here" />
              : (
                <div className="overflow-x-auto">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 min-w-[900px] sticky top-0 bg-card z-10"
                    style={{ display: 'grid', gridTemplateColumns: '90px 50px 80px 90px 90px 80px 80px 70px 80px 120px 70px' }}>
                    <span>Instrument</span><span>Side</span><span>Size</span>
                    <span>Entry</span><span>Market</span>
                    <span>Margin</span><span>Exposure</span><span>Liq.</span>
                    <span>Fees</span><span>P&L</span><span>Actions</span>
                  </div>
                  {openPositions.map(pos => (
                    <LivePositionRow
                      key={pos.id}
                      pos={pos}
                      markPrice={prices[pos.symbol] ?? pos.entry_price}
                      onClose={closingId === pos.id ? undefined : handleClose}
                      onPartialClose={closingId === pos.id ? undefined : setPartialPos}
                      onReverse={closingId === pos.id ? undefined : handleReverse}
                      onEditSLTP={closingId === pos.id ? undefined : setSltpPos}
                      closing={closingId === pos.id}
                    />
                  ))}
                </div>
              )
          )}

          {/* ORDERS (Pending) tab */}
          {activeTab === 'orders' && (
            orders.length === 0
              ? <EmptyState message="No pending orders" sub="Limit and stop orders will appear here" />
              : (
                <div className="overflow-x-auto">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 min-w-[640px] sticky top-0 bg-card z-10"
                    style={{ display: 'grid', gridTemplateColumns: '90px 60px 70px 80px 80px 80px 60px 60px' }}>
                    <span>Symbol</span><span>Side</span><span>Type</span>
                    <span>Price</span><span>Qty</span><span>Leverage</span>
                    <span>Status</span><span></span>
                  </div>
                  {orders.map(order => (
                    <OrderRow key={order.id} order={order} onCancel={handleCancelOrder} cancelling={cancellingId === order.id} />
                  ))}
                </div>
              )
          )}

          {/* CLOSED POSITIONS tab */}
          {activeTab === 'history' && (
            closedPositions.length === 0
              ? <EmptyState message="No closed positions" sub="Closed trades will appear here" />
              : (
                <div className="overflow-x-auto">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 min-w-[700px] sticky top-0 bg-card z-10"
                    style={{ display: 'grid', gridTemplateColumns: '90px 50px 70px 90px 90px 80px 120px 80px' }}>
                    <span>Symbol</span><span>Side</span><span>Size</span>
                    <span>Entry</span><span>Exit</span><span>Fees</span>
                    <span>P&L</span><span>Closed At</span>
                  </div>
                  {closedPositions.map(pos => <ClosedPositionRow key={pos.id} pos={pos} />)}
                </div>
              )
          )}

          {/* BALANCE tab */}
          {activeTab === 'balance' && account && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Account Type',      value: account.account_type },
                { label: 'Starting Balance',   value: formatCurrency(account.injected_funds) },
                { label: 'Net Worth',          value: formatCurrency(account.net_worth) },
                { label: 'Available Margin',   value: formatCurrency(account.available_margin) },
                { label: 'Unrealized P&L',     value: `${totalUnrealizedPnl >= 0 ? '+' : ''}${formatCurrency(totalUnrealizedPnl)}`, color: totalUnrealizedPnl >= 0 ? 'text-profit' : 'text-loss' },
                { label: 'Realized P&L',       value: `${account.total_pnl >= 0 ? '+' : ''}${formatCurrency(account.total_pnl)}`, color: account.total_pnl >= 0 ? 'text-profit' : 'text-loss' },
                { label: 'Margin Required',    value: formatCurrency(account.total_margin_required) },
                { label: 'Margin Level',       value: marginLevel === Infinity || marginUsed === 0 ? '∞' : `${marginLevel.toFixed(0)}%`, color: marginLevel < 150 && marginUsed > 0 ? 'text-loss' : '' },
                { label: 'Open Positions',     value: String(openPositions.length) },
                { label: 'Pending Orders',     value: String(orders.length) },
                { label: 'Margin Mode',        value: account.default_margin_mode },
                { label: 'Currency',           value: account.base_currency },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
                  <span className={cn('text-sm font-medium tabular-nums capitalize', item.color ?? '')}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ACTIVITY tab */}
          {activeTab === 'activity' && (
            activity.length === 0
              ? <EmptyState message="No activity yet" sub="Trade events will appear here in real time" />
              : <div>{activity.map(item => <ActivityRow key={item.id} item={item} />)}</div>
          )}
        </div>
      </div>
    </>
  )
}
