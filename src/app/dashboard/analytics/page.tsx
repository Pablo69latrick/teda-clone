'use client'

import { useState } from 'react'
import {
  BarChart3, TrendingUp, Clock, Target,
  Percent, Award, Activity,
} from 'lucide-react'
import { cn, formatCurrency, formatTimestamp } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAccounts, useTradingData } from '@/lib/hooks'
import type { Position } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

function StatCard({
  label, value, sub, icon: Icon, loading, accent,
}: {
  label: string; value: React.ReactNode; sub?: React.ReactNode
  icon: React.ElementType; loading?: boolean; accent?: 'profit' | 'loss' | 'neutral'
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card border border-border/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground/50" />
      </div>
      {loading ? (
        <><Skeleton className="h-7 w-28" /><Skeleton className="h-3.5 w-20 mt-1" /></>
      ) : (
        <>
          <div className={cn(
            'text-xl font-bold tracking-tight',
            accent === 'profit' ? 'text-profit' : accent === 'loss' ? 'text-loss' : '',
          )}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </>
      )}
    </div>
  )
}

function MiniBar({ values }: { values: number[] }) {
  const max = Math.max(...values.map(Math.abs), 1)
  return (
    <div className="flex items-end gap-0.5 h-16">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <div
            className={cn('rounded-sm', v >= 0 ? 'bg-profit/60' : 'bg-loss/60')}
            style={{ height: `${(Math.abs(v) / max) * 100}%`, minHeight: 2 }}
          />
        </div>
      ))}
    </div>
  )
}

function TradeRow({ pos }: { pos: Position }) {
  const pnl = pos.realized_pnl
  return (
    <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
      <td className="px-5 py-2.5 font-medium">{pos.symbol}</td>
      <td className="px-3 py-2.5">
        <Badge variant={pos.direction === 'long' ? 'long' : 'short'} className="text-[10px] px-1.5 py-0">
          {pos.direction}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{pos.quantity.toLocaleString()}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">${pos.entry_price.toFixed(5)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">${(pos.exit_price ?? 0).toFixed(5)}</td>
      <td className={cn('px-3 py-2.5 text-right tabular-nums font-medium', pnl >= 0 ? 'text-profit' : 'text-loss')}>
        {formatCurrency(pnl)}
      </td>
      <td className="px-5 py-2.5 text-right text-muted-foreground text-[10px] tabular-nums">
        {pos.exit_timestamp ? formatTimestamp(pos.exit_timestamp) : '—'}
      </td>
    </tr>
  )
}

function fmtPnl(v: number): string {
  return `${v >= 0 ? '+' : ''}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | 'all'>('30d')

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const account = accounts?.[0]
  const { data: tradingData, isLoading: loadingTrading } = useTradingData(account?.id)

  const loading = loadingAccounts || loadingTrading

  const acc = tradingData?.account ?? account
  const allPositions = tradingData?.positions ?? []
  const closedPositions = allPositions.filter(p => p.status === 'closed')
  const openPositions = allPositions.filter(p => p.status === 'open')

  const wins = closedPositions.filter(p => p.realized_pnl > 0)
  const losses = closedPositions.filter(p => p.realized_pnl <= 0)
  const winRate = closedPositions.length > 0 ? (wins.length / closedPositions.length) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + p.realized_pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, p) => s + p.realized_pnl, 0) / losses.length : 0
  const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin) / Math.abs(avgLoss) : 0
  const avgDuration = closedPositions.length > 0
    ? closedPositions.reduce((s, p) => {
        if (p.exit_timestamp && p.entry_timestamp) {
          const ms = (p.exit_timestamp > 1e12 ? p.exit_timestamp : p.exit_timestamp * 1000)
                   - (p.entry_timestamp > 1e12 ? p.entry_timestamp : p.entry_timestamp * 1000)
          return s + ms
        }
        return s
      }, 0) / closedPositions.length / 60_000
    : 0

  // Mock daily P&L bars (realistic-looking 30-day history)
  const dailyBars = [320, -180, 540, 220, -90, 410, 180, -240, 380, 150,
                     -120, 280, 430, -60, 390, 200, -310, 580, 140, -80,
                     620, 300, -190, 450, 220, -140, 380, 560, -70, 420]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Trading performance breakdown</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          {(['7d', '30d', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                selectedPeriod === p
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p === 'all' ? 'All time' : `Last ${p}`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total P&L" icon={TrendingUp} loading={loading}
          value={formatCurrency(acc?.total_pnl ?? 0)}
          accent={(acc?.total_pnl ?? 0) >= 0 ? 'profit' : 'loss'}
          sub={`${closedPositions.length} closed trades`}
        />
        <StatCard label="Win Rate" icon={Percent} loading={loading}
          value={`${winRate.toFixed(1)}%`}
          accent={winRate >= 50 ? 'profit' : 'loss'}
          sub={`${wins.length}W / ${losses.length}L`}
        />
        <StatCard label="Profit Factor" icon={Award} loading={loading}
          value={profitFactor > 0 ? profitFactor.toFixed(2) : '—'}
          accent={profitFactor >= 1 ? 'profit' : profitFactor > 0 ? 'loss' : 'neutral'}
          sub="Avg win / avg loss"
        />
        <StatCard label="Open Positions" icon={Activity} loading={loading}
          value={openPositions.length}
          sub={openPositions.length === 0 ? 'No active trades' : `${openPositions.length} position${openPositions.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily P&L chart */}
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Daily P&L</h2>
            </div>
            <Badge variant="secondary" className="text-[10px]">30 days</Badge>
          </div>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <MiniBar values={dailyBars} />
              <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                <span>30 days ago</span>
                <span className="font-medium text-profit">{fmtPnl(dailyBars.reduce((a, b) => a + b, 0))} total</span>
                <span>Today</span>
              </div>
            </>
          )}
        </div>

        {/* Trade breakdown */}
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Trade Breakdown</h2>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Average Win', value: avgWin, color: 'text-profit', fmt: (v: number) => formatCurrency(v) },
              { label: 'Average Loss', value: avgLoss, color: 'text-loss', fmt: (v: number) => formatCurrency(v) },
              { label: 'Avg Trade Duration', value: avgDuration, color: '', fmt: (v: number) => `${v.toFixed(0)}m` },
              { label: 'Total Fees', value: closedPositions.reduce((s, p) => s + p.total_fees, 0), color: 'text-muted-foreground', fmt: (v: number) => formatCurrency(v) },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={cn('font-medium tabular-nums', item.color)}>
                  {loading ? '—' : item.fmt(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trade history table */}
      <div className="rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Trade History</h2>
          </div>
          <span className="text-xs text-muted-foreground">{closedPositions.length} trades</span>
        </div>

        {closedPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="size-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No closed trades yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your trade history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <th className="text-left px-5 py-2">Symbol</th>
                  <th className="text-left px-3 py-2">Side</th>
                  <th className="text-right px-3 py-2">Size</th>
                  <th className="text-right px-3 py-2">Entry</th>
                  <th className="text-right px-3 py-2">Exit</th>
                  <th className="text-right px-3 py-2">P&L</th>
                  <th className="text-right px-5 py-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map(pos => (
                  <TradeRow key={pos.id} pos={pos} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
