'use client'

import { useState, useMemo } from 'react'
import {
  Gamepad2,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Shield,
  ChevronRight,
  Plus,
  Pencil,
  Check,
  X,
  Power,
  PowerOff,
  BarChart2,
  Copy,
  Trash2,
  BarChart3,
  Activity,
  Layers,
  Tag,
  Clock,
  Star,
  ArrowUpRight,
  Filter,
  Search,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useAdminTemplates } from '@/lib/hooks'
import type { ChallengeTemplate, PhaseRule } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

type Tab = 'templates' | 'analytics' | 'pricing' | 'rules' | 'simulation'

// ─── Simulation data ─────────────────────────────────────────────────────
type SimStep = { day: number; equity: number; pnl: number; dailyLoss: number; drawdownFromPeak: number; event: string | null; breached: boolean; passed: boolean }

function runSimulation(opts: {
  accountSize: number
  dailyLossLimitPct: number
  maxDrawdownPct: number
  profitTargetP1Pct: number
  minDays: number
  volatility: number
  seed: number
}): SimStep[] {
  const { accountSize, dailyLossLimitPct, maxDrawdownPct, profitTargetP1Pct, minDays, volatility, seed } = opts
  const steps: SimStep[] = []
  let equity = accountSize
  let peak = accountSize
  const dailyLossLimit = accountSize * (dailyLossLimitPct / 100)
  const maxDrawdown = accountSize * (maxDrawdownPct / 100)
  const target = accountSize * (1 + profitTargetP1Pct / 100)
  let breached = false
  let passed = false

  // Seeded pseudo-random
  let rng = seed
  const rand = () => {
    rng = (rng * 16807 + 0) % 2147483647
    return (rng - 1) / 2147483646
  }

  for (let day = 1; day <= 40 && !breached && !passed; day++) {
    const drift = 0.0015 * (1 + (rand() - 0.3) * 2)
    const vol = volatility / 100 * (rand() * 1.5 + 0.5)
    const r = drift + (rand() - 0.5) * vol * 2
    const pnl = equity * r
    equity = equity + pnl
    if (equity > peak) peak = equity
    const drawdownFromPeak = (peak - equity) / accountSize * 100
    const dailyLossPct = pnl < 0 ? Math.abs(pnl) / accountSize * 100 : 0

    let event: string | null = null
    if (pnl < -dailyLossLimit) { event = '💥 Daily loss limit hit'; breached = true }
    else if ((peak - equity) >= maxDrawdown) { event = '💥 Max drawdown hit'; breached = true }
    else if (equity >= target && day >= minDays) { event = '✅ Phase 1 passed!'; passed = true }
    else if (day % 7 === 0) event = '🗞️ High-impact news event'
    else if (rand() > 0.85) event = '📈 Strong trending day'
    else if (rand() < 0.12) event = '📉 Volatile session'

    steps.push({ day, equity, pnl, dailyLoss: dailyLossPct, drawdownFromPeak, event, breached, passed })
  }
  return steps
}

// ─── Mock analytics per template ────────────────────────────────────────
const TEMPLATE_ANALYTICS = [
  { id: 'analytics-1', name: '$10K Standard', accounts: 1842, passRate: 22, avgDaysToFund: 18, revenue: 184_200, popularity: 95 },
  { id: 'analytics-2', name: '$25K Advanced', accounts: 934, passRate: 18, avgDaysToFund: 22, revenue: 233_500, popularity: 78 },
  { id: 'analytics-3', name: '$50K Pro', accounts: 412, passRate: 14, avgDaysToFund: 28, revenue: 206_000, popularity: 55 },
  { id: 'analytics-4', name: '$100K Elite', accounts: 156, passRate: 9, avgDaysToFund: 35, revenue: 234_000, popularity: 32 },
]

// ─── Pricing tiers ───────────────────────────────────────────────────────
const PRICING_TIERS = [
  { size: '$10,000', fee: 99, profitSplit: 80, phases: 2, leverage: 100, popular: false },
  { size: '$25,000', fee: 199, profitSplit: 80, phases: 2, leverage: 100, popular: true },
  { size: '$50,000', fee: 349, profitSplit: 85, phases: 2, leverage: 100, popular: false },
  { size: '$100,000', fee: 599, profitSplit: 90, phases: 3, leverage: 50, popular: false },
  { size: '$200,000', fee: 999, profitSplit: 90, phases: 3, leverage: 25, popular: false },
]

// ─── Global rules reference ──────────────────────────────────────────────
const GLOBAL_RULES = [
  { category: 'Risk Management', rules: [
    { rule: 'Daily Loss Limit', standard: '5%', advanced: '5%', pro: '5%', description: 'Max % of account lost in a single day' },
    { rule: 'Max Drawdown', standard: '10%', advanced: '10%', pro: '10%', description: 'Max % total drawdown from peak equity' },
    { rule: 'Profit Target (P1)', standard: '8%', advanced: '8%', pro: '8%', description: 'Minimum profit % to pass Phase 1' },
    { rule: 'Profit Target (P2)', standard: '5%', advanced: '5%', pro: '5%', description: 'Minimum profit % to pass Phase 2' },
  ]},
  { category: 'Trading Conditions', rules: [
    { rule: 'Min Trading Days (P1)', standard: '5d', advanced: '7d', pro: '10d', description: 'Minimum calendar days trading in Phase 1' },
    { rule: 'Max Trading Days (P1)', standard: '30d', advanced: '45d', pro: '60d', description: 'Hard deadline to hit profit target' },
    { rule: 'Max Leverage', standard: '1:100', advanced: '1:100', pro: '1:50', description: 'Maximum leverage allowed' },
    { rule: 'Weekend Holding', standard: 'No', advanced: 'No', pro: 'No', description: 'Holding positions over weekends' },
  ]},
  { category: 'Compliance', rules: [
    { rule: 'News Trading', standard: 'No', advanced: 'No', pro: 'No', description: 'Trading during high-impact news events' },
    { rule: 'Anti-Martingale', standard: 'Yes', advanced: 'Yes', pro: 'Yes', description: 'Martingale detection enabled' },
    { rule: 'EA / Bot Trading', standard: 'Yes', advanced: 'Yes', pro: 'Yes', description: 'Automated trading allowed' },
    { rule: 'Copy Trading', standard: 'No', advanced: 'No', pro: 'No', description: 'Copy trading from external signals' },
  ]},
]

// ─── Confirm Modal ──────────────────────────────────────────────────────
function ConfirmModal({ title, description, confirmLabel, confirmCls, onConfirm, onCancel }: {
  title: string; description: string; confirmLabel: string; confirmCls: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-center mb-2">{title}</h3>
        <p className="text-xs text-muted-foreground text-center mb-5">{description}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 px-4 rounded-xl bg-muted/50 hover:bg-muted text-xs font-medium transition-colors">Cancel</button>
          <button onClick={onConfirm} className={cn('flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-colors text-white', confirmCls)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Inline editable field ─────────────────────────────────────────────
function EditableField({ label, value, suffix = '', onSave, className }: {
  label: string; value: number | string; suffix?: string; onSave: (v: number) => void; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const handleSave = () => {
    const parsed = parseFloat(draft)
    if (!isNaN(parsed)) onSave(parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-primary/10 rounded px-2 py-1.5 border border-primary/30">
        <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="w-16 bg-transparent text-xs font-semibold focus:outline-none"
          />
          <span className="text-[10px] text-muted-foreground">{suffix}</span>
          <button onClick={handleSave} className="ml-1 text-profit hover:text-profit/80"><Check className="size-3" /></button>
          <button onClick={() => setEditing(false)} className="text-loss hover:text-loss/80"><X className="size-3" /></button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('bg-muted/20 rounded px-2 py-1.5 cursor-pointer hover:bg-muted/40 group transition-colors', className)}
      onClick={() => { setDraft(String(value)); setEditing(true) }}
    >
      <div className="text-muted-foreground text-[10px] mb-0.5">{label}</div>
      <div className="font-semibold text-xs flex items-center gap-1">
        {value}{suffix}
        <Pencil className="size-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
      </div>
    </div>
  )
}

// ─── Phase card ─────────────────────────────────────────────────────────
function PhaseCard({ phase, isLast, onUpdate }: { phase: PhaseRule; isLast: boolean; onUpdate: (u: PhaseRule) => void }) {
  const typeConfig: Record<string, { label: string; cls: string }> = {
    evaluation: { label: 'Evaluation', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    demo_funded: { label: 'Demo Funded', cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    funded: { label: 'Funded', cls: 'bg-profit/10 text-profit border-profit/20' },
    payout: { label: 'Payout', cls: 'bg-primary/10 text-primary border-primary/20' },
  }
  const tc = typeConfig[phase.phase_type] ?? typeConfig.evaluation

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="size-7 rounded-full bg-card border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary">{phase.phase_number}</div>
        {!isLast && <div className="w-0.5 flex-1 bg-border/50 mt-1" style={{ minHeight: 32 }} />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold">{phase.name}</span>
          <Badge variant="secondary" className={cn('text-[9px] border', tc.cls)}>{tc.label}</Badge>
          {phase.profit_split > 0 && <Badge variant="secondary" className="text-[9px]">{(phase.profit_split * 100).toFixed(0)}% split</Badge>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <EditableField label="Profit Target" value={+(phase.profit_target * 100).toFixed(0)} suffix="%" onSave={v => onUpdate({ ...phase, profit_target: v / 100 })} className={phase.profit_target > 0 ? 'text-profit' : ''} />
          <EditableField label="Daily Loss Limit" value={+(phase.daily_loss_limit * 100).toFixed(0)} suffix="%" onSave={v => onUpdate({ ...phase, daily_loss_limit: v / 100 })} />
          <EditableField label="Max Drawdown" value={+(phase.max_drawdown * 100).toFixed(0)} suffix="%" onSave={v => onUpdate({ ...phase, max_drawdown: v / 100 })} />
          <EditableField label="Min Trading Days" value={phase.min_trading_days} suffix="d" onSave={v => onUpdate({ ...phase, min_trading_days: v })} />
          <EditableField label="Max Trading Days" value={phase.max_trading_days ?? 0} suffix={phase.max_trading_days ? 'd' : ' (unlim)'} onSave={v => onUpdate({ ...phase, max_trading_days: v || null })} />
          <EditableField label="Leverage" value={phase.leverage_limit} suffix="x" onSave={v => onUpdate({ ...phase, leverage_limit: v })} />
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] flex-wrap">
          {[
            { label: 'No News Trading', active: !phase.news_trading_allowed },
            { label: 'No Weekend Hold', active: !phase.weekend_holding_allowed },
            { label: 'Anti-Martingale', active: phase.martingale_detection_enabled },
          ].map(rule => (
            <div key={rule.label} className={cn('flex items-center gap-1', rule.active ? 'text-loss' : 'text-muted-foreground/40')}>
              <Shield className="size-2.5" />{rule.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Conversion Funnel ──────────────────────────────────────────────────
function ConversionFunnel({ template }: { template: ChallengeTemplate }) {
  const phases = template.phase_sequence
  if (!phases.length) return null

  const stages = [
    { label: 'Started', pct: 100, color: '#6366f1' },
    ...phases.map((p, i) => ({
      label: p.name,
      pct: Math.max(10, 100 - (i + 1) * (100 / (phases.length + 1)) * 0.7),
      color: i === phases.length - 1 ? '#22c55e' : '#6366f1',
    })),
    { label: 'Funded', pct: Math.max(5, 100 - phases.length * (100 / (phases.length + 1)) * 0.7 - 15), color: '#22c55e' },
  ]

  return (
    <div className="flex flex-col gap-1.5">
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="w-20 text-[10px] text-right text-muted-foreground truncate">{s.label}</div>
          <div className="flex-1 h-5 bg-muted/20 rounded-sm overflow-hidden">
            <div className="h-full rounded-sm flex items-center px-2 transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: `${s.color}33`, border: `1px solid ${s.color}40` }}>
              <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.pct.toFixed(0)}%</span>
            </div>
          </div>
          {i < stages.length - 1 ? (
            <div className="text-[10px] text-muted-foreground w-12 tabular-nums text-right">→{(stages[i + 1].pct / s.pct * 100).toFixed(0)}%</div>
          ) : <div className="w-12" />}
        </div>
      ))}
    </div>
  )
}

// ─── Template Card ──────────────────────────────────────────────────────
function TemplateCard({ tmpl, localActive, onToggleActive, onEdit, onDuplicate, onDelete }: {
  tmpl: ChallengeTemplate; localActive: boolean | undefined
  onToggleActive: () => void; onEdit: (u: ChallengeTemplate) => void; onDuplicate: () => void; onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'phases' | 'funnel'>('phases')
  const [localPhases, setLocalPhases] = useState<PhaseRule[]>(tmpl.phase_sequence)
  const [hasEdits, setHasEdits] = useState(false)
  const isActive = localActive ?? tmpl.is_active

  const handlePhaseUpdate = (idx: number, updated: PhaseRule) => {
    const next = localPhases.map((p, i) => i === idx ? updated : p)
    setLocalPhases(next)
    setHasEdits(true)
  }

  const handleSaveEdits = () => {
    onEdit({ ...tmpl, phase_sequence: localPhases })
    setHasEdits(false)
  }

  return (
    <div className={cn('rounded-xl bg-card border transition-all', isActive ? 'border-border/50' : 'border-border/30 opacity-80')}>
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant={isActive ? 'active' : 'muted'} className="text-[9px] px-1.5 py-0">{isActive ? '● Active' : '○ Paused'}</Badge>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{tmpl.phase_sequence.length}-phase</Badge>
            {tmpl.category && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{tmpl.category.replace('_', ' ')}</Badge>}
          </div>
          <h3 className="font-bold text-sm text-foreground">{tmpl.name}</h3>
          {tmpl.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tmpl.description}</p>}
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-[10px] text-muted-foreground">Entry Fee</div>
          <div className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(tmpl.entry_fee)}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-border/20 border-t border-b border-border/30">
        {[
          { icon: DollarSign, label: 'Balance', value: formatCurrency(tmpl.starting_balance) },
          { icon: Users, label: 'Accounts', value: (tmpl.account_count ?? 0).toLocaleString() },
          { icon: Target, label: 'P1 Target', value: `${(tmpl.phase_sequence[0]?.profit_target ?? 0) * 100}%` },
          { icon: TrendingUp, label: 'Split', value: `${(tmpl.phase_sequence.at(-1)?.profit_split ?? 0) * 100}%` },
        ].map(item => (
          <div key={item.label} className="flex flex-col items-center gap-1 py-3 bg-card">
            <item.icon className="size-3.5 text-muted-foreground/40" />
            <div className="text-xs font-bold tabular-nums">{item.value}</div>
            <div className="text-[9px] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="border-b border-border/30">
        <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between px-5 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">
          <span>View Rules & Analytics</span>
          <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>

        {expanded && (
          <div className="border-t border-border/20">
            <div className="flex items-center gap-1 px-5 pt-4 pb-0">
              {(['phases', 'funnel'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors', activeTab === tab ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                >
                  {tab === 'phases' ? '⚙️ Phase Rules' : '📊 Conversion Funnel'}
                </button>
              ))}
              {hasEdits && (
                <button onClick={handleSaveEdits} className="ml-auto flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-profit text-white hover:bg-profit/90 transition-colors">
                  <Check className="size-3" /> Save Changes
                </button>
              )}
            </div>

            {activeTab === 'phases' && (
              <div className="px-5 pt-4 pb-5">
                <p className="text-[10px] text-muted-foreground mb-4">Click any rule value to edit inline. Press Enter to save, Escape to cancel.</p>
                {localPhases.map((phase, idx) => (
                  <PhaseCard key={phase.phase_number} phase={phase} isLast={idx === localPhases.length - 1} onUpdate={updated => handlePhaseUpdate(idx, updated)} />
                ))}
              </div>
            )}

            {activeTab === 'funnel' && (
              <div className="px-5 pt-4 pb-5">
                <p className="text-[10px] text-muted-foreground mb-4">Estimated pass-through rates based on platform averages.</p>
                <ConversionFunnel template={{ ...tmpl, phase_sequence: localPhases }} />
                <div className="mt-4 pt-3 border-t border-border/30 grid grid-cols-3 gap-3 text-xs">
                  {[
                    { label: 'Overall Funded Rate', value: `~${Math.max(2, Math.round(100 / (localPhases.length * 2 + 2)))}%` },
                    { label: 'Avg Days to Funded', value: `${localPhases.reduce((s, p) => s + p.min_trading_days, 0)} days min` },
                    { label: 'Active Accounts', value: (tmpl.account_count ?? 0).toLocaleString() },
                  ].map(stat => (
                    <div key={stat.label} className="bg-muted/20 rounded px-2 py-2">
                      <div className="text-[10px] text-muted-foreground mb-0.5">{stat.label}</div>
                      <div className="font-semibold">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 py-3">
        <button
          onClick={onToggleActive}
          className={cn('flex items-center gap-1.5 h-7 px-3 text-[10px] font-medium rounded-lg border transition-colors', isActive ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20' : 'bg-profit/10 text-profit border-profit/20 hover:bg-profit/20')}
        >
          {isActive ? <PowerOff className="size-3" /> : <Power className="size-3" />}
          {isActive ? 'Pause' : 'Activate'}
        </button>
        <button
          onClick={onDuplicate}
          className="flex items-center gap-1.5 h-7 px-3 text-[10px] font-medium rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30 transition-colors"
        >
          <Copy className="size-3" /> Duplicate
        </button>
        <button
          onClick={onDelete}
          className="ml-auto flex items-center gap-1.5 h-7 px-3 text-[10px] font-medium rounded-lg bg-loss/10 text-loss hover:bg-loss/20 border border-loss/20 transition-colors"
        >
          <Trash2 className="size-3" /> Delete
        </button>
      </div>
    </div>
  )
}

// ─── TABS ───────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'templates', label: 'Templates', icon: Layers },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'pricing', label: 'Pricing', icon: Tag },
  { id: 'rules', label: 'Rules Reference', icon: Shield },
  { id: 'simulation', label: 'Simulation', icon: Activity },
]

// ─── Main Page ──────────────────────────────────────────────────────────
export default function GameDesignerPage() {
  const { data: templates, isLoading, mutate: refreshTemplates } = useAdminTemplates()

  const [activeTab, setActiveTab] = useState<Tab>('templates')
  const [confirmModal, setConfirmModal] = useState<{ title: string; description: string; confirmLabel: string; confirmCls: string; onConfirm: () => void } | null>(null)
  const [templateSearch, setTemplateSearch] = useState('')

  // Simulation state
  const [simAccountSize, setSimAccountSize] = useState(10_000)
  const [simDailyLoss, setSimDailyLoss] = useState(5)
  const [simMaxDrawdown, setSimMaxDrawdown] = useState(10)
  const [simProfitTarget, setSimProfitTarget] = useState(8)
  const [simMinDays, setSimMinDays] = useState(5)
  const [simVolatility, setSimVolatility] = useState(12)
  const [simSeed, setSimSeed] = useState(42)
  const [simRun, setSimRun] = useState<SimStep[] | null>(null)
  const [simRunning, setSimRunning] = useState(false)

  const runSim = () => {
    setSimRunning(true)
    setTimeout(() => {
      const result = runSimulation({ accountSize: simAccountSize, dailyLossLimitPct: simDailyLoss, maxDrawdownPct: simMaxDrawdown, profitTargetP1Pct: simProfitTarget, minDays: simMinDays, volatility: simVolatility, seed: simSeed })
      setSimRun(result)
      setSimRunning(false)
    }, 400)
  }
  const randomizeSeed = () => setSimSeed(Math.floor(Math.random() * 9999) + 1)

  const displayTemplates = templates ?? []

  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return displayTemplates
    const q = templateSearch.toLowerCase()
    return displayTemplates.filter(t => t.name.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q))
  }, [displayTemplates, templateSearch])

  // ── API helper for template updates ────────────────────────────
  const callUpdateTemplate = async (templateId: string, updates: Record<string, unknown>) => {
    const res = await fetch('/api/proxy/admin/update-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, ...updates }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(err.error ?? 'Failed')
    }
    return res.json()
  }

  const handleToggleActive = (tmplId: string, currentActive: boolean) => {
    const next = !currentActive
    setConfirmModal({
      title: next ? 'Activate Template?' : 'Pause Template?',
      description: next ? 'New users will be able to start this challenge.' : 'No new accounts can be created for this challenge until reactivated.',
      confirmLabel: next ? 'Activate' : 'Pause',
      confirmCls: next ? 'bg-profit' : 'bg-yellow-500',
      onConfirm: async () => {
        try {
          await callUpdateTemplate(tmplId, { is_active: next })
          toast.success(next ? 'Template activated' : 'Template paused')
          await refreshTemplates()
        } catch (e: unknown) {
          toast.error(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
        setConfirmModal(null)
      },
    })
  }

  const handleEdit = async (tmplId: string, updated: ChallengeTemplate) => {
    try {
      await callUpdateTemplate(tmplId, {
        name: updated.name,
        description: updated.description,
        entry_fee: updated.entry_fee,
        phase_sequence: updated.phase_sequence,
      })
      toast.success('Phase rules saved')
      await refreshTemplates()
    } catch (e: unknown) {
      toast.error(`Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  const handleDuplicate = (tmpl: ChallengeTemplate) => {
    toast.info(`"${tmpl.name}" duplication — coming soon`)
  }

  const handleDelete = (tmplId: string, tmplName: string) => {
    setConfirmModal({
      title: 'Delete Template?',
      description: `This will permanently delete "${tmplName}". Existing accounts on this template won't be affected.`,
      confirmLabel: 'Delete',
      confirmCls: 'bg-loss',
      onConfirm: () => {
        toast.info(`"${tmplName}" deletion — coming soon`)
        setConfirmModal(null)
      },
    })
  }

  const activeCount = displayTemplates.filter(t => t.is_active).length
  const totalAccounts = displayTemplates.reduce((s, t) => s + (t.account_count ?? 0), 0)
  const avgFee = displayTemplates.length ? displayTemplates.reduce((s, t) => s + t.entry_fee, 0) / displayTemplates.length : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gamepad2 className="size-5 text-primary" />
            <h1 className="text-xl font-bold">Game Designer</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage challenge templates, phase rules, and parameters</p>
        </div>
        <button
          onClick={() => toast.info('New template creation coming soon')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-semibold"
        >
          <Plus className="size-3.5" /> New Template
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active Templates', value: activeCount, cls: 'text-profit', icon: Power },
          { label: 'Paused Templates', value: displayTemplates.length - activeCount, cls: 'text-yellow-500', icon: PowerOff },
          { label: 'Total Accounts', value: totalAccounts.toLocaleString(), cls: '', icon: Users },
          { label: 'Avg Entry Fee', value: avgFee ? formatCurrency(avgFee) : '—', cls: '', icon: DollarSign },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl bg-card border border-border/50 p-4 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <stat.icon className={cn('size-4', stat.cls || 'text-muted-foreground')} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              {isLoading ? <Skeleton className="h-6 w-16 mt-0.5" /> : (
                <div className={cn('text-xl font-bold tabular-nums mt-0.5', stat.cls || 'text-foreground')}>{stat.value}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 self-start">
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

      {/* ─── TEMPLATES ────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5">
            <BarChart2 className="size-3.5 text-primary shrink-0" />
            <span><span className="font-semibold text-primary">Inline editing enabled.</span>{' '}Expand any template and click rule values to edit them directly.</span>
          </div>

          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              value={templateSearch}
              onChange={e => setTemplateSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-4">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
              : filteredTemplates.map(tmpl => (
                  <TemplateCard
                    key={tmpl.id}
                    tmpl={tmpl}
                    localActive={undefined}
                    onToggleActive={() => handleToggleActive(tmpl.id, tmpl.is_active)}
                    onEdit={updated => handleEdit(tmpl.id, updated)}
                    onDuplicate={() => handleDuplicate(tmpl)}
                    onDelete={() => handleDelete(tmpl.id, tmpl.name)}
                  />
                ))
            }
          </div>
        </div>
      )}

      {/* ─── ANALYTICS ────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="flex flex-col gap-4">
          {/* Pass rate overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Accounts', value: TEMPLATE_ANALYTICS.reduce((s, t) => s + t.accounts, 0).toLocaleString(), icon: Users, cls: '' },
              { label: 'Avg Pass Rate', value: `${(TEMPLATE_ANALYTICS.reduce((s, t) => s + t.passRate, 0) / TEMPLATE_ANALYTICS.length).toFixed(1)}%`, icon: Target, cls: 'text-profit' },
              { label: 'Avg Days to Fund', value: `${(TEMPLATE_ANALYTICS.reduce((s, t) => s + t.avgDaysToFund, 0) / TEMPLATE_ANALYTICS.length).toFixed(0)}d`, icon: Clock, cls: '' },
              { label: 'Total Revenue', value: formatCurrency(TEMPLATE_ANALYTICS.reduce((s, t) => s + t.revenue, 0)), icon: DollarSign, cls: 'text-profit' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-card border border-border/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={cn('size-4', stat.cls || 'text-muted-foreground')} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                </div>
                <div className={cn('text-2xl font-bold tabular-nums', stat.cls || 'text-foreground')}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Per-template analytics */}
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Template Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30">
                    <th className="text-left px-5 py-2">Template</th>
                    <th className="text-right px-3 py-2">Accounts</th>
                    <th className="text-right px-3 py-2">Pass Rate</th>
                    <th className="text-right px-3 py-2">Avg Days</th>
                    <th className="text-right px-3 py-2">Revenue</th>
                    <th className="text-right px-5 py-2">Popularity</th>
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATE_ANALYTICS.map(t => (
                    <tr key={t.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium">{t.name}</div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold">{t.accounts.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={cn('font-semibold tabular-nums', t.passRate > 20 ? 'text-profit' : t.passRate > 10 ? 'text-yellow-500' : 'text-loss')}>
                          {t.passRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{t.avgDaysToFund}d</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-profit">{formatCurrency(t.revenue)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-20 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${t.popularity}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-6 text-right">{t.popularity}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conversion funnel overview */}
          <div className="rounded-xl bg-card border border-border/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Challenge Lifecycle Funnel</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">Platform average</span>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Started Challenge', count: 3344, pct: 100, color: '#6366f1' },
                { label: 'Active in Phase 1', count: 2891, pct: 86, color: '#6366f1' },
                { label: 'Passed Phase 1', count: 1124, pct: 34, color: '#8b5cf6' },
                { label: 'Passed Phase 2', count: 612, pct: 18, color: '#a855f7' },
                { label: 'Funded', count: 412, pct: 12, color: '#22c55e' },
                { label: 'Paid Out', count: 287, pct: 9, color: '#16a34a' },
              ].map(stage => (
                <div key={stage.label} className="flex items-center gap-3">
                  <div className="w-32 text-[10px] text-right text-muted-foreground">{stage.label}</div>
                  <div className="flex-1 h-6 bg-muted/20 rounded-sm overflow-hidden relative">
                    <div className="h-full rounded-sm flex items-center px-2" style={{ width: `${stage.pct}%`, backgroundColor: `${stage.color}25`, border: `1px solid ${stage.color}40` }}>
                      <span className="text-[10px] font-semibold" style={{ color: stage.color }}>{stage.pct}%</span>
                    </div>
                  </div>
                  <div className="text-[10px] tabular-nums font-medium w-16 text-right">{stage.count.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── PRICING ──────────────────────────────────────────────────── */}
      {activeTab === 'pricing' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
            <Tag className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span>Pricing overview of all challenge tiers. Edit individual templates to change entry fees and profit splits.</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PRICING_TIERS.map(tier => (
              <div key={tier.size} className={cn('rounded-xl bg-card border p-5 flex flex-col gap-4 relative', tier.popular ? 'border-primary shadow-md' : 'border-border/50')}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full">
                      <Star className="size-2.5" /> Most Popular
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Account Size</div>
                  <div className="text-2xl font-bold tabular-nums">{tier.size}</div>
                </div>
                <div className="text-3xl font-bold tabular-nums text-primary">{formatCurrency(tier.fee)}<span className="text-sm text-muted-foreground font-normal"> fee</span></div>
                <div className="flex flex-col gap-2 text-xs">
                  {[
                    { label: 'Profit Split', value: `${tier.profitSplit}%`, cls: 'text-profit font-semibold' },
                    { label: 'Phases', value: `${tier.phases} phases`, cls: '' },
                    { label: 'Max Leverage', value: `1:${tier.leverage}`, cls: '' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={item.cls}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => toast.info(`Edit ${tier.size} template coming soon`)}
                  className="flex items-center justify-center gap-1 w-full py-2 rounded-lg bg-muted/40 hover:bg-muted text-xs font-medium transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-3" /> Edit
                </button>
              </div>
            ))}
          </div>

          {/* Revenue per tier */}
          <div className="rounded-xl bg-card border border-border/50 p-5">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Revenue by Tier</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">Based on current account counts</span>
            </div>
            <div className="flex flex-col gap-3">
              {TEMPLATE_ANALYTICS.map((t, i) => {
                const maxRevenue = Math.max(...TEMPLATE_ANALYTICS.map(x => x.revenue))
                const pct = (t.revenue / maxRevenue) * 100
                const color = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b'][i % 4]
                return (
                  <div key={t.id}>
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="font-medium">{t.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{t.accounts} accounts</span>
                        <span className="font-bold tabular-nums">{formatCurrency(t.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── RULES REFERENCE ──────────────────────────────────────────── */}
      {activeTab === 'rules' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
            <Shield className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span>Platform-wide challenge rules across all tiers. These are the default constraints applied to all challenge accounts.</span>
          </div>

          {GLOBAL_RULES.map(section => (
            <div key={section.category} className="rounded-xl bg-card border border-border/50 overflow-hidden">
              <div className="px-5 py-3 bg-muted/20 border-b border-border/30 flex items-center gap-2">
                <Shield className="size-3.5 text-muted-foreground" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{section.category}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/20">
                      <th className="text-left px-5 py-2">Rule</th>
                      <th className="text-center px-3 py-2">Standard</th>
                      <th className="text-center px-3 py-2">Advanced</th>
                      <th className="text-center px-5 py-2">Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rules.map(rule => (
                      <tr key={rule.rule} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-2.5">
                          <div className="font-medium">{rule.rule}</div>
                          <div className="text-[10px] text-muted-foreground">{rule.description}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold">{rule.standard}</td>
                        <td className="px-3 py-2.5 text-center font-semibold">{rule.advanced}</td>
                        <td className="px-5 py-2.5 text-center font-semibold">{rule.pro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Key trading rules highlight */}
          <div className="rounded-xl bg-card border border-border/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Key Constraints Explanation</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
              {[
                { title: 'Daily Loss Limit (5%)', desc: 'If an account loses 5% of its starting balance (or current balance, whichever is higher) in a single trading day, it is immediately breached.' },
                { title: 'Max Drawdown (10%)', desc: 'Total drawdown from the highest equity point cannot exceed 10%. Once breached, the account is automatically failed.' },
                { title: 'No Weekend Holding', desc: 'All positions must be closed before market close on Friday. Any positions held over the weekend will result in account termination.' },
                { title: 'News Trading Ban', desc: 'Trading is prohibited within 2 minutes of high-impact news events. Any trades opened during this window are automatically closed.' },
                { title: 'Minimum Trading Days', desc: 'Traders must be active on a minimum number of distinct calendar days. Bot-like patterns of single-day trading are rejected.' },
                { title: 'Profit Split (80-90%)', desc: 'Once funded, traders receive 80-90% of all profits they generate. The platform retains the remaining portion as revenue.' },
              ].map(item => (
                <div key={item.title} className="bg-muted/20 rounded-lg p-3">
                  <div className="font-semibold text-foreground mb-1">{item.title}</div>
                  <div className="text-muted-foreground text-[11px] leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── SIMULATION ───────────────────────────────────────────────── */}
      {activeTab === 'simulation' && (() => {
        const lastStep = simRun?.[simRun.length - 1]
        const finalStatus = !simRun ? null : lastStep?.breached ? 'breached' : lastStep?.passed ? 'passed' : 'running'
        const minEquity = simRun ? Math.min(...simRun.map(s => s.equity)) : 0
        const maxEquity = simRun ? Math.max(...simRun.map(s => s.equity)) : 0
        const chartH = 180
        const chartW = 560
        const pad = { top: 16, bottom: 20, left: 8, right: 8 }
        const innerH = chartH - pad.top - pad.bottom
        const innerW = chartW - pad.left - pad.right
        const eqRange = maxEquity - minEquity || 1
        const yScale = (eq: number) => pad.top + innerH - ((eq - minEquity) / eqRange) * innerH
        const xScale = (i: number, total: number) => pad.left + (i / Math.max(total - 1, 1)) * innerW
        const targetLine = simAccountSize * (1 + simProfitTarget / 100)
        const ddLine = simAccountSize * (1 - simMaxDrawdown / 100)

        return (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* ─ Controls panel ─ */}
              <div className="rounded-xl bg-card border border-border/50 p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Challenge Parameters</h3>
                </div>

                {/* Account size */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Account Size</span>
                    <span className="font-semibold text-foreground">{formatCurrency(simAccountSize)}</span>
                  </div>
                  <input type="range" min={5000} max={200000} step={5000} value={simAccountSize} onChange={e => setSimAccountSize(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none bg-muted/50 accent-primary cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5"><span>$5K</span><span>$200K</span></div>
                </div>

                {/* Daily loss */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Daily Loss Limit</span>
                    <span className="font-semibold text-loss">{simDailyLoss}%</span>
                  </div>
                  <input type="range" min={1} max={10} step={0.5} value={simDailyLoss} onChange={e => setSimDailyLoss(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none bg-muted/50 accent-loss cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5"><span>1%</span><span>10%</span></div>
                </div>

                {/* Max drawdown */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Max Drawdown</span>
                    <span className="font-semibold text-loss">{simMaxDrawdown}%</span>
                  </div>
                  <input type="range" min={3} max={20} step={0.5} value={simMaxDrawdown} onChange={e => setSimMaxDrawdown(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none bg-muted/50 accent-loss cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5"><span>3%</span><span>20%</span></div>
                </div>

                {/* Profit target */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Profit Target (P1)</span>
                    <span className="font-semibold text-profit">{simProfitTarget}%</span>
                  </div>
                  <input type="range" min={3} max={20} step={0.5} value={simProfitTarget} onChange={e => setSimProfitTarget(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none bg-muted/50 accent-profit cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5"><span>3%</span><span>20%</span></div>
                </div>

                {/* Min days */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Min Trading Days</span>
                    <span className="font-semibold text-foreground">{simMinDays}d</span>
                  </div>
                  <input type="range" min={1} max={20} step={1} value={simMinDays} onChange={e => setSimMinDays(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none bg-muted/50 accent-primary cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5"><span>1d</span><span>20d</span></div>
                </div>

                {/* Volatility */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Trader Volatility</span>
                    <span className="font-semibold text-yellow-500">{simVolatility}%</span>
                  </div>
                  <input type="range" min={2} max={30} step={1} value={simVolatility} onChange={e => setSimVolatility(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none bg-muted/50 accent-yellow-500 cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5"><span>2% (tame)</span><span>30% (erratic)</span></div>
                </div>

                {/* Seed */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Random Seed</span>
                    <span className="font-semibold text-foreground tabular-nums">#{simSeed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={9999} value={simSeed} onChange={e => setSimSeed(+e.target.value)}
                      className="flex-1 px-2 py-1 text-xs bg-muted/30 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 tabular-nums" />
                    <button onClick={randomizeSeed} className="px-2 py-1 text-[10px] bg-muted/50 hover:bg-muted border border-border/30 rounded-lg transition-colors font-medium">🎲 Random</button>
                  </div>
                </div>

                {/* Run button */}
                <button
                  onClick={runSim}
                  disabled={simRunning}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {simRunning ? (
                    <><div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Simulating…</>
                  ) : (
                    <><Activity className="size-3.5" />Run Simulation</>
                  )}
                </button>
              </div>

              {/* ─ Chart + result ─ */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Result banner */}
                {finalStatus && (
                  <div className={cn('rounded-xl border px-5 py-4 flex items-center gap-4',
                    finalStatus === 'passed' ? 'bg-profit/10 border-profit/30' :
                    finalStatus === 'breached' ? 'bg-loss/10 border-loss/30' :
                    'bg-yellow-500/10 border-yellow-500/30'
                  )}>
                    <div className={cn('text-3xl', finalStatus === 'passed' ? '' : '')}>
                      {finalStatus === 'passed' ? '✅' : finalStatus === 'breached' ? '💥' : '⏳'}
                    </div>
                    <div className="flex-1">
                      <div className={cn('text-sm font-bold',
                        finalStatus === 'passed' ? 'text-profit' : finalStatus === 'breached' ? 'text-loss' : 'text-yellow-500'
                      )}>
                        {finalStatus === 'passed' ? 'Phase 1 Passed!' : finalStatus === 'breached' ? 'Account Breached' : 'Still Running (40d limit)'}
                      </div>
                      {lastStep && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Final equity: <span className="font-semibold tabular-nums">{formatCurrency(lastStep.equity)}</span>
                          {' · '}Day <span className="font-semibold">{lastStep.day}</span>
                          {' · '}P&L: <span className={cn('font-semibold tabular-nums', lastStep.equity >= simAccountSize ? 'text-profit' : 'text-loss')}>{lastStep.equity >= simAccountSize ? '+' : ''}{formatCurrency(lastStep.equity - simAccountSize)}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <div>Pass target: <span className="font-semibold">{formatCurrency(targetLine)}</span></div>
                      <div>DD limit: <span className="font-semibold">{formatCurrency(ddLine)}</span></div>
                    </div>
                  </div>
                )}

                {/* Equity chart */}
                <div className="rounded-xl bg-card border border-border/50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold flex items-center gap-1.5"><BarChart2 className="size-3.5 text-muted-foreground" /> Equity Curve</h3>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="size-2 inline-block rounded-full bg-profit" />Target</span>
                      <span className="flex items-center gap-1"><span className="size-2 inline-block rounded-full bg-loss" />DD Limit</span>
                      <span className="flex items-center gap-1"><span className="size-2 inline-block rounded-full bg-primary" />Equity</span>
                    </div>
                  </div>

                  {!simRun ? (
                    <div className="h-44 flex items-center justify-center text-xs text-muted-foreground/50">
                      <div className="text-center">
                        <Activity className="size-8 mx-auto mb-2 opacity-20" />
                        <div>Configure parameters and click Run Simulation</div>
                      </div>
                    </div>
                  ) : (
                    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ height: chartH }}>
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                        const y = pad.top + innerH * pct
                        const val = maxEquity - eqRange * pct
                        return (
                          <g key={pct}>
                            <line x1={pad.left} y1={y} x2={chartW - pad.right} y2={y} stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} />
                            <text x={pad.left} y={y - 3} fontSize={8} fill="currentColor" fillOpacity={0.35}>{formatCurrency(val, 'USD', 0)}</text>
                          </g>
                        )
                      })}

                      {/* Target line */}
                      {targetLine >= minEquity && targetLine <= maxEquity && (
                        <line x1={pad.left} y1={yScale(targetLine)} x2={chartW - pad.right} y2={yScale(targetLine)}
                          stroke="#22c55e" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.6} />
                      )}

                      {/* DD limit line */}
                      {ddLine >= minEquity && ddLine <= maxEquity && (
                        <line x1={pad.left} y1={yScale(ddLine)} x2={chartW - pad.right} y2={yScale(ddLine)}
                          stroke="#ef4444" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.6} />
                      )}

                      {/* Starting balance line */}
                      {simAccountSize >= minEquity && simAccountSize <= maxEquity && (
                        <line x1={pad.left} y1={yScale(simAccountSize)} x2={chartW - pad.right} y2={yScale(simAccountSize)}
                          stroke="currentColor" strokeWidth={0.5} strokeDasharray="2 4" strokeOpacity={0.25} />
                      )}

                      {/* Fill under curve */}
                      {simRun.length > 1 && (() => {
                        const pts = simRun.map((s, i) => `${xScale(i, simRun.length)},${yScale(s.equity)}`).join(' ')
                        const firstX = xScale(0, simRun.length)
                        const lastX = xScale(simRun.length - 1, simRun.length)
                        const baseY = chartH - pad.bottom
                        return (
                          <polygon
                            points={`${firstX},${baseY} ${pts} ${lastX},${baseY}`}
                            fill={finalStatus === 'breached' ? '#ef4444' : '#6366f1'}
                            fillOpacity={0.07}
                          />
                        )
                      })()}

                      {/* Line segments colored by segment */}
                      {simRun.map((s, i) => {
                        if (i === 0) return null
                        const prev = simRun[i - 1]
                        const x1 = xScale(i - 1, simRun.length)
                        const y1 = yScale(prev.equity)
                        const x2 = xScale(i, simRun.length)
                        const y2 = yScale(s.equity)
                        const color = s.breached ? '#ef4444' : s.passed ? '#22c55e' : s.pnl >= 0 ? '#6366f1' : '#f59e0b'
                        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} />
                      })}

                      {/* Event markers */}
                      {simRun.map((s, i) => {
                        if (!s.event) return null
                        const x = xScale(i, simRun.length)
                        const y = yScale(s.equity)
                        const color = s.breached ? '#ef4444' : s.passed ? '#22c55e' : '#f59e0b'
                        return (
                          <g key={`evt-${i}`}>
                            <circle cx={x} cy={y} r={4} fill={color} fillOpacity={0.9} stroke="white" strokeWidth={1} />
                          </g>
                        )
                      })}

                      {/* Day axis labels */}
                      {simRun.filter((_, i) => i % 5 === 0 || i === simRun.length - 1).map((s, _, arr) => {
                        const i = simRun.indexOf(s)
                        return (
                          <text key={`d${s.day}`} x={xScale(i, simRun.length)} y={chartH - 4} fontSize={8} textAnchor="middle" fill="currentColor" fillOpacity={0.35}>
                            D{s.day}
                          </text>
                        )
                      })}
                    </svg>
                  )}
                </div>

                {/* Event log */}
                {simRun && simRun.some(s => s.event) && (
                  <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
                    <div className="px-5 py-3 border-b border-border/30 flex items-center gap-2">
                      <Clock className="size-3.5 text-muted-foreground" />
                      <h3 className="text-xs font-semibold">Event Log</h3>
                      <span className="text-[10px] text-muted-foreground ml-auto">{simRun.filter(s => s.event).length} events</span>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-border/20">
                      {simRun.filter(s => s.event).map(s => (
                        <div key={s.day} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/10 transition-colors">
                          <div className={cn('text-[10px] font-bold tabular-nums shrink-0 w-10',
                            s.breached ? 'text-loss' : s.passed ? 'text-profit' : 'text-muted-foreground'
                          )}>D{s.day}</div>
                          <div className="text-xs flex-1">{s.event}</div>
                          <div className={cn('text-[10px] tabular-nums font-semibold shrink-0',
                            s.pnl >= 0 ? 'text-profit' : 'text-loss'
                          )}>{s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, 'USD', 0)}</div>
                          <div className="text-[10px] tabular-nums text-muted-foreground shrink-0 w-24 text-right">{formatCurrency(s.equity, 'USD', 0)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily stats table — compact */}
                {simRun && (
                  <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
                    <div className="px-5 py-3 border-b border-border/30 flex items-center gap-2">
                      <Filter className="size-3.5 text-muted-foreground" />
                      <h3 className="text-xs font-semibold">Daily Breakdown</h3>
                      <span className="text-[10px] text-muted-foreground ml-auto">{simRun.length} trading days</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-card z-10">
                          <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/30">
                            <th className="text-left px-5 py-2">Day</th>
                            <th className="text-right px-3 py-2">P&L</th>
                            <th className="text-right px-3 py-2">Equity</th>
                            <th className="text-right px-3 py-2">DD%</th>
                            <th className="text-right px-5 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simRun.map(s => (
                            <tr key={s.day} className={cn('border-b border-border/20 transition-colors',
                              s.breached ? 'bg-loss/5 hover:bg-loss/10' : s.passed ? 'bg-profit/5 hover:bg-profit/10' : 'hover:bg-muted/10'
                            )}>
                              <td className="px-5 py-1.5 font-semibold tabular-nums">D{s.day}</td>
                              <td className={cn('px-3 py-1.5 text-right tabular-nums font-semibold', s.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                                {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl, 'USD', 0)}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(s.equity, 'USD', 0)}</td>
                              <td className={cn('px-3 py-1.5 text-right tabular-nums', s.drawdownFromPeak > simMaxDrawdown * 0.7 ? 'text-loss font-semibold' : 'text-muted-foreground')}>
                                {s.drawdownFromPeak.toFixed(1)}%
                              </td>
                              <td className="px-5 py-1.5 text-right">
                                {s.breached ? <span className="text-loss text-[10px] font-bold">BREACHED</span>
                                  : s.passed ? <span className="text-profit text-[10px] font-bold">PASSED</span>
                                  : <span className="text-muted-foreground text-[10px]">active</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info banner */}
            <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
              <Activity className="size-3.5 text-primary shrink-0 mt-0.5" />
              <span><span className="font-semibold text-primary">Monte Carlo Simulation.</span>{' '}
                Uses a seeded LCG pseudo-random engine to model realistic trader behavior with configurable volatility. Each seed produces a reproducible equity curve. Use different seeds to stress-test your challenge parameters across multiple trader profiles.</span>
            </div>
          </div>
        )
      })()}

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          description={confirmModal.description}
          confirmLabel={confirmModal.confirmLabel}
          confirmCls={confirmModal.confirmCls}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Toast */}
    </div>
  )
}
