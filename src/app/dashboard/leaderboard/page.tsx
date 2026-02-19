'use client'

import { useState } from 'react'
import { Trophy, Medal, Users, Crown, TrendingUp } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useLeaderboard } from '@/lib/hooks'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

const PODIUM_CONFIG = [
  { rankLabel: '1', icon: Crown, circleColor: 'bg-yellow-100 border-yellow-300', iconColor: 'text-yellow-500', numColor: 'text-yellow-500', cardBg: 'bg-gradient-to-b from-yellow-50 to-card border-yellow-200' },
  { rankLabel: '2', icon: Medal, circleColor: 'bg-zinc-100 border-zinc-300', iconColor: 'text-zinc-400', numColor: 'text-zinc-400', cardBg: 'bg-card border-border' },
  { rankLabel: '3', icon: Trophy, circleColor: 'bg-orange-100 border-orange-300', iconColor: 'text-orange-400', numColor: 'text-orange-400', cardBg: 'bg-card border-border' },
]

export default function LeaderboardPage() {
  const [filter, setFilter] = useState<'all' | 'funded' | 'evaluation'>('all')
  const { data: entries, isLoading } = useLeaderboard()

  const filtered = (entries ?? []).filter(e => {
    if (filter === 'funded') return e.is_funded
    if (filter === 'evaluation') return !e.is_funded
    return true
  })

  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  // Reorder for podium display: 2nd | 1st | 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]]
  const podiumConfigOrder = [PODIUM_CONFIG[1], PODIUM_CONFIG[0], PODIUM_CONFIG[2]]

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Top performing traders this month</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {(['all', 'funded', 'evaluation'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                filter === f
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : f === 'funded' ? 'Funded' : 'Evaluation'}
            </button>
          ))}
        </div>
      </div>

      {/* Podium — top 3 medallion style */}
      <div className="rounded-2xl bg-card border border-border shadow-sm p-8">
        {isLoading ? (
          <div className="flex items-end justify-center gap-8">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-40 w-32 rounded-xl" />)}
          </div>
        ) : top3.length > 0 ? (
          <div className="flex items-end justify-center gap-6">
            {podiumOrder.map((entry, idx) => {
              if (!entry) return <div key={idx} className="w-40" />
              const cfg = podiumConfigOrder[idx]
              const rank = entry.rank
              const isFirst = rank === 1
              const IconComp = cfg.icon
              return (
                <div key={entry.account_id} className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border p-5 text-center w-44 transition-all',
                  isFirst ? 'pb-8 shadow-md' : '',
                  cfg.cardBg
                )}>
                  {/* Trophy/medal icon badge above circle */}
                  <div className="relative">
                    <div className={cn(
                      'w-16 h-16 rounded-full border-2 flex items-center justify-center',
                      cfg.circleColor
                    )}>
                      <IconComp className={cn('size-7', cfg.iconColor)} />
                    </div>
                    {/* Small trophy above */}
                    <div className={cn(
                      'absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                      cfg.circleColor
                    )}>
                      <IconComp className={cn('size-3', cfg.iconColor)} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate w-full">{entry.username}</p>
                  <p className={cn('text-xl font-bold tabular-nums', entry.profit_pct >= 0 ? 'text-profit' : 'text-loss')}>
                    {entry.profit_pct >= 0 ? '+' : ''}{entry.profit_pct.toFixed(2)}%
                  </p>
                  {/* Rank number box */}
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold mt-1',
                    isFirst ? 'bg-yellow-100' : 'bg-muted',
                    cfg.numColor
                  )}>
                    {rank}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Trophy className="size-8 mb-2 opacity-30" />
            <p className="text-sm">No rankings yet</p>
          </div>
        )}
      </div>

      {/* Full Rankings table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Top 10 Rankings</h2>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} traders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/20">
                <th className="text-left px-5 py-3">Rank</th>
                <th className="text-left px-3 py-3">Trader</th>
                <th className="text-right px-3 py-3">ROI</th>
                <th className="text-right px-3 py-3">P&amp;L</th>
                <th className="text-right px-3 py-3">Unrealized</th>
                <th className="text-right px-3 py-3">Used Margin</th>
                <th className="text-right px-5 py-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      {[5, 6, 3, 14, 14, 14, 14].map((w, j) => (
                        <td key={j} className="px-3 py-3">
                          <Skeleton className={`h-3.5 w-${w} ${j > 1 ? 'ml-auto' : ''}`} />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((entry, i) => {
                    const isTop3 = entry.rank <= 3
                    const rankColors = ['text-yellow-500', 'text-zinc-400', 'text-orange-400']
                    const rankIcons = [Crown, Medal, Trophy]
                    const RIcon = isTop3 ? rankIcons[entry.rank - 1] : null
                    // Mock extra financial data based on rank
                    const mockPnl = entry.profit_amount
                    const mockUnrealized = (mockPnl * 1.2).toFixed(5)
                    const mockMarginUsed = (entry.profit_amount * 2.3).toFixed(5)
                    const mockAvailable = (200000 - entry.profit_amount * 1.1).toFixed(2)
                    return (
                      <tr key={entry.account_id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {RIcon && <RIcon className={cn('size-3.5', rankColors[entry.rank - 1])} />}
                            <span className={cn(
                              'font-semibold tabular-nums',
                              isTop3 ? rankColors[entry.rank - 1] : 'text-muted-foreground'
                            )}>
                              {entry.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0 text-muted-foreground">
                              {entry.username[0]}
                            </div>
                            <span className={cn('font-medium', isTop3 ? rankColors[entry.rank - 1] : 'text-foreground')}>
                              {entry.username}
                            </span>
                          </div>
                        </td>
                        <td className={cn('px-3 py-3 text-right tabular-nums font-semibold', entry.profit_pct >= 0 ? 'text-profit' : 'text-loss')}>
                          {entry.profit_pct >= 0 ? '+' : ''}{entry.profit_pct.toFixed(2)}%
                        </td>
                        <td className={cn('px-3 py-3 text-right tabular-nums font-medium', entry.profit_amount >= 0 ? 'text-profit' : 'text-loss')}>
                          {entry.profit_amount >= 0 ? '+' : ''}{formatCurrency(entry.profit_amount)}
                        </td>
                        <td className={cn('px-3 py-3 text-right tabular-nums', entry.profit_amount >= 0 ? 'text-profit' : 'text-loss')}>
                          +${mockUnrealized}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-foreground">
                          ${mockMarginUsed}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-foreground">
                          ${mockAvailable}
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* My Rank card */}
      <div className="rounded-2xl bg-card border border-border shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <TrendingUp className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">Your rank this month</p>
            <p className="text-sm font-bold text-foreground mt-0.5">Not ranked yet — start trading to appear on the leaderboard</p>
          </div>
          <Badge variant="secondary" className="text-[10px]">Monthly</Badge>
        </div>
      </div>
    </div>
  )
}
