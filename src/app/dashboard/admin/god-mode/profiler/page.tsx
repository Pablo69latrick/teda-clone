'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Users,
  ShieldBan,
  ShieldCheck,
  Key,
  ChevronUp,
  ChevronDown,
  X,
  UserCog,
  Ban,
  CheckCircle2,
  ExternalLink,
  Mail,
  Calendar,
  Clock,
  Shield,
  Crown,
  AlertTriangle,
  UserX,
  Activity,
  Lock,
  Unlock,
  BarChart3,
  TrendingUp,
  Filter,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAdminUsers } from '@/lib/hooks'
import type { AdminUser } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

type Tab = 'users' | 'banned' | 'admins' | 'security' | 'kyc'
type SortKey = 'name' | 'createdAt' | 'lastSeen'
type SortDir = 'asc' | 'desc'

// ─── Mock KYC data ──────────────────────────────────────────────────────
type KycStatus = 'approved' | 'pending' | 'rejected' | 'not_started'
const MOCK_KYC = [
  { id: 'k1', name: 'Alex Rivera', email: 'alex@example.com', country: 'France', dob: '1990-04-15', submitted: Date.now() - 2 * 86400_000, status: 'approved' as KycStatus, docType: 'Passport', docNumber: 'FR****8421', reviewer: 'Admin Jules', reviewedAt: Date.now() - 1 * 86400_000, risk: 'low' as const, pep: false, notes: '' },
  { id: 'k2', name: 'Jamie Chen', email: 'jamie@example.com', country: 'United Kingdom', dob: '1988-11-03', submitted: Date.now() - 4 * 86400_000, status: 'pending' as KycStatus, docType: 'National ID', docNumber: null, reviewer: null, reviewedAt: null, risk: 'medium' as const, pep: false, notes: 'Awaiting document re-upload' },
  { id: 'k3', name: 'Sam Patel', email: 'sam@example.com', country: 'United States', dob: '1995-07-22', submitted: Date.now() - 6 * 86400_000, status: 'rejected' as KycStatus, docType: 'Driving License', docNumber: null, reviewer: 'Admin Jules', reviewedAt: Date.now() - 5 * 86400_000, risk: 'high' as const, pep: false, notes: 'Document expired, blurry scan' },
  { id: 'k4', name: 'Maria Torres', email: 'maria@example.com', country: 'Spain', dob: '1992-02-08', submitted: Date.now() - 1 * 86400_000, status: 'pending' as KycStatus, docType: 'Passport', docNumber: null, reviewer: null, reviewedAt: null, risk: 'low' as const, pep: false, notes: '' },
  { id: 'k5', name: 'Chris Lee', email: 'chris@example.com', country: 'Australia', dob: '1985-09-30', submitted: Date.now() - 8 * 86400_000, status: 'approved' as KycStatus, docType: 'Passport', docNumber: 'AU****7103', reviewer: 'Admin Jules', reviewedAt: Date.now() - 7 * 86400_000, risk: 'low' as const, pep: false, notes: '' },
  { id: 'k6', name: 'Lucas Martin', email: 'lucas@example.com', country: 'Germany', dob: '1993-12-14', submitted: null, status: 'not_started' as KycStatus, docType: null, docNumber: null, reviewer: null, reviewedAt: null, risk: 'low' as const, pep: false, notes: 'Reminder sent' },
  { id: 'k7', name: 'Sophia Brown', email: 'sophia@example.com', country: 'Canada', dob: '1997-06-01', submitted: Date.now() - 3 * 86400_000, status: 'pending' as KycStatus, docType: 'National ID', docNumber: null, reviewer: null, reviewedAt: null, risk: 'medium' as const, pep: true, notes: '⚠️ PEP flag — requires enhanced due diligence' },
  { id: 'k8', name: 'Oliver Davis', email: 'oliver@example.com', country: 'Singapore', dob: '1991-03-17', submitted: Date.now() - 10 * 86400_000, status: 'approved' as KycStatus, docType: 'Passport', docNumber: 'SG****2845', reviewer: 'Admin Jules', reviewedAt: Date.now() - 9 * 86400_000, risk: 'low' as const, pep: false, notes: '' },
]

// ─── Mock activity log ──────────────────────────────────────────────────
const MOCK_ACTIVITY = [
  { id: 'a1', type: 'ban', user: 'Ryan Thompson', actor: 'Admin Jules', time: Date.now() - 3600_000, reason: 'Terms of service violation' },
  { id: 'a2', type: 'unban', user: 'Emma Chen', actor: 'Admin Jules', time: Date.now() - 7200_000, reason: 'Appeal approved' },
  { id: 'a3', type: 'promote', user: 'Alex Kim', actor: 'Admin Jules', time: Date.now() - 2 * 86400_000, reason: 'Promoted to admin role' },
  { id: 'a4', type: 'reset', user: 'Maria Torres', actor: 'Admin Jules', time: Date.now() - 3 * 86400_000, reason: 'Password reset requested' },
  { id: 'a5', type: 'ban', user: 'John Davis', actor: 'Admin Jules', time: Date.now() - 4 * 86400_000, reason: 'Suspicious trading activity' },
  { id: 'a6', type: 'reset', user: 'Sophie Brown', actor: 'Admin Jules', time: Date.now() - 5 * 86400_000, reason: 'Account recovery' },
  { id: 'a7', type: 'ban', user: 'Lucas Martin', actor: 'Admin Jules', time: Date.now() - 6 * 86400_000, reason: 'Multiple rule violations' },
  { id: 'a8', type: 'promote', user: 'Nina Patel', actor: 'Admin Jules', time: Date.now() - 7 * 86400_000, reason: 'Support team expansion' },
]

// ─── Toast ─────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-foreground text-background px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
      <div className="size-2 rounded-full bg-profit" />
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X className="size-4" /></button>
    </div>
  )
}

// ─── Ban Modal ──────────────────────────────────────────────────────────
function BanModal({ user, action, reason, onReasonChange, onConfirm, onCancel }: {
  user: AdminUser; action: 'ban' | 'unban'; reason: string
  onReasonChange: (v: string) => void; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className={cn('size-12 rounded-full flex items-center justify-center mx-auto mb-4', action === 'ban' ? 'bg-loss/15' : 'bg-profit/15')}>
          {action === 'ban' ? <Ban className="size-6 text-loss" /> : <CheckCircle2 className="size-6 text-profit" />}
        </div>
        <h3 className="text-sm font-bold text-center mb-1">{action === 'ban' ? `Ban ${user.name}?` : `Unban ${user.name}?`}</h3>
        <p className="text-xs text-muted-foreground text-center mb-5">
          {action === 'ban'
            ? 'This user will be immediately locked out of the platform.'
            : 'This user will regain full access to the platform.'}
        </p>
        {action === 'ban' && (
          <div className="mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Reason for ban</label>
            <textarea
              value={reason}
              onChange={e => onReasonChange(e.target.value)}
              placeholder="e.g. Terms of service violation, suspicious trading activity..."
              rows={2}
              className="w-full text-xs bg-muted/30 border border-border/50 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground"
            />
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 px-4 rounded-xl bg-muted/50 hover:bg-muted text-xs font-medium transition-colors">Cancel</button>
          <button
            onClick={onConfirm}
            className={cn('flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-colors text-white', action === 'ban' ? 'bg-loss hover:bg-loss/90' : 'bg-profit hover:bg-profit/90')}
          >
            {action === 'ban' ? '🚫 Confirm Ban' : '✅ Confirm Unban'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── User Detail Slide-Over ─────────────────────────────────────────────
function UserDetailPanel({ user, bannedState, onBanClick, onUnbanClick, onResetPassword, onPromote, onClose }: {
  user: AdminUser; bannedState: boolean
  onBanClick: () => void; onUnbanClick: () => void
  onResetPassword: () => void; onPromote: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-card border-l border-border shadow-2xl w-96 h-full overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border/50 px-5 py-4 flex items-center justify-between z-10">
          <span className="text-sm font-semibold">User Profile</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors"><X className="size-4 text-muted-foreground" /></button>
        </div>
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center gap-4 mb-5">
            <div className={cn('size-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0', bannedState ? 'bg-loss/15 text-loss' : user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-foreground')}>
              {user.name[0]}
            </div>
            <div>
              <div className="font-bold text-base">{user.name}</div>
              <div className="text-xs text-muted-foreground mb-2">{user.email}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {bannedState ? (
                  <Badge variant="loss" className="text-[9px] px-2 py-0.5">🚫 Banned</Badge>
                ) : user.role === 'admin' ? (
                  <Badge variant="secondary" className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20"><Crown className="size-2.5 mr-0.5" /> Admin</Badge>
                ) : (
                  <Badge variant="muted" className="text-[9px] px-2 py-0.5">Active</Badge>
                )}
                {user.twoFactorEnabled && <Badge variant="secondary" className="text-[9px] px-2 py-0.5 bg-profit/10 text-profit border-profit/20"><Shield className="size-2.5 mr-0.5" /> 2FA</Badge>}
                {user.emailVerified && <Badge variant="secondary" className="text-[9px] px-2 py-0.5">✓ Verified</Badge>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { icon: Calendar, label: 'Member Since', value: timeAgo(user.createdAt) },
              { icon: Clock, label: 'Last Seen', value: timeAgo(user.lastSeen) },
              { icon: Mail, label: 'Email', value: user.emailVerified ? 'Verified ✅' : 'Unverified ⚠️' },
              { icon: Shield, label: '2FA', value: user.twoFactorEnabled ? 'Enabled ✅' : 'Disabled ❌' },
              { icon: UserCog, label: 'Role', value: <span className="capitalize">{user.role}</span> },
              { icon: Ban, label: 'Account', value: bannedState ? 'Banned 🚫' : 'Active ✅' },
            ].map(row => (
              <div key={row.label} className="bg-muted/30 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1"><row.icon className="size-2.5" />{row.label}</div>
                <div className="font-medium text-foreground">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 border-b border-border/30">
          <div className="text-[10px] text-muted-foreground mb-1">User ID</div>
          <div className="font-mono text-[10px] bg-muted/30 rounded px-2 py-1.5 break-all">{user.id}</div>
        </div>
        {bannedState && user.banReason && (
          <div className="px-5 py-3 border-b border-border/30 bg-loss/5">
            <div className="text-[10px] font-semibold text-loss uppercase tracking-wider mb-1">Ban Reason</div>
            <div className="text-xs text-muted-foreground">{user.banReason}</div>
            {user.banExpires && <div className="text-[10px] text-loss mt-1">Expires: {new Date(user.banExpires).toLocaleDateString()}</div>}
          </div>
        )}
        <div className="p-5 flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Actions</div>
          <button onClick={onResetPassword} className="w-full text-xs py-2.5 px-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-left font-medium flex items-center gap-2">
            <Key className="size-3.5 text-muted-foreground" />
            Send Password Reset Email
          </button>
          {bannedState ? (
            <button onClick={onUnbanClick} className="w-full text-xs py-2.5 px-3 rounded-xl bg-profit/10 hover:bg-profit/20 transition-colors text-left font-semibold text-profit flex items-center gap-2">
              <CheckCircle2 className="size-3.5" />
              Unban User
            </button>
          ) : (
            <button onClick={onBanClick} className="w-full text-xs py-2.5 px-3 rounded-xl bg-loss/10 hover:bg-loss/20 transition-colors text-left font-semibold text-loss flex items-center gap-2">
              <Ban className="size-3.5" />
              Ban User
            </button>
          )}
          {user.role !== 'admin' && (
            <button onClick={onPromote} className="w-full text-xs py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-left font-semibold text-primary flex items-center gap-2">
              <Crown className="size-3.5" />
              Promote to Admin
            </button>
          )}
          <button className="w-full text-xs py-2.5 px-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-left font-medium flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><ExternalLink className="size-3.5 text-muted-foreground" /> View Trading Accounts</span>
            <ChevronUp className="size-3 text-muted-foreground rotate-90" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── User Table ─────────────────────────────────────────────────────────
function UserTable({
  users,
  isLoading,
  getIsBanned,
  onSelectUser,
  onBanModal,
  onResetPassword,
  sort,
  sortDir,
  toggleSort,
}: {
  users: AdminUser[]
  isLoading: boolean
  getIsBanned: (u: AdminUser) => boolean
  onSelectUser: (u: AdminUser) => void
  onBanModal: (u: AdminUser, action: 'ban' | 'unban') => void
  onResetPassword: (u: AdminUser) => void
  sort: SortKey
  sortDir: SortDir
  toggleSort: (k: SortKey) => void
}) {
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sort !== col) return <ChevronUp className="size-3 opacity-20" />
    return sortDir === 'asc' ? <ChevronUp className="size-3 text-primary" /> : <ChevronDown className="size-3 text-primary" />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
            <th className="text-left px-5 py-2">
              <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors">User <SortIcon col="name" /></button>
            </th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-center px-3 py-2">2FA</th>
            <th className="text-center px-3 py-2">Email</th>
            <th className="text-right px-3 py-2">
              <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">Joined <SortIcon col="createdAt" /></button>
            </th>
            <th className="text-right px-3 py-2">
              <button onClick={() => toggleSort('lastSeen')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">Last Seen <SortIcon col="lastSeen" /></button>
            </th>
            <th className="text-right px-5 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-5 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                  <td className="px-3 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  <td className="px-3 py-3 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="px-5 py-3 text-right"><Skeleton className="h-6 w-24 ml-auto" /></td>
                </tr>
              ))
            : users.map((user: AdminUser) => {
                const isBanned = getIsBanned(user)
                return (
                  <tr
                    key={user.id}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                    onClick={() => onSelectUser(user)}
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0', isBanned ? 'bg-loss/15 text-loss' : user.role === 'admin' ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground')}>
                          {user.name[0]}
                        </div>
                        <div>
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{user.name}</div>
                          <div className="text-[10px] text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {isBanned
                        ? <Badge variant="loss" className="text-[9px] px-1.5 py-0">Banned</Badge>
                        : user.role === 'admin'
                        ? <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Admin</Badge>
                        : <Badge variant="muted" className="text-[9px] px-1.5 py-0">Active</Badge>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {user.twoFactorEnabled ? <ShieldCheck className="size-3.5 text-profit mx-auto" /> : <ShieldBan className="size-3.5 text-muted-foreground/30 mx-auto" />}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {user.emailVerified ? <CheckCircle2 className="size-3.5 text-profit mx-auto" /> : <X className="size-3.5 text-muted-foreground/30 mx-auto" />}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">{timeAgo(user.createdAt)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">{timeAgo(user.lastSeen)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onResetPassword(user)}
                          title="Reset Password"
                          className="size-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Key className="size-3.5" />
                        </button>
                        {isBanned ? (
                          <button
                            onClick={() => onBanModal(user, 'unban')}
                            className="h-6 px-2 text-[10px] font-medium rounded-lg bg-profit/10 text-profit hover:bg-profit/20 border border-profit/20 transition-colors"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => onBanModal(user, 'ban')}
                            className="h-6 px-2 text-[10px] font-medium rounded-lg bg-loss/10 text-loss hover:bg-loss/20 border border-loss/20 transition-colors"
                          >
                            Ban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
          }
        </tbody>
      </table>
      {!isLoading && users.length === 0 && (
        <div className="flex flex-col items-center py-10 text-muted-foreground text-xs gap-2">
          <Search className="size-5 opacity-30" />
          No users match your filters
        </div>
      )}
    </div>
  )
}

// ─── TABS ───────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'users', label: 'All Users', icon: Users },
  { id: 'banned', label: 'Banned', icon: UserX },
  { id: 'admins', label: 'Admins', icon: Crown },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'kyc', label: 'KYC / AML', icon: ShieldCheck },
]

// ─── Main Page ──────────────────────────────────────────────────────────
export default function ProfilerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('lastSeen')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data: users, isLoading } = useAdminUsers()

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [banModal, setBanModal] = useState<{ user: AdminUser; action: 'ban' | 'unban' } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [localBans, setLocalBans] = useState<Record<string, boolean>>({})

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const getIsBanned = (user: AdminUser) => localBans[user.id] !== undefined ? localBans[user.id] : user.banned

  const sortedUsers = useMemo(() => {
    if (!users) return []
    const list = [...users]
    list.sort((a, b) => {
      const va = a[sort] as number | string
      const vb = b[sort] as number | string
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return list
  }, [users, sort, sortDir])

  const filterUsers = (list: AdminUser[], q: string) => {
    if (!q) return list
    const ql = q.toLowerCase()
    return list.filter(u => u.name.toLowerCase().includes(ql) || u.email.toLowerCase().includes(ql) || u.id.includes(ql))
  }

  const allFiltered = useMemo(() => filterUsers(sortedUsers, search), [sortedUsers, search])
  const bannedFiltered = useMemo(() => filterUsers(sortedUsers.filter(u => getIsBanned(u)), search), [sortedUsers, search, localBans])
  const adminFiltered = useMemo(() => filterUsers(sortedUsers.filter(u => u.role === 'admin'), search), [sortedUsers, search])

  const totalBanned = useMemo(() => (users ?? []).filter(u => getIsBanned(u)).length, [users, localBans])
  const total2FA = (users ?? []).filter(u => u.twoFactorEnabled).length
  const totalAdmins = (users ?? []).filter(u => u.role === 'admin').length
  const totalUnverified = (users ?? []).filter(u => !u.emailVerified).length
  const no2FA = (users ?? []).filter(u => !u.twoFactorEnabled && !getIsBanned(u)).length

  const toggleSort = (key: SortKey) => {
    if (sort === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setSortDir('desc') }
  }

  const handleBanConfirm = () => {
    if (!banModal) return
    const { user, action } = banModal
    setLocalBans(prev => ({ ...prev, [user.id]: action === 'ban' }))
    showToast(action === 'ban' ? `🚫 ${user.name} banned` : `✅ ${user.name} unbanned`)
    if (selectedUser?.id === user.id) setSelectedUser({ ...user, banned: action === 'ban' })
    setBanModal(null)
    setBanReason('')
  }

  const tableProps = {
    isLoading,
    getIsBanned,
    onSelectUser: setSelectedUser,
    onBanModal: (u: AdminUser, action: 'ban' | 'unban') => setBanModal({ user: u, action }),
    onResetPassword: (u: AdminUser) => showToast(`🔑 Password reset sent to ${u.email}`),
    sort,
    sortDir,
    toggleSort,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Profiler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">User management, moderation, and access control</p>
        </div>
        {/* Quick stats bar */}
        <div className="flex items-center gap-4 shrink-0">
          {[
            { label: 'Total', value: users?.length ?? '—', cls: 'text-foreground' },
            { label: 'Active', value: ((users?.length ?? 0) - totalBanned) || '—', cls: 'text-profit' },
            { label: 'Banned', value: totalBanned || '—', cls: 'text-loss' },
            { label: 'Admins', value: totalAdmins || '—', cls: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
              <div className={cn('font-bold text-sm', s.cls)}>{isLoading ? '—' : s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 self-start">
        {TABS.map(tab => {
          const Icon = tab.icon
          const badge = tab.id === 'banned' ? totalBanned : tab.id === 'admins' ? totalAdmins : 0
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
              {badge > 0 && (
                <span className={cn('ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold', tab.id === 'banned' ? 'bg-loss/15 text-loss' : 'bg-primary/15 text-primary')}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search bar (shared across tabs) */}
      {activeTab !== 'security' && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'banned' ? 'Search banned users...' : activeTab === 'admins' ? 'Search admins...' : 'Search by name, email, or ID...'}
              className="w-full pl-9 pr-3 py-2 text-xs bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="size-3 text-muted-foreground" /></button>}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Filter className="size-3" />
            {activeTab === 'users' && `${allFiltered.length} of ${users?.length ?? 0}`}
            {activeTab === 'banned' && `${bannedFiltered.length} banned`}
            {activeTab === 'admins' && `${adminFiltered.length} admins`}
          </div>
        </div>
      )}

      {/* ─── ALL USERS ────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-border/30">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">All Users</h2>
            <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{allFiltered.length}</span>
          </div>
          <UserTable users={allFiltered} {...tableProps} />
        </div>
      )}

      {/* ─── BANNED ───────────────────────────────────────────────────── */}
      {activeTab === 'banned' && (
        <div className="flex flex-col gap-4">
          {/* Banned stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Banned', value: totalBanned, icon: Ban, cls: 'text-loss', sub: 'Locked out accounts' },
              { label: 'Banned Today', value: MOCK_ACTIVITY.filter(a => a.type === 'ban' && a.time > Date.now() - 86400_000).length, icon: UserX, cls: 'text-loss', sub: 'Last 24 hours' },
              { label: 'Ban Rate', value: `${users?.length ? (totalBanned / users.length * 100).toFixed(1) : '0'}%`, icon: BarChart3, cls: '', sub: 'Of total users' },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-card border border-border/50 p-4 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <s.icon className={cn('size-4', s.cls || 'text-muted-foreground')} />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className={cn('text-xl font-bold tabular-nums mt-0.5', s.cls || 'text-foreground')}>{isLoading ? '—' : s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-border/30">
              <UserX className="size-4 text-loss" />
              <h2 className="text-sm font-semibold">Banned Users</h2>
              <span className="text-[10px] bg-loss/10 text-loss px-1.5 py-0.5 rounded-full">{bannedFiltered.length}</span>
            </div>
            <UserTable users={bannedFiltered} {...tableProps} />
          </div>
        </div>
      )}

      {/* ─── ADMINS ───────────────────────────────────────────────────── */}
      {activeTab === 'admins' && (
        <div className="flex flex-col gap-4">
          {/* Admin stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Admins', value: totalAdmins, icon: Crown, cls: 'text-primary', sub: 'Platform staff' },
              { label: 'Recent Promotions', value: MOCK_ACTIVITY.filter(a => a.type === 'promote').length, icon: TrendingUp, cls: 'text-profit', sub: 'All time' },
              { label: 'Admin Ratio', value: `${users?.length ? (totalAdmins / users.length * 100).toFixed(1) : '0'}%`, icon: BarChart3, cls: '', sub: 'Of total users' },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-card border border-border/50 p-4 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <s.icon className={cn('size-4', s.cls || 'text-muted-foreground')} />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className={cn('text-xl font-bold tabular-nums mt-0.5', s.cls || 'text-foreground')}>{isLoading ? '—' : s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-border/30">
              <Crown className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Admin Users</h2>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{adminFiltered.length}</span>
            </div>
            <UserTable users={adminFiltered} {...tableProps} />
          </div>
        </div>
      )}

      {/* ─── SECURITY ─────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="flex flex-col gap-4">
          {/* Security health KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: '2FA Enabled', value: `${total2FA}/${users?.length ?? 0}`, sub: `${users?.length ? (total2FA / users.length * 100).toFixed(0) : 0}% adoption`, icon: ShieldCheck, cls: 'text-profit' },
              { label: '2FA Disabled', value: no2FA, sub: 'Active, no 2FA', icon: ShieldBan, cls: 'text-yellow-500' },
              { label: 'Unverified Email', value: totalUnverified, sub: 'Not email-verified', icon: Mail, cls: 'text-yellow-500' },
              { label: 'Currently Banned', value: totalBanned, sub: 'Locked out', icon: Lock, cls: 'text-loss' },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-card border border-border/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={cn('size-4', s.cls)} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                </div>
                {isLoading ? <Skeleton className="h-7 w-16" /> : (
                  <div className={cn('text-2xl font-bold tabular-nums', s.cls || 'text-foreground')}>{s.value}</div>
                )}
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Security risks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 2FA adoption */}
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">2FA Adoption</h2>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { label: '2FA Enabled', value: total2FA, total: users?.length ?? 0, color: '#22c55e' },
                  { label: 'No 2FA (Active)', value: no2FA, total: users?.length ?? 0, color: '#f59e0b' },
                  { label: 'Banned Users', value: totalBanned, total: users?.length ?? 0, color: '#ef4444' },
                ].map(item => {
                  const pct = item.total > 0 ? (item.value / item.total * 100) : 0
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold tabular-nums">{item.value} <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {!isLoading && no2FA > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <div className="flex items-center gap-2 text-xs text-yellow-600">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span><span className="font-semibold">{no2FA} active users</span> have not enabled 2FA. Consider requiring it.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Account health */}
            <div className="rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Account Health</h2>
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { label: 'Total Users', value: users?.length ?? 0, icon: Users, cls: '' },
                  { label: 'Active (Not Banned)', value: (users?.length ?? 0) - totalBanned, icon: Unlock, cls: 'text-profit' },
                  { label: 'Banned', value: totalBanned, icon: Lock, cls: 'text-loss' },
                  { label: 'Admin Accounts', value: totalAdmins, icon: Crown, cls: 'text-primary' },
                  { label: 'Email Verified', value: (users ?? []).filter(u => u.emailVerified).length, icon: Mail, cls: 'text-profit' },
                  { label: 'Email Unverified', value: totalUnverified, icon: Mail, cls: 'text-yellow-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <item.icon className={cn('size-3.5', item.cls || 'text-muted-foreground')} />
                      {item.label}
                    </div>
                    <span className={cn('font-bold tabular-nums', item.cls || 'text-foreground')}>
                      {isLoading ? '—' : item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Moderation activity log */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent Moderation Actions</h2>
            </div>
            <div className="divide-y divide-border/20">
              {MOCK_ACTIVITY.map(event => {
                const config: Record<string, { icon: string; cls: string }> = {
                  ban: { icon: '🚫', cls: 'text-loss' },
                  unban: { icon: '✅', cls: 'text-profit' },
                  promote: { icon: '⬆️', cls: 'text-primary' },
                  reset: { icon: '🔑', cls: 'text-muted-foreground' },
                }
                const c = config[event.type] ?? config.reset
                return (
                  <div key={event.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <span className="text-base mt-0.5">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">
                        <span className={cn('font-semibold', c.cls)}>{event.user}</span>
                        <span className="text-muted-foreground mx-1.5">—</span>
                        <span className="text-muted-foreground">{event.reason}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">by {event.actor}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">{timeAgo(event.time)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ TAB: KYC ══════ */}
      {activeTab === 'kyc' && (
        <div className="flex flex-col gap-4">
          {/* KYC KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Approved', count: MOCK_KYC.filter(k => k.status === 'approved').length, color: 'text-profit', bg: 'border-profit/20' },
              { label: 'Pending Review', count: MOCK_KYC.filter(k => k.status === 'pending').length, color: 'text-yellow-500', bg: 'border-yellow-500/20' },
              { label: 'Rejected', count: MOCK_KYC.filter(k => k.status === 'rejected').length, color: 'text-loss', bg: 'border-loss/20' },
              { label: 'Not Started', count: MOCK_KYC.filter(k => k.status === 'not_started').length, color: 'text-muted-foreground', bg: '' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl bg-card border ${s.bg || 'border-border/50'} p-4 text-center`}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.count}</div>
              </div>
            ))}
          </div>

          {/* KYC table */}
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">KYC Submissions</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{MOCK_KYC.length}</span>
              </div>
              <Badge variant="secondary" className="text-[9px]">AML/KYC Compliant</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-muted/20">
                    <th className="text-left px-5 py-3">User</th>
                    <th className="text-left px-3 py-3">Country</th>
                    <th className="text-left px-3 py-3">Document</th>
                    <th className="text-center px-3 py-3">Risk</th>
                    <th className="text-center px-3 py-3">PEP</th>
                    <th className="text-center px-3 py-3">Status</th>
                    <th className="text-right px-3 py-3">Submitted</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_KYC.map(kyc => {
                    const statusMap: Record<KycStatus, { label: string; cls: string }> = {
                      approved: { label: '✅ Approved', cls: 'bg-profit/10 text-profit border-profit/20' },
                      pending: { label: '⏳ Pending', cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
                      rejected: { label: '❌ Rejected', cls: 'bg-loss/10 text-loss border-loss/20' },
                      not_started: { label: '— Not started', cls: 'bg-muted/30 text-muted-foreground border-border/30' },
                    }
                    const riskMap = { low: 'text-profit', medium: 'text-yellow-500', high: 'text-loss' }
                    const s = statusMap[kyc.status]
                    return (
                      <tr key={kyc.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">{kyc.name[0]}</div>
                            <div>
                              <div className="font-medium">{kyc.name}</div>
                              <div className="text-[10px] text-muted-foreground">{kyc.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{kyc.country}</td>
                        <td className="px-3 py-3">
                          {kyc.docType ? (
                            <div>
                              <div className="font-medium">{kyc.docType}</div>
                              {kyc.docNumber && <div className="font-mono text-[10px] text-muted-foreground">{kyc.docNumber}</div>}
                            </div>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn('font-semibold capitalize text-[10px]', riskMap[kyc.risk])}>{kyc.risk}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {kyc.pep
                            ? <span className="text-[9px] bg-orange-500/15 text-orange-500 border border-orange-500/20 px-1.5 py-0.5 rounded-full font-bold">PEP</span>
                            : <span className="text-muted-foreground/30 text-[10px]">—</span>
                          }
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn('text-[9px] font-medium border px-1.5 py-0.5 rounded-full', s.cls)}>{s.label}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-[10px] text-muted-foreground">
                          {kyc.submitted ? timeAgo(kyc.submitted) : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {kyc.status === 'pending' && (
                              <>
                                <button className="h-6 px-2 text-[10px] font-medium rounded-lg bg-profit/10 text-profit hover:bg-profit/20 border border-profit/20 transition-colors">
                                  Approve
                                </button>
                                <button className="h-6 px-2 text-[10px] font-medium rounded-lg bg-loss/10 text-loss hover:bg-loss/20 border border-loss/20 transition-colors">
                                  Reject
                                </button>
                              </>
                            )}
                            {kyc.status === 'not_started' && (
                              <button className="h-6 px-2 text-[10px] font-medium rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground border border-border/30 transition-colors">
                                Send Reminder
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail: PEP alerts */}
          {MOCK_KYC.some(k => k.pep) && (
            <div className="rounded-xl bg-orange-500/5 border border-orange-500/20 px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="size-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-foreground">PEP Detected — Enhanced Due Diligence Required</span>
                <p className="text-muted-foreground mt-0.5">
                  {MOCK_KYC.filter(k => k.pep).map(k => k.name).join(', ')} {MOCK_KYC.filter(k => k.pep).length === 1 ? 'is' : 'are'} flagged as a Politically Exposed Person.
                  Additional verification steps and source-of-funds documentation must be collected before approval.
                </p>
              </div>
            </div>
          )}

          {/* Notes from rejected */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/30">
              <Lock className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Review Notes</span>
            </div>
            <div className="divide-y divide-border/20">
              {MOCK_KYC.filter(k => k.notes || k.status === 'rejected').map(k => (
                <div key={k.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{k.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{k.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{k.notes || 'No notes'}</div>
                    {k.reviewer && <div className="text-[10px] text-muted-foreground/60 mt-0.5">Reviewed by {k.reviewer} · {k.reviewedAt ? timeAgo(k.reviewedAt) : ''}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          bannedState={getIsBanned(selectedUser)}
          onBanClick={() => setBanModal({ user: selectedUser, action: 'ban' })}
          onUnbanClick={() => setBanModal({ user: selectedUser, action: 'unban' })}
          onResetPassword={() => showToast(`🔑 Password reset sent to ${selectedUser.email}`)}
          onPromote={() => showToast(`⬆️ ${selectedUser.name} promoted to admin`)}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Ban modal */}
      {banModal && (
        <BanModal
          user={banModal.user}
          action={banModal.action}
          reason={banReason}
          onReasonChange={setBanReason}
          onConfirm={handleBanConfirm}
          onCancel={() => { setBanModal(null); setBanReason('') }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
