'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, BarChart3, Calendar, Trophy, Medal,
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  Wallet, Target, ShieldAlert, Activity, Clock,
  ArrowUpRight, ArrowDownRight, Zap, CheckCircle2,
} from 'lucide-react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  useAccounts, useTradingData, useChallengeStatus,
  useEquityHistory, useActivity,
} from '@/lib/hooks'
import type { EquityPoint, ActivityItem } from '@/lib/hooks'

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded', className)} />
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: React.ElementType
  loading?: boolean
  accent?: 'profit' | 'loss' | 'neutral'
}
function StatCard({ label, value, sub, icon: Icon, loading, accent }: StatCardProps) {
  return (
    <div className={cn(
      'flex flex-col gap-3 rounded-xl bg-card border border-border/50 p-4 transition-all hover:border-border hover:shadow-sm',
      accent === 'profit' && 'border-profit/20',
      accent === 'loss' && 'border-loss/20',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
        <Icon className={cn(
          'size-4',
          accent === 'profit' ? 'text-profit/60' : accent === 'loss' ? 'text-loss/60' : 'text-muted-foreground/50'
        )} />
      </div>
      {loading ? (
        <><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-20" /></>
      ) : (
        <>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </>
      )}
    </div>
  )
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
interface ProgressBarProps {
  label: string; current: number; max: number
  format?: (v: number) => string; inverted?: boolean; loading?: boolean
}
function ProgressBar({ label, current, max, format, inverted, loading }: ProgressBarProps) {
  const pct = Math.min(100, max > 0 ? (Math.abs(current) / Math.abs(max)) * 100 : 0)
  const isWarning = pct > 70; const isDanger = pct > 90
  const fmt = format ?? formatCurrency
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums',
          inverted && isDanger ? 'text-loss' : inverted && isWarning ? 'text-yellow-500' :
          !inverted && isDanger ? 'text-profit' : ''
        )}>
          {loading ? '—' : `${fmt(current)} / ${fmt(max)}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        {loading ? <div className="shimmer h-full w-full rounded-full" /> : (
          <div
            className={cn('h-full rounded-full transition-all duration-700',
              inverted ? isDanger ? 'bg-loss' : isWarning ? 'bg-yellow-500' : 'bg-profit/60'
                       : isDanger ? 'bg-profit' : isWarning ? 'bg-profit/80' : 'bg-primary/50'
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Equity curve (pure SVG, no lib dep) ───────────────────────────────────────
function EquityChart({ points, loading }: { points: EquityPoint[]; loading: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 600; const H = 120; const PAD = 8

  if (loading || points.length < 2) {
    return (
      <div className="w-full h-[120px] rounded-lg overflow-hidden">
        <div className="shimmer w-full h-full" />
      </div>
    )
  }

  const equities = points.map(p => p.equity)
  const minE = Math.min(...equities)
  const maxE = Math.max(...equities)
  const range = maxE - minE || 1

  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const toY = (e: number) => H - PAD - ((e - minE) / range) * (H - PAD * 2)

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.equity).toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${toX(points.length - 1).toFixed(1)},${H} L${toX(0).toFixed(1)},${H} Z`

  const lastPnl = points[points.length - 1].pnl
  const isUp = lastPnl >= 0
  const color = isUp ? '#22c55e' : '#ef4444'
  const gradId = `eq-grad-${isUp ? 'up' : 'dn'}`

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-[120px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={toX(points.length - 1)} cy={toY(points[points.length - 1].equity)} r="3" fill={color} />
    </svg>
  )
}

// ─── Activity row ─────────────────────────────────────────────────────────────
function ActivityRow({ item }: { item: ActivityItem }) {
  const icons = {
    position:  { icon: TrendingUp,    color: 'text-primary bg-primary/10' },
    closed:    { icon: Activity,       color: item.pnl && item.pnl >= 0 ? 'text-profit bg-profit/10' : 'text-loss bg-loss/10' },
    order:     { icon: Clock,          color: 'text-yellow-500 bg-yellow-500/10' },
    challenge: { icon: Target,         color: 'text-primary bg-primary/10' },
    payout:    { icon: Wallet,         color: 'text-profit bg-profit/10' },
    system:    { icon: CheckCircle2,   color: 'text-muted-foreground bg-muted/50' },
  }
  const { icon: Icon, color } = icons[item.type] ?? icons.system

  const now = Date.now()
  const diff = now - item.ts
  const ago = diff < 60_000 ? 'just now'
    : diff < 3600_000 ? `${Math.floor(diff / 60_000)}m ago`
    : diff < 86400_000 ? `${Math.floor(diff / 3600_000)}h ago`
    : `${Math.floor(diff / 86400_000)}d ago`

  return (
    <div className="flex items-center gap-3 py-2.5 px-5 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
      <div className={cn('size-7 rounded-full flex items-center justify-center shrink-0', color)}>
        <Icon className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-tight truncate">{item.title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
      </div>
      <div className="text-right shrink-0">
        {item.pnl !== null && (
          <p className={cn('text-xs font-medium tabular-nums', item.pnl >= 0 ? 'text-profit' : 'text-loss')}>
            {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl)}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">{ago}</p>
      </div>
    </div>
  )
}

// ─── Live positions mini-table ─────────────────────────────────────────────────
function LivePositions({ accountId }: { accountId: string }) {
  const { data: tradingData } = useTradingData(accountId)
  const positions = tradingData?.positions?.filter(p => p.status === 'open') ?? []
  const prices = tradingData?.prices ?? {}

  if (positions.length === 0) return (
    <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
      <AlertTriangle className="size-4 opacity-40" />
      <span className="text-sm">No open positions</span>
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-5 px-5 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/40 min-w-[480px]">
        <span>Symbol</span><span>Side</span><span>Size</span><span>Entry → Mark</span><span className="text-right">Unrealized P&L</span>
      </div>
      {positions.map(pos => {
        const markPrice = prices[pos.symbol] ?? pos.entry_price
        const priceDiff = pos.direction === 'long'
          ? markPrice - pos.entry_price
          : pos.entry_price - markPrice
        const unrealizedPnl = priceDiff * pos.quantity * pos.leverage
        const pnlPct = pos.isolated_margin > 0 ? (unrealizedPnl / pos.isolated_margin) * 100 : 0
        return (
          <div key={pos.id} className="grid grid-cols-5 px-5 py-2.5 text-xs border-b border-border/20 hover:bg-muted/20 min-w-[480px] transition-colors">
            <span className="font-semibold">{pos.symbol}</span>
            <Badge variant={pos.direction as 'long' | 'short'} className="text-[10px] px-1.5 py-0 h-4 w-fit">{pos.direction}</Badge>
            <span className="tabular-nums text-muted-foreground">{pos.quantity} × {pos.leverage}x</span>
            <span className="tabular-nums text-muted-foreground">
              ${pos.entry_price.toLocaleString()} → <span className="text-foreground">${markPrice.toLocaleString()}</span>
            </span>
            <span className={cn('tabular-nums font-medium text-right', unrealizedPnl >= 0 ? 'text-profit' : 'text-loss')}>
              {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
              <span className="text-[10px] ml-1 opacity-70">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Quick nav ─────────────────────────────────────────────────────────────────
const quickLinks = [
  { label: 'Overview',     href: '/dashboard/overview',     icon: LayoutDashboard, active: true },
  { label: 'Analytics',    href: '/dashboard/analytics',    icon: BarChart3 },
  { label: 'Calendar',     href: '/dashboard/calendar',     icon: Calendar },
  { label: 'Competitions', href: '/dashboard/competitions', icon: Trophy },
  { label: 'Leaderboard',  href: '/dashboard/leaderboard',  icon: Medal },
]

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const account = accounts?.[0]

  const { data: tradingData, isLoading: loadingTrading } = useTradingData(account?.id)
  const { data: challengeStatus, isLoading: loadingChallenge } = useChallengeStatus(account?.id)
  const { data: equityHistory, isLoading: loadingEquity } = useEquityHistory(account?.id)
  const { data: activity, isLoading: loadingActivity } = useActivity(account?.id)

  const loading = loadingAccounts || loadingTrading

  const acc = tradingData?.account ?? account
  const balance = acc?.net_worth ?? 0
  const totalPnl = acc?.total_pnl ?? 0
  const initialBalance = balance - totalPnl
  const pnlPct = initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0
  const availableMargin = acc?.available_margin ?? balance
  const openPositions = tradingData?.positions?.filter(p => p.status === 'open') ?? []

  const profitCurrent = challengeStatus?.current_profit ?? 0
  const profitTarget = challengeStatus?.profit_target ?? 0
  const dailyLoss = challengeStatus?.current_daily_loss ?? 0
  const dailyLossLimit = challengeStatus?.daily_loss_limit ?? 0
  const drawdown = challengeStatus?.current_drawdown ?? 0
  const maxDrawdown = challengeStatus?.max_drawdown ?? 0
  const tradingDays = challengeStatus?.trading_days ?? 0
  const minTradingDays = challengeStatus?.min_trading_days ?? 0

  // Compute today's P&L from equity history
  const todayPnl = equityHistory && equityHistory.length >= 2
    ? equityHistory[equityHistory.length - 1].equity - equityHistory[equityHistory.length - 2].equity
    : totalPnl

  return (
    <div className="flex flex-col gap-5">

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {quickLinks.map(link => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all',
              link.active
                ? 'bg-card border border-border text-foreground shadow-sm'
                : 'bg-card/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border'
            )}>
              <Icon className="size-4" />{link.label}
            </Link>
          )
        })}
      </div>

      {/* Account banner */}
      <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-card border border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Target className="size-5 text-primary" />
          </div>
          <div>
            {loadingAccounts ? <Skeleton className="h-5 w-40 mb-1" /> : (
              <p className="text-sm font-semibold">{acc?.name ?? 'Phase 1 — Evaluation'}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="active">active</Badge>
              {account && <span className="text-xs text-muted-foreground">ID: {account.id.slice(0, 8)}…</span>}
            </div>
          </div>
        </div>
        <Link href="/trade" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          <TrendingUp className="size-4" />Trade Now
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Balance" icon={Wallet} loading={loading}
          value={formatCurrency(balance)}
          sub={`Started at ${formatCurrency(initialBalance > 0 ? initialBalance : 200_000)}`}
        />
        <StatCard label="Total P&L" icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          loading={loading} accent={totalPnl >= 0 ? 'profit' : 'loss'}
          value={<span className={totalPnl >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(totalPnl)}</span>}
          sub={<span className={cn('flex items-center gap-1', totalPnl >= 0 ? 'text-profit' : 'text-loss')}>
            {totalPnl >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {formatPercent(Math.abs(pnlPct))}
          </span>}
        />
        <StatCard label="Today's P&L" icon={Activity} loading={loading || loadingEquity}
          accent={todayPnl >= 0 ? 'profit' : 'loss'}
          value={<span className={todayPnl >= 0 ? 'text-profit' : 'text-loss'}>{todayPnl >= 0 ? '+' : ''}{formatCurrency(todayPnl)}</span>}
          sub="vs yesterday's close"
        />
        <StatCard label="Open Positions" icon={BarChart3} loading={loading}
          value={openPositions.length}
          sub={openPositions.length === 0 ? 'No active trades' : `${openPositions.length} position${openPositions.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Left — equity curve + challenge progress */}
        <div className="xl:col-span-2 flex flex-col gap-5">

          {/* Equity curve card */}
          <div className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="text-sm font-semibold">Equity Curve</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">30-day balance history</p>
              </div>
              {equityHistory && (
                <div className={cn('flex items-center gap-1 text-xs font-medium',
                  equityHistory[equityHistory.length - 1].pnl >= 0 ? 'text-profit' : 'text-loss'
                )}>
                  {equityHistory[equityHistory.length - 1].pnl >= 0
                    ? <ArrowUpRight className="size-3.5" />
                    : <ArrowDownRight className="size-3.5" />}
                  {formatCurrency(Math.abs(equityHistory[equityHistory.length - 1].pnl))}
                  <span className="text-muted-foreground font-normal ml-1">30d</span>
                </div>
              )}
            </div>
            <div className="px-2 pb-3">
              <EquityChart points={equityHistory ?? []} loading={loadingEquity} />
            </div>
          </div>

          {/* Challenge progress */}
          <div className="rounded-xl bg-card border border-border/50 shadow-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Challenge Progress</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">Phase 1</Badge>
                <span className={cn('text-[10px] font-medium',
                  tradingDays >= minTradingDays ? 'text-profit' : 'text-muted-foreground'
                )}>
                  {tradingDays}/{minTradingDays} days
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-4 px-5 pb-5">
              <ProgressBar label="Profit Target" current={profitCurrent} max={profitTarget}
                loading={loadingChallenge} format={v => `+${formatPercent(v * 100)}`} />
              <ProgressBar label="Daily Loss Limit" current={dailyLoss} max={dailyLossLimit}
                loading={loadingChallenge} format={v => formatCurrency(v * (balance || 200_000))} inverted />
              <ProgressBar label="Max Drawdown" current={drawdown} max={maxDrawdown}
                loading={loadingChallenge} format={v => formatCurrency(v * (balance || 200_000))} inverted />
              <div className="flex items-center justify-between text-xs mt-1 pt-3 border-t border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3" />Trading Days
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.max(minTradingDays, tradingDays) }, (_, i) => (
                    <div key={i} className={cn(
                      'w-4 h-4 rounded-sm text-[8px] flex items-center justify-center font-bold',
                      i < tradingDays ? 'bg-primary/80 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Open positions */}
          <div className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Open Positions</h2>
              </div>
              <Link href="/trade" className="text-[10px] text-primary hover:text-primary/80 transition-colors font-medium">
                View in terminal →
              </Link>
            </div>
            {account ? <LivePositions accountId={account.id} /> : (
              <div className="px-5 pb-5"><Skeleton className="h-16 w-full" /></div>
            )}
          </div>
        </div>

        {/* Right — activity feed */}
        <div className="rounded-xl bg-card border border-border/50 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-border/40 shrink-0">
            <RefreshCw className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingActivity ? (
              <div className="flex flex-col gap-3 p-5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-7 rounded-full" />
                    <div className="flex-1"><Skeleton className="h-3 w-3/4 mb-1.5" /><Skeleton className="h-2.5 w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              activity.map(item => <ActivityRow key={item.id} item={item} />)
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertTriangle className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
