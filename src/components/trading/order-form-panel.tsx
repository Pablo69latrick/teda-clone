'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSWRConfig } from 'swr'
import { ChevronDown, CheckCircle, XCircle, Shield } from 'lucide-react'
import { cn, formatCurrency, calcRequiredMargin } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useInstruments, useTradingData, useChallengeStatus } from '@/lib/hooks'
import { RiskCalculatorSection } from './risk-calculator-section'
import {
  calcFullRiskResult,
  calcMaxAllowedRiskPercent,
  calcLotSizeFromRisk,
  calcSlFromRisk,
  calcTpFromSlAndRR,
  calcRiskPercentFromQtyAndSl,
  type ChallengeConstraints,
} from '@/lib/risk-calc'
import type { PlaceOrderRequest } from '@/types'

interface OrderFormPanelProps {
  symbol: string
  accountId: string
}

type OrderMode = 'market' | 'pending'
type OrderSide = 'long' | 'short'
type PendingType = 'limit' | 'stop'
type RiskMode = 'risk' | 'sl' | 'manual'

export function OrderFormPanel({ symbol, accountId }: OrderFormPanelProps) {
  // ── Existing state ──────────────────────────────────────────────────────
  const [quantity, setQuantity] = useState('0.01')
  const [leverage, setLeverage] = useState(10)
  const [orderMode, setOrderMode] = useState<OrderMode>('market')
  const [pendingType, setPendingType] = useState<PendingType>('limit')
  const [showSl, setShowSl] = useState(false)
  const [showTp, setShowTp] = useState(false)
  const [slPrice, setSlPrice] = useState('')
  const [tpPrice, setTpPrice] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showLeverage, setShowLeverage] = useState(false)

  // ── Risk Calculator state ───────────────────────────────────────────────
  const [riskPercent, setRiskPercent] = useState('1')
  const [rrRatio, setRrRatio] = useState('2')
  const [showRiskCalc, setShowRiskCalc] = useState(false)
  const [riskMode, setRiskMode] = useState<RiskMode>('risk')
  const syncGuardRef = useRef(false) // prevents useEffect loop

  // ── Hooks ───────────────────────────────────────────────────────────────
  const { mutate } = useSWRConfig()
  const { data: instruments } = useInstruments()
  const { data: tradingData } = useTradingData(accountId)
  const { data: challengeStatus } = useChallengeStatus(accountId)

  // ── Instrument data ─────────────────────────────────────────────────────
  const instrument = instruments?.find(i => i.symbol === symbol)
  const currentPrice = instrument?.current_price ?? instrument?.mark_price ?? 0
  const bidPrice = instrument?.current_bid ?? currentPrice
  const askPrice = instrument?.current_ask ?? currentPrice
  const maxLev = instrument?.max_leverage ?? 50
  const priceDecimals = instrument?.price_decimals ?? 5
  const qtyDecimals = instrument?.qty_decimals ?? 2
  const minOrderSize = instrument?.min_order_size ?? 0.01

  // ── Account data ────────────────────────────────────────────────────────
  const account = tradingData?.account
  const availableMargin = account?.available_margin ?? 0
  const equity = account?.net_worth ?? account?.injected_funds ?? 200_000
  const startingBalance = account?.injected_funds ?? 200_000

  useEffect(() => {
    if (leverage > maxLev) setLeverage(maxLev)
  }, [maxLev, leverage])

  // ── Base derived values ─────────────────────────────────────────────────
  const qty = parseFloat(quantity) || 0
  const requiredMargin = calcRequiredMargin(qty, currentPrice, leverage)
  const marginPct = availableMargin > 0 ? (requiredMargin / availableMargin) * 100 : 0
  const slPriceNum = parseFloat(slPrice) || 0
  const tpPriceNum = parseFloat(tpPrice) || 0
  const entryPrice = orderMode === 'pending' && limitPrice
    ? parseFloat(limitPrice) || currentPrice
    : currentPrice

  // ── Challenge constraints ───────────────────────────────────────────────
  const challengeConstraints: ChallengeConstraints | null = useMemo(() => {
    if (!challengeStatus) return null
    return {
      dailyLossLimit: challengeStatus.daily_loss_limit ?? 0.05,
      maxDrawdown: challengeStatus.max_drawdown ?? 0.10,
      currentDailyLoss: challengeStatus.current_daily_loss ?? 0,
      currentDrawdown: challengeStatus.current_drawdown ?? 0,
    }
  }, [challengeStatus])

  const maxAllowedRisk = calcMaxAllowedRiskPercent(challengeConstraints, startingBalance, equity)

  const dailyLossRemaining = challengeConstraints
    ? (challengeConstraints.dailyLossLimit - challengeConstraints.currentDailyLoss) * startingBalance
    : Infinity
  const drawdownRemaining = challengeConstraints
    ? (challengeConstraints.maxDrawdown - challengeConstraints.currentDrawdown) * startingBalance
    : Infinity

  // ── Risk Calculator result (derived) ────────────────────────────────────
  // Direction hint: use 'long' as default since we compute both sides at order time
  const directionHint: 'long' | 'short' = 'long'

  const riskResult = useMemo(() => {
    if (!showRiskCalc || entryPrice <= 0) return null
    const riskPct = parseFloat(riskPercent) || 0
    const rr = parseFloat(rrRatio) || 2
    if (riskPct <= 0) return null

    return calcFullRiskResult(
      equity, startingBalance, entryPrice, leverage, directionHint,
      riskPct, rr, priceDecimals, qtyDecimals, minOrderSize, challengeConstraints
    )
  }, [showRiskCalc, entryPrice, riskPercent, rrRatio, equity, startingBalance,
    leverage, directionHint, priceDecimals, qtyDecimals, minOrderSize, challengeConstraints])

  // ── Bidirectional binding: sync derived fields ──────────────────────────
  useEffect(() => {
    if (!showRiskCalc || !riskResult || syncGuardRef.current) return
    syncGuardRef.current = true

    if (riskMode === 'risk') {
      // Risk % changed → update SL, TP, quantity
      setSlPrice(riskResult.slPrice.toFixed(priceDecimals))
      setTpPrice(riskResult.tpPrice.toFixed(priceDecimals))
      setQuantity(riskResult.quantity.toFixed(qtyDecimals))
    }

    // Reset guard in next microtask
    Promise.resolve().then(() => { syncGuardRef.current = false })
  }, [riskResult, riskMode, showRiskCalc, priceDecimals, qtyDecimals])

  // When user edits SL manually with risk calc open → recalc qty + risk%
  useEffect(() => {
    if (!showRiskCalc || riskMode !== 'sl' || syncGuardRef.current) return
    if (slPriceNum <= 0 || entryPrice <= 0) return
    syncGuardRef.current = true

    const riskPct = parseFloat(riskPercent) || 1
    const rr = parseFloat(rrRatio) || 2

    // Recalculate quantity from current risk% and manual SL
    const newQty = calcLotSizeFromRisk(
      equity, riskPct, entryPrice, slPriceNum, leverage, qtyDecimals, minOrderSize
    )
    setQuantity(newQty.toFixed(qtyDecimals))

    // Recalculate TP from manual SL + R:R
    const newTp = calcTpFromSlAndRR(entryPrice, slPriceNum, rr, directionHint, priceDecimals)
    setTpPrice(newTp.toFixed(priceDecimals))

    // Update implied risk %
    const impliedRisk = calcRiskPercentFromQtyAndSl(equity, newQty, entryPrice, slPriceNum, leverage)
    setRiskPercent(impliedRisk.toFixed(2))

    Promise.resolve().then(() => { syncGuardRef.current = false })
  }, [slPriceNum, riskMode, showRiskCalc]) // eslint-disable-line react-hooks/exhaustive-deps

  // When user edits quantity manually with risk calc open → recalc risk% + SL
  useEffect(() => {
    if (!showRiskCalc || riskMode !== 'manual' || syncGuardRef.current) return
    if (qty <= 0 || entryPrice <= 0) return
    syncGuardRef.current = true

    const riskPct = parseFloat(riskPercent) || 1
    const rr = parseFloat(rrRatio) || 2

    // Recalculate SL from current risk% and manual quantity
    const newSl = calcSlFromRisk(equity, riskPct, qty, entryPrice, leverage, directionHint, priceDecimals)
    if (newSl > 0) {
      setSlPrice(newSl.toFixed(priceDecimals))
      const newTp = calcTpFromSlAndRR(entryPrice, newSl, rr, directionHint, priceDecimals)
      setTpPrice(newTp.toFixed(priceDecimals))
    }

    // Update implied risk %
    if (slPriceNum > 0) {
      const impliedRisk = calcRiskPercentFromQtyAndSl(equity, qty, entryPrice, slPriceNum, leverage)
      setRiskPercent(impliedRisk.toFixed(2))
    }

    Promise.resolve().then(() => { syncGuardRef.current = false })
  }, [qty, riskMode, showRiskCalc]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Risk mode wrappers ──────────────────────────────────────────────────
  const handleRiskPercentChange = (v: string) => {
    setRiskPercent(v)
    setRiskMode('risk')
  }

  const handleRrRatioChange = (v: string) => {
    setRrRatio(v)
    setRiskMode('risk')
  }

  const handleSlPriceChangeManual = (v: string) => {
    setSlPrice(v)
    if (showRiskCalc) setRiskMode('sl')
  }

  const handleQuantityChangeManual = (v: string) => {
    setQuantity(v)
    if (showRiskCalc) setRiskMode('manual')
  }

  const handleToggleRiskCalc = (expanded: boolean) => {
    setShowRiskCalc(expanded)
    if (expanded) {
      // Auto-enable SL and TP when opening risk calculator
      if (!showSl) setShowSl(true)
      if (!showTp) setShowTp(true)
      setRiskMode('risk')
    }
  }

  // ── Existing helpers ────────────────────────────────────────────────────
  const calcSlTpPnl = (targetPrice: number, side: OrderSide) => {
    if (!targetPrice || !currentPrice || qty === 0) return { amount: 0, pct: 0 }
    const diff = side === 'long'
      ? (targetPrice - currentPrice) * qty * leverage
      : (currentPrice - targetPrice) * qty * leverage
    const pct = requiredMargin > 0 ? (diff / requiredMargin) * 100 : 0
    return { amount: diff, pct }
  }

  const handleQuantityDelta = (delta: number) => {
    const current = parseFloat(quantity) || 0
    const step = instrument?.min_order_size ?? 0.01
    const newQty = Math.max(step, current + delta * step).toFixed(instrument?.qty_decimals ?? 2)
    setQuantity(newQty)
    if (showRiskCalc) setRiskMode('manual')
  }

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 2_000)
  }

  const handlePlaceOrder = async (side: OrderSide) => {
    if (qty === 0 || submitting) return
    const isLimit = orderMode === 'pending'
    const parsedLimit = limitPrice ? parseFloat(limitPrice) : undefined
    if (isLimit && !parsedLimit) return

    const effectiveOrderType = orderMode === 'market' ? 'market' : pendingType

    const payload: PlaceOrderRequest = {
      account_id: accountId,
      symbol,
      direction: side,
      order_type: effectiveOrderType,
      quantity: qty,
      leverage,
      margin_mode: 'cross',
      ...(parsedLimit ? { price: parsedLimit } : {}),
      ...(showTp && tpPrice ? { tp_price: parseFloat(tpPrice) } : {}),
      ...(showSl && slPrice ? { sl_price: parseFloat(slPrice) } : {}),
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
        ? `${side.toUpperCase()} ${qty} ${symbol} filled @ ${orderMode === 'market' ? 'market' : parsedLimit}`
        : `${side.toUpperCase()} ${qty} ${symbol} ${effectiveOrderType} order placed`
      showToast('success', filledMsg)

      // Optimistic: inject data into SWR caches for instant UI update
      const tradingDataKey = `/api/proxy/engine/trading-data?account_id=${accountId}`
      if (order.status === 'filled') {
        // Inject position into trading-data cache immediately (no revalidate — let the 3s interval handle it)
        mutate(tradingDataKey, (prev: Record<string, unknown> | undefined) => {
          if (!prev) return prev
          const prevPositions = (prev.positions ?? []) as Record<string, unknown>[]
          const prevAccount = prev.account as Record<string, number> | undefined
          return {
            ...prev,
            positions: [...prevPositions, { ...order, unrealized_pnl: 0, original_quantity: order.quantity }],
            account: prevAccount ? {
              ...prevAccount,
              available_margin: (prevAccount.available_margin ?? 0) - (order.isolated_margin ?? 0),
              total_margin_required: (prevAccount.total_margin_required ?? 0) + (order.isolated_margin ?? 0),
            } : prevAccount,
          }
        }, { revalidate: false })
      }

      // Force immediate revalidation of all related caches
      // Using setTimeout(0) to ensure optimistic data renders first
      setTimeout(() => {
        mutate(tradingDataKey)
        mutate(`/api/proxy/engine/orders?account_id=${accountId}`)
        mutate(`/api/proxy/engine/activity?account_id=${accountId}`)
        mutate(`/api/proxy/engine/closed-positions?account_id=${accountId}`)
      }, 100)

      setQuantity(instrument?.min_order_size?.toString() ?? '0.01')
      setLimitPrice('')
      setSlPrice('')
      setTpPrice('')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Order failed')
    } finally {
      setSubmitting(false)
    }
  }

  const isDisabled = qty === 0 || submitting || (orderMode === 'pending' && !limitPrice)

  // ── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-card">
      {/* Mode toggle: MARKET / PENDING */}
      <div className="flex items-center border-b border-border/50">
        {(['market', 'pending'] as OrderMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setOrderMode(mode)}
            className={cn(
              'flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors text-center',
              orderMode === mode
                ? 'text-foreground border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {mode === 'market' ? 'Market' : 'Pending'}
          </button>
        ))}
      </div>

      {/* Pending sub-type */}
      {orderMode === 'pending' && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50">
          {(['limit', 'stop'] as PendingType[]).map(type => (
            <button
              key={type}
              onClick={() => setPendingType(type)}
              className={cn(
                'px-2.5 py-0.5 rounded text-[10px] font-medium capitalize transition-colors',
                pendingType === type
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Price input (for pending orders) */}
      {orderMode === 'pending' && (
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {pendingType === 'stop' ? 'Stop Price' : 'Limit Price'}
            </span>
            <button
              onClick={() => setLimitPrice(currentPrice.toFixed(priceDecimals))}
              className="text-[10px] text-primary hover:text-primary/80 transition-colors"
            >
              Current: {currentPrice.toFixed(priceDecimals)}
            </button>
          </div>
          <div className="flex items-center gap-1 bg-muted/30 rounded-md border border-border/50">
            <button
              onClick={() => {
                const v = parseFloat(limitPrice) || currentPrice
                const step = instrument?.tick_size ?? 0.01
                setLimitPrice((v - step).toFixed(priceDecimals))
              }}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >−</button>
            <input
              type="text"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              placeholder={currentPrice.toFixed(priceDecimals)}
              className="flex-1 bg-transparent text-center text-sm font-medium text-foreground focus:outline-none py-1.5 tabular-nums"
            />
            <button
              onClick={() => {
                const v = parseFloat(limitPrice) || currentPrice
                const step = instrument?.tick_size ?? 0.01
                setLimitPrice((v + step).toFixed(priceDecimals))
              }}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >+</button>
          </div>
        </div>
      )}

      {/* Quantity input */}
      <div className="px-3 py-2 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Volume (lots)</span>
          {instrument && (
            <span className="text-[10px] text-muted-foreground">min {instrument.min_order_size}</span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-muted/30 rounded-md border border-border/50">
          <button onClick={() => handleQuantityDelta(-1)}
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">−</button>
          <input type="text" value={quantity} onChange={e => handleQuantityChangeManual(e.target.value)}
            className="flex-1 bg-transparent text-center text-sm font-medium text-foreground focus:outline-none py-1.5 tabular-nums" />
          <button onClick={() => handleQuantityDelta(1)}
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">+</button>
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          {[0.01, 0.05, 0.1, 0.5, 1].map(q => (
            <button key={q} onClick={() => {
              const v = q.toFixed(instrument?.qty_decimals ?? 2)
              setQuantity(v)
              if (showRiskCalc) setRiskMode('manual')
            }}
              className={cn(
                'flex-1 py-0.5 rounded text-[9px] font-medium transition-colors border',
                parseFloat(quantity) === q
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
              )}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* SL / TP toggle buttons */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50">
        <button onClick={() => setShowSl(v => !v)}
          className={cn(
            'flex-1 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all border',
            showSl ? 'bg-loss/10 text-loss border-loss/30' : 'text-muted-foreground border-border/50 hover:text-foreground hover:border-border'
          )}>SL</button>
        <button onClick={() => setShowTp(v => !v)}
          className={cn(
            'flex-1 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all border',
            showTp ? 'bg-profit/10 text-profit border-profit/30' : 'text-muted-foreground border-border/50 hover:text-foreground hover:border-border'
          )}>TP</button>
        <button onClick={() => { setShowSl(v => !v); setShowTp(v => !v) }}
          className={cn(
            'px-2 py-1 rounded text-[10px] font-medium transition-all border',
            showSl && showTp ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground border-border/50 hover:text-foreground hover:border-border'
          )}
          title="Toggle both SL & TP">R:R</button>
      </div>

      {/* SL input */}
      {showSl && (
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-loss uppercase tracking-wider font-semibold">Stop Loss</span>
            {slPriceNum > 0 && (
              <span className="text-[10px] text-loss tabular-nums">
                {calcSlTpPnl(slPriceNum, 'long').amount < 0 ? '' : '+'}
                {formatCurrency(calcSlTpPnl(slPriceNum, 'long').amount)}
                {' '}/ {calcSlTpPnl(slPriceNum, 'long').pct.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-muted/30 rounded-md border border-loss/30">
            <button onClick={() => { const v = parseFloat(slPrice) || currentPrice; const step = instrument?.tick_size ?? 0.01; handleSlPriceChangeManual((v - step).toFixed(priceDecimals)) }}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm">−</button>
            <input type="text" value={slPrice} onChange={e => handleSlPriceChangeManual(e.target.value)}
              placeholder={currentPrice > 0 ? (currentPrice * 0.99).toFixed(priceDecimals) : '0.00'}
              className="flex-1 bg-transparent text-center text-sm font-medium text-foreground focus:outline-none py-1.5 tabular-nums" />
            <button onClick={() => { const v = parseFloat(slPrice) || currentPrice; const step = instrument?.tick_size ?? 0.01; handleSlPriceChangeManual((v + step).toFixed(priceDecimals)) }}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm">+</button>
          </div>
        </div>
      )}

      {/* TP input */}
      {showTp && (
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-profit uppercase tracking-wider font-semibold">Take Profit</span>
            {tpPriceNum > 0 && (
              <span className="text-[10px] text-profit tabular-nums">
                +{formatCurrency(calcSlTpPnl(tpPriceNum, 'long').amount)}
                {' '}/ +{calcSlTpPnl(tpPriceNum, 'long').pct.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-muted/30 rounded-md border border-profit/30">
            <button onClick={() => { const v = parseFloat(tpPrice) || currentPrice; const step = instrument?.tick_size ?? 0.01; setTpPrice((v - step).toFixed(priceDecimals)) }}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm">−</button>
            <input type="text" value={tpPrice} onChange={e => setTpPrice(e.target.value)}
              placeholder={currentPrice > 0 ? (currentPrice * 1.01).toFixed(priceDecimals) : '0.00'}
              className="flex-1 bg-transparent text-center text-sm font-medium text-foreground focus:outline-none py-1.5 tabular-nums" />
            <button onClick={() => { const v = parseFloat(tpPrice) || currentPrice; const step = instrument?.tick_size ?? 0.01; setTpPrice((v + step).toFixed(priceDecimals)) }}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground text-sm">+</button>
          </div>
        </div>
      )}

      {/* ── RISK CALCULATOR (collapsible) ──────────────────────────────── */}
      <RiskCalculatorSection
        riskPercent={riskPercent}
        setRiskPercent={handleRiskPercentChange}
        rrRatio={rrRatio}
        setRrRatio={handleRrRatioChange}
        isExpanded={showRiskCalc}
        setIsExpanded={handleToggleRiskCalc}
        riskResult={riskResult}
        maxAllowedRiskPercent={maxAllowedRisk}
        dailyLossRemaining={dailyLossRemaining}
        drawdownRemaining={drawdownRemaining}
        startingBalance={startingBalance}
      />

      {/* Leverage (collapsible) */}
      <div className="px-3 py-2 border-b border-border/50">
        <button onClick={() => setShowLeverage(v => !v)} className="flex items-center justify-between w-full">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Leverage</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-foreground">{leverage}×</span>
            <ChevronDown className={cn('size-3 text-muted-foreground transition-transform', showLeverage && 'rotate-180')} />
          </div>
        </button>
        {showLeverage && (
          <div className="mt-2">
            <input type="range" min={1} max={maxLev} value={leverage}
              onChange={e => setLeverage(Number(e.target.value))}
              className="w-full h-1 rounded-full accent-primary cursor-pointer" />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
              <span>1×</span>
              {[0.25, 0.5, 0.75].map(frac => (
                <button key={frac} onClick={() => setLeverage(Math.round(maxLev * frac))}
                  className="hover:text-foreground transition-colors">{Math.round(maxLev * frac)}×</button>
              ))}
              <span>{maxLev}×</span>
            </div>
          </div>
        )}
      </div>

      {/* Init Margin info */}
      <div className="px-3 py-1.5 border-b border-border/50">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <Shield className="size-2.5" /> Init. Margin
          </span>
          <span className="text-foreground font-medium tabular-nums">
            {formatCurrency(requiredMargin)}
            {marginPct > 0 && (
              <span className={cn('ml-1', marginPct > 80 ? 'text-loss' : 'text-muted-foreground')}>
                ({marginPct.toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
        {qty > 0 && currentPrice > 0 && (
          <div className="flex items-center justify-between text-[10px] mt-0.5">
            <span className="text-muted-foreground">Exposure</span>
            <span className="text-muted-foreground tabular-nums">{formatCurrency(qty * currentPrice)}</span>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'mx-2 my-1 px-3 py-2 rounded-lg border text-xs flex items-center gap-2 transition-all',
          toast.type === 'success' ? 'bg-profit/10 border-profit/30 text-profit' : 'bg-loss/10 border-loss/30 text-loss'
        )}>
          {toast.type === 'success' ? <CheckCircle className="size-3.5 shrink-0" /> : <XCircle className="size-3.5 shrink-0" />}
          <span className="truncate">{toast.msg}</span>
        </div>
      )}

      {/* SELL / BUY buttons with bid/ask prices */}
      <div className="grid grid-cols-2 gap-1.5 p-2">
        <Button variant="short" data-action="short" onClick={() => handlePlaceOrder('short')} disabled={isDisabled}
          className="h-12 flex flex-col items-center justify-center gap-0 rounded-lg">
          {submitting ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
            <><span className="text-xs font-bold tracking-wide">SELL</span>
              <span className="text-[10px] font-medium tabular-nums opacity-80">{bidPrice > 0 ? bidPrice.toFixed(priceDecimals) : '—'}</span></>
          )}
        </Button>
        <Button variant="long" data-action="long" onClick={() => handlePlaceOrder('long')} disabled={isDisabled}
          className="h-12 flex flex-col items-center justify-center gap-0 rounded-lg">
          {submitting ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
            <><span className="text-xs font-bold tracking-wide">BUY</span>
              <span className="text-[10px] font-medium tabular-nums opacity-80">{askPrice > 0 ? askPrice.toFixed(priceDecimals) : '—'}</span></>
          )}
        </Button>
      </div>

      {/* Spread */}
      <div className="flex items-center justify-center px-3 pb-2 text-[9px] text-muted-foreground tabular-nums">
        Spread: {(askPrice - bidPrice).toFixed(priceDecimals)}
        {currentPrice > 0 && <span className="ml-1">({((askPrice - bidPrice) / currentPrice * 100).toFixed(3)}%)</span>}
      </div>
    </div>
  )
}
