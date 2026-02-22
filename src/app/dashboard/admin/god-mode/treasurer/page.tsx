'use client'

import { useState, useMemo } from 'react'
import {
  DollarSign,
  TrendingUp,
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
  Pencil,
  Check,
  Percent,
  Settings2,
} from 'lucide-react'
import { cn, formatCurrency, timeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import { useAdminStats, useAdminPayouts } from '@/lib/hooks'
import { Badge } from '@/components/ui/badge'
import type { Payout } from '@/types'

// Enriched payout returned by admin/payouts endpoint (has joined user info)
type AdminPayout = Payout & { user_name: string; user_email: string }

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

// ─── Types ─────────────────────────────────────────────────────────────
type PayoutMethod = 'all' | 'bank' | 'crypto' | 'paypal'

// Mock data removed — real payouts fetched via useAdminPayouts()

// ─── Monthly revenue data ───────────────────────────────────────────────
const MONTHLY = [
  { month: 'Jul', revenue: 248_000, payouts: 31_000, net: 217_000, accounts: 312 },
  { month: 'Aug', revenue: 280_000, payouts: 38_000, net: 242_000, accounts: 358 },
  { month: 'Sep', revenue: 310_000, payouts: 44_000, net: 266_000, accounts: 401 },
  { month: 'Oct', revenue: 365_000, payouts: 52_000, net: 313_000, accounts: 455 },
  { month: 'Nov', revenue: 398_000, payouts: 67_000, net: 331_000, accounts: 518 },
  { month: 'Dec', revenue: 412_800, payouts: 71_000, net: 341_800, accounts: 574 },
]

// Processed history derived from useAdminPayouts() where status !== 'pending'

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
  payout: AdminPayout
  rejectReason: string
  onRejectReasonChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

function ConfirmModal({ type, payout, rejectReason, onRejectReasonChange, onConfirm, onCancel, loading }: ConfirmModalProps) {
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
            ? `Send ${formatCurrency(payout.amount)} to ${payout.user_name}`
            : `Deny the payout request from ${payout.user_name}`}
        </p>
        <div className="bg-muted/30 rounded-xl p-3 mb-4 space-y-2 text-xs">
          {[
            { label: 'Trader', value: payout.user_name },
            { label: 'Amount', value: formatCurrency(payout.amount), cls: 'font-bold text-foreground' },
            { label: 'Method', value: METHOD_LABELS[payout.method] ?? payout.method },
            { label: 'Destination', value: <span className="font-mono text-[10px]">{payout.wallet_address ?? '—'}</span> },
            { label: 'Account', value: <span className="font-mono text-[10px]">{payout.account_id.slice(0, 8)}…</span> },
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
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2 px-4 rounded-xl bg-muted/50 hover:bg-muted text-xs font-medium transition-colors disabled:opacity-50">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn('flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-colors text-white disabled:opacity-50', type === 'approve' ? 'bg-profit hover:bg-profit/90' : 'bg-loss hover:bg-loss/90')}
          >
            {loading ? 'Processing…' : type === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Expandable payout row ──────────────────────────────────────────────
function PayoutRow({
  p,
  isSelected,
  onSelect,
  onApprove,
  onReject,
}: {
  p: AdminPayout
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
            <div className="size-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{(p.user_name || '?')[0]}</div>
            <div>
              <div className="font-semibold text-foreground text-xs">{p.user_name || 'Unknown'}</div>
              <div className="text-[10px] text-muted-foreground">{p.user_email}</div>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-right">
          <div className="font-bold tabular-nums text-sm text-foreground">{formatCurrency(p.amount)}</div>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            <MethodIcon className="size-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{METHOD_LABELS[p.method]}</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">{(p.wallet_address ?? '—').slice(0, 18)}…</div>
        </td>
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
          <td colSpan={6} className="px-8 py-4">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="bg-card rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1">Account ID</div>
                <div className="font-mono font-semibold">{p.account_id.slice(0, 8)}…</div>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1">Wallet / Destination</div>
                <div className="font-mono text-[10px] break-all">{p.wallet_address ?? '—'}</div>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1">TX Hash</div>
                <div className="font-mono text-[10px] break-all">{p.tx_hash ?? 'Not yet processed'}</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Fee Structure mock data ─────────────────────────────────────────────
const INITIAL_FEE_TIERS = [
  { id: 'f1', size: '$10,000', evalFee: 99, phase2Fee: 0, resetFee: 79, profitSplit: 80, maxScale: '$200,000', popular: false },
  { id: 'f2', size: '$25,000', evalFee: 199, phase2Fee: 0, resetFee: 149, profitSplit: 80, maxScale: '$500,000', popular: true },
  { id: 'f3', size: '$50,000', evalFee: 299, phase2Fee: 0, resetFee: 229, profitSplit: 85, maxScale: '$1,000,000', popular: false },
  { id: 'f4', size: '$100,000', evalFee: 499, phase2Fee: 0, resetFee: 369, profitSplit: 85, maxScale: '$2,000,000', popular: false },
  { id: 'f5', size: '$200,000', evalFee: 899, phase2Fee: 0, resetFee: 649, profitSplit: 90, maxScale: '$4,000,000', popular: false },
]

// Waterfall data: Revenue → Costs → Net
const WATERFALL_ITEMS = [
  { label: 'Gross Revenue', value: 412_800, type: 'start' as const },
  { label: 'Payment Fees', value: -8_256, type: 'deduct' as const },
  { label: 'Refunds', value: -4_128, type: 'deduct' as const },
  { label: 'Chargebacks', value: -1_652, type: 'deduct' as const },
  { label: 'Net Eval Revenue', value: 398_764, type: 'subtotal' as const },
  { label: 'Trader Payouts', value: -71_000, type: 'deduct' as const },
  { label: 'Platform COGS', value: -28_400, type: 'deduct' as const },
  { label: 'Net Profit', value: 299_364, type: 'end' as const },
]

// ─── TABS ───────────────────────────────────────────────────────────────
type Tab = 'overview' | 'payouts' | 'revenue' | 'history' | 'fees'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'payouts', label: 'Payouts', icon: Clock },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'history', label: 'History', icon: History },
  { id: 'fees', label: 'Fee Structure', icon: Settings2 },
]

// ─── Main Page ──────────────────────────────────────────────────────────
export default function TreasurerPage() {
  const { data: stats, isLoading } = useAdminStats()
  const { data: allPayouts, mutate: refreshPayouts } = useAdminPayouts()

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [histSearch, setHistSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<PayoutMethod>('all')
  const [confirmModal, setConfirmModal] = useState<{ type: 'approve' | 'reject'; payoutId: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)

  // Cast to AdminPayout since admin/payouts enriches with user_name/user_email
  const payouts = (allPayouts ?? []) as AdminPayout[]
  const pendingPayouts = useMemo(() => payouts.filter(p => p.status === 'pending'), [payouts])
  const processedPayouts = useMemo(() => payouts.filter(p => p.status !== 'pending'), [payouts])

  const filteredPayouts = useMemo(() => {
    const q = search.toLowerCase()
    return pendingPayouts.filter(p => {
      if (methodFilter !== 'all' && p.method !== methodFilter) return false
      if (!q) return true
      return p.user_name.toLowerCase().includes(q) || p.user_email.toLowerCase().includes(q) || p.account_id.includes(q)
    })
  }, [pendingPayouts, search, methodFilter])

  const filteredHistory = useMemo(() => {
    const q = histSearch.toLowerCase()
    if (!q) return processedPayouts
    return processedPayouts.filter(h => h.user_name.toLowerCase().includes(q) || h.user_email.toLowerCase().includes(q))
  }, [histSearch, processedPayouts])

  const totalPending = filteredPayouts.reduce((s, p) => s + p.amount, 0)
  const confirmingPayout = confirmModal ? pendingPayouts.find(p => p.id === confirmModal.payoutId) : null

  // ── API call to approve/reject a single payout ─────────────────────
  const callApprovePayout = async (payoutId: string, action: 'approve' | 'reject', adminNote?: string) => {
    const res = await fetch('/api/proxy/admin/approve-payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: payoutId, action, admin_note: adminNote || undefined }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(err.error ?? 'Failed')
    }
    return res.json()
  }

  const handleConfirm = async () => {
    if (!confirmModal || !confirmingPayout) return
    const isApprove = confirmModal.type === 'approve'
    setActionLoading(true)
    try {
      await callApprovePayout(confirmModal.payoutId, isApprove ? 'approve' : 'reject', rejectReason || undefined)
      toast.success(
        isApprove
          ? `${formatCurrency(confirmingPayout.amount)} approved for ${confirmingPayout.user_name}`
          : `Payout rejected${rejectReason ? `: ${rejectReason}` : ''}`
      )
      await refreshPayouts()
    } catch (e: unknown) {
      toast.error(`Action failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setActionLoading(false)
      setConfirmModal(null)
      setRejectReason('')
      setBulkSelected(prev => { const n = new Set(prev); n.delete(confirmModal.payoutId); return n })
    }
  }

  const handleBulkApprove = async () => {
    if (bulkSelected.size === 0) return
    const ids = [...bulkSelected]
    const total = pendingPayouts.filter(p => ids.includes(p.id)).reduce((s, p) => s + p.amount, 0)
    setActionLoading(true)
    try {
      await Promise.all(ids.map(id => callApprovePayout(id, 'approve')))
      toast.success(`${ids.length} payouts approved (${formatCurrency(total)})`)
      setBulkSelected(new Set())
      await refreshPayouts()
    } catch (e: unknown) {
      toast.error(`Bulk approve failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setActionLoading(false)
    }
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

  // Fee structure state
  const [feeTiers, setFeeTiers] = useState(INITIAL_FEE_TIERS)
  const [editingCell, setEditingCell] = useState<{ tierId: string; field: string } | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [feeToast, setFeeToast] = useState<string | null>(null)

  const startEdit = (tierId: string, field: string, currentVal: number | string) => {
    setEditingCell({ tierId, field })
    setEditDraft(String(currentVal))
  }
  const commitEdit = () => {
    if (!editingCell) return
    const num = parseFloat(editDraft)
    if (!isNaN(num)) {
      setFeeTiers(prev => prev.map(t =>
        t.id === editingCell.tierId
          ? { ...t, [editingCell.field]: num }
          : t
      ))
      setFeeToast(`✅ Updated ${editingCell.field} on ${feeTiers.find(t => t.id === editingCell.tierId)?.size}`)
      setTimeout(() => setFeeToast(null), 3000)
    }
    setEditingCell(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Treasurer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform financials, revenue tracking & payout management</p>
        </div>
        <button
          onClick={() => toast.success('Financial report exported')}
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
              { label: 'Avg Amount', value: filteredPayouts.length ? formatCurrency(totalPending / filteredPayouts.length) : '$0', sub: 'Per payout request', icon: AlertTriangle, cls: 'text-primary' },
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
                    <th className="text-right px-3 py-2">Requested</th>
                    <th className="text-right px-5 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-xs text-muted-foreground">
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
              { label: 'Approved', value: processedPayouts.filter(h => h.status === 'approved').length, sub: `${formatCurrency(processedPayouts.filter(h => h.status === 'approved').reduce((s, h) => s + h.amount, 0))} paid`, icon: CheckCircle, cls: 'text-profit' },
              { label: 'Rejected', value: processedPayouts.filter(h => h.status === 'rejected').length, sub: 'Denied requests', icon: XCircle, cls: 'text-loss' },
              { label: 'Total Processed', value: processedPayouts.length, sub: 'All decisions', icon: History, cls: 'text-muted-foreground' },
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
                            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">{(h.user_name || '?')[0]}</div>
                            <div>
                              <div className="font-medium">{h.user_name || 'Unknown'}</div>
                              <div className="text-[10px] text-muted-foreground">{h.user_email}</div>
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
                        <td className="px-3 py-2.5 text-center">
                          {h.status === 'approved' ? (
                            <Badge variant="secondary" className="text-[9px] bg-profit/10 text-profit border-profit/20">Approved</Badge>
                          ) : (
                            <div>
                              <Badge variant="secondary" className="text-[9px] bg-loss/10 text-loss border-loss/20">Rejected</Badge>
                              {h.admin_note && <div className="text-[9px] text-muted-foreground mt-0.5 max-w-[120px] truncate">{h.admin_note}</div>}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right text-muted-foreground">{h.processed_at ? timeAgo(h.processed_at) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── FEES ─────────────────────────────────────────────────────── */}
      {activeTab === 'fees' && (
        <div className="flex flex-col gap-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Avg Eval Fee', value: `$${(feeTiers.reduce((s, t) => s + t.evalFee, 0) / feeTiers.length).toFixed(0)}`, icon: DollarSign, cls: 'text-primary' },
              { label: 'Avg Profit Split', value: `${(feeTiers.reduce((s, t) => s + t.profitSplit, 0) / feeTiers.length).toFixed(0)}%`, icon: Percent, cls: 'text-profit' },
              { label: 'Tiers Active', value: feeTiers.length.toString(), icon: Settings2, cls: 'text-foreground' },
              { label: 'Avg Reset Fee', value: `$${(feeTiers.reduce((s, t) => s + t.resetFee, 0) / feeTiers.length).toFixed(0)}`, icon: ArrowUpRight, cls: 'text-yellow-500' },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-2 rounded-xl bg-card border border-border/50 p-4">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-muted/60 flex items-center justify-center">
                    <s.icon className={cn('size-3.5', s.cls)} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</span>
                </div>
                <div className={cn('text-2xl font-bold tabular-nums', s.cls)}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Fee tier table — inline editable */}
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Settings2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Fee Tiers</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Pencil className="size-3" />
                Click any cell to edit
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-muted/20">
                    <th className="text-left px-5 py-3">Account Size</th>
                    <th className="text-right px-3 py-3">Eval Fee ($)</th>
                    <th className="text-right px-3 py-3">Reset Fee ($)</th>
                    <th className="text-right px-3 py-3">Profit Split (%)</th>
                    <th className="text-right px-5 py-3">Max Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {feeTiers.map(tier => {
                    const editableCell = (field: 'evalFee' | 'resetFee' | 'profitSplit', val: number) => {
                      const isEditing = editingCell?.tierId === tier.id && editingCell?.field === field
                      return (
                        <td className="px-3 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                autoFocus
                                value={editDraft}
                                onChange={e => setEditDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null) }}
                                className="w-20 text-xs bg-muted/40 border border-primary/40 rounded px-2 py-1 text-right focus:outline-none"
                              />
                              <button onClick={commitEdit} className="size-5 flex items-center justify-center rounded bg-profit/20 text-profit hover:bg-profit/30 transition-colors">
                                <Check className="size-3" />
                              </button>
                              <button onClick={() => setEditingCell(null)} className="size-5 flex items-center justify-center rounded bg-muted hover:bg-muted/80 transition-colors text-muted-foreground">
                                <X className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(tier.id, field, val)}
                              className="group flex items-center justify-end gap-1.5 w-full hover:text-primary transition-colors tabular-nums font-semibold"
                            >
                              {field === 'profitSplit' ? `${val}%` : `$${val}`}
                              <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </button>
                          )}
                        </td>
                      )
                    }
                    return (
                      <tr key={tier.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{tier.size}</span>
                            {tier.popular && (
                              <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-semibold">Popular</span>
                            )}
                          </div>
                        </td>
                        {editableCell('evalFee', tier.evalFee)}
                        {editableCell('resetFee', tier.resetFee)}
                        {editableCell('profitSplit', tier.profitSplit)}
                        <td className="px-5 py-3 text-right text-muted-foreground font-medium">{tier.maxScale}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Waterfall net margin chart */}
          <div className="rounded-xl bg-card border border-border/50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Net Margin Waterfall — December</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-6">Revenue breakdown from gross to net profit after all deductions</p>

            <div className="flex flex-col gap-2">
              {(() => {
                let runningBase = 0
                const maxAbs = Math.max(...WATERFALL_ITEMS.map(i => Math.abs(i.value)))
                return WATERFALL_ITEMS.map((item, idx) => {
                  const isStart = item.type === 'start'
                  const isEnd = item.type === 'end'
                  const isSubtotal = item.type === 'subtotal'
                  const isDeduct = item.type === 'deduct'

                  const barWidth = (Math.abs(item.value) / maxAbs) * 100

                  if (isStart || isSubtotal) runningBase = 0

                  const offsetPct = isDeduct ? (runningBase / maxAbs) * 100 : 0
                  if (isDeduct) runningBase += item.value

                  const color = isStart ? 'bg-primary' : isEnd ? 'bg-profit' : isSubtotal ? 'bg-blue-500' : 'bg-loss'
                  const textColor = isStart ? 'text-primary' : isEnd ? 'text-profit' : isSubtotal ? 'text-blue-500' : 'text-loss'

                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-36 text-[10px] text-right text-muted-foreground shrink-0">{item.label}</div>
                      <div className="flex-1 h-7 bg-muted/10 rounded overflow-hidden relative">
                        {isDeduct && offsetPct > 0 && (
                          <div className="absolute left-0 h-full bg-transparent" style={{ width: `${offsetPct}%` }} />
                        )}
                        <div
                          className={cn('h-full rounded flex items-center px-2 absolute', color)}
                          style={{
                            left: isDeduct ? `${offsetPct}%` : '0%',
                            width: `${barWidth}%`,
                          }}
                        />
                      </div>
                      <div className={cn('w-28 text-xs font-bold tabular-nums text-right shrink-0', textColor)}>
                        {item.value < 0 ? '-' : ''}{formatCurrency(Math.abs(item.value))}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>

            <div className="mt-5 pt-4 border-t border-border/30 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">Gross Revenue</div>
                <div className="font-bold text-sm text-primary tabular-nums">{formatCurrency(WATERFALL_ITEMS[0].value)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">Total Deductions</div>
                <div className="font-bold text-sm text-loss tabular-nums">{formatCurrency(Math.abs(WATERFALL_ITEMS.filter(i => i.type === 'deduct').reduce((s, i) => s + i.value, 0)))}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">Net Profit</div>
                <div className="font-bold text-sm text-profit tabular-nums">{formatCurrency(WATERFALL_ITEMS.at(-1)!.value)}</div>
              </div>
            </div>
          </div>

          {feeToast && (
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-foreground text-background px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
              <div className="size-2 rounded-full bg-profit" />
              {feeToast}
            </div>
          )}
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
          loading={actionLoading}
        />
      )}
    </div>
  )
}
