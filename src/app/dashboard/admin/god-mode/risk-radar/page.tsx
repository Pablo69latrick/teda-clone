'use client'

import { useState, useMemo } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  Activity,
  ArrowUp,
  ArrowDown,
  Bell,
  XCircle,
  RefreshCw,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Flag,
  Search,
  Filter,
  Map,
  Clock,
  Flame,
  Grid3X3,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAdminRiskMetrics, useAdminAccounts } from '@/lib/hooks'
import { Badge } from '@/components/ui/badge'
import type { AdminAccount } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

function ActionToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-foreground text-background px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
      <div className="size-2 rounded-full bg-profit" />
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <XCircle className="size-4" />
      </button>
    </div>
  )
}

function RiskKpi({ label, value, sub, icon: Icon, loading, severity }: {
  label: string; value: React.ReactNode; sub?: string
  icon: React.ElementType; loading?: boolean; severity?: 'ok' | 'warn' | 'danger'
}) {
  const clr = severity === 'danger' ? 'text-loss' : severity === 'warn' ? 'text-yellow-500' : 'text-profit'
  const borderCls = severity === 'danger' ? 'border-loss/40 bg-loss/5' : severity === 'warn' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border/50'
  return (
    <div className={cn('flex flex-col gap-2 rounded-xl bg-card border p-4', borderCls)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
        <Icon className={cn('size-4', severity ? clr : 'text-muted-foreground/50')} />
      </div>
      {loading ? (
        <><Skeleton className="h-7 w-24" /><Skeleton className="h-3 w-16 mt-1" /></>
      ) : (
        <>
          <div className={cn('text-2xl font-bold tracking-tight tabular-nums', clr)}>{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </>
      )}
    </div>
  )
}

// ─── Breach Account Row ───────────────────────────────────────────────
function BreachRow({ acc, onAction }: { acc: AdminAccount; onAction: (msg: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const drawdownPct = acc.injectedFunds > 0
    ? Math.abs((acc.injectedFunds - acc.availableMargin - acc.reservedMargin) / acc.injectedFunds) * 100
    : 0
  const usedPct = acc.injectedFunds > 0 ? (acc.reservedMargin / acc.injectedFunds) * 100 : 0
  const riskLevel = drawdownPct > 8 ? 'danger' : drawdownPct > 5 ? 'warn' : 'ok'
  const riskColor = riskLevel === 'danger' ? 'text-loss' : riskLevel === 'warn' ? 'text-yellow-500' : 'text-profit'
  const barColor = riskLevel === 'danger' ? 'bg-loss' : riskLevel === 'warn' ? 'bg-yellow-500' : 'bg-profit'

  return (
    <div className={cn(
      'rounded-lg border transition-all',
      riskLevel === 'danger' ? 'border-loss/30 bg-loss/5' : riskLevel === 'warn' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-border/30'
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={cn(
          'size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          riskLevel === 'danger' ? 'bg-loss/20 text-loss' : riskLevel === 'warn' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-muted text-muted-foreground'
        )}>
          {(acc.userName ?? '?')[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold truncate">{acc.userName ?? '—'}</span>
            <Badge
              variant={acc.accountStatus as 'active' | 'funded' | 'passed' | 'breached' | 'muted'}
              className="text-[9px] px-1.5 py-0 capitalize shrink-0"
            >
              {acc.accountStatus}
            </Badge>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground truncate">{acc.id}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn('font-bold text-sm tabular-nums', riskColor)}>{drawdownPct.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground">drawdown</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onAction(`🔔 Warning sent to ${acc.userName ?? acc.id}`)}
            title="Send warning"
            className="size-7 rounded flex items-center justify-center hover:bg-yellow-500/15 text-yellow-500 transition-colors"
          >
            <Bell className="size-3.5" />
          </button>
          <button
            onClick={() => onAction(`🚩 ${acc.userName ?? acc.id} flagged for review`)}
            title="Flag account"
            className="size-7 rounded flex items-center justify-center hover:bg-orange-500/15 text-orange-500 transition-colors"
          >
            <Flag className="size-3.5" />
          </button>
          <button
            onClick={() => onAction(`🔒 Force-closed positions for ${acc.userName ?? acc.id}`)}
            title="Force close"
            className="size-7 rounded flex items-center justify-center hover:bg-loss/15 text-loss transition-colors"
          >
            <XCircle className="size-3.5" />
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="size-7 rounded flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Drawdown bar */}
      <div className="px-4 pb-2">
        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${Math.min(100, drawdownPct * 10)}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/20 mx-4 mb-3 pt-3 grid grid-cols-3 gap-2 text-xs">
          {[
            { label: 'Account ID', value: acc.id.slice(0, 16) + '…' },
            { label: 'Type', value: acc.accountType },
            { label: 'Margin Mode', value: acc.defaultMarginMode },
            { label: 'Available', value: formatCurrency(acc.availableMargin) },
            { label: 'Reserved', value: formatCurrency(acc.reservedMargin) },
            { label: 'Injected', value: formatCurrency(acc.injectedFunds) },
            { label: 'Used %', value: `${usedPct.toFixed(1)}%` },
            { label: 'Currency', value: acc.baseCurrency },
            { label: 'Drawdown', value: `${drawdownPct.toFixed(2)}%` },
          ].map(row => (
            <div key={row.label} className="bg-muted/20 rounded px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground mb-0.5">{row.label}</div>
              <div className="font-medium text-foreground truncate">{row.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Drawdown histogram bar ───────────────────────────────────────────
function DrawdownBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-20 text-right text-muted-foreground shrink-0">{label}</div>
      <div className="flex-1 h-5 bg-muted/20 rounded overflow-hidden">
        <div
          className="h-full rounded flex items-center px-2"
          style={{ width: `${pct}%`, backgroundColor: `${color}33`, border: `1px solid ${color}40`, minWidth: count > 0 ? 24 : 0 }}
        >
          <span className="text-[10px] font-semibold" style={{ color }}>{count}</span>
        </div>
      </div>
    </div>
  )
}

type Tab = 'live' | 'exposure' | 'breaches' | 'alerts' | 'heatmap'

// ─── Heatmap Data (symbol × hour) ─────────────────────────────────────
const HEATMAP_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'NAS100', 'SPX500', 'USOIL']
const HEATMAP_HOURS = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22']

// Simulated drawdown concentration: higher on market open hours and news times
const HEATMAP_DATA: Record<string, Record<string, number>> = {
  EURUSD: { '00': 1, '02': 2, '04': 3, '06': 7, '08': 12, '10': 18, '12': 9, '14': 21, '16': 14, '18': 6, '20': 3, '22': 2 },
  GBPUSD: { '00': 1, '02': 1, '04': 2, '06': 8, '08': 15, '10': 22, '12': 11, '14': 19, '16': 16, '18': 7, '20': 4, '22': 2 },
  USDJPY: { '00': 4, '02': 6, '04': 9, '06': 5, '08': 8, '10': 11, '12': 14, '14': 10, '16': 7, '18': 4, '20': 3, '22': 5 },
  XAUUSD: { '00': 2, '02': 3, '04': 4, '06': 6, '08': 14, '10': 19, '12': 12, '14': 28, '16': 17, '18': 8, '20': 5, '22': 3 },
  BTCUSD: { '00': 8, '02': 6, '04': 5, '06': 7, '08': 9, '10': 11, '12': 13, '14': 15, '16': 12, '18': 10, '20': 9, '22': 8 },
  NAS100: { '00': 1, '02': 1, '04': 1, '06': 1, '08': 2, '10': 3, '12': 5, '14': 24, '16': 31, '18': 8, '20': 2, '22': 1 },
  SPX500: { '00': 1, '02': 1, '04': 1, '06': 1, '08': 2, '10': 3, '12': 4, '14': 22, '16': 27, '18': 7, '20': 2, '22': 1 },
  USOIL:  { '00': 2, '02': 3, '04': 3, '06': 4, '08': 11, '10': 16, '12': 9, '14': 13, '16': 10, '18': 6, '20': 4, '22': 3 },
}

// Correlation matrix (simplified)
const CORR_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'NAS100']
const CORR_MATRIX: number[][] = [
  [ 1.00,  0.87, -0.62,  0.42, -0.08,  0.11],
  [ 0.87,  1.00, -0.58,  0.38, -0.06,  0.09],
  [-0.62, -0.58,  1.00, -0.31,  0.04, -0.07],
  [ 0.42,  0.38, -0.31,  1.00,  0.22,  0.17],
  [-0.08, -0.06,  0.04,  0.22,  1.00,  0.74],
  [ 0.11,  0.09, -0.07,  0.17,  0.74,  1.00],
]

const MOCK_ALERTS = [
  { id: 'a1', level: 'danger', title: 'Account breached daily loss limit', account: 'acc_kp8m2x', time: '3m ago' },
  { id: 'a2', level: 'warn', title: 'Near-breach: 85% daily limit reached', account: 'acc_7r3k9z', time: '8m ago' },
  { id: 'a3', level: 'warn', title: 'Large open position detected', account: 'acc_2w5n1q', time: '15m ago' },
  { id: 'a4', level: 'danger', title: 'Max drawdown threshold hit', account: 'acc_9p4k8m', time: '21m ago' },
  { id: 'a5', level: 'warn', title: 'News trading restriction triggered', account: 'acc_5j7r2n', time: '34m ago' },
  { id: 'a6', level: 'info', title: 'Weekend hold detected on funded account', account: 'acc_1w4k7m', time: '1h ago' },
  { id: 'a7', level: 'info', title: 'Martingale pattern flagged by detection system', account: 'acc_8x3p6q', time: '2h ago' },
  { id: 'a8', level: 'danger', title: 'Multiple breach violations same user', account: 'acc_6z9n2k', time: '3h ago' },
]

export default function RiskRadarPage() {
  const { data: risk, isLoading: riskLoading } = useAdminRiskMetrics()
  const { data: accounts, isLoading: accountsLoading } = useAdminAccounts()

  const [activeTab, setActiveTab] = useState<Tab>('live')
  const [filter, setFilter] = useState<'all' | 'breached' | 'active'>('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const atRiskAccounts = useMemo(() => {
    if (!accounts) return []
    let list = accounts.filter(acc => {
      const drawdownPct = acc.injectedFunds > 0
        ? Math.abs((acc.injectedFunds - acc.availableMargin - acc.reservedMargin) / acc.injectedFunds) * 100
        : 0
      if (filter === 'breached') return acc.accountStatus === 'breached'
      if (filter === 'active') return acc.accountStatus === 'active' && drawdownPct > 2
      return drawdownPct > 2 || acc.accountStatus === 'breached'
    })
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.id.toLowerCase().includes(q) || (a.userName ?? '').toLowerCase().includes(q))
    }
    return list.sort((a, b) => {
      const da = a.injectedFunds > 0 ? Math.abs((a.injectedFunds - a.availableMargin - a.reservedMargin) / a.injectedFunds) : 0
      const db = b.injectedFunds > 0 ? Math.abs((b.injectedFunds - b.availableMargin - b.reservedMargin) / b.injectedFunds) : 0
      return db - da
    })
  }, [accounts, filter, search])

  const maxDrawdownCount = useMemo(() => {
    if (!risk?.drawdown_distribution) return 1
    return Math.max(...risk.drawdown_distribution.map(b => b.count), 1)
  }, [risk])

  const totalExposure = useMemo(() => {
    if (!risk?.top_symbols_exposure) return 0
    return risk.top_symbols_exposure.reduce((s, sym) => s + sym.long_notional + sym.short_notional, 0)
  }, [risk])

  const breachedCount = accounts?.filter(a => a.accountStatus === 'breached').length ?? 0
  const hasCritical = (risk?.breached_today ?? 0) > 0

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'live', label: 'Live Risk', icon: Activity },
    { id: 'exposure', label: 'Exposure', icon: Map },
    { id: 'breaches', label: `Breaches${breachedCount > 0 ? ` (${breachedCount})` : ''}`, icon: ShieldAlert },
    { id: 'alerts', label: 'Alert Log', icon: Bell },
    { id: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
  ]

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('size-2 rounded-full animate-pulse', hasCritical ? 'bg-loss' : 'bg-profit')} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {hasCritical ? 'Critical · live' : 'Live · refreshes every 10s'}
            </span>
          </div>
          <h1 className="text-xl font-bold">Risk Radar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time exposure monitoring and breach management</p>
        </div>
        <button
          onClick={async () => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 800) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-xs font-medium text-muted-foreground hover:text-foreground shrink-0"
        >
          <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 mb-6 self-start">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isDanger = tab.id === 'breaches' && breachedCount > 0
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                activeTab === tab.id
                  ? isDanger ? 'bg-loss/10 text-loss' : 'bg-card text-foreground shadow-sm'
                  : isDanger ? 'text-loss/70 hover:text-loss' : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ════════════════════════════════ TAB: LIVE RISK ═══ */}
      {activeTab === 'live' && (
        <div className="flex flex-col gap-5">
          {/* Critical breach banner */}
          {hasCritical && (
            <div className="rounded-xl bg-loss/10 border border-loss/30 px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Flame className="size-5 text-loss shrink-0" />
                <div>
                  <div className="text-sm font-bold text-loss">{risk?.breached_today} breach{(risk?.breached_today ?? 0) > 1 ? 'es' : ''} detected today</div>
                  <div className="text-xs text-muted-foreground">Immediate review required — accounts have violated trading rules</div>
                </div>
              </div>
              <button
                onClick={() => showToast('🚨 Breach escalated to risk team')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-loss text-white text-xs font-bold hover:bg-loss/90 transition-colors shrink-0"
              >
                <Zap className="size-3.5" />
                Escalate
              </button>
            </div>
          )}

          {/* Near-breach banner */}
          {!hasCritical && (risk?.accounts_near_breach ?? 0) > 0 && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-5 py-3 flex items-center gap-3">
              <AlertTriangle className="size-4 text-yellow-500 shrink-0" />
              <span className="text-xs text-yellow-700 font-medium">
                {risk?.accounts_near_breach} accounts approaching their daily loss limit
              </span>
            </div>
          )}

          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <RiskKpi
              label="Total Open Exposure"
              value={riskLoading ? '—' : formatCurrency(risk?.total_open_exposure ?? 0)}
              sub="Sum of all open positions"
              icon={TrendingDown}
              loading={riskLoading}
              severity={riskLoading ? undefined : (risk?.total_open_exposure ?? 0) > 5_000_000 ? 'danger' : 'warn'}
            />
            <RiskKpi
              label="Open P&L"
              value={riskLoading ? '—' : formatCurrency(risk?.total_open_pnl ?? 0)}
              sub="Platform net unrealized"
              icon={Activity}
              loading={riskLoading}
              severity={riskLoading ? undefined : (risk?.total_open_pnl ?? 0) < 0 ? 'warn' : 'ok'}
            />
            <RiskKpi
              label="Max Single Exposure"
              value={riskLoading ? '—' : formatCurrency(risk?.max_single_account_exposure ?? 0)}
              sub="Highest-risk single account"
              icon={ShieldAlert}
              loading={riskLoading}
              severity={riskLoading ? undefined : (risk?.max_single_account_exposure ?? 0) > 500_000 ? 'danger' : 'ok'}
            />
            <RiskKpi
              label="Near-Breach Accounts"
              value={riskLoading ? '—' : (risk?.accounts_near_breach ?? 0).toString()}
              sub=">80% of daily loss limit"
              icon={AlertTriangle}
              loading={riskLoading}
              severity={riskLoading ? undefined : (risk?.accounts_near_breach ?? 0) > 5 ? 'danger' : (risk?.accounts_near_breach ?? 0) > 0 ? 'warn' : 'ok'}
            />
            <RiskKpi
              label="At Daily Limit"
              value={riskLoading ? '—' : (risk?.accounts_at_daily_limit ?? 0).toString()}
              sub="Exactly at daily loss limit"
              icon={Zap}
              loading={riskLoading}
              severity={riskLoading ? undefined : (risk?.accounts_at_daily_limit ?? 0) > 0 ? 'danger' : 'ok'}
            />
            <RiskKpi
              label="Breached Today"
              value={riskLoading ? '—' : (risk?.breached_today ?? 0).toString()}
              sub="Rule violations this session"
              icon={XCircle}
              loading={riskLoading}
              severity={riskLoading ? undefined : (risk?.breached_today ?? 0) > 0 ? 'danger' : 'ok'}
            />
          </div>

          {/* Largest position banner */}
          {!riskLoading && risk?.largest_open_position && (
            <div className="rounded-xl bg-card border border-border/50 px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'size-9 rounded-lg flex items-center justify-center',
                  risk.largest_open_position.direction === 'long' ? 'bg-profit/10' : 'bg-loss/10'
                )}>
                  {risk.largest_open_position.direction === 'long'
                    ? <ArrowUp className="size-4 text-profit" />
                    : <ArrowDown className="size-4 text-loss" />
                  }
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Largest Open Position</div>
                  <div className="font-bold text-sm">{risk.largest_open_position.symbol} · {formatCurrency(risk.largest_open_position.notional)}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{risk.largest_open_position.account_id}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => showToast(`⚠️ Warning sent to ${risk.largest_open_position!.account_id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-600 text-xs font-medium hover:bg-yellow-500/20 border border-yellow-500/20 transition-colors"
                >
                  <Bell className="size-3" /> Warn
                </button>
                <button
                  onClick={() => showToast(`🔒 Force closed ${risk.largest_open_position!.account_id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-loss/10 text-loss text-xs font-medium hover:bg-loss/20 border border-loss/20 transition-colors"
                >
                  <XCircle className="size-3" /> Force Close
                </button>
              </div>
            </div>
          )}

          {/* Drawdown distribution */}
          {!riskLoading && risk?.drawdown_distribution && (
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Drawdown Distribution</span>
                <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-profit inline-block" />Safe (&lt;5%)</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-yellow-500 inline-block" />Warning (5-8%)</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-loss inline-block" />Critical (&gt;8%)</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {risk.drawdown_distribution.map((bucket) => {
                  const pct = parseFloat(bucket.bucket)
                  const color = pct > 8 ? '#dc2626' : pct > 5 ? '#eab308' : '#22c55e'
                  return (
                    <DrawdownBar
                      key={bucket.bucket}
                      label={`${bucket.bucket}%`}
                      count={bucket.count}
                      max={maxDrawdownCount}
                      color={color}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════ TAB: EXPOSURE ══════ */}
      {activeTab === 'exposure' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Symbol exposure */}
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Map className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Symbol Exposure</span>
                <span className="ml-auto text-xs text-muted-foreground">Total: {formatCurrency(totalExposure)}</span>
              </div>
              {riskLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(risk?.top_symbols_exposure ?? []).map(sym => {
                    const total = sym.long_notional + sym.short_notional
                    const pct = totalExposure > 0 ? (total / totalExposure) * 100 : 0
                    const longPct = total > 0 ? (sym.long_notional / total) * 100 : 50
                    return (
                      <div key={sym.symbol} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{sym.symbol}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(total)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-muted/20 rounded-full overflow-hidden flex">
                          <div className="h-full bg-profit/70 rounded-l-full" style={{ width: `${longPct}%` }} />
                          <div className="h-full bg-loss/70 rounded-r-full" style={{ width: `${100 - longPct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="text-profit">Long: {formatCurrency(sym.long_notional)}</span>
                          <span className={cn('font-medium', sym.net > 0 ? 'text-profit' : 'text-loss')}>Net: {formatCurrency(sym.net)}</span>
                          <span className="text-loss">Short: {formatCurrency(sym.short_notional)}</span>
                        </div>
                      </div>
                    )
                  })}
                  {(risk?.top_symbols_exposure ?? []).length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-6">No open positions</div>
                  )}
                </div>
              )}
            </div>

            {/* Concentration risk */}
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Concentration Risk</span>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Max Single Account', value: formatCurrency(risk?.max_single_account_exposure ?? 0), pct: totalExposure > 0 ? ((risk?.max_single_account_exposure ?? 0) / totalExposure * 100) : 0, severity: (risk?.max_single_account_exposure ?? 0) / (totalExposure || 1) > 0.3 ? 'danger' : 'ok' },
                  { label: 'Near-Breach Accounts', value: `${risk?.accounts_near_breach ?? 0} accounts`, pct: Math.min(100, (risk?.accounts_near_breach ?? 0) * 10), severity: (risk?.accounts_near_breach ?? 0) > 5 ? 'danger' : 'ok' },
                  { label: 'At Daily Limit', value: `${risk?.accounts_at_daily_limit ?? 0} accounts`, pct: Math.min(100, (risk?.accounts_at_daily_limit ?? 0) * 20), severity: (risk?.accounts_at_daily_limit ?? 0) > 0 ? 'danger' : 'ok' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className={cn('text-xs font-semibold', item.severity === 'danger' ? 'text-loss' : 'text-profit')}>{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', item.severity === 'danger' ? 'bg-loss' : 'bg-profit')}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Largest position detail */}
              {risk?.largest_open_position && (
                <div className="mt-5 pt-4 border-t border-border/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Largest Position</div>
                  <div className="bg-muted/20 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold">{risk.largest_open_position.symbol}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{risk.largest_open_position.account_id.slice(0, 16)}…</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{formatCurrency(risk.largest_open_position.notional)}</div>
                      <div className={cn('text-[10px] font-medium capitalize', risk.largest_open_position.direction === 'long' ? 'text-profit' : 'text-loss')}>
                        {risk.largest_open_position.direction}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Exposure summary */}
          <div className="rounded-xl bg-card border border-border/50 p-5">
            <div className="text-xs font-semibold mb-4">Exposure Overview</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Open Exposure', value: formatCurrency(risk?.total_open_exposure ?? 0), color: 'text-foreground' },
                { label: 'Net Open P&L', value: formatCurrency(risk?.total_open_pnl ?? 0), color: (risk?.total_open_pnl ?? 0) >= 0 ? 'text-profit' : 'text-loss' },
                { label: 'Symbols Tracked', value: `${risk?.top_symbols_exposure?.length ?? 0}`, color: 'text-foreground' },
                { label: 'Accounts at Risk', value: `${(risk?.accounts_near_breach ?? 0) + (risk?.accounts_at_daily_limit ?? 0)}`, color: 'text-yellow-500' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">{s.label}</div>
                  <div className={cn('font-bold text-base tabular-nums', s.color)}>{riskLoading ? '—' : s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ TAB: BREACHES ══════ */}
      {activeTab === 'breaches' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search account ID or name..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="size-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
              {(['all', 'breached', 'active'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize',
                    filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* At-risk accounts */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">At-Risk Accounts</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{atRiskAccounts.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Eye className="size-3" />
                Click to expand
              </div>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {accountsLoading
                ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
                : atRiskAccounts.length === 0
                  ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground text-xs gap-2">
                      <ShieldAlert className="size-5 opacity-30" />
                      No at-risk accounts
                    </div>
                  )
                  : atRiskAccounts.map(acc => (
                      <BreachRow key={acc.id} acc={acc} onAction={showToast} />
                    ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ TAB: ALERTS ════════ */}
      {activeTab === 'alerts' && (
        <div className="flex flex-col gap-4">
          {/* Alert summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Critical', count: MOCK_ALERTS.filter(a => a.level === 'danger').length, color: 'text-loss', bg: 'bg-loss/10 border-loss/20' },
              { label: 'Warning', count: MOCK_ALERTS.filter(a => a.level === 'warn').length, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
              { label: 'Info', count: MOCK_ALERTS.filter(a => a.level === 'info').length, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-xl border p-4 text-center', s.bg)}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
                <div className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.count}</div>
              </div>
            ))}
          </div>

          {/* Alert log */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/30">
              <Bell className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Alert Log</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{MOCK_ALERTS.length} alerts</span>
            </div>
            <div className="divide-y divide-border/20">
              {MOCK_ALERTS.map(alert => {
                const levelColor = alert.level === 'danger' ? 'bg-loss' : alert.level === 'warn' ? 'bg-yellow-500' : 'bg-blue-500'
                const levelText = alert.level === 'danger' ? 'text-loss' : alert.level === 'warn' ? 'text-yellow-500' : 'text-blue-500'
                const levelBg = alert.level === 'danger' ? 'bg-loss/10' : alert.level === 'warn' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
                return (
                  <div key={alert.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <div className={cn('size-2 rounded-full shrink-0 mt-1.5', levelColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground">{alert.title}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{alert.account}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded', levelBg, levelText)}>
                        {alert.level}
                      </span>
                      <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        {alert.time}
                      </div>
                    </div>
                    <button
                      onClick={() => showToast(`✅ Alert ${alert.id} resolved`)}
                      className="h-6 px-2 text-[10px] font-medium rounded-lg bg-muted/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-border/30 shrink-0"
                    >
                      Resolve
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════ TAB: HEATMAP ═════════ */}
      {activeTab === 'heatmap' && (
        <div className="flex flex-col gap-5">
          {/* Drawdown Concentration Heatmap */}
          <div className="rounded-xl bg-card border border-border/50 p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Grid3X3 className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Drawdown Concentration by Symbol × Hour (UTC)</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-5">Number of accounts near or breaching loss limit per time window (last 30 days)</p>

            <div className="min-w-max">
              {/* Hour labels */}
              <div className="flex gap-0 ml-20 mb-1">
                {HEATMAP_HOURS.map(h => (
                  <div key={h} className="w-10 text-center text-[9px] text-muted-foreground">{h}h</div>
                ))}
              </div>
              {/* Rows */}
              {HEATMAP_SYMBOLS.map(symbol => {
                const row = HEATMAP_DATA[symbol]
                const rowMax = Math.max(...HEATMAP_HOURS.map(h => row[h] ?? 0))
                return (
                  <div key={symbol} className="flex items-center gap-0 mb-0.5">
                    <div className="w-20 text-[10px] font-semibold text-right pr-3 text-muted-foreground shrink-0">{symbol}</div>
                    {HEATMAP_HOURS.map(h => {
                      const v = row[h] ?? 0
                      const intensity = rowMax > 0 ? v / rowMax : 0
                      const bg = v === 0 ? 'bg-muted/10'
                        : intensity > 0.8 ? 'bg-loss'
                        : intensity > 0.5 ? 'bg-yellow-500'
                        : intensity > 0.25 ? 'bg-yellow-400/50'
                        : 'bg-profit/30'
                      const textColor = intensity > 0.5 ? 'text-white' : intensity > 0.25 ? 'text-foreground' : 'text-muted-foreground'
                      return (
                        <div
                          key={h}
                          className={cn('w-10 h-9 flex items-center justify-center text-[10px] font-semibold rounded-sm mx-px transition-all', bg, textColor)}
                          title={`${symbol} @ ${h}h UTC: ${v} accounts at risk`}
                        >
                          {v > 0 ? v : ''}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 ml-20">
                {[
                  { color: 'bg-muted/10', label: '0' },
                  { color: 'bg-profit/30', label: '1-5' },
                  { color: 'bg-yellow-400/50', label: '6-12' },
                  { color: 'bg-yellow-500', label: '13-20' },
                  { color: 'bg-loss', label: '20+' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={cn('w-4 h-4 rounded-sm', l.color)} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
                <span className="text-[10px] text-muted-foreground ml-2">accounts at risk</span>
              </div>
            </div>
          </div>

          {/* Correlation Matrix */}
          <div className="rounded-xl bg-card border border-border/50 p-5 overflow-x-auto">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Symbol Correlation Matrix</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-5">30-day return correlations — high positive correlations increase concentrated risk exposure</p>

            <div className="min-w-max">
              {/* Header row */}
              <div className="flex gap-0 ml-20 mb-0.5">
                {CORR_SYMBOLS.map(s => (
                  <div key={s} className="w-14 text-center text-[9px] text-muted-foreground font-semibold">{s.slice(0, 6)}</div>
                ))}
              </div>
              {CORR_MATRIX.map((row, ri) => (
                <div key={ri} className="flex items-center gap-0 mb-0.5">
                  <div className="w-20 text-[10px] font-semibold text-right pr-3 text-muted-foreground shrink-0">{CORR_SYMBOLS[ri]}</div>
                  {row.map((val, ci) => {
                    const isDiag = ri === ci
                    const bg = isDiag ? 'bg-muted/40'
                      : val > 0.7 ? 'bg-loss/70'
                      : val > 0.4 ? 'bg-loss/30'
                      : val > 0.1 ? 'bg-muted/20'
                      : val < -0.4 ? 'bg-profit/40'
                      : val < -0.1 ? 'bg-profit/20'
                      : 'bg-muted/10'
                    const textColor = isDiag ? 'text-muted-foreground'
                      : Math.abs(val) > 0.5 ? 'text-foreground font-bold'
                      : 'text-muted-foreground'
                    return (
                      <div
                        key={ci}
                        className={cn('w-14 h-9 flex items-center justify-center text-[10px] rounded-sm mx-px', bg, textColor)}
                        title={`${CORR_SYMBOLS[ri]} / ${CORR_SYMBOLS[ci]}: ${val.toFixed(2)}`}
                      >
                        {isDiag ? '—' : val.toFixed(2)}
                      </div>
                    )
                  })}
                </div>
              ))}
              <div className="flex items-center gap-3 mt-3 ml-20">
                {[
                  { color: 'bg-loss/70', label: 'High +corr (>0.7)' },
                  { color: 'bg-muted/20', label: 'Low corr' },
                  { color: 'bg-profit/40', label: 'High -corr (<-0.4)' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={cn('w-4 h-4 rounded-sm', l.color)} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Risk Insight banner */}
          <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="size-4 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">High-risk window</span>: 14h–16h UTC shows the highest breach concentration across all symbols.
              EURUSD, GBPUSD, and XAUUSD are highly correlated — simultaneous adverse moves can cause cascading breaches.
              Consider increasing monitoring frequency during US session open (14h–17h UTC).
            </div>
          </div>
        </div>
      )}

      {toast && <ActionToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
