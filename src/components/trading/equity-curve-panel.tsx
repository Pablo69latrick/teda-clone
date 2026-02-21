'use client'

/**
 * EquityCurvePanel — lightweight SVG sparkline area chart.
 *
 * Renders the equity history as a smooth area chart using a pure SVG path.
 * No additional chart library needed — keeps the bundle light.
 *
 * Shows:
 *  - Equity curve (area fill)
 *  - Starting balance reference line (dashed)
 *  - Current equity + total P&L in the header
 *  - Tooltip on hover (date + equity value)
 */

import { useState, useCallback } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { useEquityHistory } from '@/lib/hooks'

interface EquityCurvePanelProps {
  accountId: string
  startingBalance?: number
}

// Build a smooth SVG polyline path from points
function buildPath(points: { x: number; y: number }[], smooth = false): string {
  if (points.length === 0) return ''
  if (!smooth) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  }
  // Catmull-Rom to cubic bezier
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

export function EquityCurvePanel({ accountId, startingBalance }: EquityCurvePanelProps) {
  const { data: history } = useEquityHistory(accountId)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const W = 100  // SVG viewBox width (%)
  const H = 60   // SVG viewBox height (units)
  const PAD = { top: 4, bottom: 4, left: 0, right: 0 }

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!history || history.length === 0) return
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const xFrac = (e.clientX - rect.left) / rect.width
    const idx = Math.round(xFrac * (history.length - 1))
    setHoverIdx(Math.max(0, Math.min(history.length - 1, idx)))
  }, [history])

  if (!history || history.length < 2) {
    return (
      <div className="flex flex-col h-full bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 shrink-0">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Equity</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground/50">No equity history yet</span>
        </div>
      </div>
    )
  }

  const equities = history.map(p => p.equity)
  const minEq    = Math.min(...equities)
  const maxEq    = Math.max(...equities)
  const range    = maxEq - minEq || 1

  const toX = (i: number) =>
    PAD.left + ((i / (history.length - 1)) * (W - PAD.left - PAD.right))
  const toY = (eq: number) =>
    PAD.top + ((1 - (eq - minEq) / range) * (H - PAD.top - PAD.bottom))

  const points = history.map((p, i) => ({ x: toX(i), y: toY(p.equity) }))
  const linePath = buildPath(points, true)

  // Area: close path at bottom
  const first = points[0]
  const last  = points[points.length - 1]
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${H} L ${first.x.toFixed(2)} ${H} Z`

  // Reference line at starting balance (or min)
  const refEq      = startingBalance ?? minEq
  const refY       = toY(refEq)
  const refVisible = refY >= PAD.top && refY <= H - PAD.bottom

  const latestEq   = history[history.length - 1]?.equity ?? 0
  const totalPnl   = latestEq - (history[0]?.equity ?? latestEq)
  const totalPct   = history[0]?.equity ? (totalPnl / history[0].equity) * 100 : 0
  const isPositive = totalPnl >= 0

  // Hover tooltip data
  const hoverPoint  = hoverIdx !== null ? history[hoverIdx] : null
  const hoverPt     = hoverIdx !== null ? points[hoverIdx] : null

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 shrink-0">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Equity</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tabular-nums text-foreground">
            {formatCurrency(hoverPoint?.equity ?? latestEq)}
          </span>
          <span className={cn(
            'text-[10px] font-medium tabular-nums',
            isPositive ? 'text-profit' : 'text-loss'
          )}>
            {isPositive ? '+' : ''}{formatCurrency(totalPnl)}
            <span className="opacity-70 ml-0.5">({totalPct.toFixed(1)}%)</span>
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="flex-1 relative overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`eq-gradient-${accountId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'} stopOpacity="0.25" />
              <stop offset="100%" stopColor={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d={areaPath}
            fill={`url(#eq-gradient-${accountId})`}
          />

          {/* Reference line (starting balance) */}
          {refVisible && (
            <line
              x1={PAD.left} y1={refY}
              x2={W - PAD.right} y2={refY}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          )}

          {/* Equity line */}
          <path
            d={linePath}
            fill="none"
            stroke={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover vertical line + dot */}
          {hoverPt && (
            <>
              <line
                x1={hoverPt.x} y1={PAD.top}
                x2={hoverPt.x} y2={H - PAD.bottom}
                stroke="rgba(255,255,255,0.20)"
                strokeWidth="0.5"
              />
              <circle
                cx={hoverPt.x} cy={hoverPt.y}
                r="1.5"
                fill={isPositive ? 'rgb(34,197,94)' : 'rgb(239,68,68)'}
              />
            </>
          )}
        </svg>

        {/* Hover tooltip */}
        {hoverPoint && hoverPt && (
          <div
            className="absolute pointer-events-none bg-popover border border-border rounded px-2 py-1 text-[10px] shadow-lg z-10"
            style={{
              left: `${(hoverPt.x / W) * 100}%`,
              top: `${(hoverPt.y / H) * 100}%`,
              transform: 'translate(-50%, -120%)',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="text-muted-foreground mr-1">
              {new Date(hoverPoint.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
            <span className="font-semibold text-foreground">{formatCurrency(hoverPoint.equity)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
