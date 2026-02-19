'use client'

import { useState } from 'react'
import { Trophy, Medal, TrendingUp, Users, Crown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useLeaderboard } from '@/lib/hooks'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

const RANK_COLORS = ['text-yellow-400', 'text-zinc-300', 'text-orange-400']
const RANK_ICONS = [Crown, Medal, Medal]

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Top performing traders this month</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
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
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Podium — top 3 */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : top3.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {/* Reorder: 2nd | 1st | 3rd */}
          {[top3[1], top3[0], top3[2]].map((entry, podiumIdx) => {
            if (!entry) return <div key={podiumIdx} />
            const rank = entry.rank
            const RankIcon = RANK_ICONS[rank - 1] ?? Medal
            const isFirst = rank === 1
            return (
              <div
                key={entry.account_id}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all',
                  isFirst
                    ? 'bg-gradient-to-b from-yellow-500/10 to-card border-yellow-500/30 shadow-lg shadow-yellow-500/5'
                    : 'bg-card border-border/50'
                )}
              >
                <RankIcon className={cn('size-6', RANK_COLORS[rank - 1])} />
                <div className={cn('text-2xl font-bold tabular-nums', RANK_COLORS[rank - 1])}>
                  #{rank}
                </div>
                <div className="font-semibold text-sm text-foreground truncate w-full">
                  {entry.username}
                </div>
                <div className={cn('text-lg font-bold tabular-nums', entry.profit_pct >= 0 ? 'text-profit' : 'text-loss')}>
                  {entry.profit_pct >= 0 ? '+' : ''}{entry.profit_pct.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(entry.profit_amount)}
                </div>
                {entry.is_funded && (
                  <Badge variant="secondary" className="text-[9px] bg-profit/10 text-profit border-profit/20">
                    Funded
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Ranks 4+ table */}
      <div className="rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Rankings</h2>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} traders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <th className="text-left px-5 py-2">Rank</th>
                <th className="text-left px-3 py-2">Trader</th>
                <th className="text-right px-3 py-2">Gain %</th>
                <th className="text-right px-3 py-2">Profit</th>
                <th className="text-right px-3 py-2">Days</th>
                <th className="text-right px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-5 py-3"><Skeleton className="h-3.5 w-6" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3.5 w-24" /></td>
                      <td className="px-3 py-3 text-right"><Skeleton className="h-3.5 w-14 ml-auto" /></td>
                      <td className="px-3 py-3 text-right"><Skeleton className="h-3.5 w-18 ml-auto" /></td>
                      <td className="px-3 py-3 text-right"><Skeleton className="h-3.5 w-8 ml-auto" /></td>
                      <td className="px-5 py-3 text-right"><Skeleton className="h-3.5 w-16 ml-auto" /></td>
                    </tr>
                  ))
                : rest.map(entry => (
                    <tr key={entry.account_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-2.5 font-mono font-medium text-muted-foreground">
                        #{entry.rank}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                            {entry.username[0]}
                          </div>
                          <span className="font-medium text-foreground">{entry.username}</span>
                        </div>
                      </td>
                      <td className={cn('px-3 py-2.5 text-right tabular-nums font-semibold', entry.profit_pct >= 0 ? 'text-profit' : 'text-loss')}>
                        {entry.profit_pct >= 0 ? '+' : ''}{entry.profit_pct.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(entry.profit_amount)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {entry.trading_days}d
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {entry.is_funded ? (
                          <Badge variant="secondary" className="text-[9px] bg-profit/10 text-profit border-profit/20">Funded</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">{entry.challenge_type}</Badge>
                        )}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
