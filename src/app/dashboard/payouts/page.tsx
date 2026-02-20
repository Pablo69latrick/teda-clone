'use client'

import { useState } from 'react'
import { DollarSign, Clock, CheckCircle, XCircle, Plus, ExternalLink, Loader2 } from 'lucide-react'
import { cn, formatCurrency, timeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAccounts, useTradingData, usePayouts } from '@/lib/hooks'
import { mutate } from 'swr'
import type { PayoutStatus, PayoutMethod } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
}

const STATUS_CONFIG: Record<PayoutStatus, { label: string; icon: React.ElementType; cls: string }> = {
  pending:    { label: 'Pending',    icon: Clock,       cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  approved:   { label: 'Approved',   icon: CheckCircle, cls: 'bg-chart-2/10 text-chart-2 border-chart-2/20' },
  processing: { label: 'Processing', icon: Loader2,     cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  rejected:   { label: 'Rejected',   icon: XCircle,     cls: 'bg-loss/10 text-loss border-loss/20' },
  paid:       { label: 'Paid',       icon: CheckCircle, cls: 'bg-profit/10 text-profit border-profit/20' },
}

const METHOD_LABELS: Record<PayoutMethod, string> = {
  crypto: 'Crypto (USDT/USDC)',
  bank: 'Bank Transfer',
  paypal: 'PayPal',
}

export default function PayoutsPage() {
  const [showRequest, setShowRequest] = useState(false)
  const [amount, setAmount] = useState('')
  const [wallet, setWallet] = useState('')
  const [method, setMethod] = useState<PayoutMethod>('crypto')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: accounts } = useAccounts()
  const account = accounts?.[0]
  const accountId = account?.id
  const { data: tradingData, isLoading } = useTradingData(accountId)
  const { data: payouts, isLoading: loadingPayouts } = usePayouts(accountId)

  const acc = tradingData?.account ?? account
  const availableForPayout = Math.max(0, (acc?.total_pnl ?? 0) * 0.8) // 80% profit split
  const totalPaid = (payouts ?? []).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const pendingAmount = (payouts ?? []).filter(p => p.status === 'pending' || p.status === 'approved').reduce((s, p) => s + p.amount, 0)
  const pendingCount = (payouts ?? []).filter(p => p.status === 'pending' || p.status === 'approved').length

  async function handleSubmit() {
    if (!accountId || !amount || parseFloat(amount) <= 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/proxy/engine/request-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          account_id: accountId,
          amount: parseFloat(amount),
          method,
          wallet_address: wallet || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit request')
      }
      mutate(`/api/proxy/engine/payouts?account_id=${accountId}`)
      setShowRequest(false)
      setAmount('')
      setWallet('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

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
          { label: 'Total Paid', value: formatCurrency(totalPaid), icon: CheckCircle, accent: null, sub: `${(payouts ?? []).filter(p => p.status === 'paid').length} payouts` },
          { label: 'Pending', value: formatCurrency(pendingAmount), icon: Clock, accent: null, sub: `${pendingCount} request(s)` },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col gap-3 rounded-xl bg-card border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{stat.label}</span>
              <stat.icon className="size-4 text-muted-foreground/50" />
            </div>
            {isLoading || loadingPayouts ? (
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

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-loss/10 border border-loss/20 text-loss text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <label className="text-xs text-muted-foreground block mb-1.5">Method</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as PayoutMethod)}
                className="w-full bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none text-foreground"
              >
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                {method === 'crypto' ? 'Wallet Address' : method === 'paypal' ? 'PayPal Email' : 'Account Details'}
              </label>
              <div className="bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
                <input
                  type="text"
                  value={wallet}
                  onChange={e => setWallet(e.target.value)}
                  placeholder={method === 'crypto' ? '0x...' : method === 'paypal' ? 'email@example.com' : 'IBAN / Account #'}
                  className="w-full bg-transparent text-sm focus:outline-none text-foreground"
                />
              </div>
              {method === 'crypto' && (
                <p className="text-[10px] text-muted-foreground mt-1">USDT / USDC on BSC or ETH</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => { setShowRequest(false); setError(null) }} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              disabled={!amount || parseFloat(amount) <= 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting && <Loader2 className="size-3 mr-1.5 animate-spin" />}
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
          <span className="text-xs text-muted-foreground">{(payouts ?? []).length} requests</span>
        </div>

        {loadingPayouts ? (
          <div className="px-5 pb-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (payouts ?? []).length === 0 ? (
          <div className="px-5 pb-8 text-center text-sm text-muted-foreground">
            No payout requests yet. Once your account is funded, you can request withdrawals here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <th className="text-left px-5 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Method</th>
                  <th className="text-left px-3 py-2">Wallet</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Requested</th>
                  <th className="text-right px-5 py-2">Processed</th>
                </tr>
              </thead>
              <tbody>
                {(payouts ?? []).map(payout => {
                  const cfg = STATUS_CONFIG[payout.status] ?? STATUS_CONFIG.pending
                  const Icon = cfg.icon
                  return (
                    <tr key={payout.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 font-semibold tabular-nums">{formatCurrency(payout.amount)}</td>
                      <td className="px-3 py-3 text-muted-foreground capitalize">{payout.method}</td>
                      <td className="px-3 py-3 font-mono text-muted-foreground text-[10px]">{payout.wallet_address ?? '—'}</td>
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
        )}
      </div>
    </div>
  )
}
