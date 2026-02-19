'use client'

import Link from 'next/link'
import { useRef } from 'react'
import {
  LayoutDashboard, BarChart3, Calendar, Trophy, Medal,
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  Wallet, Target, Activity, Clock,
  ArrowUpRight, ArrowDownRight, Zap, CheckCircle2,
} from 'lucide-react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import {
  useAccounts, useTradingData, useChallengeStatus,
  useEquityHistory, useActivity,
} from '@/lib/hooks'
import type { EquityPoint, ActivityItem } from '@/lib/hooks'

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted/60', className)} />
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: React.ElementType
  iconBg?: string
  loading?: boolean
}
function StatCard({ label, value, sub, icon: Icon, iconBg = 'bg-blue-50 text-blue-400', loading }: StatCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-card border border-border p-5 shadow-sm min-h-[110px]">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-xs text-muted-foreground font-medium mb-2">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-32 mb-1" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          )}
          {loading ? (
            <Skeleton className="h-3.5 w-20 mt-1" />
          ) : (
            sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>
          )}
        </div>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  )
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
interface ProgressBarProps {
  label: string; left: string; right: string
  pct: number; status?: 'ok' | 'warning' | 'danger'; loading?: boolean
}
function ProgressBar({ label, left, right, pct, status = 'ok', loading }: ProgressBarProps) {
  const barColor = status === 'danger' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-400' : 'bg-muted-foreground/30'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {status === 'warning' || status === 'danger'
          ? <AlertTriangle className={cn('size-3', status === 'danger' ? 'text-red-500' : 'text-yellow-500')} />
          : <div className="size-3 rounded-full border border-muted-foreground/40" />
        }
        <span>{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        {loading
          ? <div className="animate-pulse h-full w-full bg-muted/60 rounded-full" />
          : <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
        }
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{loading ? '—' : left}</span>
        <span>{loading ? '—' : right}</span>
      </div>
    </div>
  )
}

// ─── Equity curve ──────────────────────────────────────────────────────────────
function EquityChart({ points, loading }: { points: EquityPoint[]; loading: boolean }) {
  const W = 600; const H = 140; const PAD = 8
  if (loading || points.length < 2)
    return <div className="w-full h-[140px] rounded-xl overflow-hidden animate-pulse bg-muted/40" />
  const equities = points.map(p => p.equity)
  const minE = Math.min(...equities); const maxE = Math.max(...equities)
  const range = maxE - minE || 1
  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const toY = (e: number) => H - PAD - ((e - minE) / range) * (H - PAD * 2)
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.equity).toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${toX(points.length - 1).toFixed(1)},${H} L${toX(0).toFixed(1)},${H} Z`
  const isUp = points[points.length - 1].pnl >= 0
  const color = isUp ? '#16a34a' : '#dc2626'
  const gradId = `eq-${isUp ? 'up' : 'dn'}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[140px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={toX(points.length - 1)} cy={toY(points[points.length - 1].equity)} r="3.5" fill={color} />
    </svg>
  )
}

// ─── Activity row ──────────────────────────────────────────────────────────────
function ActivityRow({ item }: { item: ActivityItem }) {
  const isPositive = item.pnl !== null && item.pnl >= 0
  const configs: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
    position:  { icon: TrendingUp,   bg: 'bg-blue-50',   text: 'text-blue-500' },
    closed:    { icon: Activity,     bg: isPositive ? 'bg-green-50' : 'bg-red-50', text: isPositive ? 'text-green-600' : 'text-red-500' },
    order:     { icon: Clock,        bg: 'bg-yellow-50', text: 'text-yellow-500' },
    challenge: { icon: Target,       bg: 'bg-purple-50', text: 'text-purple-500' },
    payout:    { icon: Wallet,       bg: 'bg-green-50',  text: 'text-green-600' },
    system:    { icon: CheckCircle2, bg: 'bg-muted',     text: 'text-muted-foreground' },
  }
  const { icon: Icon, bg, text } = configs[item.type] ?? configs.system
  const now = Date.now(); const diff = now - item.ts
  const ago = diff < 60_000 ? 'just now'
    : diff < 3600_000 ? `${Math.floor(diff / 60_000)}m ago`
    : diff < 86400_000 ? `${Math.floor(diff / 3600_000)}h ago`
    : `${Math.floor(diff / 86400_000)}d ago`
  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <div className={cn('size-8 rounded-full flex items-center justify-center shrink-0', bg)}>
        <Icon className={cn('size-3.5', text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-tight truncate">{item.title}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.sub}</p>
      </div>
      <div className="text-right shrink-0">
        {item.pnl !== null && (
          <p className={cn('text-xs font-semibold tabular-nums', item.pnl >= 0 ? 'text-profit' : 'text-loss')}>
            {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl)}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">{ago}</p>
      </div>
    </div>
  )
}

// ─── Live positions ─────────────────────────────────────────────────────────────
function LivePositions({ accountId }: { accountId: string }) {
  const { data: tradingData } = useTradingData(accountId)
  const positions = tradingData?.positions?.filter(p => p.status === 'open') ?? []
  const prices = tradingData?.prices ?? {}
  if (positions.length === 0)
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
        <AlertTriangle className="size-4 opacity-30" />
        <span className="text-sm">No open positions</span>
      </div>
    )
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-5 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border min-w-[520px]">
        <span>Symbol</span><span>Side</span><span>Size</span><span>Entry → Mark</span><span className="text-right">Unrealized P&L</span>
      </div>
      {positions.map(pos => {
        const markPrice = prices[pos.symbol] ?? pos.entry_price
        const priceDiff = pos.direction === 'long' ? markPrice - pos.entry_price : pos.entry_price - markPrice
        const unrealizedPnl = priceDiff * pos.quantity * pos.leverage
        const pnlPct = pos.isolated_margin > 0 ? (unrealizedPnl / pos.isolated_margin) * 100 : 0
        return (
          <div key={pos.id} className="grid grid-cols-5 px-4 py-3 text-xs border-b border-border/60 hover:bg-muted/30 min-w-[520px] transition-colors">
            <span className="font-bold text-foreground">{pos.symbol}</span>
            <span>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold',
                pos.direction === 'long' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              )}>{pos.direction}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">{pos.quantity} × {pos.leverage}x</span>
            <span className="tabular-nums text-muted-foreground">
              ${pos.entry_price.toLocaleString()} → <span className="text-foreground font-medium">${markPrice.toLocaleString()}</span>
            </span>
            <span className={cn('tabular-nums font-semibold text-right', unrealizedPnl >= 0 ? 'text-profit' : 'text-loss')}>
              {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
              <span className="text-[10px] ml-1 font-normal opacity-60">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Nav tabs ──────────────────────────────────────────────────────────────────
const NAV_TABS = [
  { label: 'Overview',     href: '/dashboard/overview',     icon: LayoutDashboard },
  { label: 'Analytics',    href: '/dashboard/analytics',    icon: BarChart3 },
  { label: 'Calendar',     href: '/dashboard/calendar',     icon: Calendar },
  { label: 'Competitions', href: '/dashboard/competitions', icon: Trophy },
  { label: 'Leaderboard',  href: '/dashboard/leaderboard',  icon: Medal },
]

// ─── Page ───────────────────────────────────────────────────────────────────────
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
  const openPositions = tradingData?.positions?.filter(p => p.status === 'open') ?? []

  const profitCurrent = challengeStatus?.current_profit ?? 0
  const profitTarget = challengeStatus?.profit_target ?? 0.08
  const dailyLoss = challengeStatus?.current_daily_loss ?? 0
  const dailyLossLimit = challengeStatus?.daily_loss_limit ?? 0.05
  const drawdown = challengeStatus?.current_drawdown ?? 0
  const maxDrawdown = challengeStatus?.max_drawdown ?? 0.10
  const tradingDays = challengeStatus?.trading_days ?? 0
  const minTradingDays = challengeStatus?.min_trading_days ?? 5

  const todayPnl = equityHistory && equityHistory.length >= 2
    ? equityHistory[equityHistory.length - 1].equity - equityHistory[equityHistory.length - 2].equity
    : 0
  const equityPnl = equityHistory && equityHistory.length > 0 ? equityHistory[equityHistory.length - 1].pnl : 0

  const profitPct = profitTarget > 0 ? (profitCurrent / profitTarget) * 100 : 0
  const dailyPct = dailyLossLimit > 0 ? (dailyLoss / dailyLossLimit) * 100 : 0
  const drawdownPct = maxDrawdown > 0 ? (drawdown / maxDrawdown) * 100 : 0

  return (
    <div className="flex flex-col gap-5">

      {/* Page title */}
      <h1 className="text-2xl font-bold text-foreground">Overview</h1>

      {/* Account banner */}
      <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Target className="size-5 text-muted-foreground" />
          </div>
          <div>
            {loadingAccounts
              ? <Skeleton className="h-4 w-44 mb-1.5" />
              : <p className="text-sm font-semibold text-foreground">{acc?.name ?? 'Phase 1 — Evaluation'}</p>
            }
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">active</span>
              {account && <span className="text-[11px] text-muted-foreground font-mono">ID: {account.id.slice(0, 8)}…</span>}
            </div>
          </div>
        </div>
        <Link href="/trade" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
          <TrendingUp className="size-4" />Trade Now
        </Link>
      </div>

      {/* Stats 4-grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Portfolio" icon={Wallet} iconBg="bg-blue-50 text-blue-400" loading={loading}
          value={formatCurrency(balance)} sub="Available equity" />
        <StatCard label="Unrealized P&L" icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          iconBg={totalPnl >= 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'} loading={loading}
          value={<span className={totalPnl >= 0 ? 'text-profit' : 'text-loss'}>{totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}</span>}
          sub={<span className={cn('flex items-center gap-0.5', totalPnl >= 0 ? 'text-profit' : 'text-loss')}>
            {totalPnl >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{formatPercent(Math.abs(pnlPct))}
          </span>} />
        <StatCard label="Open Positions" icon={Activity}
          iconBg="bg-purple-50 text-purple-400" loading={loading}
          value={openPositions.length}
          sub="Active trades" />
        <StatCard label="24h Return" icon={BarChart3} iconBg="bg-orange-50 text-orange-400" loading={loading || loadingEquity}
          value={<span className={todayPnl >= 0 ? 'text-profit' : 'text-loss'}>{todayPnl >= 0 ? '+' : ''}{formatPercent(Math.abs(pnlPct))}</span>}
          sub={formatCurrency(Math.abs(todayPnl))} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 flex flex-col gap-5">

          {/* Equity Curve */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div>
                <h2 className="text-sm font-bold text-foreground">Equity Curve</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">30-day balance history</p>
              </div>
              {equityHistory && equityHistory.length > 0 && (
                <div className={cn('flex items-center gap-1 text-xs font-semibold', equityPnl >= 0 ? 'text-profit' : 'text-loss')}>
                  {equityPnl >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {formatCurrency(Math.abs(equityPnl))}
                  <span className="text-muted-foreground font-normal ml-1">30d</span>
                </div>
              )}
            </div>
            <div className="px-3 pb-4">
              <EquityChart points={equityHistory ?? []} loading={loadingEquity} />
            </div>
          </div>

          {/* Challenge Progress */}
          <div className="rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-bold text-foreground">Challenge Progress</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-600">Phase 1</span>
                <span className="text-[11px] text-muted-foreground">{tradingDays}/{minTradingDays} days</span>
              </div>
            </div>
            <div className="flex flex-col gap-5 px-5 py-5">
              <ProgressBar label="Profit Target" loading={loadingChallenge} pct={profitPct} status="ok"
                left={`+${formatPercent(profitCurrent * 100)}`} right={`+${formatPercent(profitTarget * 100)}`} />
              <ProgressBar label="Daily Loss Limit (Resets 00:00 UTC)" loading={loadingChallenge}
                pct={dailyPct} status={dailyPct > 90 ? 'danger' : dailyPct > 60 ? 'warning' : 'ok'}
                left={formatCurrency(dailyLoss * (balance || 200_000))} right={formatCurrency(dailyLossLimit * (balance || 200_000))} />
              <ProgressBar label="Max Drawdown (Static)" loading={loadingChallenge}
                pct={drawdownPct} status={drawdownPct > 90 ? 'danger' : drawdownPct > 60 ? 'warning' : 'ok'}
                left={formatCurrency(drawdown * (balance || 200_000))} right={formatCurrency(maxDrawdown * (balance || 200_000))} />
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3" />Trading Days
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.max(minTradingDays, tradingDays) }, (_, i) => (
                    <div key={i} className={cn(
                      'w-5 h-5 rounded-md text-[9px] flex items-center justify-center font-bold border',
                      i < tradingDays ? 'bg-foreground text-background border-foreground' : 'bg-muted text-muted-foreground border-border'
                    )}>{i + 1}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Open Positions */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-bold text-foreground">Open Positions</h2>
              </div>
              <Link href="/trade" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium">
                View in terminal →
              </Link>
            </div>
            {account ? <LivePositions accountId={account.id} /> : <div className="px-5 py-5"><Skeleton className="h-16 w-full" /></div>}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-card border border-border shadow-sm flex flex-col">
          <div className="flex items-center gap-2 px-4 pt-5 pb-4 border-b border-border shrink-0">
            <RefreshCw className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">Recent Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingActivity ? (
              <div className="flex flex-col gap-3 p-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1"><Skeleton className="h-3 w-3/4 mb-1.5" /><Skeleton className="h-2.5 w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : activity && activity.length > 0
              ? activity.map(item => <ActivityRow key={item.id} item={item} />)
              : (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-6">
                  <AlertTriangle className="size-8 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}
