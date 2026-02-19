'use client'

import { useState } from 'react'
import { DollarSign, Clock, CheckCircle, XCircle, Plus, ExternalLink } from 'lucide-react'
import { cn, formatCurrency, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAccounts, useTradingData } from '@/lib/hooks'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'paid'

interface MockPayout {
  id: string
  amount: number
  status: PayoutStatus
  requested_at: number
  processed_at: number | null
  wallet: string
  tx_hash: string | null
}

// Mock payout history — in prod this would come from /api/proxy/actions/payouts
const MOCK_PAYOUTS: MockPayout[] = [
  { id: 'p1', amount: 3_200, status: 'paid', requested_at: Date.now() - 14 * 86400_000, processed_at: Date.now() - 12 * 86400_000, wallet: '0xaB3c...8dF1', tx_hash: '0xabc123' },
  { id: 'p2', amount: 1_800, status: 'approved', requested_at: Date.now() - 3 * 86400_000, processed_at: Date.now() - 1 * 86400_000, wallet: '0xaB3c...8dF1', tx_hash: null },
  { id: 'p3', amount: 5_500, status: 'pending', requested_at: Date.now() - 1 * 86400_000, processed_at: null, wallet: '0xaB3c...8dF1', tx_hash: null },
]

const STATUS_CONFIG: Record<PayoutStatus, { label: string; icon: React.ElementType; cls: string }> = {
  pending: { label: 'Pending', icon: Clock, cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  approved: { label: 'Approved', icon: CheckCircle, cls: 'bg-chart-2/10 text-chart-2 border-chart-2/20' },
  rejected: { label: 'Rejected', icon: XCircle, cls: 'bg-loss/10 text-loss border-loss/20' },
  paid: { label: 'Paid', icon: CheckCircle, cls: 'bg-profit/10 text-profit border-profit/20' },
}

export default function PayoutsPage() {
  const [showRequest, setShowRequest] = useState(false)
  const [amount, setAmount] = useState('')

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const account = accounts?.[0]
  const { data: tradingData, isLoading } = useTradingData(account?.id)

  const acc = tradingData?.account ?? account
  const availableForPayout = Math.max(0, (acc?.total_pnl ?? 0) * 0.8) // 80% profit split
  const totalPaid = MOCK_PAYOUTS.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const pendingAmount = MOCK_PAYOUTS.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Request and track your profit withdrawals</p>
        </div>
        <Button
          onClick={() => setShowRequest(v => !v)}
          className="flex items-center gap-2 text-xs"
          size="sm"
        >
          <Plus className="size-3.5" />
          Request Payout
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Available for Payout', value: formatCurrency(availableForPayout), icon: DollarSign, accent: 'profit' as const, sub: '80% profit split' },
          { label: 'Total Paid', value: formatCurrency(totalPaid), icon: CheckCircle, accent: null, sub: `${MOCK_PAYOUTS.filter(p => p.status === 'paid').length} payouts` },
          { label: 'Pending', value: formatCurrency(pendingAmount), icon: Clock, accent: null, sub: `${MOCK_PAYOUTS.filter(p => p.status === 'pending').length} request(s)` },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col gap-3 rounded-xl bg-card border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{stat.label}</span>
              <stat.icon className="size-4 text-muted-foreground/50" />
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className={cn('text-xl font-bold tracking-tight', stat.accent === 'profit' ? 'text-profit' : '')}>
                {stat.value}
              </div>
            )}
            <div className="text-xs text-muted-foreground">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Request payout form */}
      {showRequest && (
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <h2 className="text-sm font-semibold mb-4">New Payout Request</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Amount (USD)</label>
              <div className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-sm font-medium focus:outline-none tabular-nums"
                />
                <button
                  onClick={() => setAmount(availableForPayout.toFixed(2))}
                  className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  MAX
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Available: {formatCurrency(availableForPayout)}
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Wallet Address</label>
              <div className="bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
                <input
                  type="text"
                  placeholder="0x..."
                  className="w-full bg-transparent text-sm focus:outline-none text-foreground"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">USDT / USDC on BSC or ETH</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowRequest(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" className="text-xs" disabled={!amount || parseFloat(amount) <= 0}>
              Submit Request
            </Button>
          </div>
        </div>
      )}

      {/* Payout history */}
      <div className="rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Payout History</h2>
          </div>
          <span className="text-xs text-muted-foreground">{MOCK_PAYOUTS.length} requests</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <th className="text-left px-5 py-2">Amount</th>
                <th className="text-left px-3 py-2">Wallet</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Requested</th>
                <th className="text-right px-5 py-2">Processed</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PAYOUTS.map(payout => {
                const cfg = STATUS_CONFIG[payout.status]
                const Icon = cfg.icon
                return (
                  <tr key={payout.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-semibold tabular-nums">{formatCurrency(payout.amount)}</td>
                    <td className="px-3 py-3 font-mono text-muted-foreground text-[10px]">{payout.wallet}</td>
                    <td className="px-3 py-3">
                      <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium', cfg.cls)}>
                        <Icon className="size-2.5" />
                        {cfg.label}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                      {timeAgo(payout.requested_at)}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground tabular-nums">
                      {payout.processed_at ? (
                        <div className="flex items-center justify-end gap-1">
                          <span>{timeAgo(payout.processed_at)}</span>
                          {payout.tx_hash && (
                            <ExternalLink className="size-3 text-muted-foreground/50" />
                          )}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
