'use client'

import { ChevronDown, AlertTriangle, Target, Shield } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  RISK_PRESETS,
  RR_PRESETS,
  getRiskColor,
  type RiskCalcResult,
} from '@/lib/risk-calc'

// ─── Props ───────────────────────────────────────────────────────────────────

interface RiskCalculatorSectionProps {
  // Controlled state (lifted to parent)
  riskPercent: string
  setRiskPercent: (v: string) => void
  rrRatio: string
  setRrRatio: (v: string) => void
  isExpanded: boolean
  setIsExpanded: (v: boolean) => void

  // Read-only computed data (from parent)
  riskResult: RiskCalcResult | null
  maxAllowedRiskPercent: number

  // Challenge budget display
  dailyLossRemaining: number   // in $
  drawdownRemaining: number    // in $
  startingBalance: number
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RiskCalculatorSection({
  riskPercent,
  setRiskPercent,
  rrRatio,
  setRrRatio,
  isExpanded,
  setIsExpanded,
  riskResult,
  maxAllowedRiskPercent,
  dailyLossRemaining,
  drawdownRemaining,
  startingBalance,
}: RiskCalculatorSectionProps) {
  const riskPct = parseFloat(riskPercent) || 0

  return (
    <div className="px-3 py-2 border-b border-border/50">
      {/* ── Header toggle (always visible) ─────────────────────────────── */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full"
      >
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Target className="size-2.5" />
          Risk Calculator
        </span>
        <div className="flex items-center gap-1">
          {riskPct > 0 && (
            <span className={cn('text-xs font-semibold tabular-nums', getRiskColor(riskPct))}>
              {riskPct}%
            </span>
          )}
          <ChevronDown
            className={cn(
              'size-3 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* ── Expanded content ───────────────────────────────────────────── */}
      {isExpanded && (
        <div className="mt-2 space-y-2.5">

          {/* Row 1: Risk % presets + custom input */}
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Risk %
            </span>
            <div className="flex items-center gap-1 mt-1">
              {RISK_PRESETS.map(pct => {
                const isOver = pct > maxAllowedRiskPercent
                return (
                  <button
                    key={pct}
                    onClick={() => setRiskPercent(String(pct))}
                    title={isOver ? `Max allowed: ${maxAllowedRiskPercent.toFixed(1)}%` : undefined}
                    className={cn(
                      'flex-1 py-0.5 rounded text-[9px] font-medium transition-colors border',
                      parseFloat(riskPercent) === pct
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border',
                      isOver && 'opacity-50'
                    )}
                  >
                    {pct}%
                  </button>
                )
              })}
              <input
                type="text"
                value={riskPercent}
                onChange={e => setRiskPercent(e.target.value)}
                className="w-12 bg-muted/30 rounded border border-border/50 text-center text-[10px] font-medium text-foreground py-0.5 tabular-nums focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Row 2: R:R ratio presets + custom input */}
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Reward : Risk
            </span>
            <div className="flex items-center gap-1 mt-1">
              {RR_PRESETS.map(rr => (
                <button
                  key={rr}
                  onClick={() => setRrRatio(String(rr))}
                  className={cn(
                    'flex-1 py-0.5 rounded text-[9px] font-medium transition-colors border',
                    parseFloat(rrRatio) === rr
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  1:{rr}
                </button>
              ))}
              <div className="flex items-center gap-0.5 w-12">
                <span className="text-[9px] text-muted-foreground">1:</span>
                <input
                  type="text"
                  value={rrRatio}
                  onChange={e => setRrRatio(e.target.value)}
                  className="w-8 bg-muted/30 rounded border border-border/50 text-center text-[10px] font-medium text-foreground py-0.5 tabular-nums focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Computed summary */}
          {riskResult && (
            <div className="space-y-1.5 pt-2 border-t border-border/30">
              {/* Optimal lot size */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Lot size</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {riskResult.quantity.toFixed(4)}
                </span>
              </div>
              {/* SL price */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">SL price</span>
                <span className="tabular-nums text-loss font-medium">
                  {riskResult.slPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                </span>
              </div>
              {/* TP price */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">TP price</span>
                <span className="tabular-nums text-profit font-medium">
                  {riskResult.tpPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                </span>
              </div>
              {/* $ at risk */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Risk ($)</span>
                <span className={cn('font-semibold tabular-nums', getRiskColor(riskResult.riskPercent))}>
                  −{formatCurrency(riskResult.riskAmount)}
                  <span className="text-[9px] ml-0.5 opacity-70">
                    ({riskResult.riskPercent.toFixed(2)}%)
                  </span>
                </span>
              </div>
              {/* Potential reward */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Reward ($)</span>
                <span className="font-semibold tabular-nums text-profit">
                  +{formatCurrency(riskResult.rewardAmount)}
                </span>
              </div>
              {/* Estimated fees */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Est. fees</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(riskResult.roundTripFees)}
                </span>
              </div>
            </div>
          )}

          {/* Row 4: Challenge budget info */}
          <div className="space-y-1 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1 mb-1">
              <Shield className="size-2.5 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                Challenge Budget
              </span>
            </div>

            <div className="flex justify-between text-[9px]">
              <span className="text-muted-foreground">Daily loss remaining</span>
              <span
                className={cn(
                  'tabular-nums font-medium',
                  dailyLossRemaining < startingBalance * 0.01
                    ? 'text-loss'
                    : dailyLossRemaining < startingBalance * 0.02
                      ? 'text-amber-400'
                      : 'text-muted-foreground'
                )}
              >
                {dailyLossRemaining === Infinity ? '—' : formatCurrency(Math.max(0, dailyLossRemaining))}
              </span>
            </div>

            <div className="flex justify-between text-[9px]">
              <span className="text-muted-foreground">Drawdown remaining</span>
              <span
                className={cn(
                  'tabular-nums font-medium',
                  drawdownRemaining < startingBalance * 0.02
                    ? 'text-loss'
                    : drawdownRemaining < startingBalance * 0.04
                      ? 'text-amber-400'
                      : 'text-muted-foreground'
                )}
              >
                {drawdownRemaining === Infinity ? '—' : formatCurrency(Math.max(0, drawdownRemaining))}
              </span>
            </div>

            {/* Warning if over limit */}
            {riskResult?.isOverLimit && (
              <div className="flex items-center gap-1 text-[9px] text-loss mt-1 bg-loss/5 rounded px-2 py-1 border border-loss/20">
                <AlertTriangle className="size-2.5 shrink-0" />
                <span>
                  Exceeds challenge limit (max {maxAllowedRiskPercent.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
