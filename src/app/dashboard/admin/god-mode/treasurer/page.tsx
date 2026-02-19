'use client'

import { DollarSign, TrendingUp, Clock, CheckCircle, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'
import { cn, formatCurrency, formatLargeNumber, timeAgo } from '@/lib/utils'
import { useAdminStats } from '@/lib/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

// Mock payout queue
const PENDING_PAYOUTS = [
  { id: 'pay-1', user: 'Alex Rivera', email: 'alex@example.com', amount: 18_400, wallet: '0xaB3c...8dF1', requested_at: Date.now() - 2 * 86400_000, account: 'acc-4' },
  { id: 'pay-2', user: 'Jamie Chen', email: 'jamie@example.com', amount: 9_200, wallet: '0x7F2d...3aC9', requested_at: Date.now() - 1 * 86400_000, account: 'acc-12' },
  { id: 'pay-3', user: 'Sam Patel', email: 'sam@example.com', amount: 14_400, wallet: '0xE5c1...bB44', requested_at: Date.now() - 3600_000, account: 'acc-22' },
]

// Mock monthly revenue bars
const MONTHLY = [
  { month: 'Aug', revenue: 280_000, payouts: 38_000 },
  { month: 'Sep', revenue: 310_000, payouts: 44_000 },
  { month: 'Oct', revenue: 365_000, payouts: 52_000 },
  { month: 'Nov', revenue: 398_000, payouts: 67_000 },
  { month: 'Dec', revenue: 412_800, payouts: 71_000 },
]

function MiniBarChart({ data }: { data: { month: string; revenue: number; payouts: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue))
  return (
    <div className="flex items-end gap-2 h-24 mt-4">
      {data.map(d => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: `${(d.revenue / max) * 80}px` }}>
            <div className="w-full bg-loss/40 rounded-sm" style={{ height: `${(d.payouts / d.revenue) * 100}%`, minHeight: 2 }} />
            <div className="w-full bg-profit/50 rounded-sm flex-1" />
          </div>
          <span className="text-[9px] text-muted-foreground">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

export default function TreasurerPage() {
  const { data: stats, isLoading } = useAdminStats()

  const totalPending = PENDING_PAYOUTS.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Treasurer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform financials, deposits, and payout management</p>
      </div>

      {/* Main financial stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Revenue (Month)', icon: TrendingUp, value: stats?.revenue_month, accent: 'profit' as const, sub: `+${((stats?.revenue_month ?? 0) / Math.max(1, stats?.revenue_all_time ?? 1) * 100).toFixed(1)}% of total` },
          { label: 'Revenue (All Time)', icon: DollarSign, value: stats?.revenue_all_time, accent: undefined, sub: 'Since platform launch', large: true },
          { label: 'Total Deposited', icon: ArrowDownLeft, value: stats?.total_deposited, accent: undefined, sub: 'Capital under management', large: true },
          { label: 'Payouts Paid', icon: ArrowUpRight, value: stats?.total_payouts_paid, accent: 'loss' as const, sub: 'Total to traders' },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col gap-3 rounded-xl bg-card border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{stat.label}</span>
              <stat.icon className="size-4 text-muted-foreground/50" />
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className={cn('text-xl font-bold tracking-tight', stat.accent === 'profit' ? 'text-profit' : stat.accent === 'loss' ? 'text-loss' : '')}>
                {stat.large ? formatLargeNumber(stat.value ?? 0) : formatCurrency(stat.value ?? 0)}
              </div>
            )}
            <div className="text-xs text-muted-foreground">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart + pending payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue chart */}
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Monthly Revenue</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-profit/50" /> Revenue</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-loss/40" /> Payouts</div>
            </div>
          </div>
          <MiniBarChart data={MONTHLY} />
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="text-muted-foreground">Net margin (this month):</div>
            <div className="font-semibold text-profit">
              {formatCurrency((stats?.revenue_month ?? 0) - (MONTHLY[MONTHLY.length - 1]?.payouts ?? 0))}
            </div>
          </div>
        </div>

        {/* Platform health */}
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Platform Health</h2>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Avg Account Lifetime', value: `${stats?.avg_account_lifetime_days ?? 0} days` },
              { label: 'Monthly Churn Rate', value: `${((stats?.churn_rate ?? 0) * 100).toFixed(1)}%`, cls: 'text-yellow-400' },
              { label: 'New Signups (Month)', value: `${stats?.new_signups_month ?? 0}` },
              { label: 'New Signups (Today)', value: `${stats?.new_signups_today ?? 0}` },
              { label: 'Funded Accounts', value: `${stats?.funded_accounts ?? 0}`, cls: 'text-profit' },
              { label: 'Pending Payouts', value: `${stats?.pending_payouts ?? 0} (${formatCurrency(stats?.pending_payout_amount ?? 0)})`, cls: stats?.pending_payouts ? 'text-yellow-400' : '' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={cn('font-medium tabular-nums', item.cls ?? '')}>
                  {isLoading ? '—' : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payout queue */}
      <div className="rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-yellow-400" />
            <h2 className="text-sm font-semibold">Pending Payout Queue</h2>
            {PENDING_PAYOUTS.length > 0 && (
              <Badge variant="secondary" className="text-[9px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                {PENDING_PAYOUTS.length} pending
              </Badge>
            )}
          </div>
          <span className="text-sm font-semibold text-yellow-400 tabular-nums">{formatCurrency(totalPending)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <th className="text-left px-5 py-2">Trader</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Wallet</th>
                <th className="text-right px-3 py-2">Requested</th>
                <th className="text-right px-5 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {PENDING_PAYOUTS.map(p => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium">{p.user}</div>
                    <div className="text-[10px] text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(p.amount)}</td>
                  <td className="px-3 py-3 font-mono text-[10px] text-muted-foreground">{p.wallet}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">{timeAgo(p.requested_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2.5 py-0 text-profit border-profit/30 hover:bg-profit/10">
                        <CheckCircle className="size-2.5 mr-0.5" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2.5 py-0 text-loss border-loss/30 hover:bg-loss/10">
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
