'use client'

import { useState, useMemo } from 'react'
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Activity,
  Search,
  X,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Award,
  Zap,
  CircleDot,
  BarChart3,
  Clock,
  Globe,
  Server,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  Database,
  Wifi,
  CreditCard,
  Bell,
  Eye,
  MonitorSmartphone,
  MapPin,
  Fingerprint,
  LogOut,
  Timer,
} from 'lucide-react'
import { cn, formatCurrency, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAdminStats, useAdminUsers, useAdminAccounts } from '@/lib/hooks'
import type { AdminUser, AdminAccount } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

// ─── Sparkline SVG ────────────────────────────────────────────────────
function Sparkline({ values, color = '#22c55e', height = 32, width = 80 }: { values: number[]; color?: string; height?: number; width?: number }) {
  if (!values.length) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const pts = points.join(' ')
  const lastPt = points[points.length - 1].split(',')
  const areaPath = `M${points[0].split(',')[0]},${height} L${pts.split(' ').join(' L')} L${lastPt[0]},${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(lastPt[0])} cy={parseFloat(lastPt[1])} r="2.5" fill={color} />
    </svg>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string
  sub?: string
  delta?: number
  icon: React.ElementType
  iconColor?: string
  iconBg?: string
  sparkValues?: number[]
  loading?: boolean
  sparkColor?: string
  onClick?: () => void
}
function KpiCard({ label, value, sub, delta, icon: Icon, iconColor = 'text-primary', iconBg = 'bg-muted/60', sparkValues, loading, sparkColor, onClick }: KpiCardProps) {
  const sc = sparkColor ?? (delta !== undefined ? (delta >= 0 ? '#22c55e' : '#dc2626') : '#6366f1')
  return (
    <div
      className={cn('rounded-xl bg-card border border-border/50 p-4 flex flex-col gap-2 transition-all', onClick && 'cursor-pointer hover:border-primary/30 hover:shadow-sm')}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('size-7 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('size-3.5', iconColor)} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        {sparkValues && <Sparkline values={sparkValues} color={sc} />}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-28" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>
          {delta !== undefined && (
            <span className={cn('text-xs font-medium mb-0.5 flex items-center gap-0.5', delta >= 0 ? 'text-profit' : 'text-loss')}>
              {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── Stat Row ─────────────────────────────────────────────────────────
function StatRow({ label, value, valueClass = '' }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-semibold', valueClass)}>{value}</span>
    </div>
  )
}

// ─── User Slide-Over ──────────────────────────────────────────────────
function UserSlideOver({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-card border-l border-border shadow-2xl w-84 h-full overflow-y-auto flex flex-col"
        style={{ width: 340 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border/50 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">User Profile</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 border-b border-border/30">
          <div className="flex items-center gap-3 mb-5">
            <div className={cn(
              'size-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0',
              user.banned ? 'bg-loss/15 text-loss' : user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-foreground'
            )}>
              {user.name[0]}
            </div>
            <div>
              <div className="font-semibold text-sm">{user.name}</div>
              <div className="text-xs text-muted-foreground mb-1.5">{user.email}</div>
              <div className="flex items-center gap-1">
                {user.banned ? (
                  <Badge variant="loss" className="text-[9px] px-1.5 py-0">Banned</Badge>
                ) : user.role === 'admin' ? (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Admin</Badge>
                ) : (
                  <Badge variant="muted" className="text-[9px] px-1.5 py-0">Active</Badge>
                )}
                {user.twoFactorEnabled && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-profit/10 text-profit border-profit/20">2FA</Badge>}
              </div>
            </div>
          </div>
          <div className="space-y-0 bg-muted/20 rounded-lg px-3">
            <StatRow label="Role" value={<span className="capitalize">{user.role}</span>} />
            <StatRow label="Status" value={user.banned ? '🚫 Banned' : '✅ Active'} valueClass={user.banned ? 'text-loss' : 'text-profit'} />
            <StatRow label="2FA Enabled" value={user.twoFactorEnabled ? 'Yes' : 'No'} valueClass={user.twoFactorEnabled ? 'text-profit' : 'text-muted-foreground'} />
            <StatRow label="Email Verified" value={user.emailVerified ? 'Verified' : 'Unverified'} valueClass={user.emailVerified ? 'text-profit' : 'text-yellow-500'} />
            <StatRow label="Joined" value={timeAgo(user.createdAt)} />
            <StatRow label="Last Active" value={timeAgo(user.lastSeen)} />
          </div>
        </div>
        <div className="px-5 py-3 border-b border-border/30">
          <div className="text-[10px] text-muted-foreground mb-1">User ID</div>
          <div className="font-mono text-[10px] bg-muted/30 rounded px-2 py-1.5 break-all">{user.id}</div>
        </div>
        <div className="p-5 flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Quick Actions</div>
          <button className="w-full text-xs py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-left font-medium flex items-center gap-2">
            🔑 Send Password Reset Email
          </button>
          {user.banned ? (
            <button className="w-full text-xs py-2 px-3 rounded-lg bg-profit/10 hover:bg-profit/20 transition-colors text-left font-medium text-profit flex items-center gap-2">
              ✅ Unban User
            </button>
          ) : (
            <button className="w-full text-xs py-2 px-3 rounded-lg bg-loss/10 hover:bg-loss/20 transition-colors text-left font-medium text-loss flex items-center gap-2">
              🚫 Ban User
            </button>
          )}
          <button className="w-full text-xs py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-left font-medium text-primary flex items-center gap-2">
            ⬆️ Promote to Admin
          </button>
          <button className="w-full text-xs py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-left font-medium flex items-center justify-between">
            <span>View in Profiler</span>
            <ExternalLink className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Account Slide-Over ───────────────────────────────────────────────
function AccountSlideOver({ account, onClose }: { account: AdminAccount; onClose: () => void }) {
  const statusColor = account.accountStatus === 'active' ? 'text-profit'
    : account.accountStatus === 'breached' ? 'text-loss'
    : account.accountStatus === 'funded' ? 'text-primary'
    : 'text-muted-foreground'
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-card border-l border-border shadow-2xl h-full overflow-y-auto flex flex-col"
        style={{ width: 340 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border/50 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Account Detail</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 border-b border-border/30">
          <div className="font-mono text-[10px] text-muted-foreground mb-2">{account.id}</div>
          <div className="flex items-center gap-3 mb-5">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
              {(account.userName ?? '?')[0]}
            </div>
            <div>
              <div className="font-semibold text-sm">{account.userName ?? '—'}</div>
              <div className="text-[10px] text-muted-foreground">{account.userEmail ?? '—'}</div>
            </div>
          </div>
          <div className="space-y-0 bg-muted/20 rounded-lg px-3">
            <StatRow
              label="Status"
              value={<span className={cn('capitalize', statusColor)}>{account.accountStatus}</span>}
            />
            <StatRow label="Account Type" value={<span className="capitalize">{account.accountType}</span>} />
            <StatRow label="Currency" value={account.baseCurrency} />
            <StatRow label="Margin Mode" value={<span className="capitalize">{account.defaultMarginMode}</span>} />
            <StatRow label="Available Margin" value={formatCurrency(account.availableMargin)} valueClass="text-profit" />
            <StatRow label="Reserved Margin" value={formatCurrency(account.reservedMargin)} />
            <StatRow label="Injected Funds" value={formatCurrency(account.injectedFunds)} />
            <StatRow label="Created" value={timeAgo(account.createdAt)} />
          </div>
        </div>
        <div className="p-5 flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Risk Actions</div>
          <button className="w-full text-xs py-2 px-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors text-left font-medium text-yellow-600 flex items-center gap-2">
            ⚠️ Send Risk Warning
          </button>
          <button className="w-full text-xs py-2 px-3 rounded-lg bg-loss/10 hover:bg-loss/20 transition-colors text-left font-medium text-loss flex items-center gap-2">
            🔒 Force Close All Positions
          </button>
          <button className="w-full text-xs py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-left font-medium flex items-center justify-between">
            <span>View in Risk Radar</span>
            <ExternalLink className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page Tabs ────────────────────────────────────────────────────────
type Tab = 'overview' | 'users' | 'accounts' | 'platform' | 'sessions'

// ─── Mock Live Sessions ───────────────────────────────────────────────
const MOCK_SESSIONS = [
  { id: 's1', userId: 'usr_4k2p', name: 'Alex Rivera', email: 'alex@example.com', role: 'trader', ip: '82.45.183.12', country: 'FR', city: 'Paris', device: 'Chrome 120 / macOS', startedAt: Date.now() - 4 * 60_000, lastActivity: Date.now() - 20_000, pages: 14, accountId: 'acc-0004', status: 'active' },
  { id: 's2', userId: 'usr_8m9r', name: 'Jamie Chen', email: 'jamie@example.com', role: 'trader', ip: '78.192.44.201', country: 'GB', city: 'London', device: 'Safari 17 / iPhone', startedAt: Date.now() - 12 * 60_000, lastActivity: Date.now() - 55_000, pages: 7, accountId: 'acc-0012', status: 'active' },
  { id: 's3', userId: 'usr_2n1k', name: 'Sam Patel', email: 'sam@example.com', role: 'trader', ip: '104.28.77.93', country: 'US', city: 'New York', device: 'Firefox 121 / Windows', startedAt: Date.now() - 28 * 60_000, lastActivity: Date.now() - 180_000, pages: 22, accountId: 'acc-0022', status: 'idle' },
  { id: 's4', userId: 'usr_6z3w', name: 'Maria Torres', email: 'maria@example.com', role: 'trader', ip: '185.60.112.44', country: 'ES', city: 'Madrid', device: 'Chrome 119 / Android', startedAt: Date.now() - 2 * 60_000, lastActivity: Date.now() - 8_000, pages: 3, accountId: 'acc-0035', status: 'active' },
  { id: 's5', userId: 'usr_9p7q', name: 'Chris Lee', email: 'chris@example.com', role: 'trader', ip: '203.0.113.45', country: 'AU', city: 'Sydney', device: 'Edge 120 / Windows', startedAt: Date.now() - 55 * 60_000, lastActivity: Date.now() - 320_000, pages: 31, accountId: 'acc-0041', status: 'idle' },
  { id: 's6', userId: 'usr_3x8t', name: 'Admin Jules', email: 'jules@platform.com', role: 'admin', ip: '192.168.1.1', country: 'FR', city: 'Lyon', device: 'Chrome 120 / macOS', startedAt: Date.now() - 8 * 60_000, lastActivity: Date.now() - 2_000, pages: 48, accountId: null, status: 'active' },
  { id: 's7', userId: 'usr_5b4n', name: 'Lucas Martin', email: 'lucas@example.com', role: 'trader', ip: '91.108.4.56', country: 'DE', city: 'Berlin', device: 'Chrome 118 / Linux', startedAt: Date.now() - 35 * 60_000, lastActivity: Date.now() - 900_000, pages: 9, accountId: 'acc-0089', status: 'inactive' },
]

const FLAG_MAP: Record<string, string> = { FR: '🇫🇷', GB: '🇬🇧', US: '🇺🇸', ES: '🇪🇸', AU: '🇦🇺', DE: '🇩🇪', JP: '🇯🇵', CA: '🇨🇦', BR: '🇧🇷', SG: '🇸🇬' }

// ─── Mini Activity Feed (mock) ────────────────────────────────────────
const ACTIVITY_FEED = [
  { id: '1', icon: '👤', text: 'New user registered', sub: 'john.doe@example.com', time: '2m ago', color: 'text-blue-500' },
  { id: '2', icon: '💰', text: 'Payout approved', sub: '$1,250.00 → Sarah K.', time: '5m ago', color: 'text-profit' },
  { id: '3', icon: '🚨', text: 'Account breached', sub: 'acc_8x2k9p — daily loss limit hit', time: '12m ago', color: 'text-loss' },
  { id: '4', icon: '✅', text: 'Phase 1 passed', sub: 'Mike R. → Phase 2 evaluation', time: '18m ago', color: 'text-profit' },
  { id: '5', icon: '💸', text: 'New challenge started', sub: '10K Evaluation — $99 fee', time: '24m ago', color: 'text-primary' },
  { id: '6', icon: '🔑', text: 'Password reset', sub: 'user@domain.com', time: '31m ago', color: 'text-muted-foreground' },
  { id: '7', icon: '⚠️', text: 'Risk warning sent', sub: 'acc_3k7m1q — 80% daily limit', time: '45m ago', color: 'text-yellow-500' },
  { id: '8', icon: '📋', text: 'Payout requested', sub: '$3,400.00 — pending review', time: '1h ago', color: 'text-orange-500' },
  { id: '9', icon: '🚫', text: 'User banned', sub: 'Suspicious activity detected', time: '2h ago', color: 'text-loss' },
  { id: '10', icon: '🎯', text: 'Funded account created', sub: 'acc_live_9z2p → $50K funded', time: '3h ago', color: 'text-primary' },
]

// ─── Platform Health Metrics ──────────────────────────────────────────
const SYSTEM_METRICS = [
  { label: 'API Latency', value: '42ms', status: 'ok', icon: Wifi },
  { label: 'DB Response', value: '8ms', status: 'ok', icon: Database },
  { label: 'CPU Usage', value: '34%', status: 'ok', icon: Cpu },
  { label: 'Memory', value: '61%', status: 'warn', icon: Server },
  { label: 'Active Sessions', value: '847', status: 'ok', icon: Globe },
  { label: 'Error Rate', value: '0.02%', status: 'ok', icon: AlertCircle },
]

// ─── Revenue Chart (SVG) ──────────────────────────────────────────────
function RevenueBarChart({ data }: { data: number[] }) {
  const W = 280, H = 56
  const max = Math.max(...data) || 1
  const barW = (W - (data.length - 1) * 3) / data.length
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {data.map((v, i) => {
        const h = (v / max) * (H - 4)
        const x = i * (barW + 3)
        const isLast = i === data.length - 1
        return (
          <rect
            key={i}
            x={x}
            y={H - h - 2}
            width={barW}
            height={h}
            rx={2}
            fill={isLast ? '#6366f1' : '#6366f120'}
          />
        )
      })}
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function CommandCenterPage() {
  const { data: stats, isLoading: statsLoading, mutate: refreshStats } = useAdminStats()
  const { data: users, isLoading: usersLoading } = useAdminUsers()
  const { data: accounts, isLoading: accountsLoading } = useAdminAccounts()

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [userSearch, setUserSearch] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'banned' | 'admin'>('all')
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'active' | 'funded' | 'breached' | 'passed'>('all')

  const revenueSparkline = [18200, 21000, 19500, 24000, 22800, 26100, 28400, stats?.revenue_today ?? 31200]
  const usersSparkline = [1620, 1680, 1710, 1750, 1790, 1810, 1840, stats?.total_users ?? 1847]
  const fundedSparkline = [44, 48, 51, 53, 57, 60, 62, stats?.funded_accounts ?? 64]
  const payoutSparkline = [4200, 5100, 6800, 5900, 7200, 8100, 9400, stats?.total_payouts_paid ?? 10200]
  const revenueBarData = [18200, 21000, 19500, 24000, 22800, 26100, 28400, stats?.revenue_today ?? 31200]

  const filteredUsers = useMemo(() => {
    if (!users) return []
    let list = [...users].sort((a, b) => b.lastSeen - a.lastSeen)
    if (userSearch) {
      const q = userSearch.toLowerCase()
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (userStatusFilter === 'banned') list = list.filter(u => u.banned)
    else if (userStatusFilter === 'active') list = list.filter(u => !u.banned && u.role !== 'admin')
    else if (userStatusFilter === 'admin') list = list.filter(u => u.role === 'admin')
    return list.slice(0, 12)
  }, [users, userSearch, userStatusFilter])

  const filteredAccounts = useMemo(() => {
    if (!accounts) return []
    let list = [...accounts].sort((a, b) => b.createdAt - a.createdAt)
    if (accountSearch) {
      const q = accountSearch.toLowerCase()
      list = list.filter(a =>
        a.id.toLowerCase().includes(q) ||
        (a.userName ?? '').toLowerCase().includes(q) ||
        (a.userEmail ?? '').toLowerCase().includes(q)
      )
    }
    if (accountStatusFilter !== 'all') {
      list = list.filter(a => a.accountStatus === accountStatusFilter)
    }
    return list.slice(0, 12)
  }, [accounts, accountSearch, accountStatusFilter])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshStats()
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const activeSessions = MOCK_SESSIONS.filter(s => s.status === 'active').length

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'accounts', label: 'Accounts', icon: Activity },
    { id: 'platform', label: 'Platform Health', icon: Server },
    { id: 'sessions', label: `Live Sessions${activeSessions > 0 ? ` (${activeSessions})` : ''}`, icon: MonitorSmartphone },
  ]

  return (
    <div className="flex flex-col gap-0">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-2 rounded-full bg-profit animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Live · refreshes every 30s</span>
          </div>
          <h1 className="text-xl font-bold">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Full platform overview — all metrics at a glance</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 mb-6 self-start">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ═══════════════════════════════════ TAB: OVERVIEW ═══ */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Revenue KPIs */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Revenue</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Revenue Today"
                value={statsLoading ? '—' : formatCurrency(stats?.revenue_today ?? 0)}
                sub={`+${stats?.new_signups_today ?? 0} signups today`}
                delta={8.2}
                icon={DollarSign}
                iconColor="text-profit"
                iconBg="bg-profit/10"
                sparkValues={revenueSparkline}
                loading={statsLoading}
              />
              <KpiCard
                label="Revenue MTD"
                value={statsLoading ? '—' : formatCurrency(stats?.revenue_month ?? 0)}
                sub="Month to date"
                delta={12.4}
                icon={TrendingUp}
                iconColor="text-primary"
                iconBg="bg-primary/10"
                loading={statsLoading}
              />
              <KpiCard
                label="All-Time Revenue"
                value={statsLoading ? '—' : formatCurrency(stats?.revenue_all_time ?? 0)}
                sub={`Churn: ${stats?.churn_rate?.toFixed(1) ?? '—'}%`}
                icon={Award}
                iconColor="text-yellow-500"
                iconBg="bg-yellow-500/10"
                loading={statsLoading}
              />
              <KpiCard
                label="Pending Payouts"
                value={statsLoading ? '—' : formatCurrency(stats?.pending_payout_amount ?? 0)}
                sub={`${stats?.pending_payouts ?? 0} requests pending`}
                delta={-3.1}
                icon={Zap}
                iconColor="text-orange-500"
                iconBg="bg-orange-500/10"
                sparkValues={payoutSparkline}
                sparkColor="#f97316"
                loading={statsLoading}
              />
            </div>
          </div>

          {/* User/Account KPIs */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Users & Accounts</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Total Users"
                value={statsLoading ? '—' : (stats?.total_users ?? 0).toLocaleString()}
                sub={`+${stats?.new_signups_month ?? 0} this month`}
                delta={2.3}
                icon={Users}
                iconColor="text-blue-500"
                iconBg="bg-blue-500/10"
                sparkValues={usersSparkline}
                sparkColor="#3b82f6"
                loading={statsLoading}
              />
              <KpiCard
                label="Active Accounts"
                value={statsLoading ? '—' : (stats?.active_accounts ?? 0).toLocaleString()}
                sub="Currently in challenge"
                icon={Activity}
                iconColor="text-profit"
                iconBg="bg-profit/10"
                loading={statsLoading}
              />
              <KpiCard
                label="Funded Accounts"
                value={statsLoading ? '—' : (stats?.funded_accounts ?? 0).toLocaleString()}
                sub="Live funded traders"
                delta={5.7}
                icon={CircleDot}
                iconColor="text-primary"
                iconBg="bg-primary/10"
                sparkValues={fundedSparkline}
                loading={statsLoading}
              />
              <KpiCard
                label="Breached Today"
                value={statsLoading ? '—' : (stats?.breached_accounts ?? 0).toLocaleString()}
                sub="Rule violations today"
                delta={-1.8}
                icon={ShieldAlert}
                iconColor="text-loss"
                iconBg="bg-loss/10"
                loading={statsLoading}
              />
            </div>
          </div>

          {/* 3-col layout: Revenue chart + Activity + Quick stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue bars */}
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-semibold">Revenue (Last 8d)</div>
                  <div className="text-[10px] text-muted-foreground">Daily challenge fee income</div>
                </div>
                <Badge variant="secondary" className="text-[9px] bg-profit/10 text-profit border-profit/20">+8.2% vs prev</Badge>
              </div>
              <RevenueBarChart data={revenueBarData} />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                <div>
                  <div className="text-[10px] text-muted-foreground">Today</div>
                  <div className="font-bold text-sm">{statsLoading ? '—' : formatCurrency(stats?.revenue_today ?? 0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">Total deposited</div>
                  <div className="font-bold text-sm">{statsLoading ? '—' : formatCurrency(stats?.total_deposited ?? 0)}</div>
                </div>
              </div>
            </div>

            {/* Activity feed */}
            <div className="rounded-xl bg-card border border-border/50 flex flex-col">
              <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/30">
                <Bell className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Activity Feed</span>
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">Live</span>
              </div>
              <div className="overflow-y-auto flex-1" style={{ maxHeight: 240 }}>
                {ACTIVITY_FEED.map(item => (
                  <div key={item.id} className="flex items-start gap-2.5 px-4 py-2.5 border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                    <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.text}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.sub}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick platform stats */}
            <div className="rounded-xl bg-card border border-border/50 p-5 flex flex-col gap-1">
              <div className="text-xs font-semibold mb-3">Platform Stats</div>
              <StatRow label="Total Deposited" value={statsLoading ? '—' : formatCurrency(stats?.total_deposited ?? 0)} valueClass="text-foreground" />
              <StatRow label="Total Payouts Paid" value={statsLoading ? '—' : formatCurrency(stats?.total_payouts_paid ?? 0)} valueClass="text-profit" />
              <StatRow label="Pending Payout Value" value={statsLoading ? '—' : formatCurrency(stats?.pending_payout_amount ?? 0)} valueClass="text-orange-500" />
              <StatRow label="Avg Account Lifetime" value={`${stats?.avg_account_lifetime_days?.toFixed(0) ?? '—'}d`} />
              <StatRow label="Churn Rate" value={`${stats?.churn_rate?.toFixed(1) ?? '—'}%`} valueClass={(stats?.churn_rate ?? 0) > 10 ? 'text-loss' : 'text-profit'} />
              <StatRow label="New Signups (Today)" value={`+${stats?.new_signups_today ?? '—'}`} valueClass="text-profit" />
              <StatRow label="New Signups (Month)" value={`+${stats?.new_signups_month ?? '—'}`} valueClass="text-profit" />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ TAB: USERS ═════ */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-4">
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Users', value: users?.length ?? 0, color: 'text-foreground' },
              { label: 'Active', value: users?.filter(u => !u.banned && u.role !== 'admin').length ?? 0, color: 'text-profit' },
              { label: 'Banned', value: users?.filter(u => u.banned).length ?? 0, color: 'text-loss' },
              { label: 'Admins', value: users?.filter(u => u.role === 'admin').length ?? 0, color: 'text-primary' },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-card border border-border/50 p-4 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
                {usersLoading ? <Skeleton className="h-6 w-10 mx-auto" /> : (
                  <div className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value.toLocaleString()}</div>
                )}
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
              />
              {userSearch && (
                <button onClick={() => setUserSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="size-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
              {(['all', 'active', 'banned', 'admin'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setUserStatusFilter(s)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize',
                    userStatusFilter === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Users</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{filteredUsers.length} shown</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30">
                    <th className="text-left px-5 py-2.5">User</th>
                    <th className="text-left px-3 py-2.5">Role / Status</th>
                    <th className="text-center px-3 py-2.5">2FA</th>
                    <th className="text-center px-3 py-2.5">Email</th>
                    <th className="text-right px-3 py-2.5">Last Active</th>
                    <th className="text-right px-5 py-2.5">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/20">
                          <td className="px-5 py-2.5"><Skeleton className="h-4 w-36" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-4 w-14" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-4 w-8 mx-auto" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-4 w-8 mx-auto" /></td>
                          <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="px-5 py-2.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                        </tr>
                      ))
                    : filteredUsers.map((user: AdminUser) => (
                        <tr
                          key={user.id}
                          className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer group"
                          onClick={() => setSelectedUser(user)}
                        >
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                'size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                                user.banned ? 'bg-loss/15 text-loss' : user.role === 'admin' ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'
                              )}>
                                {user.name[0]}
                              </div>
                              <div>
                                <div className="font-medium text-foreground group-hover:text-primary transition-colors">{user.name}</div>
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
                          <td className="px-3 py-2.5 text-center">
                            {user.twoFactorEnabled
                              ? <CheckCircle2 className="size-3.5 text-profit mx-auto" />
                              : <X className="size-3.5 text-muted-foreground/30 mx-auto" />
                            }
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {user.emailVerified
                              ? <CheckCircle2 className="size-3.5 text-profit mx-auto" />
                              : <X className="size-3.5 text-muted-foreground/30 mx-auto" />
                            }
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{timeAgo(user.lastSeen)}</td>
                          <td className="px-5 py-2.5 text-right text-muted-foreground">
                            <div className="flex items-center justify-end gap-1">
                              {timeAgo(user.createdAt)}
                              <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
            {!usersLoading && filteredUsers.length === 0 && (
              <div className="flex flex-col items-center py-10 text-muted-foreground text-xs gap-2">
                <Search className="size-5 opacity-30" />
                No users match your search
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════ TAB: ACCOUNTS ════ */}
      {activeTab === 'accounts' && (
        <div className="flex flex-col gap-4">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(
              [
                { label: 'Total', status: 'all' as const, color: 'text-foreground' },
                { label: 'Active', status: 'active' as const, color: 'text-profit' },
                { label: 'Funded', status: 'funded' as const, color: 'text-primary' },
                { label: 'Passed', status: 'passed' as const, color: 'text-blue-500' },
                { label: 'Breached', status: 'breached' as const, color: 'text-loss' },
              ] as const
            ).map(s => {
              const count = s.status === 'all'
                ? accounts?.length ?? 0
                : accounts?.filter(a => a.accountStatus === s.status).length ?? 0
              return (
                <button
                  key={s.status}
                  onClick={() => setAccountStatusFilter(s.status)}
                  className={cn(
                    'rounded-xl border p-3 text-center transition-all',
                    accountStatusFilter === s.status
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-card border-border/50 hover:border-border'
                  )}
                >
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
                  {accountsLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : (
                    <div className={cn('text-xl font-bold tabular-nums', s.color)}>{count.toLocaleString()}</div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              value={accountSearch}
              onChange={e => setAccountSearch(e.target.value)}
              placeholder="Search by account ID, name, or email..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
            />
            {accountSearch && (
              <button onClick={() => setAccountSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Accounts</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{filteredAccounts.length} shown</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30">
                    <th className="text-left px-5 py-2.5">Account</th>
                    <th className="text-left px-3 py-2.5">Status</th>
                    <th className="text-left px-3 py-2.5">Type</th>
                    <th className="text-right px-3 py-2.5">Available</th>
                    <th className="text-right px-3 py-2.5">Reserved</th>
                    <th className="text-right px-3 py-2.5">Currency</th>
                    <th className="text-right px-5 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {accountsLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/20">
                          <td className="px-5 py-2.5"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-3 py-2.5"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                          <td className="px-5 py-2.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                        </tr>
                      ))
                    : filteredAccounts.map((acc: AdminAccount) => (
                        <tr
                          key={acc.id}
                          className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer group"
                          onClick={() => setSelectedAccount(acc)}
                        >
                          <td className="px-5 py-2.5">
                            <div className="font-medium text-foreground group-hover:text-primary transition-colors">{acc.userName ?? '—'}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{acc.id.slice(0, 14)}…</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={acc.accountStatus as 'active' | 'funded' | 'passed' | 'breached' | 'muted'}
                              className="text-[9px] px-1.5 py-0 capitalize"
                            >
                              {acc.accountStatus}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 capitalize text-muted-foreground">{acc.accountType}</td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums text-profit">
                            {formatCurrency(acc.availableMargin)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(acc.reservedMargin)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{acc.baseCurrency}</td>
                          <td className="px-5 py-2.5 text-right text-muted-foreground">
                            <div className="flex items-center justify-end gap-1">
                              {timeAgo(acc.createdAt)}
                              <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
            {!accountsLoading && filteredAccounts.length === 0 && (
              <div className="flex flex-col items-center py-10 text-muted-foreground text-xs gap-2">
                <Search className="size-5 opacity-30" />
                No accounts found
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ TAB: PLATFORM ══ */}
      {activeTab === 'platform' && (
        <div className="flex flex-col gap-4">
          {/* System Status */}
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/30">
              <div className="size-2 rounded-full bg-profit animate-pulse" />
              <span className="text-sm font-semibold">System Status</span>
              <Badge variant="secondary" className="ml-auto text-[9px] bg-profit/10 text-profit border-profit/20">All Systems Operational</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y divide-border/30">
              {SYSTEM_METRICS.map(m => {
                const Icon = m.icon
                return (
                  <div key={m.label} className="flex items-center gap-3 p-4">
                    <div className={cn(
                      'size-8 rounded-lg flex items-center justify-center shrink-0',
                      m.status === 'ok' ? 'bg-profit/10' : 'bg-yellow-500/10'
                    )}>
                      <Icon className={cn('size-4', m.status === 'ok' ? 'text-profit' : 'text-yellow-500')} />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{m.label}</div>
                      <div className={cn('font-bold text-sm', m.status === 'ok' ? 'text-foreground' : 'text-yellow-500')}>{m.value}</div>
                    </div>
                    <div className={cn('ml-auto size-2 rounded-full', m.status === 'ok' ? 'bg-profit' : 'bg-yellow-500')} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Financial Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Financial Health</span>
              </div>
              <div className="space-y-0">
                <StatRow label="Total Deposited" value={statsLoading ? '—' : formatCurrency(stats?.total_deposited ?? 0)} valueClass="text-foreground font-bold" />
                <StatRow label="Total Payouts Paid" value={statsLoading ? '—' : formatCurrency(stats?.total_payouts_paid ?? 0)} valueClass="text-loss" />
                <StatRow
                  label="Net Revenue"
                  value={statsLoading ? '—' : formatCurrency((stats?.total_deposited ?? 0) - (stats?.total_payouts_paid ?? 0))}
                  valueClass="text-profit font-bold"
                />
                <StatRow label="Pending Payouts" value={statsLoading ? '—' : formatCurrency(stats?.pending_payout_amount ?? 0)} valueClass="text-orange-500" />
                <StatRow label="Pending Count" value={`${stats?.pending_payouts ?? '—'} requests`} />
              </div>
              <div className="mt-4 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Payout Ratio</span>
                  <span className="font-semibold">
                    {stats ? `${((stats.total_payouts_paid / (stats.total_deposited || 1)) * 100).toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: stats ? `${Math.min(100, (stats.total_payouts_paid / (stats.total_deposited || 1)) * 100)}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">User Engagement</span>
              </div>
              <div className="space-y-0">
                <StatRow label="Total Users" value={(stats?.total_users ?? 0).toLocaleString()} />
                <StatRow label="New (Today)" value={`+${stats?.new_signups_today ?? '—'}`} valueClass="text-profit" />
                <StatRow label="New (This Month)" value={`+${stats?.new_signups_month ?? '—'}`} valueClass="text-profit" />
                <StatRow label="Avg Lifetime" value={`${stats?.avg_account_lifetime_days?.toFixed(0) ?? '—'} days`} />
                <StatRow
                  label="Churn Rate"
                  value={`${stats?.churn_rate?.toFixed(2) ?? '—'}%`}
                  valueClass={(stats?.churn_rate ?? 0) > 5 ? 'text-loss' : 'text-profit'}
                />
              </div>
              <div className="mt-4 pt-3 border-t border-border/30 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Active', value: stats?.active_accounts ?? 0, color: 'text-profit' },
                  { label: 'Funded', value: stats?.funded_accounts ?? 0, color: 'text-primary' },
                  { label: 'Breached', value: stats?.breached_accounts ?? 0, color: 'text-loss' },
                ].map(s => (
                  <div key={s.label} className="bg-muted/20 rounded-lg p-2">
                    <div className="text-[10px] text-muted-foreground mb-1">{s.label}</div>
                    <div className={cn('font-bold text-base tabular-nums', s.color)}>{s.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/30">
              <AlertCircle className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Recent System Events</span>
            </div>
            <div className="divide-y divide-border/20">
              {[
                { type: 'ok', msg: 'Database backup completed successfully', time: '10m ago' },
                { type: 'warn', msg: 'Memory usage exceeded 60% threshold', time: '23m ago' },
                { type: 'ok', msg: 'All trading engine services healthy', time: '1h ago' },
                { type: 'ok', msg: 'Scheduled maintenance completed', time: '3h ago' },
                { type: 'ok', msg: 'SSL certificate renewed', time: '1d ago' },
              ].map((e, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className={cn('size-2 rounded-full shrink-0', e.type === 'ok' ? 'bg-profit' : 'bg-yellow-500')} />
                  <span className="text-xs text-foreground flex-1">{e.msg}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{e.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ TAB: LIVE SESSIONS ═══ */}
      {activeTab === 'sessions' && (
        <div className="flex flex-col gap-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Active Now', value: MOCK_SESSIONS.filter(s => s.status === 'active').length, color: 'text-profit', bg: 'border-profit/20' },
              { label: 'Idle (>2min)', value: MOCK_SESSIONS.filter(s => s.status === 'idle').length, color: 'text-yellow-500', bg: 'border-yellow-500/20' },
              { label: 'Total Online', value: MOCK_SESSIONS.filter(s => s.status !== 'inactive').length, color: 'text-foreground', bg: '' },
              { label: 'Avg Session', value: '18m', color: 'text-primary', bg: '' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl bg-card border ${s.bg || 'border-border/50'} p-4 text-center`}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Geo breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Top Locations</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {Object.entries(
                  MOCK_SESSIONS.reduce((acc, s) => {
                    acc[s.country] = (acc[s.country] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([code, count]) => (
                  <div key={code} className="flex items-center gap-2">
                    <span className="text-base w-6 shrink-0">{FLAG_MAP[code] ?? '🌍'}</span>
                    <span className="text-xs font-medium flex-1">{code}</span>
                    <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden mx-2">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(count / MOCK_SESSIONS.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Device breakdown */}
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MonitorSmartphone className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Devices</span>
              </div>
              {[
                { label: 'Desktop', count: MOCK_SESSIONS.filter(s => !s.device.includes('iPhone') && !s.device.includes('Android')).length, color: 'bg-primary' },
                { label: 'Mobile', count: MOCK_SESSIONS.filter(s => s.device.includes('iPhone') || s.device.includes('Android')).length, color: 'bg-blue-400' },
              ].map(d => (
                <div key={d.label} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-semibold">{d.count} ({((d.count / MOCK_SESSIONS.length) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${d.color}`} style={{ width: `${(d.count / MOCK_SESSIONS.length) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t border-border/30 space-y-1">
                {['Chrome', 'Safari', 'Firefox', 'Edge'].map(browser => {
                  const cnt = MOCK_SESSIONS.filter(s => s.device.includes(browser)).length
                  return (
                    <div key={browser} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{browser}</span>
                      <span className="font-medium">{cnt} session{cnt !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Session activity heatmap (simplified) */}
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Timer className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Session Duration</span>
              </div>
              <div className="flex flex-col gap-2">
                {MOCK_SESSIONS.slice().sort((a, b) => (b.startedAt - a.startedAt)).map(s => {
                  const durationMs = Date.now() - s.startedAt
                  const mins = Math.floor(durationMs / 60_000)
                  const pct = Math.min(100, (mins / 60) * 100)
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">
                        {s.name[0]}
                      </div>
                      <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', s.status === 'active' ? 'bg-profit' : s.status === 'idle' ? 'bg-yellow-500' : 'bg-muted-foreground/30')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground w-10 text-right">{mins}m</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sessions table */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Fingerprint className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Active Sessions</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{MOCK_SESSIONS.length} total</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="size-1.5 rounded-full bg-profit animate-pulse" />
                Live
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-muted/20">
                    <th className="text-left px-5 py-2.5">User</th>
                    <th className="text-left px-3 py-2.5">Location</th>
                    <th className="text-left px-3 py-2.5">Device</th>
                    <th className="text-right px-3 py-2.5">Pages</th>
                    <th className="text-right px-3 py-2.5">Duration</th>
                    <th className="text-center px-3 py-2.5">Status</th>
                    <th className="text-right px-5 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SESSIONS.map(session => {
                    const durationMins = Math.floor((Date.now() - session.startedAt) / 60_000)
                    const idleSecs = Math.floor((Date.now() - session.lastActivity) / 1_000)
                    const statusColor = session.status === 'active' ? 'text-profit' : session.status === 'idle' ? 'text-yellow-500' : 'text-muted-foreground'
                    const statusDot = session.status === 'active' ? 'bg-profit animate-pulse' : session.status === 'idle' ? 'bg-yellow-500' : 'bg-muted-foreground/30'
                    return (
                      <tr key={session.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                              session.role === 'admin' ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground'
                            )}>
                              {session.name[0]}
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-1">
                                {session.name}
                                {session.role === 'admin' && <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-semibold">ADMIN</span>}
                              </div>
                              <div className="text-[10px] text-muted-foreground">{session.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span>{FLAG_MAP[session.country] ?? '🌍'}</span>
                            <div>
                              <div className="font-medium">{session.city}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{session.ip}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-[10px]">{session.device}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{session.pages}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-semibold tabular-nums">{durationMins}m</div>
                          <div className={cn('text-[10px]', idleSecs > 120 ? 'text-yellow-500' : 'text-muted-foreground')}>
                            idle {idleSecs < 60 ? `${idleSecs}s` : `${Math.floor(idleSecs / 60)}m`}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className={cn('size-1.5 rounded-full', statusDot)} />
                            <span className={cn('text-[10px] font-semibold capitalize', statusColor)}>{session.status}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Impersonate"
                              className="h-6 px-2 text-[10px] font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors flex items-center gap-1"
                            >
                              <Eye className="size-3" /> View
                            </button>
                            <button
                              title="Terminate session"
                              className="size-6 rounded-lg bg-loss/10 hover:bg-loss/20 text-loss border border-loss/20 transition-colors flex items-center justify-center"
                            >
                              <LogOut className="size-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security note */}
          <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 px-5 py-4 flex items-start gap-3">
            <AlertCircle className="size-4 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Session impersonation</span> lets you view the platform exactly as a specific trader sees it.
              All impersonation actions are logged and auditable. Terminating a session will force the user to log in again.
            </div>
          </div>
        </div>
      )}

      {/* Slide-overs */}
      {selectedUser && <UserSlideOver user={selectedUser} onClose={() => setSelectedUser(null)} />}
      {selectedAccount && <AccountSlideOver account={selectedAccount} onClose={() => setSelectedAccount(null)} />}
    </div>
  )
}
