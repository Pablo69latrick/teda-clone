'use client'

import { ShieldAlert, AlertTriangle, TrendingDown, Activity, ArrowUp, ArrowDown } from 'lucide-react'
import { cn, formatCurrency, formatLargeNumber } from '@/lib/utils'
import { useAdminRiskMetrics } from '@/lib/hooks'
import { Badge } from '@/components/ui/badge'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

function RiskCard({
  label, value, sub, icon: Icon, loading, severity,
}: {
  label: string; value: React.ReactNode; sub?: string
  icon: React.ElementType; loading?: boolean; severity?: 'ok' | 'warn' | 'danger'
}) {
  const clr = severity === 'danger' ? 'text-loss' : severity === 'warn' ? 'text-yellow-400' : 'text-profit'
  return (
    <div className={cn(
      'flex flex-col gap-3 rounded-xl bg-card border p-4',
      severity === 'danger' ? 'border-loss/30' : severity === 'warn' ? 'border-yellow-500/30' : 'border-border/50'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
        <Icon className={cn('size-4', severity ? clr : 'text-muted-foreground/50')} />
      </div>
      {loading ? (
        <><Skeleton className="h-7 w-28" /><Skeleton className="h-3.5 w-20 mt-1" /></>
      ) : (
        <>
          <div className={cn('text-xl font-bold tracking-tight', clr)}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </>
      )}
    </div>
  )
}

export default function RiskRadarPage() {
  const { data: risk, isLoading } = useAdminRiskMetrics()

  const maxBar = Math.max(...(risk?.top_symbols_exposure ?? []).map(s => Math.abs(s.long_notional) + Math.abs(s.short_notional)), 1)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-yellow-400" />
          <h1 className="text-xl font-semibold">Risk Radar</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide exposure, drawdown, and breach monitoring</p>
      </div>

      {/* Alert banner if breaches today */}
      {!isLoading && (risk?.breached_today ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-loss/10 border border-loss/30 px-4 py-3">
          <AlertTriangle className="size-4 text-loss shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-loss">{risk?.breached_today} account{risk?.breached_today !== 1 ? 's' : ''} breached today.</span>
            <span className="text-muted-foreground ml-2">Review the accounts below and take appropriate action.</span>
          </div>
        </div>
      )}

      {/* Risk stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <RiskCard label="Total Open Exposure" icon={Activity} loading={isLoading}
          value={formatLargeNumber(risk?.total_open_exposure ?? 0)}
          sub="Aggregate notional value"
          severity="warn"
        />
        <RiskCard label="Open PnL" icon={TrendingDown} loading={isLoading}
          value={formatCurrency(risk?.total_open_pnl ?? 0)}
          sub="Unrealized across all accounts"
          severity={(risk?.total_open_pnl ?? 0) >= 0 ? 'ok' : 'warn'}
        />
        <RiskCard label="Breached Today" icon={AlertTriangle} loading={isLoading}
          value={risk?.breached_today ?? 0}
          sub="New breaches in last 24h"
          severity={(risk?.breached_today ?? 0) > 0 ? 'danger' : 'ok'}
        />
        <RiskCard label="Near Breach" icon={AlertTriangle} loading={isLoading}
          value={risk?.accounts_near_breach ?? 0}
          sub=">80% drawdown limit"
          severity={(risk?.accounts_near_breach ?? 0) > 5 ? 'warn' : 'ok'}
        />
        <RiskCard label="At Daily Limit" icon={AlertTriangle} loading={isLoading}
          value={risk?.accounts_at_daily_limit ?? 0}
          sub="Hit daily loss limit today"
          severity={(risk?.accounts_at_daily_limit ?? 0) > 0 ? 'danger' : 'ok'}
        />
        <RiskCard label="Largest Position" icon={Activity} loading={isLoading}
          value={risk?.largest_open_position ? formatCurrency(risk.largest_open_position.notional) : '—'}
          sub={risk?.largest_open_position ? `${risk.largest_open_position.symbol} · ${risk.largest_open_position.direction.toUpperCase()}` : 'No open positions'}
          severity="warn"
        />
      </div>

      {/* Symbol exposure breakdown */}
      <div className="rounded-xl bg-card border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Symbol Exposure</h2>
          <Badge variant="secondary" className="text-[9px] ml-1">Long vs Short</Badge>
        </div>

        <div className="flex flex-col gap-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            : (risk?.top_symbols_exposure ?? []).map(sym => {
                const total = sym.long_notional + sym.short_notional
                const longPct = total > 0 ? (sym.long_notional / total) * 100 : 50
                const net = sym.net
                return (
                  <div key={sym.symbol}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground w-20">{sym.symbol}</span>
                        <span className="text-muted-foreground">
                          Long: {formatLargeNumber(sym.long_notional)} · Short: {formatLargeNumber(sym.short_notional)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {net > 0 ? <ArrowUp className="size-3 text-profit" /> : <ArrowDown className="size-3 text-loss" />}
                        <span className={cn('font-semibold tabular-nums', net > 0 ? 'text-profit' : 'text-loss')}>
                          {net > 0 ? '+' : ''}{formatLargeNumber(net)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-muted/30 flex">
                      <div className="bg-profit/60 transition-all" style={{ width: `${longPct}%` }} />
                      <div className="bg-loss/60 flex-1" />
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* Drawdown distribution */}
      <div className="rounded-xl bg-card border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingDown className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Drawdown Distribution</h2>
          <Badge variant="secondary" className="text-[9px] ml-1">Active accounts</Badge>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="flex items-end gap-2 h-24">
            {(risk?.drawdown_distribution ?? []).map(bucket => {
              const maxCount = Math.max(...(risk?.drawdown_distribution ?? []).map(b => b.count), 1)
              const heightPct = (bucket.count / maxCount) * 100
              const isCritical = bucket.bucket.includes('8–10')
              const isWarn = bucket.bucket.includes('6–8') || bucket.bucket.includes('4–6')
              return (
                <div key={bucket.bucket} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{bucket.count}</span>
                  <div className="w-full rounded-sm"
                    style={{
                      height: `${heightPct}%`,
                      minHeight: 4,
                      backgroundColor: isCritical ? 'rgba(239,68,68,0.6)' : isWarn ? 'rgba(234,179,8,0.5)' : 'rgba(34,197,94,0.4)',
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground text-center leading-tight">{bucket.bucket}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
