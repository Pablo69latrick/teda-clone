'use client'

import { useState } from 'react'
import { Link2, Copy, Users, DollarSign, TrendingUp, Check, ExternalLink, Loader2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAffiliateDashboard } from '@/lib/hooks'
import type { AffiliateMonthly } from '@/types'

function MiniBarChart({ data }: { data: AffiliateMonthly[] }) {
  const max = Math.max(...data.map(d => d.amount), 1)
  return (
    <div className="flex items-end gap-2 h-16">
      {data.map((d, i) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={cn('w-full rounded-t-sm', i === data.length - 1 ? 'bg-primary/60' : 'bg-primary/25')}
            style={{ height: `${(d.amount / max) * 100}%`, minHeight: 4 }}
          />
          <span className="text-[9px] text-muted-foreground">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

export default function AffiliatePage() {
  const { data, isLoading } = useAffiliateDashboard()
  const [copied, setCopied] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { stats, referrals, monthly } = data

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Affiliate Program</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Earn {Math.round(stats.commission_rate * 100)}% commission on every referral&apos;s entry fee</p>
      </div>

      {/* Referral link */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="size-4 text-primary" />
          <span className="text-sm font-semibold">Your Referral Link</span>
          <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-primary/20">{stats.affiliate_code}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-card/80 border border-border/50 rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground truncate">
            {stats.affiliate_link}
          </div>
          <Button
            size="sm"
            variant={copied ? 'outline' : 'default'}
            onClick={() => handleCopy(stats.affiliate_link)}
            className={cn('shrink-0 text-xs gap-1.5 transition-all', copied ? 'text-profit border-profit/30' : '')}
          >
            {copied ? <><Check className="size-3" /> Copied!</> : <><Copy className="size-3" /> Copy Link</>}
          </Button>
          <Button size="sm" variant="outline" className="shrink-0 text-xs gap-1.5" asChild>
            <a href={stats.affiliate_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3" /> Preview
            </a>
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Share this link with friends. You earn <strong className="text-foreground">{Math.round(stats.commission_rate * 100)}%</strong> of their entry fee every time they purchase a challenge.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Earned', value: formatCurrency(stats.total_earned), icon: DollarSign, cls: 'text-profit', sub: 'All time' },
          { label: 'This Month', value: formatCurrency(stats.this_month), icon: TrendingUp, cls: 'text-profit', sub: `${stats.active_referrals} active referrals` },
          { label: 'Total Referrals', value: stats.total_referrals, icon: Users, cls: '', sub: `${stats.active_referrals} still active` },
          { label: 'Pending Payout', value: formatCurrency(stats.pending_commission), icon: DollarSign, cls: 'text-yellow-400', sub: 'Processing' },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col gap-3 rounded-xl bg-card border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{stat.label}</span>
              <stat.icon className="size-4 text-muted-foreground/50" />
            </div>
            <div className={cn('text-xl font-bold tracking-tight', stat.cls)}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Two col: chart + commission breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Monthly Commissions</h2>
          </div>
          <MiniBarChart data={monthly} />
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-muted-foreground">{monthly.length}-month total</span>
            <span className="font-semibold">{formatCurrency(monthly.reduce((s, m) => s + m.amount, 0))}</span>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Commission Structure</h2>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { challenge: '50K Standard 2-Step', fee: 299, commission: 59.80 },
              { challenge: '100K Instant Funding', fee: 549, commission: 109.80 },
              { challenge: '200K Elite', fee: 1099, commission: 219.80 },
            ].map(item => (
              <div key={item.challenge} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 text-sm">
                <span className="text-muted-foreground text-xs">{item.challenge}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{formatCurrency(item.fee)}</span>
                  <span className="font-semibold text-profit">{formatCurrency(item.commission)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            {Math.round(stats.commission_rate * 100)}% of the entry fee, paid to your account within 7 days of purchase.
          </p>
        </div>
      </div>

      {/* Recent referrals */}
      <div className="rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent Referrals</h2>
          </div>
          <span className="text-xs text-muted-foreground">{referrals.length} shown</span>
        </div>

        {referrals.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-muted-foreground">
            No referrals yet. Share your link to start earning!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <th className="text-left px-5 py-2">Trader</th>
                  <th className="text-left px-3 py-2">Challenge</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-5 py-2">Commission</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(ref => (
                  <tr key={ref.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">
                          {ref.name[0]}
                        </div>
                        <span className="font-medium text-foreground">{ref.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{ref.challenge}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={ref.status as 'active' | 'funded' | 'breached'}
                        className="text-[9px] px-1.5 py-0"
                      >
                        {ref.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-profit tabular-nums">
                      +{formatCurrency(ref.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
