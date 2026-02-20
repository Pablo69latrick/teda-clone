'use client'

import { useState, useMemo } from 'react'
import { Search, History, Filter, ArrowUpDown } from 'lucide-react'
import { cn, formatCurrency, formatTimestamp } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAccounts, useClosedPositions } from '@/lib/hooks'
import type { Position } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

type SortKey = 'entry_timestamp' | 'exit_timestamp' | 'realized_pnl' | 'quantity'
type SortDir = 'asc' | 'desc'

export default function HistoryPage() {
  const [search, setSearch] = useState('')
  const [filterSide, setFilterSide] = useState<'all' | 'long' | 'short'>('all')
  const [filterResult, setFilterResult] = useState<'all' | 'win' | 'loss'>('all')
  const [sort, setSort] = useState<SortKey>('exit_timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const account = accounts?.[0]
  const { data: closedRaw, isLoading: loadingClosed } = useClosedPositions(account?.id)

  const loading = loadingAccounts || loadingClosed

  const closedPositions: Position[] = closedRaw ?? []

  const filtered = useMemo(() => {
    let list = [...closedPositions]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.symbol.toLowerCase().includes(q))
    }
    if (filterSide !== 'all') list = list.filter(p => p.direction === filterSide)
    if (filterResult === 'win') list = list.filter(p => p.realized_pnl > 0)
    if (filterResult === 'loss') list = list.filter(p => p.realized_pnl <= 0)
    list.sort((a, b) => {
      const va = a[sort] as number | null
      const vb = b[sort] as number | null
      const na = va ?? 0
      const nb = vb ?? 0
      return sortDir === 'asc' ? na - nb : nb - na
    })
    return list
  }, [closedPositions, search, filterSide, filterResult, sort, sortDir])

  const totalPnl = filtered.reduce((s, p) => s + p.realized_pnl, 0)
  const wins = filtered.filter(p => p.realized_pnl > 0).length
  const losses = filtered.filter(p => p.realized_pnl <= 0).length

  const toggleSort = (key: SortKey) => {
    if (sort === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setSortDir('desc') }
  }

  const SortBtn = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(col)}
      className={cn('flex items-center gap-1 transition-colors hover:text-foreground', sort === col ? 'text-foreground' : '')}
    >
      {children}
      <ArrowUpDown className={cn('size-3', sort === col ? 'text-primary' : 'opacity-30')} />
    </button>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trade History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All closed positions and transactions</p>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Realized PnL</div>
              <div className={cn('text-lg font-bold tabular-nums', totalPnl >= 0 ? 'text-profit' : 'text-loss')}>
                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Win / Loss</div>
              <div className="text-sm font-semibold">
                <span className="text-profit">{wins}W</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-loss">{losses}L</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by symbol..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          {(['all', 'long', 'short'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterSide(f)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                filterSide === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          {(['all', 'win', 'loss'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterResult(f)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                filterResult === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="size-3" />
          {filtered.length} trades
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <th className="text-left px-5 py-3">Symbol</th>
                <th className="text-left px-3 py-3">Side</th>
                <th className="text-right px-3 py-3">
                  <SortBtn col="quantity">Size</SortBtn>
                </th>
                <th className="text-right px-3 py-3">Entry Price</th>
                <th className="text-right px-3 py-3">Exit Price</th>
                <th className="text-right px-3 py-3">Leverage</th>
                <th className="text-right px-3 py-3">
                  <SortBtn col="realized_pnl">PnL</SortBtn>
                </th>
                <th className="text-right px-3 py-3">Fees</th>
                <th className="text-left px-3 py-3">Close Reason</th>
                <th className="text-right px-3 py-3">
                  <SortBtn col="entry_timestamp">Opened</SortBtn>
                </th>
                <th className="text-right px-5 py-3">
                  <SortBtn col="exit_timestamp">Closed</SortBtn>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/30">
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} className={cn('py-3', j === 0 ? 'px-5' : j === 10 ? 'px-5' : 'px-3')}>
                          <Skeleton className="h-3.5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <History className="size-8 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No trades found</p>
                          <p className="text-xs text-muted-foreground/60">
                            {search || filterSide !== 'all' || filterResult !== 'all'
                              ? 'Try adjusting your filters'
                              : 'Your closed trades will appear here'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                : filtered.map(pos => {
                    const pnl = pos.realized_pnl
                    const closeReasonColors: Record<string, string> = {
                      manual: 'text-muted-foreground',
                      sl: 'text-loss',
                      tp: 'text-profit',
                      limit: 'text-chart-2',
                      liquidation: 'text-loss',
                    }
                    return (
                      <tr key={pos.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-2.5 font-medium">{pos.symbol}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={pos.direction} className="text-[9px] px-1.5 py-0">{pos.direction}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {pos.quantity.toFixed(3)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">${pos.entry_price.toFixed(5)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">${(pos.exit_price ?? 0).toFixed(5)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{pos.leverage}x</td>
                        <td className={cn('px-3 py-2.5 text-right tabular-nums font-semibold', pnl >= 0 ? 'text-profit' : 'text-loss')}>
                          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(pos.total_fees)}
                        </td>
                        <td className={cn('px-3 py-2.5 capitalize', closeReasonColors[pos.close_reason ?? 'manual'] ?? 'text-muted-foreground')}>
                          {pos.close_reason ?? 'manual'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground text-[10px] tabular-nums">
                          {formatTimestamp(pos.entry_timestamp)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-muted-foreground text-[10px] tabular-nums">
                          {pos.exit_timestamp ? formatTimestamp(pos.exit_timestamp) : '—'}
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
