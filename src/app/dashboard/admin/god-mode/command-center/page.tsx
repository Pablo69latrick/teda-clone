'use client'

import {
  Users, TrendingUp, DollarSign, AlertTriangle,
  UserCheck, BadgeDollarSign, Activity, ShieldAlert,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { cn, formatCurrency, formatLargeNumber, timeAgo } from '@/lib/utils'
import { useAdminStats, useAdminUsers, useAdminAccounts } from '@/lib/hooks'
import { Badge } from '@/components/ui/badge'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

function StatCard({
  label, value, sub, icon: Icon, loading, accent, trend,
}: {
  label: string; value: React.ReactNode; sub?: React.ReactNode
  icon: React.ElementType; loading?: boolean
  accent?: 'profit' | 'loss' | 'warn' | 'blue'
  trend?: 'up' | 'down'
}) {
  const accentCls = {
    profit: 'text-profit', loss: 'text-loss',
    warn: 'text-yellow-400', blue: 'text-blue-400', undefined: '',
  }[accent ?? 'undefined']

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card border border-border/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground/50" />
      </div>
      {loading ? (
        <><Skeleton className="h-7 w-28" /><Skeleton className="h-3.5 w-20 mt-1" /></>
      ) : (
        <>
          <div className={cn('text-xl font-bold tracking-tight flex items-center gap-1.5', accentCls)}>
            {value}
            {trend && (
              trend === 'up'
                ? <ArrowUpRight className="size-4 text-profit" />
                : <ArrowDownRight className="size-4 text-loss" />
            )}
          </div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </>
      )}
    </div>
  )
}

export default function CommandCenterPage() {
  const { data: stats, isLoading: loadingStats } = useAdminStats()
  const { data: users, isLoading: loadingUsers } = useAdminUsers()
  const { data: accounts, isLoading: loadingAccounts } = useAdminAccounts()

  const recentUsers = (users ?? []).slice(0, 8)
  const recentAccounts = (accounts ?? []).slice(0, 8)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">Command Center</h1>
          <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-primary/20 ml-1">ADMIN</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide overview and management</p>
      </div>

      {/* Revenue stats */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Revenue</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today" icon={DollarSign} loading={loadingStats} accent="profit" trend="up"
            value={formatCurrency(stats?.revenue_today ?? 0)}
            sub={`+${stats?.new_signups_today ?? 0} signups`}
          />
          <StatCard label="This Month" icon={TrendingUp} loading={loadingStats} accent="profit"
            value={formatCurrency(stats?.revenue_month ?? 0)}
            sub={`${stats?.new_signups_month ?? 0} new users`}
          />
          <StatCard label="All Time" icon={BadgeDollarSign} loading={loadingStats}
            value={formatLargeNumber(stats?.revenue_all_time ?? 0)}
            sub="Total platform revenue"
          />
          <StatCard label="Payouts Paid" icon={ArrowUpRight} loading={loadingStats}
            value={formatCurrency(stats?.total_payouts_paid ?? 0)}
            sub={stats?.pending_payouts ? `${stats.pending_payouts} pending` : 'No pending payouts'}
            accent={stats?.pending_payouts ? 'warn' : undefined}
          />
        </div>
      </div>

      {/* User/account stats */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Accounts</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Users" icon={Users} loading={loadingStats}
            value={(stats?.total_users ?? 0).toLocaleString()}
            sub="Registered accounts"
          />
          <StatCard label="Active Accounts" icon={UserCheck} loading={loadingStats} accent="profit"
            value={(stats?.active_accounts ?? 0).toLocaleString()}
            sub="Currently in challenge"
          />
          <StatCard label="Funded" icon={Activity} loading={loadingStats} accent="blue"
            value={(stats?.funded_accounts ?? 0).toLocaleString()}
            sub="Live funded traders"
          />
          <StatCard label="Breached" icon={AlertTriangle} loading={loadingStats} accent="loss"
            value={(stats?.breached_accounts ?? 0).toLocaleString()}
            sub={`${((stats?.breached_accounts ?? 0) / Math.max(1, stats?.active_accounts ?? 1) * 100).toFixed(1)}% breach rate`}
          />
        </div>
      </div>

      {/* Two column: recent users + recent accounts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Users */}
        <div className="rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent Users</h2>
            </div>
            <span className="text-xs text-muted-foreground">{users?.length ?? 0} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <th className="text-left px-5 py-2">User</th>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-right px-5 py-2">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-5 py-2.5"><Skeleton className="h-3.5 w-32" /></td>
                        <td className="px-3 py-2.5"><Skeleton className="h-3.5 w-10" /></td>
                        <td className="px-5 py-2.5 text-right"><Skeleton className="h-3.5 w-14 ml-auto" /></td>
                      </tr>
                    ))
                  : recentUsers.map(user => (
                      <tr key={user.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-2.5">
                          <div>
                            <div className="font-medium text-foreground">{user.name}</div>
                            <div className="text-[10px] text-muted-foreground">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {user.banned ? (
                            <Badge variant="loss" className="text-[9px] px-1.5 py-0">Banned</Badge>
                          ) : user.role === 'admin' ? (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Admin</Badge>
                          ) : (
                            <Badge variant="muted" className="text-[9px] px-1.5 py-0">User</Badge>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right text-muted-foreground tabular-nums">
                          {timeAgo(user.lastSeen)}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Accounts */}
        <div className="rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent Accounts</h2>
            </div>
            <span className="text-xs text-muted-foreground">{accounts?.length ?? 0} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <th className="text-left px-5 py-2">Trader</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-5 py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loadingAccounts
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-5 py-2.5"><Skeleton className="h-3.5 w-32" /></td>
                        <td className="px-3 py-2.5"><Skeleton className="h-3.5 w-14" /></td>
                        <td className="px-5 py-2.5 text-right"><Skeleton className="h-3.5 w-20 ml-auto" /></td>
                      </tr>
                    ))
                  : recentAccounts.map(acc => (
                      <tr key={acc.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-2.5">
                          <div>
                            <div className="font-medium text-foreground">{acc.userName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{acc.id.slice(0, 12)}…</div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant={acc.accountStatus as 'active' | 'funded' | 'passed' | 'breached' | 'muted'}
                            className="text-[9px] px-1.5 py-0"
                          >
                            {acc.accountStatus}
                          </Badge>
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums font-medium">
                          {formatCurrency(acc.availableMargin)}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
