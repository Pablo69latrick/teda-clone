'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, Check, Shield, Clock, TrendingUp, AlertTriangle,
  Loader2, Star, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useChallengeTemplates } from '@/lib/hooks'
import { useActiveAccount } from '@/lib/use-active-account'
import { mutate } from 'swr'
import type { ChallengeTemplate, PhaseRule } from '@/types'

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

// ─── Phase card ──────────────────────────────────────────────────────────────
function PhaseCard({ phase, index, total }: { phase: PhaseRule; index: number; total: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/20 border border-border/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{phase.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
          {phase.phase_type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Profit Target</span>
          <span className="font-medium text-profit">{phase.profit_target > 0 ? `${(phase.profit_target * 100).toFixed(0)}%` : '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Daily Loss</span>
          <span className="font-medium text-loss">{(phase.daily_loss_limit * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Max Drawdown</span>
          <span className="font-medium text-loss">{(phase.max_drawdown * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Profit Split</span>
          <span className="font-medium">{phase.profit_split > 0 ? `${(phase.profit_split * 100).toFixed(0)}%` : '—'}</span>
        </div>
        {phase.min_trading_days > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Min Days</span>
            <span className="font-medium">{phase.min_trading_days}</span>
          </div>
        )}
        {phase.max_trading_days && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Max Days</span>
            <span className="font-medium">{phase.max_trading_days}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Leverage</span>
          <span className="font-medium">{phase.leverage_limit}x</span>
        </div>
      </div>

      {/* Rules badges */}
      <div className="flex flex-wrap gap-1 mt-1">
        {phase.news_trading_allowed && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chart-2/10 text-chart-2 border border-chart-2/20">News OK</span>
        )}
        {phase.weekend_holding_allowed && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">Weekend Hold</span>
        )}
        {phase.martingale_detection_enabled && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Anti-Martingale</span>
        )}
      </div>
    </div>
  )
}

// ─── Template Card ───────────────────────────────────────────────────────────
function TemplateCard({
  template,
  onPurchase,
  purchasing,
  disabled,
}: {
  template: ChallengeTemplate
  onPurchase: (id: string) => void
  purchasing: string | null
  disabled: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isFree = template.entry_fee === 0
  const phases = template.phase_sequence
  const maxSplit = Math.max(...phases.map(p => p.profit_split))
  const isProcessing = purchasing === template.id

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border transition-all duration-300',
        isFree
          ? 'bg-gradient-to-b from-primary/5 to-card border-primary/30 shadow-sm shadow-primary/5'
          : 'bg-card border-border/50 hover:border-border',
      )}
    >
      {/* Popular badge */}
      {isFree && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-md">
          <Star className="size-3" />
          Free Trial
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 p-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold">{template.name}</h3>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
            )}
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-lg bg-muted/30 p-2.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</span>
            <span className="text-sm font-bold mt-0.5">{formatCurrency(template.starting_balance)}</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-muted/30 p-2.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Phases</span>
            <span className="text-sm font-bold mt-0.5">{phases.length}</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-muted/30 p-2.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Split</span>
            <span className="text-sm font-bold mt-0.5 text-profit">
              {maxSplit > 0 ? `${(maxSplit * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
        </div>

        {/* Quick rules summary */}
        <div className="flex flex-wrap gap-1.5">
          {phases[0]?.profit_target > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <TrendingUp className="size-3 text-profit" />
              <span>Target: {(phases[0].profit_target * 100).toFixed(0)}%</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Shield className="size-3 text-loss" />
            <span>DD: {(phases[0].max_drawdown * 100).toFixed(0)}%</span>
          </div>
          {phases[0]?.max_trading_days && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="size-3" />
              <span>{phases[0].max_trading_days}d</span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable phases */}
      <div className="px-5">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors mb-3"
        >
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {expanded ? 'Hide' : 'Show'} phase details
        </button>

        {expanded && (
          <div className="flex flex-col gap-2 mb-4">
            {phases.map((phase, i) => (
              <PhaseCard key={i} phase={phase} index={i} total={phases.length} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-border/30 p-5 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Entry Fee</span>
            <div className={cn('text-lg font-bold', isFree ? 'text-profit' : '')}>
              {isFree ? 'Free' : formatCurrency(template.entry_fee)}
            </div>
          </div>
        </div>

        <Button
          className="w-full text-xs font-semibold"
          size="sm"
          disabled={disabled || isProcessing}
          onClick={() => onPurchase(template.id)}
        >
          {isProcessing ? (
            <>
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Zap className="size-3.5 mr-1.5" />
              {isFree ? 'Start Free Trial' : 'Start Challenge'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ChallengesPage() {
  const router = useRouter()
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { accounts, setActiveAccountId } = useActiveAccount()
  const { data: templates, isLoading } = useChallengeTemplates()

  const atLimit = accounts.length >= 10

  async function handlePurchase(templateId: string) {
    setPurchasing(templateId)
    setError(null)
    try {
      const res = await fetch('/api/proxy/engine/purchase-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ template_id: templateId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to start challenge')
      }
      const newAccount = await res.json()
      // Refresh accounts list, switch to new account, redirect
      await mutate('/api/proxy/actions/accounts')
      setActiveAccountId(newAccount.id)
      router.push('/dashboard/overview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Challenges</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose a challenge and start trading. Pass the evaluation to get funded.
        </p>
      </div>

      {/* Account limit warning */}
      {atLimit && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="size-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-500">Account Limit Reached</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You have {accounts.length} accounts (maximum 10). Close or remove an existing account before starting a new challenge.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-loss/10 border border-loss/20 text-loss text-xs">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Templates grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-card border border-border/50 p-5">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-3 w-48 mb-4" />
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (templates ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No challenges available</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Check back soon for new challenges.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(templates ?? []).map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onPurchase={handlePurchase}
              purchasing={purchasing}
              disabled={atLimit}
            />
          ))}
        </div>
      )}

      {/* Info section */}
      <div className="rounded-xl bg-card border border-border/50 p-5">
        <h2 className="text-sm font-semibold mb-3">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: 'Pick a Challenge',
              desc: 'Choose a challenge that fits your trading style and capital requirements.',
              icon: Zap,
            },
            {
              step: '2',
              title: 'Pass the Evaluation',
              desc: 'Trade within the rules — hit the profit target without breaching drawdown limits.',
              icon: TrendingUp,
            },
            {
              step: '3',
              title: 'Get Funded',
              desc: 'Once you pass, trade with real capital and keep up to 85% of your profits.',
              icon: Check,
            },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">{item.title}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
