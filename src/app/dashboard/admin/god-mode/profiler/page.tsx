'use client'

import { useState, useMemo } from 'react'
import { Search, Users, ShieldBan, ShieldCheck, Key, ChevronUp, ChevronDown } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminUsers } from '@/lib/hooks'
import type { AdminUser } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

type SortKey = 'name' | 'createdAt' | 'lastSeen'
type SortDir = 'asc' | 'desc'

export default function ProfilerPage() {
  const [search, setSearch] = useState('')
  const [filterBanned, setFilterBanned] = useState<boolean | null>(null)
  const [sort, setSort] = useState<SortKey>('lastSeen')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data: users, isLoading } = useAdminUsers()

  const filtered = useMemo(() => {
    if (!users) return []
    let list = [...users]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (filterBanned !== null) {
      list = list.filter(u => u.banned === filterBanned)
    }
    list.sort((a, b) => {
      const va = a[sort] as number | string
      const vb = b[sort] as number | string
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
    return list
  }, [users, search, filterBanned, sort, sortDir])

  const totalBanned = (users ?? []).filter(u => u.banned).length
  const total2FA = (users ?? []).filter(u => u.twoFactorEnabled).length

  const toggleSort = (key: SortKey) => {
    if (sort === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sort !== col) return <ChevronUp className="size-3 opacity-20" />
    return sortDir === 'asc'
      ? <ChevronUp className="size-3 text-primary" />
      : <ChevronDown className="size-3 text-primary" />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Profiler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">User management and account moderation</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Banned</div>
            <div className="font-bold text-loss">{totalBanned}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">2FA Enabled</div>
            <div className="font-bold text-profit">{total2FA}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          {([
            { label: 'All', value: null },
            { label: 'Active', value: false },
            { label: 'Banned', value: true },
          ] as { label: string; value: boolean | null }[]).map(opt => (
            <button
              key={opt.label}
              onClick={() => setFilterBanned(opt.value)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                filterBanned === opt.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Users</h2>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} of {users?.length ?? 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <th className="text-left px-5 py-2">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    User <SortIcon col="name" />
                  </button>
                </th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">2FA</th>
                <th className="text-right px-3 py-2">
                  <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                    Joined <SortIcon col="createdAt" />
                  </button>
                </th>
                <th className="text-right px-5 py-2">
                  <button onClick={() => toggleSort('lastSeen')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                    Last Seen <SortIcon col="lastSeen" />
                  </button>
                </th>
                <th className="text-right px-5 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-5 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-8" /></td>
                      <td className="px-3 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="px-5 py-3 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                      <td className="px-5 py-3 text-right"><Skeleton className="h-6 w-16 ml-auto" /></td>
                    </tr>
                  ))
                : filtered.map((user: AdminUser) => (
                    <tr key={user.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                            {user.name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{user.name}</div>
                            <div className="text-[10px] text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {user.banned ? (
                          <Badge variant="loss" className="text-[9px] px-1.5 py-0">Banned</Badge>
                        ) : user.role === 'admin' ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Admin</Badge>
                        ) : (
                          <Badge variant="muted" className="text-[9px] px-1.5 py-0">Active</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {user.twoFactorEnabled
                          ? <ShieldCheck className="size-3.5 text-profit" />
                          : <ShieldBan className="size-3.5 text-muted-foreground/40" />
                        }
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                        {timeAgo(user.createdAt)}
                      </td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground tabular-nums">
                        {timeAgo(user.lastSeen)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 py-0">
                            <Key className="size-2.5 mr-0.5" /> Reset
                          </Button>
                          {user.banned ? (
                            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 py-0 text-profit border-profit/30 hover:bg-profit/10">
                              Unban
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 py-0 text-loss border-loss/30 hover:bg-loss/10">
                              Ban
                            </Button>
                          )}
                        </div>
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
