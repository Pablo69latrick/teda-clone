'use client'

/**
 * ChallengeStatusBar — compact CRM widget for the trade page header.
 *
 * Shows the key challenge metrics inline so traders can monitor their
 * progress without leaving the chart view:
 *   - Phase + status badge
 *   - Profit progress vs target (green bar)
 *   - Daily loss vs limit (red bar when close)
 *   - Max drawdown vs limit (red bar when close)
 *   - Trading days vs minimum required
 *
 * Wired to useChallengeStatus() so it revalidates automatically via
 * Realtime + SWR polling. No props needed beyond accountId.
 */

import { cn } from '@/lib/utils'
import { useChallengeStatus } from '@/lib/hooks'
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ChallengeStatusBarProps {
  accountId: string
}

function MetricBar({
  label,
  current,
  limit,
  inverse = false,
}: {
  label: string
  current: number
  limit: number
  inverse?: boolean   // true = bar fills from bad side (drawdown / daily loss)
}) {
  const pct = limit > 0 ? Math.min(100, Math.abs(current / limit) * 100) : 0
  const isWarning = pct > 70
  const isDanger  = pct > 90

  return (
    <div className="flex flex-col gap-0.5 min-w-[80px]">
      <div className="flex justify-between items-center">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={cn(
          'text-[9px] font-semibold tabular-nums',
          inverse
            ? isDanger ? 'text-loss' : isWarning ? 'text-amber-400' : 'text-muted-foreground'
            : current >= limit ? 'text-profit' : 'text-muted-foreground'
        )}>
          {(current * 100).toFixed(2)}%
          <span className="opacity-50 ml-0.5">/{(limit * 100).toFixed(0)}%</span>
        </span>
      </div>
      <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            inverse
              ? isDanger  ? 'bg-loss'
                : isWarning ? 'bg-amber-400'
                : 'bg-muted-foreground/40'
              : current >= limit ? 'bg-profit' : 'bg-primary/60'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function ChallengeStatusBar({ accountId }: ChallengeStatusBarProps) {
  const { data: status } = useChallengeStatus(accountId)

  if (!status) return null

  const isBreached = status.is_breached
  const isPassed   = status.is_passed
  const tradingDaysOk = status.trading_days >= status.min_trading_days
  const profitTargetMet = status.current_profit >= status.profit_target

  // Overall health color
  const healthColor = isBreached
    ? 'border-loss/50 bg-loss/5'
    : isPassed
    ? 'border-profit/50 bg-profit/5'
    : status.current_drawdown > status.max_drawdown * 0.85
    ? 'border-amber-400/30 bg-amber-400/5'
    : 'border-border/50 bg-card'

  return (
    <div className={cn(
      'flex items-center gap-4 px-3 py-1.5 border-b text-xs transition-colors shrink-0',
      healthColor
    )}>
      {/* Status icon + phase */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isBreached ? (
          <AlertTriangle className="size-3 text-loss" />
        ) : isPassed ? (
          <CheckCircle2 className="size-3 text-profit" />
        ) : (
          <Shield className="size-3 text-muted-foreground" />
        )}
        <span className={cn(
          'text-[10px] font-semibold',
          isBreached ? 'text-loss' : isPassed ? 'text-profit' : 'text-muted-foreground'
        )}>
          {isBreached
            ? `BREACHED${status.breach_reason ? ` · ${status.breach_reason}` : ''}`
            : isPassed
            ? 'PHASE PASSED ✓'
            : `PHASE ${status.current_phase ?? 1}`}
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-border/50 shrink-0" />

      {/* Metrics */}
      <div className="flex items-center gap-4 flex-1 min-w-0 overflow-x-auto no-scrollbar">
        {/* Profit target */}
        <div className="flex items-center gap-2 shrink-0">
          <TrendingUp className={cn('size-3', profitTargetMet ? 'text-profit' : 'text-muted-foreground')} />
          <MetricBar
            label="Profit"
            current={status.current_profit}
            limit={status.profit_target}
          />
        </div>

        {/* Daily loss */}
        <div className="flex items-center gap-2 shrink-0">
          <TrendingDown className={cn('size-3',
            Math.abs(status.current_daily_loss) > status.daily_loss_limit * 0.8
              ? 'text-loss' : 'text-muted-foreground'
          )} />
          <MetricBar
            label="Daily loss"
            current={Math.abs(status.current_daily_loss)}
            limit={status.daily_loss_limit}
            inverse
          />
        </div>

        {/* Max drawdown */}
        <div className="flex items-center gap-2 shrink-0">
          <TrendingDown className={cn('size-3',
            status.current_drawdown > status.max_drawdown * 0.8
              ? 'text-loss' : 'text-muted-foreground'
          )} />
          <MetricBar
            label="Drawdown"
            current={status.current_drawdown}
            limit={status.max_drawdown}
            inverse
          />
        </div>

        {/* Trading days */}
        <div className="flex flex-col gap-0.5 min-w-[70px] shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Days</span>
            <span className={cn(
              'text-[9px] font-semibold tabular-nums',
              tradingDaysOk ? 'text-profit' : 'text-muted-foreground'
            )}>
              {status.trading_days}
              <span className="opacity-50 ml-0.5">/{status.min_trading_days}</span>
            </span>
          </div>
          <div className="h-1 w-full bg-muted/40 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500',
                tradingDaysOk ? 'bg-profit' : 'bg-primary/60')}
              style={{ width: `${Math.min(100, (status.trading_days / Math.max(1, status.min_trading_days)) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
