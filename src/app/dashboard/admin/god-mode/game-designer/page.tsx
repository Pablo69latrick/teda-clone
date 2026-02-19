'use client'

import { useState } from 'react'
import { Gamepad2, Target, TrendingUp, Users, DollarSign, Shield, ChevronRight, Plus, Pencil } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminTemplates } from '@/lib/hooks'
import type { ChallengeTemplate, PhaseRule } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

function PhaseCard({ phase, isLast }: { phase: PhaseRule; isLast: boolean }) {
  const typeConfig: Record<string, { label: string; cls: string }> = {
    evaluation: { label: 'Evaluation', cls: 'bg-chart-2/10 text-chart-2 border-chart-2/20' },
    demo_funded: { label: 'Demo Funded', cls: 'bg-chart-1/10 text-chart-1 border-chart-1/20' },
    funded: { label: 'Funded', cls: 'bg-profit/10 text-profit border-profit/20' },
    payout: { label: 'Payout', cls: 'bg-primary/10 text-primary border-primary/20' },
  }
  const tc = typeConfig[phase.phase_type] ?? typeConfig.evaluation

  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col items-center shrink-0">
        <div className="size-6 rounded-full bg-card border-2 border-primary flex items-center justify-center text-[9px] font-bold text-primary">
          {phase.phase_number}
        </div>
        {!isLast && <div className="w-0.5 h-full bg-border/50 mt-1" style={{ minHeight: 32 }} />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-foreground">{phase.name}</span>
          <Badge variant="secondary" className={cn('text-[9px] border', tc.cls)}>{tc.label}</Badge>
          {phase.profit_split > 0 && (
            <Badge variant="secondary" className="text-[9px]">{(phase.profit_split * 100).toFixed(0)}% split</Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          {[
            { label: 'Profit Target', value: phase.profit_target > 0 ? `${(phase.profit_target * 100).toFixed(0)}%` : '—', cls: 'text-profit' },
            { label: 'Daily Loss', value: `-${(phase.daily_loss_limit * 100).toFixed(0)}%`, cls: 'text-loss' },
            { label: 'Max DD', value: `-${(phase.max_drawdown * 100).toFixed(0)}%`, cls: 'text-loss' },
            { label: 'Min Days', value: `${phase.min_trading_days}d`, cls: '' },
            { label: 'Max Days', value: phase.max_trading_days ? `${phase.max_trading_days}d` : 'Unlimited', cls: '' },
            { label: 'Leverage', value: `${phase.leverage_limit}x`, cls: '' },
          ].map(item => (
            <div key={item.label} className="bg-muted/20 rounded px-2 py-1.5">
              <div className="text-muted-foreground mb-0.5">{item.label}</div>
              <div className={cn('font-semibold', item.cls)}>{item.value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          {!phase.news_trading_allowed && <span className="flex items-center gap-0.5"><Shield className="size-2.5" /> No news</span>}
          {!phase.weekend_holding_allowed && <span className="flex items-center gap-0.5"><Shield className="size-2.5" /> No weekend hold</span>}
          {phase.martingale_detection_enabled && <span className="flex items-center gap-0.5"><Shield className="size-2.5" /> Anti-martingale</span>}
        </div>
      </div>
    </div>
  )
}

function TemplateCard({ tmpl }: { tmpl: ChallengeTemplate }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl bg-card border border-border/50">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={tmpl.is_active ? 'profit' : 'muted'} className="text-[9px] px-1.5 py-0">
              {tmpl.is_active ? 'Active' : 'Paused'}
            </Badge>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              {tmpl.phase_sequence.length}-phase
            </Badge>
          </div>
          <h3 className="font-semibold text-sm text-foreground">{tmpl.name}</h3>
          {tmpl.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
          )}
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-xs text-muted-foreground">Entry Fee</div>
          <div className="text-lg font-bold text-foreground">{formatCurrency(tmpl.entry_fee)}</div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-px bg-border/30 border-t border-border/30">
        {[
          { icon: DollarSign, label: 'Balance', value: formatCurrency(tmpl.starting_balance) },
          { icon: Users, label: 'Accounts', value: (tmpl.account_count ?? 0).toLocaleString() },
          { icon: Target, label: 'Target (P1)', value: `${(tmpl.phase_sequence[0]?.profit_target ?? 0) * 100}%` },
          { icon: TrendingUp, label: 'Profit Split', value: `${(tmpl.phase_sequence[tmpl.phase_sequence.length - 1]?.profit_split ?? 0) * 100}%` },
        ].map(item => (
          <div key={item.label} className="flex flex-col items-center gap-1 py-3 bg-card">
            <item.icon className="size-3.5 text-muted-foreground/50" />
            <div className="text-xs font-semibold tabular-nums">{item.value}</div>
            <div className="text-[9px] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Expand phases */}
      <div className="border-t border-border/30">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        >
          <span>Phase Sequence ({tmpl.phase_sequence.length} phases)</span>
          <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>

        {expanded && (
          <div className="px-5 pb-5 pt-2 border-t border-border/30">
            {tmpl.phase_sequence.map((phase, idx) => (
              <PhaseCard
                key={phase.phase_number}
                phase={phase}
                isLast={idx === tmpl.phase_sequence.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border/30">
        <Button variant="outline" size="sm" className="h-7 text-[10px] px-3 py-0">
          <Pencil className="size-2.5 mr-1" /> Edit Rules
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[10px] px-3 py-0">
          {tmpl.is_active ? 'Pause' : 'Activate'}
        </Button>
      </div>
    </div>
  )
}

export default function GameDesignerPage() {
  const { data: templates, isLoading } = useAdminTemplates()

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gamepad2 className="size-5 text-primary" />
            <h1 className="text-xl font-semibold">Game Designer</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage challenge templates, phase rules, and parameters</p>
        </div>
        <Button size="sm" className="text-xs flex items-center gap-1.5">
          <Plus className="size-3.5" /> New Template
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Templates', value: (templates ?? []).filter(t => t.is_active).length, cls: 'text-profit' },
          { label: 'Total Accounts', value: (templates ?? []).reduce((s, t) => s + (t.account_count ?? 0), 0).toLocaleString(), cls: '' },
          { label: 'Avg Entry Fee', value: templates?.length ? formatCurrency((templates.reduce((s, t) => s + t.entry_fee, 0)) / templates.length) : '—', cls: '' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl bg-card border border-border/50 p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{stat.label}</div>
            {isLoading ? <Skeleton className="h-7 w-20" /> : (
              <div className={cn('text-xl font-bold', stat.cls)}>{stat.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* Template cards */}
      <div className="flex flex-col gap-4">
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
          : (templates ?? []).map(tmpl => <TemplateCard key={tmpl.id} tmpl={tmpl} />)
        }
      </div>
    </div>
  )
}
