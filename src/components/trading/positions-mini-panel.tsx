'use client'

/**
 * Positions mini-panel — compact TradingView-style open positions
 * for the right sidebar.
 *
 * Each row: [↑/↓ arrow]  [SYM]  [qty]  [+$P&L]
 * With flash effect on P&L changes and total P&L summary.
 *
 * Uses the same SWR cache as BottomPanel / OrderFormPanel (no extra requests).
 */

import { memo, useRef, useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useTradingData } from '@/lib/hooks'
import { useLivePrices } from '@/lib/price-store'
import type { Position } from '@/types'

// ─── Single position row ─────────────────────────────────────────────────────

const MiniPositionRow = memo(function MiniPositionRow({
  pos,
  markPrice,
}: {
  pos: Position
  markPrice: number
}) {
  const isLong = pos.direction === 'long'
  const priceDiff = isLong
    ? markPrice - pos.entry_price
    : pos.entry_price - markPrice
  const unrealizedPnl = priceDiff * pos.quantity * pos.leverage

  // Flash on P&L change
  const prevPnl = useRef(unrealizedPnl)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (Math.abs(unrealizedPnl - prevPnl.current) < 0.001) return
    const dir = unrealizedPnl > prevPnl.current ? 'up' : 'down'
    prevPnl.current = unrealizedPnl
    if (timerRef.current) clearTimeout(timerRef.current)
    setFlash(dir)
    timerRef.current = setTimeout(() => setFlash(null), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [unrealizedPnl])

  const sym = pos.symbol.replace('-USD', '')

  return (
    <div
      className={cn(
        'flex items-center justify-between px-2.5 py-[4px] text-[11px] tabular-nums transition-colors duration-150',
        flash === 'up' && 'bg-[#26a69a]/10',
        flash === 'down' && 'bg-[#ef5350]/10',
      )}
    >
      {/* Left: direction arrow + symbol + qty */}
      <div className="flex items-center gap-1.5 min-w-0">
        {isLong ? (
          <TrendingUp className="size-3 text-[#26a69a] shrink-0" />
        ) : (
          <TrendingDown className="size-3 text-[#ef5350] shrink-0" />
        )}
        <span className="font-medium text-[#d1d4dc] truncate">{sym}</span>
        <span className="text-[#787b86] text-[10px]">{pos.quantity}</span>
      </div>

      {/* Right: P&L */}
      <span
        className={cn(
          'font-medium shrink-0 ml-2',
          unrealizedPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]',
        )}
      >
        {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
      </span>
    </div>
  )
})

// ─── Main panel ──────────────────────────────────────────────────────────────

interface PositionsMiniPanelProps {
  accountId: string
}

export function PositionsMiniPanel({ accountId }: PositionsMiniPanelProps) {
  const { data: tradingData } = useTradingData(accountId)
  const livePrices = useLivePrices()

  const openPositions = tradingData?.positions?.filter(p => p.status === 'open') ?? []
  const prices = tradingData?.prices ?? {}

  if (openPositions.length === 0) return null

  // Total unrealized P&L
  const totalPnl = openPositions.reduce((sum, pos) => {
    const mp = livePrices[pos.symbol] || prices[pos.symbol] || pos.entry_price
    const diff = pos.direction === 'long' ? mp - pos.entry_price : pos.entry_price - mp
    return sum + diff * pos.quantity * pos.leverage
  }, 0)

  return (
    <div className="flex flex-col">
      {openPositions.map(pos => {
        const mp = livePrices[pos.symbol] || prices[pos.symbol] || pos.entry_price
        return <MiniPositionRow key={pos.id} pos={pos} markPrice={mp} />
      })}

      {/* Total row — only when 2+ positions */}
      {openPositions.length > 1 && (
        <div className="flex items-center justify-between px-2.5 py-[3px] text-[10px] border-t border-[#2a2e39]/60">
          <span className="text-[#787b86]">Total P&L</span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              totalPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]',
            )}
          >
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
          </span>
        </div>
      )}
    </div>
  )
}
