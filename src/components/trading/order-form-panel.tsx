'use client'

import { useState, useEffect } from 'react'
import { useSWRConfig } from 'swr'
import { ChevronDown, Info, CheckCircle, XCircle } from 'lucide-react'
import { cn, formatCurrency, calcRequiredMargin } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useInstruments } from '@/lib/hooks'
import type { PlaceOrderRequest } from '@/types'

interface OrderFormPanelProps {
  symbol: string
  accountId: string
}

type OrderSide = 'long' | 'short'
type OrderType = 'market' | 'limit' | 'stop'

export function OrderFormPanel({ symbol, accountId }: OrderFormPanelProps) {
  const [quantity, setQuantity] = useState('0.00')
  const [leverage, setLeverage] = useState(10)
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [showSlTp, setShowSlTp] = useState(false)
  const [slPrice, setSlPrice] = useState('')
  const [tpPrice, setTpPrice] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const { mutate } = useSWRConfig()
  const { data: instruments } = useInstruments()

  // Find the current instrument matching the selected symbol
  const instrument = instruments?.find(i => i.symbol === symbol)
  const currentPrice = instrument?.current_price ?? instrument?.mark_price ?? 0
  const maxLev = instrument?.max_leverage ?? 50
  const fundingRate = instrument?.funding_rate ?? 0
  const nextFundingTime = instrument?.next_funding_time ?? (Date.now() + 4 * 60 * 60 * 1000)
  const priceDecimals = instrument?.price_decimals ?? 5

  // Clamp leverage when switching symbols (different max_leverage)
  useEffect(() => {
    if (leverage > maxLev) setLeverage(maxLev)
  }, [maxLev, leverage])

  const qty = parseFloat(quantity) || 0
  const requiredMargin = calcRequiredMargin(qty, currentPrice, leverage)

  const handleQuantityChange = (delta: number) => {
    const current = parseFloat(quantity) || 0
    const step = instrument?.min_order_size ?? 0.01
    setQuantity(Math.max(0, current + delta * step).toFixed(instrument?.qty_decimals ?? 2))
  }

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3_500)
  }

  const handlePlaceOrder = async (side: OrderSide) => {
    if (qty === 0 || submitting) return
    const parsedLimit = limitPrice ? parseFloat(limitPrice) : undefined
    if (orderType !== 'market' && !parsedLimit) return

    const payload: PlaceOrderRequest = {
      account_id: accountId,
      symbol,
      direction: side,
      order_type: orderType,
      quantity: qty,
      leverage,
      margin_mode: 'cross',
      ...(parsedLimit ? { price: parsedLimit } : {}),
      ...(tpPrice ? { tp_price: parseFloat(tpPrice) } : {}),
      ...(slPrice ? { sl_price: parseFloat(slPrice) } : {}),
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/proxy/engine/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message ?? `Order rejected (${res.status})`)
      }
      const order = await res.json()
      const filledMsg = order.status === 'filled'
        ? `${side.toUpperCase()} ${qty} ${symbol} filled @ market`
        : `${side.toUpperCase()} ${qty} ${symbol} order placed`
      showToast('success', filledMsg)

      // UX #5: Immediately invalidate SWR caches so positions/account update
      // without waiting for the next 2s poll
      mutate(`/api/proxy/engine/positions?account_id=${accountId}`)
      mutate(`/api/proxy/engine/trading-data?account_id=${accountId}`)
      mutate('/api/proxy/actions/accounts')
      mutate(`/api/proxy/engine/activity?account_id=${accountId}`)

      // UX #6: Reset form fields after successful order
      setQuantity('0.00')
      setLimitPrice('')
      setSlPrice('')
      setTpPrice('')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Order failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Countdown to next funding
  const [nextFunding, setNextFunding] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = nextFundingTime - Date.now()
      if (diff <= 0) { setNextFunding('00:00:00'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setNextFunding(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [nextFundingTime])

  return (
    <div className="flex flex-col bg-card">
      {/* Symbol header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">
            {symbol[0]}
          </div>
          <span className="text-xs font-semibold text-foreground">{symbol}</span>
          <Info className="size-3 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-1">
          <button className="px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/50 transition-colors">
            Risk
          </button>
          <button
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/50 transition-colors"
            onClick={() => setShowSlTp(v => !v)}
          >
            SL
          </button>
          <button
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/50 transition-colors"
            onClick={() => setShowSlTp(v => !v)}
          >
            TP
          </button>
          <button className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="size-3" />
          </button>
        </div>
      </div>

      {/* Price + Init margin display */}
      <div className="px-3 py-1.5 border-b border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Init Margin:{' '}
          <span className="text-foreground font-medium">
            {formatCurrency(requiredMargin)} ({leverage}x)
          </span>
        </span>
        {currentPrice > 0 && (
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            ${currentPrice.toFixed(priceDecimals)}
          </span>
        )}
      </div>

      {/* Order type selector */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50">
        {(['market', 'limit', 'stop'] as OrderType[]).map(type => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium capitalize transition-colors',
              orderType === type
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Quantity input */}
      <div className="px-3 py-2 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Size (lots)</span>
          {instrument && (
            <span className="text-[10px] text-muted-foreground">
              min {instrument.min_order_size}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-muted/30 rounded-md border border-border/50">
          <button
            onClick={() => handleQuantityChange(-1)}
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            −
          </button>
          <input
            type="text"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="flex-1 bg-transparent text-center text-sm font-medium text-foreground focus:outline-none py-1.5 tabular-nums"
          />
          <button
            onClick={() => handleQuantityChange(1)}
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Price input (for limit/stop) */}
      {orderType !== 'market' && (
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {orderType === 'stop' ? 'Stop Price' : 'Limit Price'}
            </span>
            <span className="text-[10px] text-muted-foreground">{formatCurrency(currentPrice, 'USD', priceDecimals)}</span>
          </div>
          <div className="bg-muted/30 rounded-md border border-border/50 px-2 py-1.5">
            <input
              type="text"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              placeholder={currentPrice > 0 ? currentPrice.toFixed(priceDecimals) : '0.00000'}
              className="w-full bg-transparent text-sm text-foreground focus:outline-none tabular-nums"
            />
          </div>
        </div>
      )}

      {/* Leverage slider */}
      <div className="px-3 py-2 border-b border-border/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Leverage</span>
          <span className="text-xs font-semibold text-foreground">{leverage}×</span>
        </div>
        <input
          type="range"
          min={1}
          max={maxLev}
          value={leverage}
          onChange={e => setLeverage(Number(e.target.value))}
          className="w-full h-1 rounded-full accent-primary cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>1×</span>
          <span>{Math.round(maxLev * 0.25)}×</span>
          <span>{Math.round(maxLev * 0.5)}×</span>
          <span>{maxLev}×</span>
        </div>
      </div>

      {/* SL/TP (collapsible) */}
      {showSlTp && (
        <div className="px-3 py-2 border-b border-border/50 flex flex-col gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Stop Loss</span>
            <div className="bg-muted/30 rounded-md border border-loss/30 px-2 py-1.5">
              <input
                type="text"
                value={slPrice}
                onChange={e => setSlPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-sm text-foreground focus:outline-none tabular-nums"
              />
            </div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Take Profit</span>
            <div className="bg-muted/30 rounded-md border border-profit/30 px-2 py-1.5">
              <input
                type="text"
                value={tpPrice}
                onChange={e => setTpPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-sm text-foreground focus:outline-none tabular-nums"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={cn(
          'mx-2 mb-1 px-3 py-2 rounded-lg border text-xs flex items-center gap-2 transition-all',
          toast.type === 'success'
            ? 'bg-profit/10 border-profit/30 text-profit'
            : 'bg-loss/10 border-loss/30 text-loss'
        )}>
          {toast.type === 'success'
            ? <CheckCircle className="size-3.5 shrink-0" />
            : <XCircle className="size-3.5 shrink-0" />
          }
          <span className="truncate">{toast.msg}</span>
        </div>
      )}

      {/* Short / Long buttons */}
      <div className="grid grid-cols-7 gap-1 p-2">
        <Button
          variant="short"
          onClick={() => handlePlaceOrder('short')}
          disabled={qty === 0 || submitting || (orderType !== 'market' && !limitPrice)}
          className="col-span-3 h-10 text-sm font-semibold"
        >
          {submitting ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Short'}
        </Button>
        {/* Center: quantity display */}
        <div className="col-span-1 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground text-center leading-tight tabular-nums">
            {qty.toFixed(instrument?.qty_decimals ?? 2)}
            <br />
            <span className="text-[8px]">lots</span>
          </span>
        </div>
        <Button
          variant="long"
          onClick={() => handlePlaceOrder('long')}
          disabled={qty === 0 || submitting || (orderType !== 'market' && !limitPrice)}
          className="col-span-3 h-10 text-sm font-semibold"
        >
          {submitting ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Long'}
        </Button>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>MARGIN USED</span>
          <span className="text-foreground font-medium tabular-nums">{formatCurrency(requiredMargin)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>FUNDING</span>
          <span className={cn('font-medium tabular-nums', fundingRate < 0 ? 'text-loss' : 'text-profit')}>
            {(fundingRate * 100).toFixed(4)}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span>⏱ NEXT</span>
          <span className="text-foreground font-medium tabular-nums">{nextFunding}</span>
        </div>
      </div>
    </div>
  )
}
