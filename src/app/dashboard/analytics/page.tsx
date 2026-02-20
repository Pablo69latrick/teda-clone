'use client'

import { useState, useRef, useCallback } from 'react'
import {
  BarChart3, TrendingUp, Clock, Target,
  Percent, Award, Activity, Calendar,
  Flame, CheckCircle, XCircle, Zap, Share2,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { cn, formatCurrency, formatTimestamp } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAccounts, useTradingData } from '@/lib/hooks'
import type { Position } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

function StatCard({
  label, value, sub, icon: Icon, loading, accent,
}: {
  label: string; value: React.ReactNode; sub?: React.ReactNode
  icon: React.ElementType; loading?: boolean; accent?: 'profit' | 'loss' | 'neutral'
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground/50" />
      </div>
      {loading ? (
        <><Skeleton className="h-7 w-28" /><Skeleton className="h-3.5 w-20 mt-1" /></>
      ) : (
        <>
          <div className={cn(
            'text-xl font-bold tracking-tight',
            accent === 'profit' ? 'text-profit' : accent === 'loss' ? 'text-loss' : '',
          )}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </>
      )}
    </div>
  )
}

function MiniBar({ values }: { values: number[] }) {
  const max = Math.max(...values.map(Math.abs), 1)
  return (
    <div className="flex items-end gap-0.5 h-16">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <div
            className={cn('rounded-sm', v >= 0 ? 'bg-profit/60' : 'bg-loss/60')}
            style={{ height: `${(Math.abs(v) / max) * 100}%`, minHeight: 2 }}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Radar chart SVG (Consistency / R:R / IQ / Win%) ─────────────────────────
function RadarChart({
  scores,
}: {
  scores: { consistency: number; rr: number; iq: number; winRate: number }
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const cx = 120; const cy = 120; const r = 80
  const labels = ['Consistency', 'R/R', 'IQ', 'Win %']
  const values = [scores.consistency, scores.rr, scores.iq, scores.winRate]
  // Pentagon-ish: 4 axes at 0°, 90°, 180°, 270° (top, right, bottom, left)
  const angles = [-90, 0, 90, 180].map(a => (a * Math.PI) / 180)
  const toPoint = (angle: number, pct: number) => ({
    x: cx + Math.cos(angle) * r * pct,
    y: cy + Math.sin(angle) * r * pct,
  })
  // Grid circles
  const gridLevels = [0.25, 0.5, 0.75, 1]
  // Data polygon
  const pts = angles.map((a, i) => toPoint(a, values[i] / 100))
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  // Axes points
  const axesPts = angles.map(a => toPoint(a, 1))
  const composite = Math.round(values.reduce((a, b) => a + b, 0) / values.length)

  const [copied, setCopied] = useState(false)

  const handleShareToX = useCallback(async () => {
    if (!cardRef.current || sharing) return
    setSharing(true)
    try {
      // Hide the share button before capturing
      const shareBtn = cardRef.current.querySelector('[data-share-btn]') as HTMLElement | null
      if (shareBtn) shareBtn.style.display = 'none'

      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#1e3a8a',
      })

      // Restore button
      if (shareBtn) shareBtn.style.display = ''

      // Convert to blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()

      const tweetText = `📊 My Teda Performance Score: ${composite}/100\n\n🎯 Consistency: ${scores.consistency} | R/R: ${scores.rr} | Win%: ${scores.winRate} | IQ: ${scores.iq}\n\n#Teda #PropTrading #Trading`

      // Try native share (mobile) with image attached
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'performance.png', { type: 'image/png' })] })) {
        await navigator.share({
          text: tweetText,
          files: [new File([blob], 'performance.png', { type: 'image/png' })],
        })
      } else {
        // Desktop: copy image to clipboard, then open X compose
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ])
          setCopied(true)
          setTimeout(() => setCopied(false), 4000)
        } catch {
          // Clipboard API not available — fallback: download the image
          const link = document.createElement('a')
          link.download = `teda-performance-${composite}.png`
          link.href = dataUrl
          link.click()
        }

        // Open X compose with pre-filled text
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
          '_blank',
        )
      }
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }, [composite, scores, sharing])

  return (
    <div ref={cardRef} className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e40af, #1d4ed8)' }}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-blue-200 text-xs font-medium">Performance ⓘ</p>
            <p className="text-white text-4xl font-bold mt-1">{composite}</p>
            <p className="text-blue-200 text-xs mt-0.5">Composite</p>
          </div>
          {/* Watermark for shared image */}
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="text-blue-200 text-[10px] font-medium tracking-wider">TEDA</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* SVG Radar */}
          <svg width="240" height="240" viewBox="0 0 240 240" className="shrink-0">
            {/* Grid */}
            {gridLevels.map(lvl => {
              const gPts = angles.map(a => toPoint(a, lvl))
              return (
                <polygon
                  key={lvl}
                  points={gPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                />
              )
            })}
            {/* Axes */}
            {axesPts.map((p, i) => (
              <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
                stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            ))}
            {/* Data */}
            <polygon points={polyline}
              fill="rgba(147,197,253,0.25)"
              stroke="rgba(147,197,253,0.8)"
              strokeWidth="1.5"
            />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3"
                fill="white" />
            ))}
            {/* Labels */}
            {axesPts.map((p, i) => {
              const pad = 14
              const dx = (p.x - cx) / r * pad
              const dy = (p.y - cy) / r * pad
              return (
                <text key={i}
                  x={(p.x + dx).toFixed(1)} y={(p.y + dy).toFixed(1)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="9" fill="rgba(191,219,254,0.9)" fontWeight="500"
                >
                  {labels[i]}: {values[i]}
                </text>
              )
            })}
          </svg>

          {/* Tips */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="size-3.5 text-yellow-300" />
              <span className="text-blue-100 text-xs font-semibold">Tips</span>
            </div>
            <ul className="text-blue-200 text-[11px] space-y-1.5">
              <li>· Elite win rate! Consider slightly larger position sizes</li>
              <li>· Excellent trade management — your winners are outpacing losers</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Consistency', 'IQ Usage', 'Win Rate', 'R/R'].map(tag => (
                <span key={tag} className="text-[10px] text-blue-200 bg-blue-900/50 px-2 py-0.5 rounded-full">
                  {tag} ⓘ
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Share button */}
        <button
          data-share-btn
          onClick={handleShareToX}
          disabled={sharing}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-medium disabled:opacity-50"
        >
          {sharing ? (
            <>
              <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : copied ? (
            <>
              <CheckCircle className="size-3.5 text-green-300" />
              Image copied — paste in X with ⌘V
            </>
          ) : (
            <>
              <Share2 className="size-3.5" />
              Share on 𝕏
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function TradeRow({ pos }: { pos: Position }) {
  const pnl = pos.realized_pnl
  return (
    <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
      <td className="px-5 py-2.5 font-medium">{pos.symbol}</td>
      <td className="px-3 py-2.5">
        <Badge variant={pos.direction === 'long' ? 'long' : 'short'} className="text-[10px] px-1.5 py-0">
          {pos.direction}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{pos.quantity.toLocaleString()}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">${pos.entry_price.toFixed(5)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">${(pos.exit_price ?? 0).toFixed(5)}</td>
      <td className={cn('px-3 py-2.5 text-right tabular-nums font-medium', pnl >= 0 ? 'text-profit' : 'text-loss')}>
        {formatCurrency(pnl)}
      </td>
      <td className="px-5 py-2.5 text-right text-muted-foreground text-[10px] tabular-nums">
        {pos.exit_timestamp ? formatTimestamp(pos.exit_timestamp) : '—'}
      </td>
    </tr>
  )
}

function fmtPnl(v: number): string {
  return `${v >= 0 ? '+' : ''}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | 'all'>('30d')

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const account = accounts?.[0]
  const { data: tradingData, isLoading: loadingTrading } = useTradingData(account?.id)

  const loading = loadingAccounts || loadingTrading

  const acc = tradingData?.account ?? account
  const allPositions = tradingData?.positions ?? []
  const closedPositions = allPositions.filter(p => p.status === 'closed')
  const openPositions = allPositions.filter(p => p.status === 'open')

  const wins = closedPositions.filter(p => p.realized_pnl > 0)
  const losses = closedPositions.filter(p => p.realized_pnl <= 0)
  const winRate = closedPositions.length > 0 ? (wins.length / closedPositions.length) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + p.realized_pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, p) => s + p.realized_pnl, 0) / losses.length : 0
  const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin) / Math.abs(avgLoss) : 0
  const avgDuration = closedPositions.length > 0
    ? closedPositions.reduce((s, p) => {
        if (p.exit_timestamp && p.entry_timestamp) {
          const ms = (p.exit_timestamp > 1e12 ? p.exit_timestamp : p.exit_timestamp * 1000)
                   - (p.entry_timestamp > 1e12 ? p.entry_timestamp : p.entry_timestamp * 1000)
          return s + ms
        }
        return s
      }, 0) / closedPositions.length / 60_000
    : 0

  // Mock daily P&L bars (realistic-looking 30-day history)
  const dailyBars = [320, -180, 540, 220, -90, 410, 180, -240, 380, 150,
                     -120, 280, 430, -60, 390, 200, -310, 580, 140, -80,
                     620, 300, -190, 450, 220, -140, 380, 560, -70, 420]

  // Computed radar scores
  const radarScores = {
    consistency: Math.min(100, Math.round(62 + (winRate > 50 ? 10 : 0))),
    rr: Math.min(100, Math.round(80 + (profitFactor > 1 ? 5 : -10))),
    iq: 67,
    winRate: Math.min(100, Math.round(winRate) || 100),
  }

  const accountSize = acc?.net_worth ?? 200_000
  const initialCapital = accountSize - (acc?.total_pnl ?? 0)
  const startDate = 'Jan 6, 2026' // mock

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Trading performance breakdown</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {(['7d', '30d', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                selectedPeriod === p
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p === 'all' ? 'All time' : `Last ${p}`}
            </button>
          ))}
        </div>
      </div>

      {/* Account Info header */}
      <div className="rounded-2xl bg-card border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Prop Account</h2>
          <span className="text-xs text-muted-foreground font-medium">USD</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: BarChart3, iconBg: 'bg-blue-50 text-blue-400', label: 'ACCOUNT SIZE', value: loading ? '—' : formatCurrency(accountSize) },
            { icon: TrendingUp, iconBg: 'bg-green-50 text-green-500', label: 'INITIAL CAPITAL', value: loading ? '—' : formatCurrency(initialCapital > 0 ? initialCapital : 200_000) },
            { icon: Calendar, iconBg: 'bg-purple-50 text-purple-400', label: 'START DATE', value: startDate },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', item.iconBg)}>
                <item.icon className="size-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{item.label} ⓘ</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Average Win" icon={TrendingUp} loading={loading}
          value={formatCurrency(avgWin)}
          accent="profit"
          sub={`${wins.length} winning trades`}
        />
        <StatCard label="Win Rate" icon={Percent} loading={loading}
          value={`${winRate.toFixed(1)}%`}
          accent={winRate >= 50 ? 'profit' : 'loss'}
          sub={`${wins.length}W / ${losses.length}L`}
        />
        <StatCard label="Average Loss" icon={Award} loading={loading}
          value={formatCurrency(avgLoss)}
          accent="loss"
          sub="Avg loss per trade"
        />
        <StatCard label="Profit Factor" icon={Activity} loading={loading}
          value={profitFactor > 0 ? profitFactor.toFixed(2) : '∞'}
          accent={profitFactor >= 1 ? 'profit' : profitFactor > 0 ? 'loss' : 'neutral'}
          sub="Avg win / avg loss"
        />
      </div>

      {/* Radar + Balance History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RadarChart scores={radarScores} />

        {/* Balance History */}
        <div className="rounded-2xl bg-card border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Balance History ⓘ</h2>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {['1W', '1M', '3M', '6M', '1Y', 'ALL'].map(t => (
                <button key={t} className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  t === '1M' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                )}>{t}</button>
              ))}
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(accountSize)}</div>
          <div className="text-xs text-profit mt-1">+0.00% (+$0.00000) ⓘ</div>
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground/40">
            <BarChart3 className="size-8" />
            <p className="text-xs text-center">No equity history available yet<br/>
              <span className="text-muted-foreground/60">Start trading to see your performance</span>
            </p>
          </div>
        </div>
      </div>

      {/* Two column layout — Daily P&L + Trade breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily P&L chart */}
        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Daily P&L</h2>
            </div>
            <Badge variant="secondary" className="text-[10px]">30 days</Badge>
          </div>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <MiniBar values={dailyBars} />
              <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                <span>30 days ago</span>
                <span className="font-medium text-profit">{fmtPnl(dailyBars.reduce((a, b) => a + b, 0))} total</span>
                <span>Today</span>
              </div>
            </>
          )}
        </div>

        {/* Trade breakdown */}
        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Trade Breakdown</h2>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Average Win', value: avgWin, color: 'text-profit', fmt: (v: number) => formatCurrency(v) },
              { label: 'Average Loss', value: avgLoss, color: 'text-loss', fmt: (v: number) => formatCurrency(v) },
              { label: 'Avg Trade Duration', value: avgDuration, color: '', fmt: (v: number) => `${v.toFixed(0)}m` },
              { label: 'Total Fees', value: closedPositions.reduce((s, p) => s + p.total_fees, 0), color: 'text-muted-foreground', fmt: (v: number) => formatCurrency(v) },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={cn('font-medium tabular-nums', item.color)}>
                  {loading ? '—' : item.fmt(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trading Streaks & Activity */}
      <div className="rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-border">
          <Flame className="size-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-foreground">Trading Streaks &amp; Activity</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
          {[
            { label: 'Current', sublabel: 'Win Streak', value: Math.max(wins.length, 1), icon: Flame, bg: 'bg-green-50', text: 'text-green-600', iconText: 'text-green-500' },
            { label: 'Best Win', sublabel: 'consecutive wins', value: Math.max(wins.length, 1), icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600', iconText: 'text-green-500' },
            { label: 'Worst Loss', sublabel: 'consecutive losses', value: losses.length, icon: XCircle, bg: 'bg-red-50', text: 'text-red-500', iconText: 'text-red-400' },
            { label: 'Activity', sublabel: 'trades per day', value: (closedPositions.length / 30).toFixed(1), icon: Activity, bg: 'bg-blue-50', text: 'text-blue-600', iconText: 'text-blue-500' },
          ].map((item, idx) => (
            <div key={item.label} className={cn(
              'flex flex-col gap-2 p-5',
              item.bg,
              idx < 3 && 'border-r border-border'
            )}>
              <div className="flex items-center gap-1.5">
                <item.icon className={cn('size-3.5', item.iconText)} />
                <span className={cn('text-xs font-semibold', item.iconText)}>{item.label}</span>
              </div>
              <p className={cn('text-3xl font-bold', item.text)}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.sublabel}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trade history table */}
      <div className="rounded-xl bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Trade History</h2>
          </div>
          <span className="text-xs text-muted-foreground">{closedPositions.length} trades</span>
        </div>

        {closedPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="size-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No closed trades yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your trade history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="text-left px-5 py-2">Symbol</th>
                  <th className="text-left px-3 py-2">Side</th>
                  <th className="text-right px-3 py-2">Size</th>
                  <th className="text-right px-3 py-2">Entry</th>
                  <th className="text-right px-3 py-2">Exit</th>
                  <th className="text-right px-3 py-2">P&L</th>
                  <th className="text-right px-5 py-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map(pos => (
                  <TradeRow key={pos.id} pos={pos} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
