'use client'

import { useState, useMemo } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  AlertTriangle,
  BarChart3,
  X,
  Search,
  Download,
  CreditCard,
  Landmark,
  Bitcoin,
  History,
  Filter,
  ChevronDown,
  ChevronRight,
  Activity,
} from 'lucide-react'
import { cn, formatCurrency, timeAgo } from '@/lib/utils'
import { useAdminStats } from '@/lib/hooks'
import { Badge } from '@/components/ui/badge'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

// ─── Types ─────────────────────────────────────────────────────────────
type Tab = 'overview' | 'payouts' | 'revenue' | 'history'
type PayoutMethod = 'all' | 'bank' | 'crypto' | 'paypal'

// ─── Mock payout queue ─────────────────────────────────────────────────
const INITIAL_PAYOUTS = [
  { id: 'pay-1', user: 'Alex Rivera', email: 'alex@example.com', amount: 18_400, method: 'crypto' as const, wallet: '0xaB3c...8dF1', requested_at: Date.now() - 2 * 86400_000, account: 'acc-0004', profitSplit: 80, daysInFunded: 14, risk: 'low' as const },
  { id: 'pay-2', user: 'Jamie Chen', email: 'jamie@example.com', amount: 9_200, method: 'bank' as const, wallet: 'IBAN: FR76 3000...', requested_at: Date.now() - 1 * 86400_000, account: 'acc-0012', profitSplit: 80, daysInFunded: 8, risk: 'medium' as const },
  { id: 'pay-3', user: 'Sam Patel', email: 'sam@example.com', amount: 14_400, method: 'bank' as const, wallet: 'IBAN: GB29 NWBK...', requested_at: Date.now() - 3600_000, account: 'acc-0022', profitSplit: 85, daysInFunded: 21, risk: 'low' as const },
  { id: 'pay-4', user: 'Maria Torres', email: 'maria@example.com', amount: 6_800, method: 'paypal' as const, wallet: 'maria.torres@pm.com', requested_at: Date.now() - 7200_000, account: 'acc-0035', profitSplit: 80, daysInFunded: 5, risk: 'high' as const },
  { id: 'pay-5', user: 'Chris Lee', email: 'chris@example.com', amount: 22_000, method: 'crypto' as const, wallet: '0x4aF7...2cC1', requested_at: Date.now() - 4 * 86400_000, account: 'acc-0041', profitSplit: 90, daysInFunded: 30, risk: 'low' as const },
]

// ─── Monthly revenue data ───────────────────────────────────────────────
const MONTHLY = [
  { month: 'Jul', revenue: 248_000, payouts: 31_000, net: 217_000, accounts: 312 },
  { month: 'Aug', revenue: 280_000, payouts: 38_000, net: 242_000, accounts: 358 },
  { month: 'Sep', revenue: 310_000, payouts: 44_000, net: 266_000, accounts: 401 },
  { month: 'Oct', revenue: 365_000, payouts: 52_000, net: 313_000, accounts: 455 },
  { month: 'Nov', revenue: 398_000, payouts: 67_000, net: 331_000, accounts: 518 },
  { month: 'Dec', revenue: 412_800, payouts: 71_000, net: 341_800, accounts: 574 },
]

// ─── Processed payout history ───────────────────────────────────────────
const PROCESSED_HISTORY = [
  { id: 'hist-1', user: 'David Kim', email: 'david@example.com', amount: 11_500, method: 'bank' as const, status: 'approved' as const, processedAt: Date.now() - 2 * 86400_000, account: 'acc-0089', profitSplit: 80 },
  { id: 'hist-2', user: 'Emma Wilson', email: 'emma@example.com', amount: 3_200, method: 'paypal' as const, status: 'rejected' as const, processedAt: Date.now() - 3 * 86400_000, account: 'acc-0067', profitSplit: 80, rejectReason: 'KYC not completed' },
  { id: 'hist-3', user: 'Lucas Martin', email: 'lucas@example.com', amount: 8_700, method: 'crypto' as const, status: 'approved' as const, processedAt: Date.now() - 4 * 86400_000, account: 'acc-0102', profitSplit: 85 },
  { id: 'hist-4', user: 'Sophia Brown', email: 'sophia@example.com', amount: 15_000, method: 'bank' as const, status: 'approved' as const, processedAt: Date.now() - 5 * 86400_000, account: 'acc-0155', profitSplit: 90 },
  { id: 'hist-5', user: 'Oliver Davis', email: 'oliver@example.com', amount: 4_100, method: 'crypto' as const, status: 'rejected' as const, processedAt: Date.now() - 6 * 86400_000, account: 'acc-0199', profitSplit: 80, rejectReason: 'Suspicious activity detected' },
  { id: 'hist-6', user: 'Ava Johnson', email: 'ava@example.com', amount: 19_800, method: 'bank' as const, status: 'approved' as const, processedAt: Date.now() - 7 * 86400_000, account: 'acc-0231', profitSplit: 80 },
]

// ─── Revenue by type ────────────────────────────────────────────────────
const REVENUE_BY_TYPE = [
  { label: 'Evaluation Fees', amount: 198_400, pct: 48, color: '#6366f1' },
  { label: 'Re-attempt Fees', amount: 82_600, pct: 20, color: '#8b5cf6' },
  { label: 'Account Upgrades', amount: 62_000, pct: 15, color: '#22c55e' },
  { label: 'Funded Account Fees', amount: 45_100, pct: 11, color: '#f59e0b' },
  { label: 'Subscription Plans', amount: 24_700, pct: 6, color: '#06b6d4' },
]

// ─── Helpers ────────────────────────────────────────────────────────────
const METHOD_ICONS: Record<string, React.ElementType> = {
  bank: Landmark,
  crypto: Bitcoin,
  paypal: CreditCard,
}
const METHOD_LABELS: Record<string, string> = {
  bank: 'Bank Transfer',
  crypto: 'Crypto',
  paypal: 'PayPal',
}

// ─── SVG Revenue Line Chart ─────────────────────────────────────────────
function RevenueLineChart({ data }: { data: typeof MONTHLY }) {
  const W = 560, H = 120, PAD = 12
  const maxRev = Math.max(...data.map(d => d.revenue))

  const toXY = (i: number, v: number) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((v / maxRev) * (H - PAD * 2)),
  })

  const revPoints = data.map((d, i) => toXY(i, d.revenue))
  const payoutPoints = data.map((d, i) => toXY(i, d.payouts))
  const netPoints = data.map((d, i) => toXY(i, d.net))

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  const toArea = (pts: { x: number; y: number }[]) =>
    `${toPath(pts)} L ${pts.at(-1)!.x.toFixed(1)} ${(H - PAD).toFixed(1)} L ${PAD.toFixed(1)} ${(H - PAD).toFixed(1)} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="net-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(t => {
        const y = PAD + t * (H - PAD * 2)
        return <line key={t} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" className="text-foreground" />
      })}

      {/* Area fills */}
      <path d={toArea(revPoints)} fill="url(#rev-grad)" />
      <path d={toArea(netPoints)} fill="url(#net-grad)" />

      {/* Lines */}
      <path d={toPath(revPoints)} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toPath(payoutPoints)} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
      <path d={toPath(netPoints)} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots — revenue */}
      {revPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#22c55e" />
      ))}

      {/* Month labels */}
      {data.map((d, i) => {
        const p = revPoints[i]
        return (
          <text key={d.month} x={p.x} y={H - 1} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.4" className="text-foreground">
            {d.month}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Confirm Modal ──────────────────────────────────────────────────────
interface ConfirmModalProps {
  type: 'approve' | 'reject'
  payout: { user: string; amount: number; wallet: string; profitSplit: number; daysInFunded: number; method: string }
  rejectReason: string
  onRejectReasonChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ type, payout, rejectReason, onRejectReasonChange, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className={cn('size-12 rounded-full flex items-center justify-center mx-auto mb-4', type === 'approve' ? 'bg-profit/15' : 'bg-loss/15')}>
          {type === 'approve' ? <CheckCircle className="size-6 text-profit" /> : <XCircle className="size-6 text-loss" />}
        </div>
        <h3 className="text-sm font-bold text-center mb-1">{type === 'approve' ? 'Approve Payout?' : 'Reject Payout?'}</h3>
        <p className="text-xs text-muted-foreground text-center mb-5">
          {type === 'approve'
            ? `Send ${formatCurrency(payout.amount)} to ${payout.user}`
            : `Deny the payout request from ${payout.user}`}
        </p>
        <div className="bg-muted/30 rounded-xl p-3 mb-4 space-y-2 text-xs">
          {[
            { label: 'Trader', value: payout.user },
            { label: 'Amount', value: formatCurrency(payout.amount), cls: 'font-bold text-foreground' },
            { label: 'Method', value: METHOD_LABELS[payout.method] ?? payout.method },
            { label: 'Destination', value: <span className="font-mono text-[10px]">{payout.wallet}</span> },
            { label: 'Profit Split', value: `${payout.profitSplit}%` },
            { label: 'Days in Funded', value: `${payout.daysInFunded}d` },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-muted-foreground">{row.label}</span>
              <span className={cn('font-medium', row.cls)}>{row.value}</span>
            </div>
          ))}
        </div>
        {type === 'reject' && (
          <div className="mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Reason (optional)</label>
            <textarea
              value={rejectReason}
              onChange={e => onRejectReasonChange(e.target.value)}
              placeholder="e.g. KYC not verified, suspicious activity..."
              rows={2}
              className="w-full text-xs bg-muted/30 border border-border/50 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground"
            />
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 px-4 rounded-xl bg-muted/50 hover:bg-muted text-xs font-medium transition-colors">Cancel</button>
          <button
            onClick={onConfirm}
            className={cn('flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-colors text-white', type === 'approve' ? 'bg-profit hover:bg-profit/90' : 'bg-loss hover:bg-loss/90')}
          >
            {type === 'approve' ? '✅ Confirm Approve' : '❌ Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ──────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={cn('fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium', type === 'success' ? 'bg-foreground text-background' : 'bg-loss text-white')}>
      <div className={cn('size-2 rounded-full', type === 'success' ? 'bg-profit' : 'bg-white/60')} />
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X className="size-4" /></button>
    </div>
  )
}

// ─── Payout Risk Badge ─────────────────────────────────────────────────
function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  const map = {
    low: 'bg-profit/10 text-profit border-profit/20',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    high: 'bg-loss/10 text-loss border-loss/20',
  }
  return <span className={cn('text-[9px] font-semibold border px-1.5 py-0.5 rounded-full uppercase tracking-wide', map[risk])}>{risk}</span>
}

// ─── Expandable payout row ──────────────────────────────────────────────
function PayoutRow({
  p,
  isSelected,
  onSelect,
  onApprove,
  onReject,
}: {
  p: typeof INITIAL_PAYOUTS[0]
  isSelected: boolean
  onSelect: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const MethodIcon = METHOD_ICONS[p.method] ?? CreditCard

  return (
    <>
      <tr className={cn('border-b border-border/20 hover:bg-muted/20 transition-colors', isSelected && 'bg-primary/5')}>
        <td className="px-5 py-3 text-center">
          <input type="checkbox" checked={isSelected} onChange={onSelect} className="rounded" />
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{p.user[0]}</div>
            <div>
              <div className="font-semibold text-foreground text-xs">{p.user}</div>
              <div className="text-[10px] text-muted-foreground">{p.email}</div>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-right">
          <div className="font-bold tabular-nums text-sm text-foreground">{formatCurrency(p.amount)}</div>
          <div className="text-[10px] text-muted-foreground">{p.daysInFunded}d funded</div>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            <MethodIcon className="size-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{METHOD_LABELS[p.method]}</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">{p.wallet.slice(0, 18)}…</div>
        </td>
        <td className="px-3 py-3 text-center">
          <span className="text-xs font-semibold text-primary">{p.profitSplit}%</span>
        </td>
        <td className="px-3 py-3 text-center"><RiskBadge risk={p.risk} /></td>
        <td className="px-3 py-3 text-right text-muted-foreground text-[10px]">{timeAgo(p.requested_at)}</td>
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setExpanded(v => !v)}
              className="size-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground"
            >
              {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
            <button
              onClick={onApprove}
              className="flex items-center gap-1 h-7 px-2.5 text-[10px] font-medium rounded-lg bg-profit/10 text-profit hover:bg-profit/20 border border-profit/20 transition-colors"
            >
              <CheckCircle className="size-3" /> Approve
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1 h-7 px-2.5 text-[10px] font-medium rounded-lg bg-loss/10 text-loss hover:bg-loss/20 border border-loss/20 transition-colors"
            >
              <XCircle className="size-3" /> Reject
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/20 bg-muted/10">
          <td colSpan={8} className="px-8 py-4">
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div className="bg-card rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1">Account ID</div>
                <div className="font-mono font-semibold">{p.account}</div>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1">Full Wallet</div>
                <div className="font-mono text-[10px] break-all">{p.wallet}</div>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1">Profit Split</div>
                <div className="font-bold text-primary">{p.profitSplit}% / {100 - p.profitSplit}%</div>
                <div className="text-[10px] text-muted-foreground">Trader / Platform</div>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1">Platform Cut</div>
                <div className="font-bold text-profit">{formatCurrency(p.amount * (100 - p.profitSplit) / p.profitSplit)}</div>
                <div className="text-[10px] text-muted-foreground">Already retained</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── TABS ───────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'payouts', label: 'Payouts', icon: Clock },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'history', label: 'History', icon: History },
]

// ─── Main Page ──────────────────────────────────────────────────────────
export default function TreasurerPage() {
  const { data: stats, isLoading } = useAdminStats()

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [payouts, setPayouts] = useState(INITIAL_PAYOUTS)
  const [search, setSearch] = useState('')
  const [histSearch, setHistSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<PayoutMethod>('all')
  const [confirmModal, setConfirmModal] = useState<{ type: 'approve' | 'reject'; payoutId: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())

  const filteredPayouts = useMemo(() => {
    const q = search.toLowerCase()
    return payouts.filter(p => {
      if (processedIds.has(p.id)) return false
      if (methodFilter !== 'all' && p.method !== methodFilter) return false
      if (!q) return true
      return p.user.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.account.includes(q)
    })
  }, [payouts, search, methodFilter, processedIds])

  const filteredHistory = useMemo(() => {
    const q = histSearch.toLowerCase()
    if (!q) return PROCESSED_HISTORY
    return PROCESSED_HISTORY.filter(h => h.user.toLowerCase().includes(q) || h.email.toLowerCase().includes(q))
  }, [histSearch])

  const totalPending = filteredPayouts.reduce((s, p) => s + p.amount, 0)
  const confirmingPayout = confirmModal ? INITIAL_PAYOUTS.find(p => p.id === confirmModal.payoutId) : null

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleConfirm = () => {
    if (!confirmModal || !confirmingPayout) return
    const isApprove = confirmModal.type === 'approve'
    setProcessedIds(prev => new Set([...prev, confirmModal.payoutId]))
    showToast(
      isApprove
        ? `✅ ${formatCurrency(confirmingPayout.amount)} approved for ${confirmingPayout.user}`
        : `❌ Payout rejected${rejectReason ? `: ${rejectReason}` : ''}`,
      isApprove ? 'success' : 'error'
    )
    setConfirmModal(null)
    setRejectReason('')
    setBulkSelected(prev => { const n = new Set(prev); n.delete(confirmModal.payoutId); return n })
  }

  const handleBulkApprove = () => {
    if (bulkSelected.size === 0) return
    const ids = [...bulkSelected]
    const total = payouts.filter(p => ids.includes(p.id)).reduce((s, p) => s + p.amount, 0)
    setProcessedIds(prev => new Set([...prev, ...ids]))
    setBulkSelected(new Set())
    showToast(`✅ ${ids.length} payouts approved (${formatCurrency(total)})`, 'success')
  }

  const toggleBulk = (id: string) => setBulkSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => {
    if (bulkSelected.size === filteredPayouts.length) setBulkSelected(new Set())
    else setBulkSelected(new Set(filteredPayouts.map(p => p.id)))
  }

  const netMarginThisMonth = (stats?.revenue_month ?? 0) - (MONTHLY.at(-1)?.payouts ?? 0)
  const netMarginPct = stats?.revenue_month ? (netMarginThisMonth / stats.revenue_month) * 100 : 0
  const payoutRatioPct = stats?.revenue_month ? ((MONTHLY.at(-1)?.payouts ?? 0) / stats.revenue_month * 100) : 0

  const pendingCount = filteredPayouts.length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Treasurer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform financials, revenue tracking & payout management</p>
        </div>
        <button
          onClick={() => showToast('Financial report exported', 'success')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-xs font-medium text-muted-foreground hover:text-foreground shrink-0"
        >
          <Download className="size-3.5" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 self-start">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isPending = tab.id === 'payouts' && pendingCount > 0
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
              {isPending && (
                <span className="ml-0.5 size-4 flex items-center justify-center rounded-full bg-yellow-500/20 text-yellow-600 text-[9px] font-bold">{pendingCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── OVERVIEW ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Revenue Month', icon: TrendingUp, value: formatCurrency(stats?.revenue_month ?? 0), sub: `+${stats?.new_signups_month ?? 0} signups`, color: 'text-profit' },
              { label: 'All-Time Revenue', icon: DollarSign, value: formatCurrency(stats?.revenue_all_time ?? 0), sub: 'Since platform launch', color: '' },
              { label: 'Total Deposited', icon: ArrowDownLeft, value: formatCurrency(stats?.total_deposited ?? 0), sub: 'Capital under mgmt', color: '' },
              { label: 'Payouts Paid', icon: ArrowUpRight, value: formatCurrency(stats?.total_payouts_paid ?? 0), sub: 'Total to traders', color: 'text-loss' },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col gap-3 rounded-xl bg-card border border-border/50 p-4">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-muted/60 flex items-center justify-center">
                    <stat.icon className={cn('size-3.5', stat.color || 'text-muted-foreground')} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                </div>
                {isLoading ? <Skeleton className="h-7 w-28" /> : (
                  <div className={cn('text-2xl font-bold tabular-nums', stat.color || 'text-foreground')}>{stat.value}</div>
                )}
                <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Net margin highlight */}
          {!isLoading && (
            <div className="rounded-xl bg-gradient-to-r from-profit/10 to-primary/5 border border-profit/20 px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Net Margin This Month</div>
                <div className="text-3xl font-bold text-profit tabular-nums">{formatCurrency(netMarginThisMonth)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">After payouts — {netMarginPct.toFixed(1)}% margin</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Payout Ratio</div>
                <div className="text-2xl font-bold tabular-nums">{payoutRatioPct.toFixed(1)}%</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">of gross revenue</div>
              </div>
            </div>
          )}

          {/* Chart + Health side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Revenue chart */}
            <div className="lg:col-span-3 rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Revenue vs Payouts</h2>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-profit rounded" /> Revenue</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-loss rounded" style={{ borderStyle: 'dashed' }} /> Payouts</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-primary rounded" /> Net</div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mb-4">Last 6 months</p>
              <RevenueLineChart data={MONTHLY} />
            </div>

            {/* Platform health */}
            <div className="lg:col-span-2 rounded-xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Financial Health</h2>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Avg Account Lifetime', value: `${stats?.avg_account_lifetime_days?.toFixed(0) ?? '—'} days`, good: (stats?.avg_account_lifetime_days ?? 0) > 30 },
                  { label: 'Monthly Churn Rate', value: `${stats?.churn_rate?.toFixed(2) ?? '—'}%`, good: (stats?.churn_rate ?? 0) < 5 },
                  { label: 'New Signups (Month)', value: (stats?.new_signups_month ?? 0).toLocaleString(), good: true },
                  { label: 'New Signups (Today)', value: (stats?.new_signups_today ?? 0).toLocaleString(), good: true },
                  { label: 'Funded Accounts', value: (stats?.funded_accounts ?? 0).toLocaleString(), good: true },
                  { label: 'Pending Payouts', value: formatCurrency(stats?.pending_payout_amount ?? 0), good: (stats?.pending_payout_amount ?? 0) < 100_000 },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={cn('font-semibold tabular-nums', item.good ? 'text-profit' : 'text-yellow-500')}>
                      {isLoading ? '—' : item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly breakdown table */}
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Monthly Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30">
                    <th className="text-left px-5 py-2">Month</th>
                    <th className="text-right px-3 py-2">Revenue</th>
                    <th className="text-right px-3 py-2">Payouts</th>
                    <th className="text-right px-3 py-2">Net</th>
                    <th className="text-right px-3 py-2">Margin</th>
                    <th className="text-right px-5 py-2">Accounts</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHLY.slice().reverse().map((m, i) => {
                    const margin = (m.net / m.revenue * 100)
                    const isLatest = i === 0
                    return (
                      <tr key={m.month} className={cn('border-b border-border/20 hover:bg-muted/20 transition-colors', isLatest && 'bg-primary/3')}>
                        <td className="px-5 py-2.5 font-medium">
                          {m.month}
                          {isLatest && <span className="ml-1.5 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">Latest</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-profit">{formatCurrency(m.revenue)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-loss">{formatCurrency(m.payouts)}</td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums">{formatCurrency(m.net)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={cn('font-semibold tabular-nums', margin > 80 ? 'text-profit' : margin > 70 ? 'text-yellow-500' : 'text-loss')}>
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{m.accounts.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── PAYOUTS ────────────────────────────────────────────────────── */}
      {activeTab === 'payouts' && (
        <div className="flex flex-col gap-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pending Payouts', value: pendingCount.toString(), sub: 'Awaiting approval', icon: Clock, cls: 'text-yellow-500' },
              { label: 'Total Pending', value: formatCurrency(totalPending), sub: 'Capital to release', icon: DollarSign, cls: 'text-foreground' },
              { label: 'High Risk', value: filteredPayouts.filter(p => p.risk === 'high').length.toString(), sub: 'Require extra review', icon: AlertTriangle, cls: 'text-loss' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-card border border-border/50 p-4 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <stat.icon className={cn('size-4', stat.cls)} />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                  <div className={cn('text-xl font-bold tabular-nums mt-0.5', stat.cls)}>{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search payouts..."
                    className="pl-7 pr-3 py-1.5 text-xs bg-muted/30 border border-border/30 rounded-lg focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground w-44"
                  />
                </div>
                {/* Method filter */}
                <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
                  {([
                    { value: 'all', label: 'All' },
                    { value: 'bank', label: 'Bank' },
                    { value: 'crypto', label: 'Crypto' },
                    { value: 'paypal', label: 'PayPal' },
                  ] as { value: PayoutMethod; label: string }[]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMethodFilter(opt.value)}
                      className={cn('px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors', methodFilter === opt.value ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Filter className="size-3" />
                  {filteredPayouts.length} payout{filteredPayouts.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold tabular-nums text-yellow-500">{formatCurrency(totalPending)}</span>
                {bulkSelected.size > 0 && (
                  <button
                    onClick={handleBulkApprove}
                    className="text-xs px-3 py-1.5 rounded-lg bg-profit text-white hover:bg-profit/90 font-medium transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="size-3" />
                    Approve {bulkSelected.size} selected
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30">
                    <th className="px-5 py-2">
                      <input type="checkbox" checked={bulkSelected.size === filteredPayouts.length && filteredPayouts.length > 0} onChange={toggleAll} className="rounded" />
                    </th>
                    <th className="text-left px-3 py-2">Trader</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Method</th>
                    <th className="text-center px-3 py-2">Split</th>
                    <th className="text-center px-3 py-2">Risk</th>
                    <th className="text-right px-3 py-2">Requested</th>
                    <th className="text-right px-5 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-xs text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="size-6 text-profit opacity-50" />
                          All payouts have been processed
                        </div>
                      </td>
                    </tr>
                  ) : filteredPayouts.map(p => (
                    <PayoutRow
                      key={p.id}
                      p={p}
                      isSelected={bulkSelected.has(p.id)}
                      onSelect={() => toggleBulk(p.id)}
                      onApprove={() => setConfirmModal({ type: 'approve', payoutId: p.id })}
                      onReject={() => setConfirmModal({ type: 'reject', payoutId: p.id })}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPayouts.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="size-3.5 text-yellow-500" />
                  {filteredPayouts.length} payout{filteredPayouts.length !== 1 ? 's' : ''} awaiting approval
                </div>
                <div className="text-xs font-bold tabular-nums">{formatCurrency(totalPending)} total</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── REVENUE ────────────────────────────────────────────────────── */}
      {activeTab === 'revenue' && (
        <div className="flex flex-col gap-4">
          {/* Revenue KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Today', value: formatCurrency(stats?.revenue_today ?? 0), icon: TrendingUp, cls: 'text-profit' },
              { label: 'This Month', value: formatCurrency(stats?.revenue_month ?? 0), icon: BarChart3, cls: 'text-primary' },
              { label: 'All Time', value: formatCurrency(stats?.revenue_all_time ?? 0), icon: DollarSign, cls: '' },
              { label: 'Payout Ratio', value: `${payoutRatioPct.toFixed(1)}%`, icon: ArrowUpRight, cls: payoutRatioPct > 25 ? 'text-loss' : 'text-profit' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-card border border-border/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={cn('size-4', stat.cls || 'text-muted-foreground')} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                </div>
                {isLoading ? <Skeleton className="h-7 w-24" /> : (
                  <div className={cn('text-2xl font-bold tabular-nums', stat.cls || 'text-foreground')}>{stat.value}</div>
                )}
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div className="rounded-xl bg-card border border-border/50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">6-Month Revenue Trend</h2>
            </div>
            <p className="text-[10px] text-muted-foreground mb-5">Revenue, payouts, and net margin over the last 6 months</p>
            <RevenueLineChart data={MONTHLY} />
            <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground justify-center">
              <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-profit rounded" /> Revenue</div>
              <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-loss rounded" /> Payouts</div>
              <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-primary rounded" /> Net</div>
            </div>
          </div>

          {/* Revenue by type */}
          <div className="rounded-xl bg-card border border-border/50 p-5">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Revenue by Source</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">This month</span>
            </div>
            <div className="flex flex-col gap-3">
              {REVENUE_BY_TYPE.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">{item.pct}%</span>
                      <span className="text-xs font-bold tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Total Revenue This Month</span>
              <span className="font-bold text-profit tabular-nums">{formatCurrency(REVENUE_BY_TYPE.reduce((s, r) => s + r.amount, 0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── HISTORY ────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-4">
          {/* History KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Approved', value: PROCESSED_HISTORY.filter(h => h.status === 'approved').length, sub: `${formatCurrency(PROCESSED_HISTORY.filter(h => h.status === 'approved').reduce((s, h) => s + h.amount, 0))} paid`, icon: CheckCircle, cls: 'text-profit' },
              { label: 'Rejected', value: PROCESSED_HISTORY.filter(h => h.status === 'rejected').length, sub: 'Denied requests', icon: XCircle, cls: 'text-loss' },
              { label: 'Total Processed', value: PROCESSED_HISTORY.length, sub: 'All decisions', icon: History, cls: 'text-muted-foreground' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-card border border-border/50 p-4 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <stat.icon className={cn('size-4', stat.cls)} />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                  <div className="text-xl font-bold tabular-nums mt-0.5">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* History table */}
          <div className="rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <History className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Processed Payouts</h2>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{filteredHistory.length}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <input
                  value={histSearch}
                  onChange={e => setHistSearch(e.target.value)}
                  placeholder="Search history..."
                  className="pl-7 pr-3 py-1.5 text-xs bg-muted/30 border border-border/30 rounded-lg focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground w-40"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30">
                    <th className="text-left px-5 py-2">Trader</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Method</th>
                    <th className="text-center px-3 py-2">Split</th>
                    <th className="text-center px-3 py-2">Status</th>
                    <th className="text-right px-5 py-2">Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(h => {
                    const MethodIcon = METHOD_ICONS[h.method] ?? CreditCard
                    return (
                      <tr key={h.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">{h.user[0]}</div>
                            <div>
                              <div className="font-medium">{h.user}</div>
                              <div className="text-[10px] text-muted-foreground">{h.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums">{formatCurrency(h.amount)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <MethodIcon className="size-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{METHOD_LABELS[h.method]}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-[10px] font-semibold text-primary">{h.profitSplit}%</td>
                        <td className="px-3 py-2.5 text-center">
                          {h.status === 'approved' ? (
                            <Badge variant="secondary" className="text-[9px] bg-profit/10 text-profit border-profit/20">✅ Approved</Badge>
                          ) : (
                            <div>
                              <Badge variant="secondary" className="text-[9px] bg-loss/10 text-loss border-loss/20">❌ Rejected</Badge>
                              {h.rejectReason && <div className="text-[9px] text-muted-foreground mt-0.5 max-w-[120px] truncate">{h.rejectReason}</div>}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right text-muted-foreground">{timeAgo(h.processedAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && confirmingPayout && (
        <ConfirmModal
          type={confirmModal.type}
          payout={confirmingPayout}
          rejectReason={rejectReason}
          onRejectReasonChange={setRejectReason}
          onConfirm={handleConfirm}
          onCancel={() => { setConfirmModal(null); setRejectReason('') }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
