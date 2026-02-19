'use client'

import { useState } from 'react'
import { Trophy, Clock, Users, DollarSign, Flame, Lock } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type CompStatus = 'live' | 'upcoming' | 'ended'
type CompType = 'pnl' | 'winrate' | 'volume'

interface Competition {
  id: string
  name: string
  description: string
  type: CompType
  status: CompStatus
  prize_pool: number
  entry_fee: number
  participants: number
  max_participants: number | null
  starts_at: number
  ends_at: number
  prize_breakdown: { place: string; amount: number }[]
  your_rank: number | null
  your_pct: number | null
}

const MOCK_COMPS: Competition[] = [
  {
    id: 'c1',
    name: '🔥 Monthly PnL Masters',
    description: 'Top 10 traders by profit percentage at month end win a share of the prize pool.',
    type: 'pnl',
    status: 'live',
    prize_pool: 50_000,
    entry_fee: 0,
    participants: 1_243,
    max_participants: null,
    starts_at: Date.now() - 12 * 86400_000,
    ends_at: Date.now() + 18 * 86400_000,
    prize_breakdown: [
      { place: '1st', amount: 20_000 },
      { place: '2nd', amount: 12_000 },
      { place: '3rd', amount: 8_000 },
      { place: '4th–10th', amount: 1_429 },
    ],
    your_rank: 87,
    your_pct: 2.31,
  },
  {
    id: 'c2',
    name: '⚡ Weekend Warriors',
    description: 'Highest win rate over the weekend (Fri–Sun) among traders with 10+ trades.',
    type: 'winrate',
    status: 'upcoming',
    prize_pool: 10_000,
    entry_fee: 0,
    participants: 342,
    max_participants: 500,
    starts_at: Date.now() + 2 * 86400_000,
    ends_at: Date.now() + 4 * 86400_000,
    prize_breakdown: [
      { place: '1st', amount: 5_000 },
      { place: '2nd', amount: 3_000 },
      { place: '3rd', amount: 2_000 },
    ],
    your_rank: null,
    your_pct: null,
  },
  {
    id: 'c3',
    name: '💎 Elite Volume Challenge',
    description: 'Invitation-only competition for funded traders. Compete on total notional volume.',
    type: 'volume',
    status: 'live',
    prize_pool: 100_000,
    entry_fee: 0,
    participants: 48,
    max_participants: 50,
    starts_at: Date.now() - 5 * 86400_000,
    ends_at: Date.now() + 25 * 86400_000,
    prize_breakdown: [
      { place: '1st', amount: 50_000 },
      { place: '2nd', amount: 30_000 },
      { place: '3rd', amount: 20_000 },
    ],
    your_rank: null,
    your_pct: null,
  },
  {
    id: 'c4',
    name: '🎯 Q4 Grand Prix',
    description: 'Quarterly tournament — best overall risk-adjusted performance wins.',
    type: 'pnl',
    status: 'ended',
    prize_pool: 75_000,
    entry_fee: 0,
    participants: 2_100,
    max_participants: null,
    starts_at: Date.now() - 92 * 86400_000,
    ends_at: Date.now() - 2 * 86400_000,
    prize_breakdown: [
      { place: '1st', amount: 30_000 },
      { place: '2nd', amount: 20_000 },
      { place: '3rd', amount: 15_000 },
      { place: '4th–20th', amount: 625 },
    ],
    your_rank: 14,
    your_pct: 6.87,
  },
]

const STATUS_CONFIG: Record<CompStatus, { label: string; cls: string }> = {
  live: { label: 'Live', cls: 'bg-profit/10 text-profit border-profit/20' },
  upcoming: { label: 'Upcoming', cls: 'bg-chart-2/10 text-chart-2 border-chart-2/20' },
  ended: { label: 'Ended', cls: 'bg-muted text-muted-foreground border-border' },
}

const TYPE_LABELS: Record<CompType, string> = {
  pnl: 'PnL %',
  winrate: 'Win Rate',
  volume: 'Volume',
}

function timeRemaining(ms: number): string {
  const diff = ms - Date.now()
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86400_000)
  const h = Math.floor((diff % 86400_000) / 3600_000)
  if (d > 0) return `${d}d ${h}h left`
  const m = Math.floor((diff % 3600_000) / 60_000)
  return `${h}h ${m}m left`
}

function CompCard({ comp }: { comp: Competition }) {
  const cfg = STATUS_CONFIG[comp.status]
  const isLocked = comp.id === 'c3' && comp.your_rank === null
  const isFull = comp.max_participants != null && comp.participants >= comp.max_participants

  return (
    <div className={cn(
      'flex flex-col gap-4 rounded-xl bg-card border p-5 transition-all',
      comp.status === 'live' ? 'border-border/70 shadow-sm' : 'border-border/40 opacity-80',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="secondary" className={cn('text-[9px] border', cfg.cls)}>{cfg.label}</Badge>
            <Badge variant="secondary" className="text-[9px]">{TYPE_LABELS[comp.type]}</Badge>
            {isLocked && (
              <Badge variant="secondary" className="text-[9px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                <Lock className="size-2.5 mr-0.5" /> Funded Only
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-sm text-foreground">{comp.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{comp.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground">Prize Pool</div>
          <div className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(comp.prize_pool)}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
            <Users className="size-3" />
            <span className="text-[10px]">Traders</span>
          </div>
          <div className="text-sm font-semibold">
            {comp.participants.toLocaleString()}
            {comp.max_participants && <span className="text-[10px] text-muted-foreground">/{comp.max_participants}</span>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
            <Clock className="size-3" />
            <span className="text-[10px]">{comp.status === 'upcoming' ? 'Starts' : 'Time'}</span>
          </div>
          <div className="text-sm font-semibold">
            {comp.status === 'upcoming'
              ? timeRemaining(comp.starts_at).replace(' left', '')
              : comp.status === 'ended'
              ? 'Ended'
              : timeRemaining(comp.ends_at)
            }
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
            <Trophy className="size-3" />
            <span className="text-[10px]">Your Rank</span>
          </div>
          <div className={cn('text-sm font-semibold', comp.your_rank ? 'text-profit' : 'text-muted-foreground')}>
            {comp.your_rank ? `#${comp.your_rank}` : '—'}
          </div>
        </div>
      </div>

      {/* Prize breakdown */}
      <div className="rounded-lg bg-muted/20 border border-border/30 p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Prize Breakdown</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {comp.prize_breakdown.map(p => (
            <div key={p.place} className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{p.place}</span>
              <span className="font-semibold text-foreground">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between gap-3">
        {comp.your_pct !== null && (
          <div className="text-xs text-muted-foreground">
            Your gain: <span className="text-profit font-semibold">+{comp.your_pct}%</span>
          </div>
        )}
        <div className="ml-auto">
          {comp.status === 'ended' ? (
            <Button variant="outline" size="sm" className="text-xs" disabled>View Results</Button>
          ) : isLocked ? (
            <Button variant="outline" size="sm" className="text-xs" disabled>
              <Lock className="size-3 mr-1" /> Funded Only
            </Button>
          ) : isFull ? (
            <Button variant="outline" size="sm" className="text-xs" disabled>Full</Button>
          ) : comp.status === 'upcoming' ? (
            <Button size="sm" className="text-xs">Register</Button>
          ) : (
            <Button variant="outline" size="sm" className="text-xs">View Standings</Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CompetitionsPage() {
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all')

  const filtered = MOCK_COMPS.filter(c => filter === 'all' || c.status === filter)

  const liveCount = MOCK_COMPS.filter(c => c.status === 'live').length
  const totalPrizes = MOCK_COMPS.filter(c => c.status !== 'ended').reduce((s, c) => s + c.prize_pool, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Competitions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Compete and win from active prize pools</p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Prizes</div>
            <div className="text-lg font-bold text-profit tabular-nums">{formatCurrency(totalPrizes)}</div>
          </div>
          <div className="flex items-center gap-1 bg-profit/10 text-profit border border-profit/20 rounded-lg px-2.5 py-1.5">
            <Flame className="size-3.5" />
            <span className="text-xs font-semibold">{liveCount} Live</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        {(['all', 'live', 'upcoming', 'ended'] as const).map(f => (
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

      {/* Competition cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filtered.map(comp => <CompCard key={comp.id} comp={comp} />)}
      </div>
    </div>
  )
}
